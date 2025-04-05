/**
 * Validate that all references in tokens point to existing values
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface ValidationOptions {
  basePath?: string;
  strict?: boolean;
}

type TokenValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

interface ValidationContext {
  tokenMap: Map<string, TokenValue>;
  basePath: string;
  errors: string[];
  warnings: string[];
  validatedRefs: Set<string>;
  invalidRefs: Set<string>;
  path: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalReferences: number;
    validReferences: number;
    invalidReferences: number;
  };
}

/**
 * Validate all references in a token tree
 * @param {Object} tokens - Token tree to validate
 * @param {Object} options - Validation options
 * @param {string} options.basePath - Base path for external references
 * @param {boolean} options.strict - Throw on invalid references (default: false)
 * @returns {Object} Validation result with errors and warnings
 */
export async function validateReferences(
  tokens: Record<string, unknown>,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const { basePath = process.cwd(), strict = false } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const validatedRefs = new Set<string>();
  const invalidRefs = new Set<string>();

  // Build reference map of all available tokens
  const tokenMap = buildTokenMap(tokens);

  // Validate all references
  await validateTokenTree(tokens, {
    tokenMap,
    basePath,
    errors,
    warnings,
    validatedRefs,
    invalidRefs,
    path: "",
  });

  const result = {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalReferences: validatedRefs.size + invalidRefs.size,
      validReferences: validatedRefs.size,
      invalidReferences: invalidRefs.size,
    },
  };

  if (strict && !result.valid) {
    throw new Error(
      `Reference validation failed with ${errors.length} errors:\n${errors.join("\n")}`,
    );
  }

  return result;
}

/**
 * Build a map of all available token paths
 */
function buildTokenMap(
  tokens: Record<string, unknown>,
  path = "",
  map = new Map<string, TokenValue>(),
): Map<string, TokenValue> {
  for (const key in tokens) {
    const value = tokens[key];
    const currentPath = path ? `${path}/${key}` : key;

    if (isTokenLeaf(value)) {
      map.set(`#/${currentPath}`, value as TokenValue);
      const tokenValue = value as Record<string, unknown>;
      if (tokenValue.$value !== undefined) {
        map.set(`#/${currentPath}/$value`, tokenValue.$value as TokenValue);
      }
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      buildTokenMap(value as Record<string, unknown>, currentPath, map);
    }
  }

  return map;
}

/**
 * Validate references in a token tree recursively
 */
async function validateTokenTree(
  obj: unknown,
  context: ValidationContext,
  visitedPath = "",
): Promise<void> {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      await validateTokenTree(obj[i], context, `${visitedPath}[${i}]`);
    }
    return;
  }

  if (typeof obj !== "object" || obj === null) {
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key in record) {
    const value = record[key];
    const currentPath = visitedPath ? `${visitedPath}.${key}` : key;

    // Check for $ref at any level
    if (key === "$ref" && typeof value === "string") {
      await validateReference(value, currentPath, context);
    }

    // Check for $ref in $value
    if (
      key === "$value" &&
      typeof value === "object" &&
      value !== null &&
      (value as Record<string, unknown>).$ref
    ) {
      await validateReference(
        (value as Record<string, unknown>).$ref as string,
        `${currentPath}.$ref`,
        context,
      );
    }

    // Recurse into nested objects
    if (typeof value === "object" && value !== null) {
      await validateTokenTree(value, context, currentPath);
    }
  }
}

/**
 * Validate a single reference
 */
async function validateReference(
  ref: string,
  path: string,
  context: ValidationContext,
): Promise<void> {
  const { tokenMap, basePath, errors, warnings, validatedRefs, invalidRefs } =
    context;

  try {
    // Internal reference
    if (ref.startsWith("#/")) {
      if (tokenMap.has(ref)) {
        validatedRefs.add(ref);
      } else {
        errors.push(
          `Invalid internal reference at ${path}: "${ref}" does not exist`,
        );
        invalidRefs.add(ref);

        // Suggest similar paths
        const suggestion = findSimilarPath(ref, tokenMap);
        if (suggestion) {
          warnings.push(`  Did you mean: "${suggestion}"?`);
        }
      }
    }
    // External file reference
    else if (
      ref.includes(".json#") ||
      ref.startsWith("./") ||
      ref.startsWith("../")
    ) {
      const [filePath, fragment] = ref.split("#");
      const resolvedPath = resolve(basePath, filePath);

      try {
        const content = await readFile(resolvedPath, "utf-8");
        const externalTokens = JSON.parse(content);

        if (fragment) {
          // Build map for external file
          const externalMap = buildTokenMap(externalTokens);
          const fragmentRef = `#${fragment}`;

          if (externalMap.has(fragmentRef)) {
            validatedRefs.add(ref);
          } else {
            errors.push(
              `Invalid external reference at ${path}: "${ref}" - fragment "${fragment}" not found in ${filePath}`,
            );
            invalidRefs.add(ref);
          }
        } else {
          // Reference to entire file is valid if file exists
          validatedRefs.add(ref);
        }
      } catch (err) {
        errors.push(
          `Invalid external reference at ${path}: "${ref}" - file not found: ${filePath}`,
        );
        invalidRefs.add(ref);
      }
    }
    // DTCG alias format (validate if in DTCG mode)
    else if (ref.startsWith("{") && ref.endsWith("}")) {
      const tokenPath = ref.slice(1, -1).replace(/\./g, "/");
      const jsonRef = `#/${tokenPath}`;

      if (tokenMap.has(jsonRef) || tokenMap.has(`${jsonRef}/$value`)) {
        validatedRefs.add(ref);
      } else {
        warnings.push(`Unresolved DTCG alias at ${path}: "${ref}"`);
        // Don't count as error since DTCG aliases might be resolved by tools
      }
    }
    // Unknown format
    else {
      warnings.push(`Unknown reference format at ${path}: "${ref}"`);
    }
  } catch (err) {
    const error = err as Error;
    errors.push(`Error validating reference at ${path}: ${error.message}`);
    invalidRefs.add(ref);
  }
}

/**
 * Find similar token paths for suggestions
 */
function findSimilarPath(
  ref: string,
  tokenMap: Map<string, TokenValue>,
): string | null {
  const paths = Array.from(tokenMap.keys());
  const refParts = ref.split("/");
  const refEnd = refParts[refParts.length - 1];

  // Look for paths ending with the same token name
  const similar = paths.filter((p) => {
    const parts = p.split("/");
    return parts[parts.length - 1] === refEnd;
  });

  if (similar.length === 1) {
    return similar[0];
  }
  if (similar.length > 1) {
    // Return the shortest match
    return similar.sort((a, b) => a.length - b.length)[0];
  }

  return null;
}

/**
 * Check if an object is a token leaf
 */
function isTokenLeaf(obj: unknown): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return record.$value !== undefined || record.$ref !== undefined;
}
