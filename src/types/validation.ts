/**
 * Unified validation types
 */

/**
 * Base validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
  rule?: string;
}

/**
 * Base validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Extended validation result with statistics
 */
export interface ValidationResultWithStats extends ValidationResult {
  stats?: ValidationStats;
}

/**
 * Validation statistics
 */
export interface ValidationStats {
  totalTokens?: number;
  tokensWithReferences?: number;
  validReferences?: number;
  invalidReferences?: number;
  totalGroups?: number;
  totalFiles?: number;
}

/**
 * Token-specific validation result
 */
export interface TokenValidationResult extends ValidationResultWithStats {
  stats?: {
    totalTokens: number;
    tokensWithReferences: number;
    validReferences: number;
    invalidReferences: number;
  };
}

/**
 * Manifest validation result
 */
export interface ManifestValidationResult extends ValidationResult {
  manifestType?: "upft" | "dtcg";
  version?: string;
}
