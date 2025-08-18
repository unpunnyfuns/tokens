/**
 * Functional token validation API - Refactored with reduced complexity
 */

import Ajv from "ajv/dist/2020.js";
import { hasReferences } from "../references/index.js";
// Import base schemas
import baseSchema from "../schemas/tokens/base.schema.json" with {
  type: "json",
};
import tokenSchema from "../schemas/tokens/full.schema.json" with {
  type: "json",
};
// Import type schemas
import borderSchema from "../schemas/tokens/types/border.schema.json" with {
  type: "json",
};
import colorSchema from "../schemas/tokens/types/color.schema.json" with {
  type: "json",
};
import cubicBezierSchema from "../schemas/tokens/types/cubic-bezier.schema.json" with {
  type: "json",
};
import dimensionSchema from "../schemas/tokens/types/dimension.schema.json" with {
  type: "json",
};
import durationSchema from "../schemas/tokens/types/duration.schema.json" with {
  type: "json",
};
import fontFamilySchema from "../schemas/tokens/types/font-family.schema.json" with {
  type: "json",
};
import fontWeightSchema from "../schemas/tokens/types/font-weight.schema.json" with {
  type: "json",
};
import gradientSchema from "../schemas/tokens/types/gradient.schema.json" with {
  type: "json",
};
import numberSchema from "../schemas/tokens/types/number.schema.json" with {
  type: "json",
};
import shadowSchema from "../schemas/tokens/types/shadow.schema.json" with {
  type: "json",
};
import strokeStyleSchema from "../schemas/tokens/types/stroke-style.schema.json" with {
  type: "json",
};
import transitionSchema from "../schemas/tokens/types/transition.schema.json" with {
  type: "json",
};
import typographySchema from "../schemas/tokens/types/typography.schema.json" with {
  type: "json",
};
import valueTypesSchema from "../schemas/tokens/value-types.schema.json" with {
  type: "json",
};
import type { ValidationError, ValidationResult } from "../types/validation.js";
import type { TokenDocument } from "../types.js";

/**
 * Validation options
 */
export interface TokenValidationOptions {
  /** Use strict DTCG validation (default: true) */
  strict?: boolean;
  /** Check that references exist (default: false) */
  validateReferences?: boolean;
  /** Maximum number of errors to collect (default: 100) */
  errorLimit?: number;
}

// Cache compiled validators
const validatorCache = new Map<string, ReturnType<Ajv.default["compile"]>>();
let ajvInstance: Ajv.default | null = null;

/**
 * Get or create AJV instance
 */
function getAjv(): Ajv.default {
  if (!ajvInstance) {
    ajvInstance = new Ajv.default({
      allErrors: true,
      verbose: true,
      strict: false,
    });

    // Add all schemas
    const schemas = [
      baseSchema,
      valueTypesSchema,
      colorSchema,
      dimensionSchema,
      fontFamilySchema,
      fontWeightSchema,
      durationSchema,
      numberSchema,
      shadowSchema,
      typographySchema,
      cubicBezierSchema,
      strokeStyleSchema,
      borderSchema,
      transitionSchema,
      gradientSchema,
    ];

    for (const schema of schemas) {
      ajvInstance.addSchema(schema);
    }
  }

  return ajvInstance;
}

/**
 * Get compiled validator for a schema
 */
function getValidator(schemaId: string): ReturnType<Ajv.default["compile"]> {
  const cached = validatorCache.get(schemaId);
  if (cached) return cached;

  const ajv = getAjv();
  const validator = ajv.compile(
    schemaId === "full" ? tokenSchema : { type: "object" },
  );
  validatorCache.set(schemaId, validator);
  return validator;
}

/**
 * Format AJV errors to our error format
 */
function formatAjvErrors(
  errors: Ajv.ErrorObject[],
  limit = 100,
): ValidationError[] {
  return errors.slice(0, limit).map((error) => ({
    path: error.instancePath || "/",
    message:
      error.message || `Validation failed at ${error.instancePath || "root"}`,
    severity: "error" as const,
    rule: error.keyword,
    context: error.params,
  }));
}

/**
 * Add token path to collection
 */
function addTokenPath(
  key: string,
  value: unknown,
  path: string,
  tokenPaths: Set<string>,
): void {
  const currentPath = path ? `${path}.${key}` : key;

  if (value && typeof value === "object" && "$value" in value) {
    tokenPaths.add(currentPath);
  }
}

/**
 * Collect paths from nested object
 */
function collectNestedPaths(
  value: unknown,
  currentPath: string,
  tokenPaths: Set<string>,
): void {
  if (value && typeof value === "object" && !("$value" in value)) {
    collectPaths(value, currentPath, tokenPaths);
  }
}

/**
 * Collect all token paths in a document
 */
function collectPaths(
  obj: unknown,
  path: string,
  tokenPaths: Set<string>,
): void {
  if (!obj || typeof obj !== "object") return;

  for (const [key, value] of Object.entries(obj)) {
    addTokenPath(key, value, path, tokenPaths);
    const currentPath = path ? `${path}.${key}` : key;
    collectNestedPaths(value, currentPath, tokenPaths);
  }
}

/**
 * Check references for a single value
 */
function checkValueReferences(
  value: unknown,
  currentPath: string,
  tokenPaths: Set<string>,
  errors: ValidationError[],
): void {
  if (!hasReferences(value)) return;

  const refs = extractReferencePaths(value);
  for (const ref of refs) {
    if (!tokenPaths.has(ref)) {
      errors.push({
        path: `/${currentPath.replace(/\./g, "/")}`,
        message: `Reference to non-existent token: ${ref}`,
        severity: "error",
        rule: "reference-exists",
      });
    }
  }
}

/**
 * Check references in object recursively
 */
function checkObjectReferences(
  obj: unknown,
  path: string,
  tokenPaths: Set<string>,
  errors: ValidationError[],
): void {
  if (!obj || typeof obj !== "object") return;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    checkValueReferences(value, currentPath, tokenPaths, errors);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      checkObjectReferences(value, currentPath, tokenPaths, errors);
    }
  }
}

/**
 * Check if references in a document exist
 */
function checkReferences(document: TokenDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  const tokenPaths = new Set<string>();

  // Collect all token paths
  collectPaths(document, "", tokenPaths);

  // Check references
  checkObjectReferences(document, "", tokenPaths, errors);

  return errors;
}

/**
 * Extract reference from string value
 */
function extractReferenceFromString(value: string): string[] {
  const paths: string[] = [];
  const dtcgMatch = value.match(/^\{([^}]+)\}$/);
  if (dtcgMatch?.[1]) {
    paths.push(dtcgMatch[1]);
  }
  return paths;
}

/**
 * Extract references from object value
 */
function extractReferenceFromObject(value: Record<string, unknown>): string[] {
  const paths: string[] = [];

  // JSON Schema $ref format
  if ("$ref" in value && typeof value.$ref === "string") {
    const refPath = value.$ref.replace(/^#\//, "").replace(/\//g, ".");
    paths.push(refPath);
  }

  // Recurse into nested values
  for (const v of Object.values(value)) {
    paths.push(...extractReferencePaths(v));
  }

  return paths;
}

/**
 * Extract reference paths from a value
 */
function extractReferencePaths(value: unknown): string[] {
  if (typeof value === "string") {
    return extractReferenceFromString(value);
  }

  if (value && typeof value === "object") {
    return extractReferenceFromObject(value as Record<string, unknown>);
  }

  return [];
}

/**
 * Validate a token document
 */
export function validateTokenDocument(
  document: unknown,
  options: TokenValidationOptions = {},
): ValidationResult {
  const {
    strict = true,
    validateReferences = false,
    errorLimit = 100,
  } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Schema validation
  if (strict) {
    const validator = getValidator("full");
    const valid = validator(document);

    if (!valid && validator.errors) {
      errors.push(...formatAjvErrors(validator.errors, errorLimit));
    }
  }

  // Reference validation
  if (validateReferences && document && typeof document === "object") {
    const refErrors = checkReferences(document as TokenDocument);
    errors.push(...refErrors.slice(0, errorLimit - errors.length));
  }

  return {
    valid: errors.length === 0,
    errors: errors.slice(0, errorLimit),
    warnings: warnings.slice(0, errorLimit),
  };
}

/**
 * Validate multiple token documents
 */
export function validateTokenDocuments(
  documents: unknown[],
  options: TokenValidationOptions = {},
): ValidationResult[] {
  return documents.map((doc) => validateTokenDocument(doc, options));
}

/**
 * Check if value has token structure
 */
function checkValueForTokens(value: unknown): boolean {
  if (value && typeof value === "object") {
    if ("$value" in value) return true;
    if (hasTokenStructure(value)) return true;
  }
  return false;
}

/**
 * Check if object has token structure
 */
function hasTokenStructure(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;

  for (const value of Object.values(obj)) {
    if (checkValueForTokens(value)) return true;
  }

  return false;
}
