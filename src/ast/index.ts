/**
 * AST module - Functional API for token tree operations
 */

// AST building
export { createAST, loadAST } from "./ast-builder.js";

// Cycle detection
export { detectCycles } from "./cycle-detector/index.js";

// AST traversal
export {
  findNode,
  traverseAST,
  visitGroups,
  visitTokens,
} from "./ast-traverser.js";

// AST querying (functional API)
export {
  createReferenceGraph, // Renamed from buildReferenceGraph
  filterTokens,
  findAllTokens, // Renamed from getAllTokens
  findDependencies, // Renamed from getDependencies
  findDependents, // Renamed from getDependents
  findTokensByType, // Renamed from getTokensByType
  findTokensWithReferences, // Renamed from getTokensWithReferences
  findUnresolvedTokens, // Renamed from getUnresolvedTokens
  getGroup,
  getNode,
  getStatistics,
  getToken,
} from "./query.js";

// Reference resolution (using references module)
export {
  astToDocument,
  createASTReferenceGraph,
  resolveASTReferences,
} from "./resolver.js";

// Types
export type {
  ASTNode,
  ASTStatistics,
  GroupNode,
  ReferenceGraph,
  ResolutionError,
  TokenNode,
} from "./types.js";
