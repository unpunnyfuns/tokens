/**
 * @module core/utils
 * @description Utility functions for working with design tokens
 */

/**
 * Check if an object is a token leaf (has $value or $ref)
 */
export function isTokenLeaf(obj: unknown): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return "$value" in record || "$ref" in record;
}

/**
 * Check if a value contains a reference
 */
export function hasReference(value: unknown): boolean {
  if (typeof value === "object" && value !== null) {
    const valueObj = value as Record<string, unknown>;

    if ("$ref" in valueObj) {
      return true;
    }

    // Check nested objects
    for (const v of Object.values(valueObj)) {
      if (hasReference(v)) {
        return true;
      }
    }
  } else if (Array.isArray(value)) {
    // Check array elements
    for (const item of value) {
      if (hasReference(item)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract the first reference found in a value
 */
export function extractReference(value: unknown): string | null {
  if (typeof value === "object" && value !== null) {
    const valueObj = value as Record<string, unknown>;

    if ("$ref" in valueObj && typeof valueObj.$ref === "string") {
      return valueObj.$ref;
    }

    // Check nested objects
    for (const v of Object.values(valueObj)) {
      const ref = extractReference(v);
      if (ref) return ref;
    }
  } else if (Array.isArray(value)) {
    // Check array elements
    for (const item of value) {
      const ref = extractReference(item);
      if (ref) return ref;
    }
  }

  return null;
}

/**
 * Get statistics about tokens
 */
export interface TokenStats {
  totalTokens: number;
  totalGroups: number;
  tokensByType: Record<string, number>;
  tokensWithReferences: number;
  depth: number;
}

export function getTokenStats(tokens: Record<string, unknown>): TokenStats {
  const stats: TokenStats = {
    totalTokens: 0,
    totalGroups: 0,
    tokensByType: {},
    tokensWithReferences: 0,
    depth: 0,
  };

  function traverse(obj: Record<string, unknown>, currentDepth = 0): void {
    stats.depth = Math.max(stats.depth, currentDepth);

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$")) continue;

      if (isTokenLeaf(value)) {
        stats.totalTokens++;

        const token = value as Record<string, unknown>;
        if (token.$type) {
          const type = token.$type as string;
          stats.tokensByType[type] = (stats.tokensByType[type] || 0) + 1;
        }

        if (hasReference(token.$value)) {
          stats.tokensWithReferences++;
        }
      } else if (typeof value === "object" && value !== null) {
        stats.totalGroups++;
        traverse(value as Record<string, unknown>, currentDepth + 1);
      }
    }
  }

  traverse(tokens);
  return stats;
}
