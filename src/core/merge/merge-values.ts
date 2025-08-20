/**
 * Functions for merging token values
 */

import { getEffectiveType, isCompositeType } from "./guards.js";
import type { TokenValue } from "./types.js";
import { DTCGMergeError } from "./types.js";

/**
 * Deep merge two objects (for composite values)
 */
export function deepMergeObjects(a: TokenValue, b: TokenValue): TokenValue {
  const result = { ...a };

  for (const key in b) {
    if (key in result) {
      const aVal = result[key];
      const bVal = b[key];

      if (
        typeof aVal === "object" &&
        aVal !== null &&
        !Array.isArray(aVal) &&
        typeof bVal === "object" &&
        bVal !== null &&
        !Array.isArray(bVal)
      ) {
        result[key] = deepMergeObjects(aVal as TokenValue, bVal as TokenValue);
      } else {
        result[key] = bVal;
      }
    } else {
      result[key] = b[key];
    }
  }

  return result;
}

/**
 * Merge two token values based on their type
 */
export function mergeValues(
  a: unknown,
  b: unknown,
  type: string | undefined,
): unknown {
  // Simple replacement for non-composite types
  if (!isCompositeType(type)) {
    return b;
  }

  // Deep merge for composite types
  if (
    typeof a === "object" &&
    a !== null &&
    !Array.isArray(a) &&
    typeof b === "object" &&
    b !== null &&
    !Array.isArray(b)
  ) {
    return deepMergeObjects(a as TokenValue, b as TokenValue);
  }

  // Fallback to replacement
  return b;
}

/**
 * Merge two individual tokens
 */
export function mergeIndividualTokens(
  a: TokenValue,
  b: TokenValue,
  path: string,
  groupType?: string,
): TokenValue {
  const aType = getEffectiveType(a, groupType);
  const bType = getEffectiveType(b, groupType);

  // Type compatibility check
  if (aType && bType && aType !== bType) {
    throw new DTCGMergeError(
      `Type conflict: cannot merge token of type '${aType}' with type '${bType}'`,
      path,
    );
  }

  const effectiveType = bType || aType || groupType;

  // Start with a's properties
  const result: TokenValue = { ...a };

  // Merge b's properties
  for (const key in b) {
    if (key === "$value") {
      // Merge values based on type
      result.$value = mergeValues(a.$value, b.$value, effectiveType);
    } else if (key === "$extensions") {
      // Deep merge extensions
      if (
        a.$extensions &&
        typeof a.$extensions === "object" &&
        b.$extensions &&
        typeof b.$extensions === "object"
      ) {
        result.$extensions = deepMergeObjects(
          a.$extensions as TokenValue,
          b.$extensions as TokenValue,
        );
      } else {
        result[key] = b[key];
      }
    } else {
      // Other properties are replaced
      result[key] = b[key];
    }
  }

  return result;
}
