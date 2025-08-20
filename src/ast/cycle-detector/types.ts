/**
 * Types for cycle detection
 */

/**
 * Result of cycle detection
 */
export interface CycleDetectionResult {
  /** Whether any cycles were found */
  hasCycles: boolean;
  /** List of detected cycles */
  cycles: string[][];
  /** Tokens involved in cycles */
  cyclicTokens: Set<string>;
  /** Topological order (reverse of SCC completion order) - null if cycles exist */
  topologicalOrder: string[] | null;
}
