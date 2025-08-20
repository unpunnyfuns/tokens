/**
 * Validation module - Clean API for token and manifest validation
 * @module @unpunnyfuns/tokens/validation
 */

// Re-export validation types
export type {
  ManifestValidationResult,
  TokenValidationResult,
  ValidationError,
  ValidationResult,
  ValidationResultWithStats,
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
// Main validation API - just two functions, no variations
export {
  isValidManifest,
  isValidTokens,
  validateManifest,
  validateTokens,
} from "./validate.js";
