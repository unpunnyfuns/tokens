/**
 * Token validator exports
 *
 * This module has been refactored into focused sub-modules for better maintainability
 */

export {
  hasTokenStructure,
  // Types
  type TokenValidationOptions,
  // Functions
  validateTokenDocument,
  validateTokenDocuments,
} from "./token-validator/index.js";
