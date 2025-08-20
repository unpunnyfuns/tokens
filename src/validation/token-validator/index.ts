/**
 * Functional token validation API
 */

import type { ValidationResult } from "../../types/validation.js";
import type { TokenDocument } from "../../types.js";
import { checkReferences } from "./reference-validator.js";
import { formatAjvErrors, getValidator } from "./schema-manager.js";
import type { TokenValidationOptions } from "./types.js";

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

  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

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

// Re-export utilities
export { hasTokenStructure } from "./token-structure.js";
// Re-export types
export type { TokenValidationOptions } from "./types.js";
