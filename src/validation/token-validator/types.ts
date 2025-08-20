/**
 * Types for token validation
 */

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
