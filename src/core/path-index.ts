import type { TokenDocument } from "../types.js";

/**
 * Path index for O(1) token lookups
 */
export interface PathIndex {
  /** Map from path to token value */
  tokens: Map<string, unknown>;
  /** Map from path to token type (if specified) */
  types: Map<string, string>;
  /** Set of all group paths */
  groups: Set<string>;
}

// Helper to index a token
function indexToken(
  tokens: Map<string, unknown>,
  types: Map<string, string>,
  path: string,
  obj: Record<string, unknown>,
  nodeType?: string,
): void {
  tokens.set(path, obj);
  if (nodeType) {
    types.set(path, nodeType);
  }
}

// Helper to index children of a group
function indexChildren(
  node: Record<string, unknown>,
  path: string,
  nodeType: string | undefined,
  indexFunc: (n: unknown, p: string, t?: string) => void,
): void {
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith("$")) {
      const childPath = path ? `${path}.${key}` : key;
      indexFunc(value, childPath, nodeType);
    }
  }
}

/**
 * Build an index from a token document for O(1) lookups
 */
export function buildPathIndex(document: TokenDocument): PathIndex {
  const tokens = new Map<string, unknown>();
  const types = new Map<string, string>();
  const groups = new Set<string>();

  function indexNode(
    node: unknown,
    path: string = "",
    inheritedType?: string,
  ): void {
    if (!node || typeof node !== "object") return;

    const obj = node as Record<string, unknown>;
    const nodeType = (obj.$type as string | undefined) || inheritedType;

    // Check if it's a token (has $value)
    if ("$value" in obj) {
      indexToken(tokens, types, path, obj, nodeType);
      return;
    }

    // It's a group
    if (path) {
      groups.add(path);
    }

    // Index children
    indexChildren(obj, path, nodeType, indexNode);
  }

  indexNode(document);
  return { tokens, types, groups };
}

/**
 * Get a token by path using the index
 */
export function getTokenFromIndex(
  index: PathIndex,
  path: string,
): unknown | undefined {
  return index.tokens.get(path);
}

/**
 * Check if a path exists in the index
 */
export function hasPath(index: PathIndex, path: string): boolean {
  return index.tokens.has(path) || index.groups.has(path);
}

/**
 * Get all token paths matching a prefix
 */
export function getPathsWithPrefix(index: PathIndex, prefix: string): string[] {
  const results: string[] = [];
  const prefixWithDot = prefix.endsWith(".") ? prefix : `${prefix}.`;

  // Check tokens
  for (const path of index.tokens.keys()) {
    if (path === prefix || path.startsWith(prefixWithDot)) {
      results.push(path);
    }
  }

  // Check groups
  for (const path of index.groups) {
    if (path === prefix || path.startsWith(prefixWithDot)) {
      results.push(path);
    }
  }

  return results;
}

/**
 * Get all tokens of a specific type
 */
export function getTokensByType(
  index: PathIndex,
  type: string,
): Array<[string, unknown]> {
  const results: Array<[string, unknown]> = [];

  for (const [path, tokenType] of index.types) {
    if (tokenType === type) {
      const token = index.tokens.get(path);
      if (token) {
        results.push([path, token]);
      }
    }
  }

  return results;
}

/**
 * Update the index with a new or modified token
 */
export function updateIndex(
  index: PathIndex,
  path: string,
  value: unknown,
  type?: string,
): void {
  const segments = path.split(".");

  // Add all parent paths as groups
  for (let i = 1; i < segments.length; i++) {
    const parentPath = segments.slice(0, i).join(".");
    index.groups.add(parentPath);
  }

  // Update token
  if (value && typeof value === "object" && "$value" in value) {
    index.tokens.set(path, value);
    if (type) {
      index.types.set(path, type);
    }
  } else {
    // It's a group
    index.groups.add(path);
  }
}

/**
 * Remove a path from the index
 */
export function removeFromIndex(index: PathIndex, path: string): void {
  index.tokens.delete(path);
  index.types.delete(path);
  index.groups.delete(path);

  // Also remove any children
  const prefixWithDot = `${path}.`;
  for (const tokenPath of index.tokens.keys()) {
    if (tokenPath.startsWith(prefixWithDot)) {
      index.tokens.delete(tokenPath);
      index.types.delete(tokenPath);
    }
  }
  for (const groupPath of index.groups) {
    if (groupPath.startsWith(prefixWithDot)) {
      index.groups.delete(groupPath);
    }
  }
}
