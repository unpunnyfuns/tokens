/**
 * Core resolution engine implementation
 */

import { buildPathIndex, getTokenFromIndex } from "../../core/path-index.js";
import type { TokenDocument, TokenValue } from "../../types.js";
import { extractReference, normalizeReference } from "./reference-utils.js";
import type {
  ResolutionError,
  ResolveOptions,
  ResolveResult,
} from "./types.js";

/**
 * Resolve all references in a token document
 */
export function resolveReferences(
  document: TokenDocument,
  options: ResolveOptions = {},
): ResolveResult {
  const { preserveOnError = true, maxDepth = 10, partial = false } = options;

  const errors: ResolutionError[] = [];
  const resolved = new Map<string, TokenValue>();
  const chains = new Map<string, string[]>();
  const index = buildPathIndex(document);

  // Helper to check for circular references
  function hasCircular(path: string, chain: string[]): boolean {
    return chain.includes(path);
  }

  // Helper to handle depth limit
  function checkDepthLimit(
    chain: string[],
    path: string,
    value: unknown,
  ): unknown | null {
    if (chain.length >= maxDepth) {
      errors.push({
        type: "depth",
        path,
        message: `Maximum reference depth (${maxDepth}) exceeded`,
        chain,
      });
      return preserveOnError ? value : undefined;
    }
    return null;
  }

  // Helper to resolve string value
  function resolveStringValue(
    value: string,
    path: string,
    chain: string[],
  ): unknown {
    const ref = extractReference(value);
    if (ref) {
      return resolveReference(ref, path, chain);
    }
    return value;
  }

  // Helper to resolve object value
  function resolveObjectValue(
    obj: Record<string, unknown>,
    path: string,
    chain: string[],
  ): unknown {
    // Handle JSON Schema $ref
    if ("$ref" in obj && typeof obj.$ref === "string") {
      const ref = normalizeReference(obj.$ref);
      return resolveReference(ref, path, chain);
    }

    // Recursively resolve object properties
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      resolved[key] = resolveValue(val, path, chain);
    }
    return resolved;
  }

  // Helper to resolve a single token's value
  function resolveValue(
    value: unknown,
    path: string,
    chain: string[] = [],
  ): unknown {
    // Check depth limit
    const depthResult = checkDepthLimit(chain, path, value);
    if (depthResult !== null) {
      return depthResult;
    }

    // Handle string references
    if (typeof value === "string") {
      return resolveStringValue(value, path, chain);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => resolveValue(item, path, chain));
    }

    // Handle objects
    if (value && typeof value === "object") {
      return resolveObjectValue(value as Record<string, unknown>, path, chain);
    }

    return value;
  }

  // Helper to handle circular reference
  function handleCircularRef(
    targetPath: string,
    chain: string[],
    fromPath: string,
    ref: string,
  ): unknown {
    errors.push({
      type: "circular",
      path: fromPath,
      message: `Circular reference detected: ${chain.join(" → ")} → ${targetPath}`,
      reference: ref,
      chain: [...chain, targetPath],
    });
    return preserveOnError ? `{${ref}}` : undefined;
  }

  // Helper to handle missing reference
  function handleMissingRef(fromPath: string, ref: string): unknown {
    errors.push({
      type: "missing",
      path: fromPath,
      message: `Reference to non-existent token: {${ref}}`,
      reference: ref,
    });
    return preserveOnError ? `{${ref}}` : undefined;
  }

  // Helper to resolve a reference
  function resolveReference(
    ref: string,
    fromPath: string,
    chain: string[],
  ): unknown {
    const targetPath = normalizeReference(ref);

    // Check for circular reference
    if (hasCircular(targetPath, chain)) {
      return handleCircularRef(targetPath, chain, fromPath, ref);
    }

    // Get the referenced token
    const token = getTokenFromIndex(index, targetPath);
    if (!token) {
      return handleMissingRef(fromPath, ref);
    }

    // Update chain tracking
    const newChain = [...chain, targetPath];
    chains.set(fromPath, newChain);

    // Check if we've already resolved this token
    if (resolved.has(targetPath)) {
      return resolved.get(targetPath);
    }

    // Resolve the token's value
    const tokenObj = token as Record<string, unknown>;
    if ("$value" in tokenObj) {
      const resolvedValue = resolveValue(tokenObj.$value, targetPath, newChain);
      resolved.set(targetPath, resolvedValue as TokenValue);
      return resolvedValue;
    }

    return preserveOnError ? `{${ref}}` : undefined;
  }

  // Helper to process a single property
  function processProperty(
    key: string,
    value: unknown,
    path: string,
    result: Record<string, unknown>,
  ): void {
    const currentPath = path ? `${path}.${key}` : key;

    if (key === "$value") {
      // Resolve token value
      const resolvedValue = resolveValue(value, path, []);
      result[key] = resolvedValue;
      if (path) {
        resolved.set(path, resolvedValue as TokenValue);
      }
    } else if (key.startsWith("$")) {
      // Preserve other $ properties
      result[key] = value;
    } else {
      // Process nested nodes
      result[key] = processNode(value, currentPath);
    }
  }

  // Helper to process a token document recursively
  function processNode(node: unknown, path: string = ""): unknown {
    if (!node || typeof node !== "object") {
      return node;
    }

    const obj = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      processProperty(key, value, path, result);
    }

    return result;
  }

  // Process the entire document
  const tokens = processNode(document) as TokenDocument;

  // Determine success
  const success =
    errors.length === 0 ||
    (partial && errors.some((e) => e.type !== "missing"));

  return {
    tokens,
    errors,
    success,
    resolved,
    chains,
  };
}
