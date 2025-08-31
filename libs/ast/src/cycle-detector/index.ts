/**
 * Cycle detection for AST nodes
 *
 * This module provides utilities for detecting and analyzing reference cycles
 * using Tarjan's strongly connected components algorithm
 */

import { visitTokens } from "../ast-traverser.js";
import type { ASTNode } from "../types.js";
import { runTarjanAlgorithm } from "./tarjan-algorithm.js";
import type { CycleDetectionResult } from "./types.js";

/**
 * Build reference graph from AST
 */
function buildReferenceGraph(root: ASTNode): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  visitTokens(root, (token) => {
    if (token.references && token.references.length > 0) {
      // Normalize references by removing braces for cycle detection
      const normalizedReferences = token.references.map(
        (ref) => ref.replace(/^\{|\}$/g, ""), // Remove { and } from start/end
      );
      graph.set(token.path, normalizedReferences);
    }
    return true; // continue traversal
  });

  return graph;
}

/**
 * Detect reference cycles in an AST using Tarjan's algorithm
 *
 * Returns both cycle information and topological order:
 * - cycles: Array of detected cycles (empty if none)
 * - cyclicTokens: Set of all tokens involved in cycles
 * - topologicalOrder: Dependency order (null if cycles exist)
 */
export function detectCycles(root: ASTNode): CycleDetectionResult {
  const graph = buildReferenceGraph(root);
  return runTarjanAlgorithm(graph);
}

// Re-export types
export type { CycleDetectionResult } from "./types.js";
