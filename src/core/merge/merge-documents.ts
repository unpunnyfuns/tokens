/**
 * Clean merge implementation without conflict tracking
 */

import type { TokenDocument } from "../../types.js";
import { getEffectiveType, isGroup, isToken } from "./guards.js";
import { deepMergeObjects, mergeValues } from "./merge-values.js";
import type { TokenValue } from "./types.js";

/**
 * Merge two token documents (assumes no conflicts)
 */
export function mergeDocuments(
  a: TokenDocument,
  b: TokenDocument,
): TokenDocument {
  return mergeNodes(a, b, undefined);
}

/**
 * Merge two nodes
 */
function mergeNodes(
  a: unknown,
  b: unknown,
  parentType: string | undefined,
): TokenDocument {
  // Handle nullish values
  if (!a || typeof a !== "object") {
    return !b || typeof b !== "object" ? {} : (b as TokenDocument);
  }
  if (!b || typeof b !== "object") {
    return a as TokenDocument;
  }

  const aIsToken = isToken(a);
  const bIsToken = isToken(b);
  const aIsGroup = isGroup(a);
  const bIsGroup = isGroup(b);

  // Merge tokens
  if (aIsToken && bIsToken) {
    return mergeTokenNodes(
      a as TokenValue,
      b as TokenValue,
      parentType,
    ) as TokenDocument;
  }

  // Merge groups
  if (aIsGroup && bIsGroup) {
    return mergeGroupNodes(a as TokenDocument, b as TokenDocument, parentType);
  }

  // For structure mismatches, b wins (we know from conflict detection this is intentional)
  return b as TokenDocument;
}

/**
 * Merge two token nodes
 */
function mergeTokenNodes(
  a: TokenValue,
  b: TokenValue,
  parentType: string | undefined,
): TokenValue {
  const aType = getEffectiveType(a, parentType);
  const bType = getEffectiveType(b, parentType);
  const effectiveType = bType || aType || parentType;

  const result: TokenValue = { ...a };

  for (const key in b) {
    if (key === "$value") {
      result.$value = mergeValues(a.$value, b.$value, effectiveType);
    } else if (key === "$extensions") {
      result.$extensions = mergeExtensions(a.$extensions, b.$extensions);
    } else {
      result[key] = b[key];
    }
  }

  return result;
}

/**
 * Merge two group nodes
 */
function mergeGroupNodes(
  a: TokenDocument,
  b: TokenDocument,
  parentType: string | undefined,
): TokenDocument {
  const result: TokenDocument = { ...a };

  // Determine effective type for this group
  const aType = (a.$type as string) || parentType;
  const bType = (b.$type as string) || aType;
  const effectiveType = bType;

  // Merge all keys from b
  for (const key in b) {
    if (key in result) {
      // Skip metadata - just take b's value
      if (key.startsWith("$")) {
        result[key] = b[key];
      } else {
        // Recursively merge nested nodes
        result[key] = mergeNodes(result[key], b[key], effectiveType);
      }
    } else {
      // New key from b
      result[key] = b[key];
    }
  }

  return result;
}

/**
 * Merge $extensions property
 */
function mergeExtensions(aExt: unknown, bExt: unknown): unknown {
  if (aExt && typeof aExt === "object" && bExt && typeof bExt === "object") {
    return deepMergeObjects(aExt as TokenValue, bExt as TokenValue);
  }
  return bExt || aExt;
}
