/**
 * Clean validation API for tokens and manifests
 */

import type { ValidationResult } from "../types/validation.js";
import type { TokenDocument } from "../types.js";
import { validateManifestDocument } from "./manifest-validation.js";
import { validateTokenDocument } from "./token-validator.js";

/**
 * Validate a token document
 *
 * @example
 * ```typescript
 * const result = validateTokens(tokenDoc);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateTokens(
  document: TokenDocument,
  options?: {
    strict?: boolean;
    validateReferences?: boolean;
  },
): ValidationResult {
  return validateTokenDocument(document, options);
}

/**
 * Validate a manifest document
 *
 * @example
 * ```typescript
 * const result = validateManifest(manifest);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateManifest(manifest: unknown): ValidationResult {
  return validateManifestDocument(manifest);
}

/**
 * Quick check if tokens are valid
 */
export function isValidTokens(
  document: TokenDocument,
  options?: {
    strict?: boolean;
    validateReferences?: boolean;
  },
): boolean {
  return validateTokens(document, options).valid;
}

/**
 * Quick check if manifest is valid
 */
export function isValidManifest(manifest: unknown): boolean {
  return validateManifest(manifest).valid;
}
