/**
 * Token operations
 */

// Re-export path utilities from foundation to maintain API compatibility
export {
  convertDTCGToJSONPath,
  convertJSONPathToDTCG,
  deleteTokenAtPath,
  getParentPath,
  getTokenAtPath,
  isDangerousProperty,
  joinPath,
  parsePath,
  setTokenAtPath,
} from "@upft/foundation";
export * from "./merge/index.js";
export * from "./operations.js";
export {
  buildPathIndex,
  getTokenFromIndex,
  type PathIndex,
} from "./path-index.js";
