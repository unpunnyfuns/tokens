/**
 * References module - Standalone reference resolution
 */

// Reference resolution
export {
  buildDependencyGraph,
  extractReference,
  getAllReferences,
  hasReferences,
  normalizeReference,
  type ResolutionError,
  type ResolveOptions,
  type ResolveResult,
  resolveReferences,
} from "./resolver.js";
