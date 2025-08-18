import type { TokenDocument } from "../types.js";

// Type for token/group values
type TokenValue = Record<string, unknown>;

// Composite types that support deep merging of $value
const COMPOSITE_TYPES = new Set([
  "shadow",
  "typography",
  "border",
  "transition",
  "gradient",
  "strokeStyle",
]);

export class DTCGMergeError extends Error {
  constructor(
    message: string,
    public path: string,
  ) {
    super(`${message} at path: ${path}`);
    this.name = "DTCGMergeError";
  }
}

/**
 * Check if an object is a token (has $value property)
 */
function isToken(obj: unknown): boolean {
  return obj !== null && typeof obj === "object" && "$value" in obj;
}

/**
 * Check if an object is a group (has nested properties but no $value)
 */
function isGroup(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  if ("$value" in obj) return false;

  // Has at least one non-$ property
  return Object.keys(obj as Record<string, unknown>).some(
    (key) => !key.startsWith("$"),
  );
}

/**
 * Get the effective type of a token, considering inheritance
 */
function getEffectiveType(
  token: TokenValue,
  inheritedType?: string,
): string | undefined {
  return (token.$type as string | undefined) || inheritedType;
}

/**
 * Check if a type is composite (supports deep value merging)
 */
function isCompositeType(type: string | undefined): boolean {
  return type ? COMPOSITE_TYPES.has(type) : false;
}

/**
 * Deep merge two objects (for $extensions and composite values)
 */
function deepMergeObjects(a: TokenValue, b: TokenValue): TokenValue {
  const result = { ...a };

  for (const key in b) {
    if (Object.hasOwn(b, key)) {
      if (
        result[key] &&
        typeof result[key] === "object" &&
        typeof b[key] === "object" &&
        !Array.isArray(b[key]) &&
        b[key] !== null &&
        result[key] !== null
      ) {
        result[key] = deepMergeObjects(
          result[key] as TokenValue,
          b[key] as TokenValue,
        );
      } else {
        result[key] = b[key];
      }
    }
  }

  return result;
}

/**
 * Merge two token $values based on their type
 */
function mergeValues(
  aValue: unknown,
  bValue: unknown,
  type: string | undefined,
): unknown {
  // For composite types, deep merge the values
  if (
    isCompositeType(type) &&
    typeof aValue === "object" &&
    typeof bValue === "object" &&
    !Array.isArray(aValue) &&
    !Array.isArray(bValue) &&
    aValue !== null &&
    bValue !== null
  ) {
    return deepMergeObjects(aValue as TokenValue, bValue as TokenValue);
  }

  // For simple types, b overwrites a
  return bValue;
}

/**
 * Merge two individual tokens
 */
function mergeIndividualTokens(
  a: TokenValue,
  b: TokenValue,
  path: string,
  inheritedType?: string,
): TokenValue {
  const aType = getEffectiveType(a, inheritedType);
  const bType = getEffectiveType(b, inheritedType);

  // Check for type conflicts
  if (a.$type && b.$type && a.$type !== b.$type) {
    throw new DTCGMergeError(
      `Type conflict: cannot merge token with type "${a.$type}" and "${b.$type}"`,
      path,
    );
  }

  const effectiveType = bType || aType;
  const result: TokenValue = { ...a } as TokenValue;

  // Merge each property
  for (const key in b) {
    if (key === "$value") {
      result.$value = mergeValues(a.$value, b.$value, effectiveType);
    } else if (key === "$extensions") {
      const aExtensions = (a.$extensions || {}) as TokenValue;
      const bExtensions = b.$extensions as TokenValue;
      result.$extensions = deepMergeObjects(aExtensions, bExtensions);
    } else {
      // For other properties ($type, $description, etc.), last wins
      result[key] = b[key];
    }
  }

  return result;
}

/**
 * Check and get group type with conflict detection
 */
function getGroupType(
  aNode: TokenValue,
  bNode: TokenValue,
  path: string,
  inheritedType?: string,
): string | undefined {
  const aType = aNode.$type as string | undefined;
  const bType = bNode.$type as string | undefined;

  if (aType && bType && aType !== bType) {
    throw new DTCGMergeError(
      `Type conflict at group level: cannot merge "${aType}" and "${bType}"`,
      path,
    );
  }

  return bType || aType || inheritedType;
}

/**
 * Merge a single property in a group
 */
function mergeGroupProperty(
  key: string,
  aNode: TokenValue,
  bNode: TokenValue,
  result: TokenValue,
  groupType: string | undefined,
  path: string,
  mergeRecursive: (a: unknown, b: unknown, p: string, t?: string) => unknown,
): void {
  const childPath = path ? `${path}.${key}` : key;

  if (key === "$type") {
    result.$type = bNode.$type !== undefined ? bNode.$type : aNode.$type;
  } else if (key.startsWith("$")) {
    result[key] = bNode[key] !== undefined ? bNode[key] : aNode[key];
  } else {
    result[key] = mergeRecursive(aNode[key], bNode[key], childPath, groupType);
  }
}

/**
 * Handle merging of group nodes
 */
function mergeGroups(
  aNode: TokenValue,
  bNode: TokenValue,
  path: string,
  inheritedType: string | undefined,
  mergeRecursive: (a: unknown, b: unknown, p: string, t?: string) => unknown,
): TokenValue {
  const result: TokenValue = {};
  const allKeys = new Set([...Object.keys(aNode), ...Object.keys(bNode)]);
  const groupType = getGroupType(aNode, bNode, path, inheritedType);

  for (const key of allKeys) {
    mergeGroupProperty(
      key,
      aNode,
      bNode,
      result,
      groupType,
      path,
      mergeRecursive,
    );
  }

  return result;
}

/**
 * DTCG-aware merge of two token documents
 * Now safe by default - returns merged result without throwing
 * To get conflict information, use the merge() function directly
 */
export function mergeTokens(a: TokenDocument, b: TokenDocument): TokenDocument {
  // Use the new merge function in safe mode, but only return the tokens
  const result = merge(a, b, { safe: true }) as MergeResult;
  return result.tokens;
}

// DEPRECATED: mergeTokensPartial and MergePartialOptions have been removed.
// Use merge() with include/exclude/types options instead:
//   merge(a, b, { include: [...], exclude: [...], types: [...], safe: true })

/**
 * Result of a safe merge operation
 */
export interface MergeResult {
  /** The merged token document */
  tokens: TokenDocument;
  /** Any conflicts that were encountered */
  conflicts: MergeConflict[];
  /** Whether the merge completed without conflicts */
  success: boolean;
}

/**
 * Describes a merge conflict
 */
export interface MergeConflict {
  /** Path where the conflict occurred */
  path: string;
  /** Type of conflict */
  type: "type-mismatch" | "token-vs-group" | "group-vs-token";
  /** Values involved in the conflict */
  left: unknown;
  right: unknown;
  /** Resolution that was applied */
  resolution: "left" | "right" | "error";
}

/**
 * Safely merge token documents without throwing errors
 * Returns the merged result and a list of conflicts
 */
// Helper functions for mergeTokensSafe
function handleTokenVsGroup(
  aNode: unknown,
  bNode: unknown,
  path: string,
  preferRight: boolean,
  conflicts: MergeConflict[],
): unknown {
  conflicts.push({
    path,
    type: "token-vs-group",
    left: aNode,
    right: bNode,
    resolution: preferRight ? "right" : "left",
  });
  return preferRight ? bNode : aNode;
}

function handleGroupVsToken(
  aNode: unknown,
  bNode: unknown,
  path: string,
  preferRight: boolean,
  conflicts: MergeConflict[],
): unknown {
  conflicts.push({
    path,
    type: "group-vs-token",
    left: aNode,
    right: bNode,
    resolution: preferRight ? "right" : "left",
  });
  return preferRight ? bNode : aNode;
}

function handleTokenMerge(
  aToken: TokenValue,
  bToken: TokenValue,
  path: string,
  inheritedType: string | undefined,
  preferRight: boolean,
  conflicts: MergeConflict[],
): unknown {
  try {
    return mergeIndividualTokens(aToken, bToken, path, inheritedType);
  } catch (error) {
    if (error instanceof DTCGMergeError) {
      conflicts.push({
        path,
        type: "type-mismatch",
        left: aToken,
        right: bToken,
        resolution: preferRight ? "right" : "left",
      });
      return preferRight ? bToken : aToken;
    }
    throw error;
  }
}

function processGroupKey(
  key: string,
  aGroup: TokenValue,
  bGroup: TokenValue,
  result: TokenValue,
  path: string,
  groupType: string | undefined,
  mergeFunc: (a: unknown, b: unknown, p: string, t?: string) => unknown,
): void {
  const childPath = path ? `${path}.${key}` : key;

  if (key === "$type") {
    result.$type = bGroup.$type !== undefined ? bGroup.$type : aGroup.$type;
  } else if (key.startsWith("$")) {
    result[key] = bGroup[key] !== undefined ? bGroup[key] : aGroup[key];
  } else {
    result[key] = mergeFunc(aGroup[key], bGroup[key], childPath, groupType);
  }
}

function handleGroupMerge(
  aGroup: TokenValue,
  bGroup: TokenValue,
  path: string,
  inheritedType: string | undefined,
  preferRight: boolean,
  conflicts: MergeConflict[],
  mergeFunc: (a: unknown, b: unknown, p: string, t?: string) => unknown,
): TokenValue {
  const result: TokenValue = {};
  const allKeys = new Set([...Object.keys(aGroup), ...Object.keys(bGroup)]);

  // Check for type conflicts at group level
  const aType = aGroup.$type as string | undefined;
  const bType = bGroup.$type as string | undefined;

  if (aType && bType && aType !== bType) {
    conflicts.push({
      path,
      type: "type-mismatch",
      left: aGroup,
      right: bGroup,
      resolution: preferRight ? "right" : "left",
    });
  }

  const groupType = bType || aType || inheritedType;

  for (const key of allKeys) {
    processGroupKey(key, aGroup, bGroup, result, path, groupType, mergeFunc);
  }

  return result;
}

// Helper to determine node type and handle merge
function handleNodeMerge(
  aNode: unknown,
  bNode: unknown,
  path: string,
  inheritedType: string | undefined,
  preferRight: boolean,
  conflicts: MergeConflict[],
  mergeFunc: (a: unknown, b: unknown, p: string, t?: string) => unknown,
): unknown {
  const aIsToken = isToken(aNode);
  const bIsToken = isToken(bNode);
  const aIsGroup = isGroup(aNode);
  const bIsGroup = isGroup(bNode);

  // Conflict: token vs group
  if (aIsToken && bIsGroup) {
    return handleTokenVsGroup(aNode, bNode, path, preferRight, conflicts);
  }

  // Conflict: group vs token
  if (aIsGroup && bIsToken) {
    return handleGroupVsToken(aNode, bNode, path, preferRight, conflicts);
  }

  // Both tokens
  if (aIsToken && bIsToken) {
    return handleTokenMerge(
      aNode as TokenValue,
      bNode as TokenValue,
      path,
      inheritedType,
      preferRight,
      conflicts,
    );
  }

  // Both groups
  if (aIsGroup && bIsGroup) {
    return handleGroupMerge(
      aNode as TokenValue,
      bNode as TokenValue,
      path,
      inheritedType,
      preferRight,
      conflicts,
      mergeFunc,
    );
  }

  // Fallback
  return preferRight ? bNode : aNode;
}

// DEPRECATED: mergeTokensSafe has been removed.
// Use merge() with { safe: true } (which is the default):
//   merge(a, b, { preferRight: true, safe: true })

/**
 * Unified merge options
 */
export interface MergeTokensOptions {
  /** Paths to include in the merge (if not specified, all paths are included) */
  include?: string[];
  /** Paths to exclude from the merge */
  exclude?: string[];
  /** Whether to merge only tokens of specific types */
  types?: string[];
  /** When true, prefer right side in conflicts (default: true) */
  preferRight?: boolean;
  /** When true, return MergeResult with conflicts; when false, throw on conflicts (default: true for safe behavior) */
  safe?: boolean;
}

/**
 * Unified DTCG-aware merge function
 * By default, safely merges and returns conflicts without throwing
 */
export function merge(
  a: TokenDocument,
  b: TokenDocument,
  options: MergeTokensOptions = {},
): TokenDocument | MergeResult {
  const { include, exclude, types, preferRight = true, safe = true } = options;

  const conflicts: MergeConflict[] = [];

  // Helper to check if a path should be included
  function shouldIncludePath(path: string): boolean {
    if (exclude?.some((p) => path.startsWith(p))) {
      return false;
    }
    if (include && include.length > 0) {
      return include.some((p) => path.startsWith(p));
    }
    return true;
  }

  // Helper to check if a token type should be included
  function shouldIncludeType(token: TokenValue): boolean {
    if (!types || types.length === 0) return true;
    const tokenType = getEffectiveType(token, undefined);
    return tokenType ? types.includes(tokenType) : false;
  }

  function handleUnsafeMerge(
    aNode: unknown,
    bNode: unknown,
    path: string,
    inheritedType?: string,
  ): unknown {
    const aIsToken = isToken(aNode);
    const bIsToken = isToken(bNode);
    const aIsGroup = isGroup(aNode);
    const bIsGroup = isGroup(bNode);

    // Check for token/group conflicts
    if (aIsToken && bIsGroup) {
      throw new DTCGMergeError("Cannot merge group into token", path);
    }
    if (aIsGroup && bIsToken) {
      throw new DTCGMergeError("Cannot merge token into group", path);
    }

    // Both are tokens
    if (aIsToken && bIsToken) {
      // Check type filter
      if (!shouldIncludeType(bNode as TokenValue)) {
        return aNode;
      }
      return mergeIndividualTokens(
        aNode as TokenValue,
        bNode as TokenValue,
        path,
        inheritedType,
      );
    }

    // Both are groups
    return mergeGroups(
      aNode as TokenValue,
      bNode as TokenValue,
      path,
      inheritedType,
      mergeRecursive,
    );
  }

  function mergeRecursive(
    aNode: unknown,
    bNode: unknown,
    path: string = "",
    inheritedType?: string,
  ): unknown {
    // Skip if path should be excluded
    if (!shouldIncludePath(path)) {
      return aNode;
    }

    // Handle null/undefined
    if (!bNode) return aNode;
    if (!aNode) return bNode;

    // Handle empty objects - if b is empty, return a
    if (
      typeof bNode === "object" &&
      Object.keys(bNode as object).length === 0
    ) {
      return aNode;
    }

    // For safe mode, use conflict tracking
    if (safe) {
      return handleNodeMerge(
        aNode,
        bNode,
        path,
        inheritedType,
        preferRight,
        conflicts,
        mergeRecursive,
      );
    }

    // For unsafe mode, throw on conflicts
    return handleUnsafeMerge(aNode, bNode, path, inheritedType);
  }

  const tokens = mergeRecursive(a, b) as TokenDocument;

  if (safe) {
    return {
      tokens,
      conflicts,
      success: conflicts.length === 0,
    };
  }

  return tokens;
}
