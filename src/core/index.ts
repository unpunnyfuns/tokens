/**
 * Core token operations
 * @module @unpunnyfuns/tokens/core
 */

// Merge operations
export {
  merge,
  mergeTokens,
  type MergeResult,
  type MergeConflict,
  type MergeTokensOptions,
} from "./merge.js";

// Path index operations
export {
  buildPathIndex,
  getTokenFromIndex,
  getTokensByType,
  getPathsWithPrefix,
  hasPath,
  updateIndex,
  removeFromIndex,
  type PathIndex,
} from "./path-index.js";

// Token operations
export {
  cloneToken,
  traverseTokens,
  extractReferences,
  hasCircularReference,
} from "./token/operations.js";

// Token guards
export {
  isToken,
  isTokenGroup,
  isTokenDocument,
  isValidTokenDocument,
  hasType,
  hasValue,
  isReference,
  isDTCGReference,
  isJSONSchemaReference,
  isColorToken,
  isDimensionToken,
  isTypographyToken,
  isShadowToken,
  isBorderToken,
} from "./token/guards.js";

// Token path utilities
export {
  parsePath,
  joinPath,
  getParentPath,
  getTokenName,
  resolvePath,
  getTokenAtPath,
  setTokenAtPath,
  deleteTokenAtPath,
  getAllPaths,
  convertDTCGToJSONPath,
  convertJSONPathToDTCG,
} from "./token/path.js";
