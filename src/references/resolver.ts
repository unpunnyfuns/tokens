/**
 * Reference resolver exports
 *
 * This module has been refactored into focused sub-modules for better maintainability
 */

export {
  buildDependencyGraph,
  extractReference,
  getAllReferences,
  // Functions
  hasReferences,
  normalizeReference,
  type ResolutionError,
  // Types
  type ResolveOptions,
  type ResolveResult,
  resolveReferences,
} from "./resolver/index.js";
