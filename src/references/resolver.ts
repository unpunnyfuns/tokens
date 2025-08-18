import { buildPathIndex, getTokenFromIndex } from "../core/path-index.js";
import type { TokenDocument, TokenValue } from "../types.js";

/**
 * Options for reference resolution
 */
export interface ResolveOptions {
  /** Whether to preserve original reference strings on error */
  preserveOnError?: boolean;
  /** Maximum depth for reference chains to prevent infinite loops */
  maxDepth?: number;
  /** Whether to allow partial resolution (continue on errors) */
  partial?: boolean;
}

/**
 * Result of reference resolution
 */
export interface ResolveResult {
  /** The resolved token document */
  tokens: TokenDocument;
  /** Any errors encountered during resolution */
  errors: ResolutionError[];
  /** Whether resolution completed without errors */
  success: boolean;
  /** Map of resolved paths to their final values */
  resolved: Map<string, TokenValue>;
  /** Reference chains for debugging */
  chains: Map<string, string[]>;
}

/**
 * Describes a resolution error
 */
export interface ResolutionError {
  /** Type of error */
  type: "missing" | "circular" | "depth" | "invalid";
  /** Path where the error occurred */
  path: string;
  /** Error message */
  message: string;
  /** The reference that caused the error */
  reference?: string;
  /** The chain of references that led to this error */
  chain?: string[];
}

/**
 * Check if a value contains references
 */
export function hasReferences(value: unknown): boolean {
  if (typeof value === "string") {
    return /^\{[^}]+\}$/.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(hasReferences);
  }

  if (value && typeof value === "object") {
    // Check for JSON Schema $ref
    const objValue = value as Record<string, unknown>;
    if ("$ref" in objValue && typeof objValue.$ref === "string") {
      return true;
    }
    return Object.values(objValue).some(hasReferences);
  }

  return false;
}

/**
 * Extract reference path from a reference string
 */
export function extractReference(value: string): string | null {
  // DTCG reference format: {path.to.token}
  const match = value.match(/^\{([^}]+)\}$/);
  return match?.[1] ?? null;
}

/**
 * Normalize a reference path (handles JSON pointer format)
 */
export function normalizeReference(ref: string): string {
  // Handle external file references - strip the file path part
  let normalized = ref;
  if (normalized.includes("#/")) {
    const hashIndex = normalized.indexOf("#/");
    normalized = normalized.substring(hashIndex);
  }

  // Convert JSON pointer to dot notation
  if (normalized.startsWith("#/")) {
    return normalized
      .substring(2)
      .replace(/\//g, ".")
      .replace(/\/?\$value$/, "")
      .replace(/\.$/, "");
  }

  return normalized;
}

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

/**
 * Get all references in a token document
 */
export function getAllReferences(
  document: TokenDocument,
): Map<string, string[]> {
  const references = new Map<string, string[]>();
  const index = buildPathIndex(document);

  for (const [path, token] of index.tokens) {
    const refs = extractReferencesFromToken(token);
    if (refs.length > 0) {
      references.set(path, refs);
    }
  }

  return references;
}

/**
 * Extract all references from a token
 */
function extractReferencesFromToken(token: unknown): string[] {
  const refs: string[] = [];

  function extractFromValue(value: unknown): void {
    if (typeof value === "string") {
      const ref = extractReference(value);
      if (ref) {
        refs.push(ref);
      }
    } else if (Array.isArray(value)) {
      value.forEach(extractFromValue);
    } else if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("$ref" in obj && typeof obj.$ref === "string") {
        refs.push(normalizeReference(obj.$ref));
      } else {
        Object.values(obj).forEach(extractFromValue);
      }
    }
  }

  if (token && typeof token === "object" && "$value" in token) {
    const tokenObj = token as Record<string, unknown>;
    extractFromValue(tokenObj.$value);
  }

  return refs;
}

/**
 * Build a dependency graph of references
 */
export function buildDependencyGraph(document: TokenDocument): {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
} {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  const references = getAllReferences(document);

  for (const [path, refs] of references) {
    // This token depends on these references
    dependencies.set(path, new Set(refs));

    // These references have this token as a dependent
    for (const ref of refs) {
      if (!dependents.has(ref)) {
        dependents.set(ref, new Set());
      }
      dependents.get(ref)?.add(path);
    }
  }

  return { dependencies, dependents };
}
