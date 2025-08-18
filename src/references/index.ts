/**
 * References module - Standalone reference resolution and cycle detection
 */

// Cycle detection
export {
  type CycleDetectionResult,
  detectCycles,
  findShortestCycle,
  getTopologicalSort,
  wouldCreateCycle,
} from "./cycle-detector.js";
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
