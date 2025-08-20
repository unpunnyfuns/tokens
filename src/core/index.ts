/**
 * Core token operations
 * @module @unpunnyfuns/tokens/core
 */

// Merge operations
export { DTCGMergeError, merge } from "./merge.js";

// Path index operations
export {
  buildPathIndex,
  getPathsWithPrefix,
  getTokenFromIndex,
  getTokensByType,
  hasPath,
  type PathIndex,
  removeFromIndex,
  updateIndex,
} from "./path-index.js";
// Token guards
export {
  hasType,
  hasValue,
  isBorderToken,
  isColorToken,
  isDimensionToken,
  isDTCGReference,
  isJSONSchemaReference,
  isReference,
  isShadowToken,
  isToken,
  isTokenDocument,
  isTokenGroup,
  isTypographyToken,
  isValidTokenDocument,
} from "./token/guards.js";
// Token operations
export {
  cloneToken,
  extractReferences,
} from "./token/operations.js";

// Token path utilities
export {
  convertDTCGToJSONPath,
  convertJSONPathToDTCG,
  deleteTokenAtPath,
  getAllPaths,
  getParentPath,
  getTokenAtPath,
  getTokenName,
  joinPath,
  parsePath,
  resolvePath,
  setTokenAtPath,
} from "./token/path.js";
