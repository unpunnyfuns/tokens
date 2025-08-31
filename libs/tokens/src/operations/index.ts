/**
 * Token operations
 */

export * from "./merge/index.js";
export * from "./operations.js";
// Re-export path utilities from foundation to maintain API compatibility
export {
  parsePath,
  joinPath,
  getParentPath,
  getTokenAtPath,
  setTokenAtPath,
  deleteTokenAtPath,
  isDangerousProperty,
  convertDTCGToJSONPath,
  convertJSONPathToDTCG,
} from "@upft/foundation";
export {
  buildPathIndex,
  getTokenFromIndex,
  type PathIndex,
} from "./path-index.js";
