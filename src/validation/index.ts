/**
 * Validation module - Clean API for token and manifest validation
 * @module @unpunnyfuns/tokens/validation
 */

// Main validation API - just two functions, no variations
export {
  validateTokens,
  validateManifest,
  isValidTokens,
  isValidManifest,
} from "./validate.js";

// Re-export validation types
export type {
  ValidationError,
  ValidationResult,
  ValidationResultWithStats,
  TokenValidationResult,
  ManifestValidationResult,
} from "../types/validation.js";

// Schema utilities (for advanced use)
export {
  clearSchemaCache,
  getCachedSchemas,
  getSchemaForType,
  loadSchema,
  preloadSchemas,
  type SchemaLocation,
} from "./functional-api.js";
