/**
 * Conflict detection for token merging
 */

import type { TokenDocument } from "../../types.js";
import { getEffectiveType, isGroup, isToken } from "./guards.js";
import type { MergeConflict, TokenValue } from "./types.js";

/**
 * Detect all conflicts between two token documents
 */
export function detectConflicts(
  a: TokenDocument,
  b: TokenDocument,
): MergeConflict[] {
  const conflicts: MergeConflict[] = [];
  detectNodeConflicts(a, b, "", undefined, conflicts);
  return conflicts;
}

/**
 * Recursively detect conflicts in nodes
 */
function detectNodeConflicts(
  a: unknown,
  b: unknown,
  path: string,
  parentType: string | undefined,
  conflicts: MergeConflict[],
): void {
  // Handle nullish values - no conflicts
  if (!a || typeof a !== "object" || !b || typeof b !== "object") {
    return;
  }

  const aIsToken = isToken(a);
  const bIsToken = isToken(b);
  const aIsGroup = isGroup(a);
  const bIsGroup = isGroup(b);

  // Token vs Token - check for type conflicts
  if (aIsToken && bIsToken) {
    detectTokenConflicts(
      a as TokenValue,
      b as TokenValue,
      path,
      parentType,
      conflicts,
    );
    return;
  }

  // Group vs Group - recurse into children
  if (aIsGroup && bIsGroup) {
    detectGroupConflicts(
      a as TokenDocument,
      b as TokenDocument,
      path,
      parentType,
      conflicts,
    );
    return;
  }

  // Structure mismatch - token vs group or group vs token
  if ((aIsToken && bIsGroup) || (aIsGroup && bIsToken)) {
    conflicts.push({
      path: path || "root",
      type: "group-token-conflict",
      leftValue: a,
      rightValue: b,
      resolution: "right",
      message: `Cannot merge ${aIsToken ? "token" : "group"} with ${bIsToken ? "token" : "group"}`,
    });
  }
}

/**
 * Detect conflicts between two tokens
 */
function detectTokenConflicts(
  a: TokenValue,
  b: TokenValue,
  path: string,
  parentType: string | undefined,
  conflicts: MergeConflict[],
): void {
  const aType = getEffectiveType(a, parentType);
  const bType = getEffectiveType(b, parentType);

  // Check for type mismatch
  if (aType && bType && aType !== bType) {
    conflicts.push({
      path,
      type: "type-mismatch",
      leftValue: aType,
      rightValue: bType,
      resolution: "right",
      message: `Type mismatch: '${aType}' vs '${bType}'`,
    });
  }
}

/**
 * Detect conflicts within groups
 */
function detectGroupConflicts(
  a: TokenDocument,
  b: TokenDocument,
  path: string,
  parentType: string | undefined,
  conflicts: MergeConflict[],
): void {
  // Determine effective type for this group
  const aType = (a.$type as string) || parentType;
  const bType = (b.$type as string) || aType;
  const effectiveType = bType;

  // Check all keys that exist in both
  for (const key in b) {
    if (key in a) {
      const currentPath = path ? `${path}.${key}` : key;

      // Skip metadata keys
      if (key.startsWith("$")) {
        continue;
      }

      detectNodeConflicts(
        a[key],
        b[key],
        currentPath,
        effectiveType,
        conflicts,
      );
    }
  }
}
