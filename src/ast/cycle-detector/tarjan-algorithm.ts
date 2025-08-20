/**
 * Tarjan's strongly connected components algorithm for cycle detection
 */

import type { CycleDetectionResult } from "./types.js";

/**
 * Extract component from stack
 */
function extractComponent(
  node: string,
  stack: string[],
  onStack: Set<string>,
): string[] {
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

/**
 * Report a cycle
 */
function reportCycle(
  component: string[],
  cycles: string[][],
  cyclicTokens: Set<string>,
): void {
  cycles.push(component.reverse());
  for (const token of component) {
    cyclicTokens.add(token);
  }
}

/**
 * Process a strongly connected component
 */
function processSCC(
  node: string,
  stack: string[],
  onStack: Set<string>,
  graph: Map<string, string[]>,
  cycles: string[][],
  cyclicTokens: Set<string>,
  topologicalOrder: string[],
): void {
  const component = extractComponent(node, stack, onStack);

  if (component.length > 1) {
    reportCycle(component, cycles, cyclicTokens);
  } else if (component.length === 1) {
    const firstElement = component[0];
    if (firstElement) {
      // Check for self-reference
      const refs = graph.get(firstElement) || [];
      if (refs.includes(firstElement)) {
        cycles.push([firstElement]);
        cyclicTokens.add(firstElement);
      } else {
        // Single node with no self-reference - add to topological order
        topologicalOrder.push(firstElement);
      }
    }
  }
}

/**
 * Visit a neighbor in Tarjan's algorithm
 */
function visitNeighbor(
  node: string,
  neighbor: string,
  indices: Map<string, number>,
  lowlinks: Map<string, number>,
  onStack: Set<string>,
  strongConnect: (node: string) => void,
): void {
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

/**
 * Run Tarjan's algorithm to detect cycles and compute topological order
 */
export function runTarjanAlgorithm(
  graph: Map<string, string[]>,
): CycleDetectionResult {
  const cycles: string[][] = [];
  const cyclicTokens = new Set<string>();
  const topologicalOrder: string[] = [];

  // Collect all nodes (including those that are referenced but not in the graph)
  const allNodes = new Set<string>();
  for (const [from, refs] of graph) {
    allNodes.add(from);
    for (const ref of refs) {
      allNodes.add(ref);
    }
  }

  let index = 0;
  const stack: string[] = [];
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();

  function strongConnect(node: string): void {
    indices.set(node, index);
    lowlinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);

    // Visit neighbors
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      visitNeighbor(node, neighbor, indices, lowlinks, onStack, strongConnect);
    }

    // Found SCC root
    if (lowlinks.get(node) === indices.get(node)) {
      processSCC(
        node,
        stack,
        onStack,
        graph,
        cycles,
        cyclicTokens,
        topologicalOrder,
      );
    }
  }

  // Run algorithm on all nodes (including those only referenced)
  for (const node of allNodes) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  // Tarjan's already produces the correct topological order
  // (nodes with no dependencies come first)
  const hasCycles = cycles.length > 0;

  return {
    hasCycles,
    cycles,
    cyclicTokens,
    topologicalOrder: hasCycles ? null : topologicalOrder,
  };
}
