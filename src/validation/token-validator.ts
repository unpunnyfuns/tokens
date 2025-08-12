/**
 * Pure validation functions for DTCG tokens
 * No console output - returns structured results
 */

import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Ajv, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/**
 * Result for a single file validation
 */
export interface FileValidationResult {
  filePath: string;
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Result for batch validation
 */
export interface BatchValidationResult {
  valid: boolean;
  results: FileValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
  };
}

/**
 * Parse schema reference from $schema property
 */
export function parseSchemaReference(
  schemaValue: string,
  projectRoot: string,
  filePath?: string,
): string | null {
  // Handle relative paths
  if (schemaValue.startsWith("../") || schemaValue.startsWith("./")) {
    if (filePath) {
      // Resolve relative to the file's directory
      const fileDir = dirname(filePath);
      return resolve(fileDir, schemaValue);
    }
    // Fallback to project root
    return resolve(projectRoot, schemaValue);
  }

  // Handle absolute URLs
  if (schemaValue.startsWith("https://") || schemaValue.startsWith("http://")) {
    // Extract schema name from URL patterns like:
    // https://tokens.unpunny.fun/schema/0.1.0/tokens/base
    const urlMatch = schemaValue.match(/\/schema\/[^/]+\/(.+)$/);
    if (urlMatch) {
      return join(projectRoot, "schemas", `${urlMatch[1]}.schema.json`);
    }
    return null; // Unsupported URL format
  }

  // Assume it's a relative path from project root
  return join(projectRoot, "schemas", schemaValue);
}

/**
 * Create AJV instance configured for the schema directory
 */
function createAjvInstance(schemaDir: string): Ajv {
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    verbose: true,
    loadSchema: async (uri: string) => {
      // Handle relative file references
      if (uri.startsWith("./") || uri.startsWith("../")) {
        const fullPath = resolve(schemaDir, uri);
        const content = await fs.readFile(fullPath, "utf8");
        return JSON.parse(content);
      }

      // Handle file:// URIs
      if (uri.startsWith("file://")) {
        const path = uri.slice(7);
        const content = await fs.readFile(path, "utf8");
        return JSON.parse(content);
      }

      // Handle paths without ./ prefix (treated as relative to schema dir)
      if (uri.endsWith(".json") || uri.endsWith(".schema.json")) {
        // Remove leading slash if present (AJV sometimes adds it)
        const cleanUri = uri.startsWith("/") ? uri.slice(1) : uri;
        const fullPath = resolve(schemaDir, cleanUri);
        try {
          const content = await fs.readFile(fullPath, "utf8");
          return JSON.parse(content);
        } catch (_error) {
          throw new Error(`Cannot load schema: ${uri} from ${fullPath}`);
        }
      }

      throw new Error(`Cannot load schema: ${uri}`);
    },
  });

  // Add format support
  addFormats(ajv);

  return ajv;
}

/**
 * Recursively load all referenced schemas
 */
async function loadReferencedSchemas(
  ajv: Ajv,
  schemaPath: string,
  loadedSchemas: Set<string> = new Set(),
): Promise<void> {
  if (loadedSchemas.has(schemaPath)) {
    return;
  }

  loadedSchemas.add(schemaPath);

  const schemaContent = await fs.readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaContent);
  const schemaDir = dirname(schemaPath);

  // Find all $ref values in the schema
  const refs = new Set<string>();

  function findRefs(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;

    const objWithRef = obj as { $ref?: unknown };
    if (objWithRef.$ref && typeof objWithRef.$ref === "string") {
      // Only process local file refs
      if (
        (objWithRef.$ref.startsWith("./") ||
          objWithRef.$ref.startsWith("../")) &&
        !objWithRef.$ref.includes("#")
      ) {
        refs.add(objWithRef.$ref);
      }
    }

    if (Array.isArray(obj)) {
      obj.forEach(findRefs);
    } else {
      Object.values(obj as Record<string, unknown>).forEach(findRefs);
    }
  }

  findRefs(schema);

  // Load all referenced schemas
  for (const ref of refs) {
    if (ref.endsWith(".json") || ref.endsWith(".schema.json")) {
      const refPath = resolve(schemaDir, ref);
      try {
        await loadReferencedSchemas(ajv, refPath, loadedSchemas);
      } catch {
        // Ignore missing refs - AJV will handle the error
      }
    }
  }

  // Add this schema to AJV
  try {
    ajv.addSchema(schema, `file://${schemaPath}`);
  } catch {
    // Schema might already be added
  }
}

/**
 * Validate a single token file against its schema
 */
export async function validateTokenFile(
  filePath: string,
  schemaPath: string | undefined,
  projectRoot: string,
): Promise<FileValidationResult> {
  try {
    // Read the token file
    const content = await fs.readFile(filePath, "utf8");
    let data: unknown;

    try {
      data = JSON.parse(content);
    } catch (error) {
      return {
        filePath,
        valid: false,
        errors: [`JSON parse error: ${error}`],
      };
    }

    // Determine schema path
    let resolvedSchemaPath = schemaPath;

    if (!resolvedSchemaPath) {
      const dataWithSchema = data as { $schema?: string };
      if (!dataWithSchema.$schema) {
        return {
          filePath,
          valid: false,
          skipped: true,
          skipReason: "No $schema property found",
        };
      }

      const parsed = parseSchemaReference(
        dataWithSchema.$schema,
        projectRoot,
        filePath,
      );
      resolvedSchemaPath = parsed ?? undefined;
      if (!resolvedSchemaPath) {
        return {
          filePath,
          valid: false,
          errors: [`Unsupported schema URL format: ${dataWithSchema.$schema}`],
        };
      }
    }

    // Check if schema file exists
    try {
      await fs.access(resolvedSchemaPath);
    } catch {
      return {
        filePath,
        valid: false,
        errors: [`Schema file not found: ${resolvedSchemaPath}`],
      };
    }

    // Create AJV instance for this schema's directory
    const schemaDir = dirname(resolvedSchemaPath);
    const ajv = createAjvInstance(schemaDir);

    // Load the schema and all its dependencies
    try {
      await loadReferencedSchemas(ajv, resolvedSchemaPath);
    } catch (error) {
      return {
        filePath,
        valid: false,
        errors: [`Failed to load schema: ${error}`],
      };
    }

    // Compile the main schema
    let validate: ValidateFunction;
    try {
      const schemaContent = await fs.readFile(resolvedSchemaPath, "utf8");
      const schema = JSON.parse(schemaContent);
      validate = await ajv.compileAsync(schema);
    } catch (error) {
      return {
        filePath,
        valid: false,
        errors: [`Failed to compile schema: ${error}`],
      };
    }

    // Remove $schema property from data for validation
    const { $schema, ...tokenData } = data as {
      $schema?: string;
      [key: string]: unknown;
    };

    // Validate the token data
    const valid = validate(tokenData);

    if (valid) {
      return {
        filePath,
        valid: true,
      };
    }

    // Format errors - deduplicate and simplify
    const errorMap = new Map<string, Set<string>>();

    for (const e of validate.errors || []) {
      const path = e.instancePath || "/";
      const message = e.message || "Validation failed";

      // Skip verbose anyOf/oneOf errors that don't add value
      if (message.includes("must match") && message.includes("schema in")) {
        continue;
      }

      // Skip additional properties errors for valid token properties
      if (
        message.includes("must NOT have additional properties") &&
        e.params?.additionalProperty &&
        ["$type", "$value", "$description", "$extensions"].includes(
          e.params.additionalProperty,
        )
      ) {
        continue;
      }

      if (!errorMap.has(path)) {
        errorMap.set(path, new Set());
      }
      const pathErrors = errorMap.get(path);
      if (pathErrors) {
        pathErrors.add(message);
      }
    }

    // Convert to array and limit errors per path
    const errors: string[] = [];
    for (const [path, messages] of errorMap) {
      const messageArray = Array.from(messages).slice(0, 3); // Max 3 errors per path
      for (const msg of messageArray) {
        errors.push(`${path}: ${msg}`);
      }
    }

    if (errors.length === 0 && !valid) {
      errors.push(
        "Validation failed - token structure does not match any defined type",
      );
    }

    return {
      filePath,
      valid: false,
      errors,
    };
  } catch (error) {
    return {
      filePath,
      valid: false,
      errors: [`Failed to process file: ${error}`],
    };
  }
}

/**
 * Validate multiple token files
 */
export async function validateTokenFiles(
  filePaths: string[],
  projectRoot: string,
  _schemaFiles?: string[],
): Promise<BatchValidationResult> {
  // Validate each file
  const results: FileValidationResult[] = [];

  for (const filePath of filePaths) {
    const result = await validateTokenFile(filePath, undefined, projectRoot);
    results.push(result);
  }

  // Calculate summary
  const summary = {
    total: results.length,
    valid: results.filter((r) => r.valid && !r.skipped).length,
    invalid: results.filter((r) => !r.valid && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
  };

  return {
    valid: summary.invalid === 0,
    results,
    summary,
  };
}

/**
 * Clear the schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
  // No longer using a global cache since each validation creates its own AJV instance
}
