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
 * Merge two token values based on their type
 */
function mergeTokenValues(
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
 * Merge two tokens
 */
function mergeTokens(
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
      result.$value = mergeTokenValues(a.$value, b.$value, effectiveType);
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
 */
export function dtcgMerge(a: TokenDocument, b: TokenDocument): TokenDocument {
  function mergeRecursive(
    aNode: unknown,
    bNode: unknown,
    path: string = "",
    inheritedType?: string,
  ): unknown {
    // Handle null/undefined
    if (!bNode) return aNode;
    if (!aNode) return bNode;

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
      return mergeTokens(
        aNode as TokenValue,
        bNode as TokenValue,
        path,
        inheritedType,
      );
    }

    // Both are groups - delegate to separate function
    return mergeGroups(
      aNode as TokenValue,
      bNode as TokenValue,
      path,
      inheritedType,
      mergeRecursive,
    );
  }

  return mergeRecursive(a, b) as TokenDocument;
}
