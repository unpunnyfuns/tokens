/**
 * Reference resolution functionality
 *
 * This module provides utilities for resolving token references in DTCG documents
 */

// Re-export dependency graph functions
export {
  buildDependencyGraph,
  getAllReferences,
} from "./dependency-graph.js";

// Re-export utilities
export {
  extractReference,
  hasReferences,
  normalizeReference,
} from "./reference-utils.js";
// Re-export main resolution function
export { resolveReferences } from "./resolve-engine.js";
// Re-export types
export type {
  ResolutionError,
  ResolveOptions,
  ResolveResult,
} from "./types.js";
