/**
 * Functions for merging token groups
 */

import type { TokenDocument } from "@upft/foundation";
import { getGroupType, isGroup, isToken } from "./guards.js";
import { mergeIndividualTokens } from "./merge-values.js";
import type { TokenValue } from "./types.js";
import { DTCGMergeError } from "./types.js";

/**
 * Merge a single property within a group
 */
export function mergeGroupProperty(
  aVal: unknown,
  bVal: unknown,
  key: string,
  path: string,
  groupType?: string,
): unknown {
  // Both are tokens
  if (isToken(aVal) && isToken(bVal)) {
    return mergeIndividualTokens(
      aVal as TokenValue,
      bVal as TokenValue,
      path,
      groupType,
    );
  }

  // Both are groups
  if (isGroup(aVal) && isGroup(bVal)) {
    return mergeGroups(
      aVal as TokenDocument,
      bVal as TokenDocument,
      path,
      groupType,
    );
  }

  // Type mismatch: token vs group
  if (isToken(aVal) && isGroup(bVal)) {
    throw new DTCGMergeError(`Cannot merge token with group at '${key}'`, path);
  }

  if (isGroup(aVal) && isToken(bVal)) {
    throw new DTCGMergeError(`Cannot merge group with token at '${key}'`, path);
  }

  // For metadata properties, b wins
  return bVal;
}

/**
 * Merge two token groups
 */
export function mergeGroups(
  a: TokenDocument,
  b: TokenDocument,
  path = "",
  parentType?: string,
): TokenDocument {
  const result: TokenDocument = { ...a };

  // Determine the effective type for this group
  const aType = getGroupType(a as TokenValue, parentType);
  const bType = getGroupType(b as TokenValue, parentType);
  const effectiveType = bType || aType || parentType;

  // Process all keys from b
  for (const key in b) {
    const currentPath = path ? `${path}.${key}` : key;

    if (key in result) {
      // Merge existing properties
      (result as Record<string, unknown>)[key] = mergeGroupProperty(
        result[key],
        b[key],
        key,
        currentPath,
        effectiveType,
      );
    } else {
      // Add new properties
      result[key] = b[key];
    }
  }

  return result;
}
