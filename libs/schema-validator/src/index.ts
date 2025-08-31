/**
 * Schema validation using AJV for UPFT tokens and manifests
 */

import type { ValidationResult } from "@upft/foundation";
import { schemas } from "@upft/schemas";
import type { ErrorObject } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsDefault from "ajv-formats";

// Create AJV instance with draft 2020-12 support and formats
const ajv = new Ajv2020({
  allErrors: true,
  verbose: true,
  strict: false, // Allow additional properties for extensibility
});

// Use type assertion for ajv-formats with NodeNext module resolution
const addFormats =
  addFormatsDefault as unknown as typeof addFormatsDefault.default;
addFormats(ajv);

// Add all schemas to AJV to resolve cross-references
ajv.addSchema(schemas.tokens.valueTypes);
ajv.addSchema(schemas.tokens.base);
ajv.addSchema(schemas.tokens.full);
ajv.addSchema(schemas.manifest);

// Add all type schemas
for (const schema of Object.values(schemas.tokens.types)) {
  ajv.addSchema(schema);
}

// Create named references for common access
ajv.addSchema(schemas.manifest, "manifest");
ajv.addSchema(schemas.tokens.full, "tokens");
ajv.addSchema(schemas.tokens.base, "tokens-base");

// Compiled validators (cached)
const manifestValidator = ajv.getSchema("manifest");
const tokensBaseValidator = ajv.getSchema("tokens-base");

export interface SchemaValidationOptions {
  /** Use strict token validation (requires $type on all tokens) */
  strict?: boolean;
}

/**
 * Validate a manifest against UPFT manifest schema
 */
export function validateManifest(
  data: unknown,
  _options: SchemaValidationOptions = {},
): ValidationResult {
  if (!manifestValidator) {
    return {
      valid: false,
      errors: [
        {
          message: "Manifest schema validator not available",
          path: "",
          severity: "error",
        },
      ],
      warnings: [],
    };
  }

  const isValid = manifestValidator(data);

  if (isValid) {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  const errors = (manifestValidator.errors || []).map((error: ErrorObject) => ({
    message: `${error.instancePath || "root"}: ${error.message}`,
    path: error.instancePath || "",
    severity: "error" as const,
  }));

  return {
    valid: false,
    errors,
    warnings: [],
  };
}

/**
 * Validate token document against DTCG schema
 */
export function validateTokenDocument(
  data: unknown,
  options: SchemaValidationOptions = {},
): ValidationResult {
  if (options.strict) {
    // For strict validation, we need to validate each typed token against its specific type schema
    return validateTokenDocumentStrict(data);
  }

  // For non-strict validation, use base schema (more permissive)
  if (!tokensBaseValidator) {
    return {
      valid: false,
      errors: [
        {
          message: "Base token schema validator not available",
          path: "",
          severity: "error",
        },
      ],
      warnings: [],
    };
  }

  const isValid = tokensBaseValidator(data);

  if (isValid) {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  const errors = (tokensBaseValidator.errors || []).map(
    (error: ErrorObject) => ({
      message: `${error.instancePath || "root"}: ${error.message}`,
      path: error.instancePath || "",
      severity: "error" as const,
    }),
  );

  return {
    valid: false,
    errors,
    warnings: [],
  };
}

/**
 * Strict validation that validates each typed token against its specific type schema
 */
function validateTokenDocumentStrict(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: [
        {
          message: "Document must be an object",
          path: "",
          severity: "error",
        },
      ],
      warnings: [],
    };
  }

  const obj = data as Record<string, unknown>;
  const allErrors: ValidationResult["errors"] = [];

  // First validate against base schema
  if (tokensBaseValidator) {
    const baseValid = tokensBaseValidator(data);
    if (!baseValid) {
      const errors = (tokensBaseValidator.errors || []).map(
        (error: ErrorObject) => ({
          message: `${error.instancePath || "root"}: ${error.message}`,
          path: error.instancePath || "",
          severity: "error" as const,
        }),
      );
      allErrors.push(...errors);
    }
  }

  // Then validate each typed token against its specific schema
  validateTokensRecursively(obj, "", allErrors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: [],
  };
}

/**
 * Recursively validate tokens in a document
 */
function validateTokensRecursively(
  obj: Record<string, unknown>,
  path: string,
  errors: ValidationResult["errors"],
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue; // Skip meta properties

    const currentPath = path ? `${path}.${key}` : key;

    if (value && typeof value === "object") {
      const item = value as Record<string, unknown>;

      // Check if this is a token (has $type and $value)
      if (typeof item.$type === "string" && item.$value !== undefined) {
        validateTypedToken(item, currentPath, errors);
      } else {
        // This is a group, recurse
        validateTokensRecursively(item, currentPath, errors);
      }
    }
  }
}

/**
 * Validate a single typed token against its specific schema
 */
function validateTypedToken(
  token: Record<string, unknown>,
  path: string,
  errors: ValidationResult["errors"],
): void {
  const tokenType = token.$type as string;

  // Get the specific type schema
  const typeSchema = (schemas.tokens.types as Record<string, unknown>)[
    tokenType
  ];
  if (!typeSchema) {
    errors.push({
      message: `Unknown token type: ${tokenType}`,
      path,
      severity: "error",
    });
    return;
  }

  // Compile and validate against the type-specific schema
  try {
    const validator = ajv.compile(typeSchema);
    const isValid = validator(token);

    if (!isValid) {
      const typeErrors = (validator.errors || []).map((error: ErrorObject) => ({
        message: `${path}${error.instancePath}: ${error.message}`,
        path: `${path}${error.instancePath}`,
        severity: "error" as const,
      }));
      errors.push(...typeErrors);
    }
  } catch (err) {
    errors.push({
      message: `Failed to validate token type ${tokenType}: ${err}`,
      path,
      severity: "error",
    });
  }
}

/**
 * Detect file type based on content structure
 */
export function detectFileType(
  data: unknown,
): "manifest" | "tokens" | "unknown" {
  if (!data || typeof data !== "object") {
    return "unknown";
  }

  const obj = data as Record<string, unknown>;

  // Check for manifest indicators
  if (obj.modifiers && typeof obj.modifiers === "object") {
    return "manifest";
  }

  if (obj.sets && Array.isArray(obj.sets)) {
    return "manifest";
  }

  // Check for token indicators
  if (hasTokenStructure(obj)) {
    return "tokens";
  }

  return "unknown";
}

/**
 * Check if object has token document structure
 */
function hasTokenStructure(obj: Record<string, unknown>): boolean {
  // Look for token-like properties
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue; // Skip meta properties

    if (value && typeof value === "object") {
      const item = value as Record<string, unknown>;

      // Has $value (token) or nested structure (group)
      if (item.$value !== undefined || hasTokenStructure(item)) {
        return true;
      }
    }
  }

  return false;
}
