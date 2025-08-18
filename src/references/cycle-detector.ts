import type { TokenDocument } from "../types.js";
import { getAllReferences } from "./resolver.js";

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
}

/**
 * Detect reference cycles in a token document using Tarjan's algorithm
 */
export function detectCycles(document: TokenDocument): CycleDetectionResult {
  const references = getAllReferences(document);
  const cycles: string[][] = [];
  const cyclicTokens = new Set<string>();

  // Build adjacency list
  const graph = new Map<string, string[]>();
  for (const [from, refs] of references) {
    graph.set(from, refs);
  }

  // Tarjan's strongly connected components algorithm
  let index = 0;
  const stack: string[] = [];
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();

  // Helper to extract component from stack
  function extractComponent(node: string): string[] {
    const component: string[] = [];
    let w: string | undefined;
    do {
      w = stack.pop();
      if (w) {
        onStack.delete(w);
        component.push(w);
      }
    } while (w && w !== node);
    return component;
  }

  // Helper to report cycle
  function reportCycle(component: string[]): void {
    cycles.push(component.reverse());
    for (const token of component) {
      cyclicTokens.add(token);
    }
  }

  // Helper to process an SCC component
  function processSCC(node: string): void {
    const component = extractComponent(node);

    if (component.length > 1) {
      reportCycle(component);
    } else if (component.length === 1) {
      // Check for self-reference
      const firstElement = component[0];
      if (firstElement) {
        const refs = graph.get(firstElement) || [];
        if (refs.includes(firstElement)) {
          cycles.push([firstElement]);
          cyclicTokens.add(firstElement);
        }
      }
    }
  }

  // Helper to visit a neighbor
  function visitNeighbor(node: string, neighbor: string): void {
    if (!indices.has(neighbor)) {
      strongConnect(neighbor);
      const nodeLow = lowlinks.get(node) ?? 0;
      const neighborLow = lowlinks.get(neighbor) ?? 0;
      lowlinks.set(node, Math.min(nodeLow, neighborLow));
    } else if (onStack.has(neighbor)) {
      const nodeLow = lowlinks.get(node) ?? 0;
      const neighborIdx = indices.get(neighbor) ?? 0;
      lowlinks.set(node, Math.min(nodeLow, neighborIdx));
    }
  }

  function strongConnect(node: string): void {
    indices.set(node, index);
    lowlinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);

    // Visit neighbors
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      visitNeighbor(node, neighbor);
    }

    // Found SCC root
    if (lowlinks.get(node) === indices.get(node)) {
      processSCC(node);
    }
  }

  // Run algorithm on all unvisited nodes
  for (const node of graph.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
    cyclicTokens,
  };
}

// Helper to check if we found a cycle
function checkForCycle(
  ref: string,
  startToken: string,
  path: string[],
): string[] | null {
  if (ref === startToken) {
    return [...path, startToken];
  }
  return null;
}

// Helper to process BFS queue item
function processBFSItem(
  node: string,
  path: string[],
  startToken: string,
  references: Map<string, string[]>,
  queue: Array<{ node: string; path: string[] }>,
  visited: Set<string>,
): string[] | null {
  if (visited.has(node) && node !== startToken) {
    return null;
  }

  const refs = references.get(node) || [];
  for (const ref of refs) {
    const cycle = checkForCycle(ref, startToken, path);
    if (cycle) {
      return cycle;
    }

    if (!path.includes(ref)) {
      queue.push({ node: ref, path: [...path, ref] });
    }
  }

  if (node !== startToken) {
    visited.add(node);
  }
  return null;
}

/**
 * Find the shortest cycle containing a given token
 */
export function findShortestCycle(
  document: TokenDocument,
  startToken: string,
): string[] | null {
  const references = getAllReferences(document);
  const queue: Array<{ node: string; path: string[] }> = [
    { node: startToken, path: [startToken] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const result = processBFSItem(
      item.node,
      item.path,
      startToken,
      references,
      queue,
      visited,
    );

    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Check if adding a reference would create a cycle
 */
export function wouldCreateCycle(
  document: TokenDocument,
  fromToken: string,
  toToken: string,
): boolean {
  const references = getAllReferences(document);

  // Check if there's already a path from toToken to fromToken
  const visited = new Set<string>();
  const queue = [toToken];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current === fromToken) {
      return true; // Would create cycle
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const refs = references.get(current) || [];
    queue.push(...refs);
  }

  return false;
}

// Helper to build graph data for topological sort
function buildTopologicalData(references: Map<string, string[]>): {
  allTokens: Set<string>;
  inDegree: Map<string, number>;
  dependents: Map<string, Set<string>>;
} {
  const allTokens = new Set<string>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();

  // Collect tokens and build dependency maps
  for (const [from, refs] of references) {
    allTokens.add(from);
    if (!inDegree.has(from)) {
      inDegree.set(from, 0);
    }

    for (const ref of refs) {
      allTokens.add(ref);
      if (!inDegree.has(ref)) {
        inDegree.set(ref, 0);
      }

      if (!dependents.has(ref)) {
        dependents.set(ref, new Set());
      }
      dependents.get(ref)?.add(from);
    }
  }

  // Calculate in-degrees
  for (const [from, refs] of references) {
    inDegree.set(from, (inDegree.get(from) ?? 0) + refs.length);
  }

  return { allTokens, inDegree, dependents };
}

// Helper to initialize queue with zero-degree nodes
function initializeQueue(inDegree: Map<string, number>): string[] {
  const queue: string[] = [];
  for (const [token, degree] of inDegree) {
    if (degree === 0) {
      queue.push(token);
    }
  }
  return queue;
}

// Helper to process dependencies
function processDependencies(
  current: string,
  dependents: Map<string, Set<string>>,
  inDegree: Map<string, number>,
  queue: string[],
): void {
  const deps = dependents.get(current);
  if (!deps) return;

  for (const dependent of deps) {
    const degree = (inDegree.get(dependent) ?? 0) - 1;
    inDegree.set(dependent, degree);
    if (degree === 0) {
      queue.push(dependent);
    }
  }
}

// Helper to run Kahn's algorithm
function runKahnsAlgorithm(
  allTokens: Set<string>,
  inDegree: Map<string, number>,
  dependents: Map<string, Set<string>>,
): string[] | null {
  const result: string[] = [];
  const queue = initializeQueue(inDegree);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    result.push(current);
    processDependencies(current, dependents, inDegree, queue);
  }

  return result.length === allTokens.size ? result : null;
}

/**
 * Get topological sort of tokens (respecting dependencies)
 * Returns null if cycles exist
 */
export function getTopologicalSort(document: TokenDocument): string[] | null {
  const references = getAllReferences(document);
  const { hasCycles } = detectCycles(document);

  if (hasCycles) {
    return null;
  }

  // If no references, return empty array (all tokens are independent)
  if (references.size === 0) {
    return [];
  }

  const { allTokens, inDegree, dependents } = buildTopologicalData(references);
  return runKahnsAlgorithm(allTokens, inDegree, dependents);
}
