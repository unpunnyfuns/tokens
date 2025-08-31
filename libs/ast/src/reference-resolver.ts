/**
 * Reference resolution (content inclusion) - Assembly Phase
 *
 * References ($ref) are always resolved immediately via content inclusion.
 * This is separate from alias transformation which is configurable.
 */

import { extractReferences } from "@upft/foundation";
import type { TypedToken } from "./token-types.js";
import type {
  ProjectAST,
  ResolutionError,
  TokenAST,
  TokenNode,
} from "./types.js";

export interface ReferenceResolutionResult {
  success: boolean;
  errors: ResolutionError[];
  resolvedReferences: number;
}

/**
 * Resolve all references ($ref) in a project via content inclusion
 * This is the assembly phase - always runs, not configurable
 */
export function resolveReferences(
  project: ProjectAST,
): ReferenceResolutionResult {
  const errors: ResolutionError[] = [];
  let resolvedReferences = 0;

  // Process each file for reference resolution
  for (const [filePath, file] of project.files) {
    try {
      const fileResult = resolveFileReferences(file, project);
      resolvedReferences += fileResult.resolvedReferences;
      errors.push(...fileResult.errors);
    } catch (error) {
      errors.push({
        type: "missing",
        path: "",
        message: `Failed to resolve references in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        reference: "",
        filePath,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    resolvedReferences,
  };
}

/**
 * Resolve all references in a single file
 */
function resolveFileReferences(
  file: TokenAST,
  project: ProjectAST,
): ReferenceResolutionResult {
  const errors: ResolutionError[] = [];
  let resolvedReferences = 0;

  // Find all tokens with $ref in their structure
  const tokensToProcess = findTokensWithReferences(file);

  for (const token of tokensToProcess) {
    try {
      const resolved = resolveTokenReferences(token, file, project);
      if (resolved) {
        resolvedReferences++;
      }
    } catch (error) {
      errors.push({
        type: "missing",
        path: token.path,
        message: `Failed to resolve reference in token: ${error instanceof Error ? error.message : String(error)}`,
        reference: "",
        filePath: file.filePath,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    resolvedReferences,
  };
}

/**
 * Find all tokens that contain $ref properties
 */
function findTokensWithReferences(file: TokenAST): TokenNode[] {
  const tokensWithRefs: TokenNode[] = [];

  function walkNode(node: TokenAST | import("./types.js").GroupNode): void {
    for (const token of node.tokens.values()) {
      if (hasReferenceInToken(token)) {
        tokensWithRefs.push(token);
      }
    }

    if ("groups" in node) {
      for (const group of node.groups.values()) {
        walkNode(group);
      }
    }
  }

  walkNode(file);
  return tokensWithRefs;
}

/**
 * Check if a token contains any $ref properties
 */
function hasReferenceInToken(token: TokenNode): boolean {
  // Check if typedValue contains $ref
  if (
    token.typedValue &&
    typeof token.typedValue.$value === "object" &&
    token.typedValue.$value !== null
  ) {
    return hasReference(token.typedValue.$value);
  }
  return false;
}

/**
 * Recursively check if an object contains $ref properties
 */
function hasReference(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  if ("$ref" in obj && typeof obj.$ref === "string") {
    return true;
  }

  for (const value of Object.values(obj)) {
    if (hasReference(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve all references in a token via content inclusion
 */
function resolveTokenReferences(
  token: TokenNode,
  file: TokenAST,
  project: ProjectAST,
): boolean {
  if (!token.typedValue || typeof token.typedValue.$value !== "object") {
    return false;
  }

  const resolvedValue = resolveValueReferences(
    token.typedValue.$value,
    file,
    project,
  );

  if (resolvedValue !== token.typedValue.$value) {
    // Create new typedValue with resolved references
    token.typedValue = {
      ...token.typedValue,
      $value: resolvedValue,
    } as TypedToken;

    // Extract any aliases that were included via reference resolution
    const newAliases = extractAliasesFromValue(resolvedValue);
    if (newAliases.length > 0) {
      // Add new aliases to references array
      const existingRefs = token.references || [];
      const uniqueRefs = [...new Set([...existingRefs, ...newAliases])];
      token.references =
        uniqueRefs as import("./token-types.js").TokenReference[];
      token.resolved = false; // Still has aliases to resolve
    } else if (!token.references || token.references.length === 0) {
      // If token has no remaining references (aliases), mark as resolved
      token.resolved = true;
      token.resolvedValue = token.typedValue;
    }

    return true;
  }

  return false;
}

/**
 * Resolve references in a value via content inclusion
 */
function resolveValueReferences(
  value: unknown,
  file: TokenAST,
  project: ProjectAST,
): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // Handle $ref - content inclusion
  if ("$ref" in value && typeof value.$ref === "string") {
    return resolveReference(value.$ref, file, project);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => resolveValueReferences(item, file, project));
  }

  // Handle objects
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = resolveValueReferences(val, file, project);
  }

  return result;
}

/**
 * Resolve a single $ref via content inclusion
 */
function resolveReference(
  ref: string,
  file: TokenAST,
  project: ProjectAST,
): unknown {
  // Intra-document reference: #/path/to/token
  if (ref.startsWith("#/")) {
    return resolveIntraDocumentReference(ref, file);
  }

  // Inter-document reference: https://example.com/file.json#/path
  const interDocMatch = ref.match(
    /^(https?:\/\/[^#]+\.json|file:\/\/[^#]+\.json|\.\.?\/[^#]+\.json)#(.+)$/,
  );
  if (interDocMatch) {
    const [, filePath, tokenPath] = interDocMatch;
    if (!(filePath && tokenPath)) {
      throw new Error(`Invalid inter-document reference format: ${ref}`);
    }
    return resolveInterDocumentReference(filePath, tokenPath, project);
  }

  throw new Error(`Unsupported reference format: ${ref}`);
}

/**
 * Navigate to the next node in the path
 */
function navigateToNextNode(
  current:
    | TokenAST
    | import("./types.js").GroupNode
    | import("./types.js").TokenNode,
  part: string,
  ref: string,
): TokenAST | import("./types.js").GroupNode | import("./types.js").TokenNode {
  if (
    (current.type === "file" || current.type === "group") &&
    current.tokens?.has(part)
  ) {
    return current.tokens.get(part) as import("./types.js").TokenNode;
  }

  if (
    (current.type === "file" || current.type === "group") &&
    current.groups?.has(part)
  ) {
    return current.groups.get(part) as import("./types.js").GroupNode;
  }

  throw new Error(`Reference path not found: ${ref}`);
}

/**
 * Resolve intra-document reference via content inclusion
 */
function resolveIntraDocumentReference(ref: string, file: TokenAST): unknown {
  // Convert #/base/$value to path lookup
  const path = ref.slice(2); // Remove #/
  const parts = path.split("/");
  if (!parts.length) {
    throw new Error(`Invalid reference path: ${ref}`);
  }

  let current:
    | TokenAST
    | import("./types.js").GroupNode
    | import("./types.js").TokenNode = file;

  for (const part of parts) {
    if (
      part === "$value" &&
      current.type === "token" &&
      current.typedValue?.$value !== undefined
    ) {
      return current.typedValue.$value;
    }

    current = navigateToNextNode(current, part, ref);
  }

  // If we end up with a token, return its value
  if (current.type === "token" && current.typedValue?.$value !== undefined) {
    return current.typedValue.$value;
  }

  throw new Error(`Reference did not resolve to a value: ${ref}`);
}

/**
 * Resolve inter-document reference via content inclusion
 */
function resolveInterDocumentReference(
  filePath: string,
  tokenPath: string,
  project: ProjectAST,
): unknown {
  const targetFile = project.files.get(filePath);
  if (!targetFile) {
    throw new Error(`Referenced file not found: ${filePath}`);
  }

  return resolveIntraDocumentReference(`#/${tokenPath}`, targetFile);
}

/**
 * Extract DTCG aliases from a resolved value
 */
function extractAliasesFromValue(value: unknown): string[] {
  // Create a temporary token object to use extractReferences
  const tempToken = {
    $value: value,
    $type: "color",
  } as import("@upft/foundation").TokenOrGroup;
  const rawReferences = extractReferences(tempToken);

  // Filter for DTCG aliases (not $ref or cross-file references)
  const aliases = rawReferences.filter((ref) => {
    // Skip $ref references
    if (ref.startsWith("#/")) return false;
    // Skip cross-file references
    if (ref.match(/^(https?:\/\/|file:\/\/|\.\.?\/)/) || ref.includes(".json#"))
      return false;
    // This is a DTCG alias
    return true;
  });

  return aliases.map((alias) => {
    // Normalize to {token.path} format
    const normalized = alias
      .replace(/^{|}$/g, "") // Remove existing braces
      .replace(/\//g, "."); // Convert slashes to dots
    return `{${normalized}}`;
  });
}
