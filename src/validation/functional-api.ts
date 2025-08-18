/**
 * Schema utilities for advanced validation use cases
 */

export type {
  ValidationError,
  ValidationResult,
} from "../types/validation.js";

export {
  clearSchemaCache,
  DTCG_SCHEMAS,
  getCachedSchemas,
  getSchemaForType,
  loadSchema,
  preloadSchemas,
  type SchemaLocation,
} from "./schema-utils.js";

// Internal validation functions - not exported from main API
export { validateTokenDocument } from "./token-validator.js";
export { validateManifestDocument } from "./manifest-validation.js";
