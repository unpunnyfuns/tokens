/**
 * @module core/ast-metadata
 * @description Pass 5: Calculate metadata and statistics
 */

import type { EnhancedAST } from "./ast-types.ts";

/**
 * Pass 5: Calculate metadata and statistics
 */
export function pass5_calculateMetadata(ast: EnhancedAST): void {
  // Calculate reference depth for each token
  const depthCache = new Map<string, number>();

  function calculateDepth(
    tokenPath: string,
    visited = new Set<string>(),
  ): number {
    if (visited.has(tokenPath)) return -1; // Circular reference
    visited.add(tokenPath);

    const cachedDepth = depthCache.get(tokenPath);
    if (cachedDepth !== undefined) {
      return cachedDepth;
    }

    const token = ast.tokenMap.get(tokenPath);
    if (!token) return -1;

    if (!token.hasReference) {
      // Base case: non-reference token has depth 0
      token.referenceDepth = 0;
      depthCache.set(tokenPath, 0);
      return 0;
    }

    // Find the reference
    const ref = ast.references.find((r) => r.from === tokenPath && r.isValid);
    if (!ref?.resolvedPath) {
      token.referenceDepth = -1;
      depthCache.set(tokenPath, -1);
      return -1;
    }

    // Calculate depth recursively
    const targetDepth = calculateDepth(ref.resolvedPath, visited);
    const depth = targetDepth >= 0 ? targetDepth + 1 : -1;
    token.referenceDepth = depth;
    depthCache.set(tokenPath, depth);

    // Update max depth stat
    if (depth > ast.stats.maxReferenceDepth) {
      ast.stats.maxReferenceDepth = depth;
    }

    return depth;
  }

  // Calculate depth for all tokens
  for (const token of ast.tokens) {
    calculateDepth(token.path);
  }

  // Add warnings for deep reference chains
  for (const token of ast.tokens) {
    if (token.referenceDepth > 3) {
      if (!token.warnings) token.warnings = [];
      token.warnings.push(
        `Deep reference chain (${token.referenceDepth} levels)`,
      );
    }
  }
}
