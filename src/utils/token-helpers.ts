/**
 * Common token manipulation utilities
 */

import type { TokenDocument, TokenValue } from "../types.js";

/**
 * Count total tokens in a document
 */
export function countTokens(obj: unknown): number {
  let count = 0;
  if (typeof obj === "object" && obj !== null) {
    for (const value of Object.values(obj)) {
      if (typeof value === "object" && value !== null && "$value" in value) {
        count++;
      } else if (typeof value === "object") {
        count += countTokens(value);
      }
    }
  }
  return count;
}

/**
 * Extract all token paths from a document
 */
export function extractTokenPaths(doc: TokenDocument, prefix = ""): string[] {
  const paths: string[] = [];

  function traverse(obj: unknown, currentPath: string) {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      const path = currentPath ? `${currentPath}.${key}` : key;

      if (value && typeof value === "object" && "$value" in value) {
        paths.push(path);
      } else if (typeof value === "object") {
        traverse(value, path);
      }
    }
  }

  traverse(doc, prefix);
  return paths;
}

/**
 * Get token value by path
 */
export function getTokenByPath(
  doc: TokenDocument,
  path: string,
): TokenValue | undefined {
  const parts = path.split(".");
  let current: unknown = doc;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as TokenValue | undefined;
}

/**
 * Set token value by path
 */
export function setTokenByPath(
  doc: TokenDocument,
  path: string,
  value: TokenValue,
): TokenDocument {
  const parts = path.split(".");
  const result = JSON.parse(JSON.stringify(doc)); // Deep clone
  let current: unknown = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const curr = current as Record<string, unknown>;
    if (part && (!curr[part] || typeof curr[part] !== "object")) {
      curr[part] = {};
    }
    if (part) {
      current = curr[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    (current as Record<string, unknown>)[lastPart] = value;
  }
  return result;
}

/**
 * Filter tokens by type
 */
export function filterTokensByType(
  doc: TokenDocument,
  type: string,
): Record<string, TokenValue> {
  const result: Record<string, TokenValue> = {};

  function traverse(obj: unknown, path: string) {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (
        value &&
        typeof value === "object" &&
        "$type" in value &&
        value.$type === type
      ) {
        result[currentPath] = value as TokenValue;
      } else if (typeof value === "object") {
        traverse(value, currentPath);
      }
    }
  }

  traverse(doc, "");
  return result;
}

/**
 * Merge token documents (right wins on conflicts)
 */
export function mergeTokenDocuments(...docs: TokenDocument[]): TokenDocument {
  if (docs.length === 0) return {};
  if (docs.length === 1) return docs[0] || {};

  return docs.reduce((merged, doc) => {
    return deepMerge(merged, doc) as TokenDocument;
  }, {} as TokenDocument);
}

/**
 * Deep merge objects
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (!source || typeof source !== "object") return source;
  if (!target || typeof target !== "object") return source;

  const result = { ...(target as Record<string, unknown>) };
  const sourceObj = source as Record<string, unknown>;
  const targetObj = target as Record<string, unknown>;

  for (const key in sourceObj) {
    const sourceValue = sourceObj[key];
    const targetValue = targetObj[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      // Both are objects, merge recursively
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      // Otherwise, source wins
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Check if a value is a token (has $value property)
 */
export function isToken(value: unknown): value is TokenValue {
  return value !== null && typeof value === "object" && "$value" in value;
}

/**
 * Check if a value contains a reference
 */
export function hasReference(value: TokenValue): boolean {
  if (typeof value === "string") {
    return /^\{[^}]+\}$/.test(value);
  }

  if (value && typeof value === "object") {
    if ("$ref" in value) return true;

    return Object.values(value).some((v) => hasReference(v as TokenValue));
  }

  return false;
}
