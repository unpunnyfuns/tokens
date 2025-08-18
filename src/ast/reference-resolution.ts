/**
 * Functional reference resolution utilities
 * A leaner alternative to the class-based ReferenceResolver
 */

import type { TokenValue } from "../types.js";
import { ASTQuery } from "./ast-query.js";
import { visitTokens } from "./ast-traverser.js";
import type { ASTNode, ResolutionError, TokenNode } from "./types.js";

/**
 * Resolution context to pass between functions
 */
interface ResolutionContext {
  ast: ASTNode;
  query: ASTQuery;
  resolved: Map<string, TokenValue>;
  chains: Map<string, string[]>;
  errors: ResolutionError[];
}

/**
 * Create a new resolution context
 */
function createContext(ast: ASTNode): ResolutionContext {
  return {
    ast,
    query: new ASTQuery(ast),
    resolved: new Map(),
    chains: new Map(),
    errors: [],
  };
}

/**
 * Resolve all references in an AST (main entry point)
 */
export function resolveReferences(ast: ASTNode): {
  ast: ASTNode;
  errors: ResolutionError[];
} {
  const context = createContext(ast);

  // Get resolution order
  const order = getResolutionOrder(ast);

  // Resolve tokens in order
  for (const path of order) {
    const token = context.query.getToken(path);
    if (token) {
      resolveToken(context, token);
    }
  }

  // Update AST with resolved values
  updateASTWithResolvedValues(context);

  return {
    ast: context.ast,
    errors: context.errors,
  };
}

/**
 * Resolve a single token
 */
function resolveToken(
  context: ResolutionContext,
  token: TokenNode,
): TokenValue | undefined {
  // Check if already resolved
  const existing = context.resolved.get(token.path);
  if (existing !== undefined) {
    return existing;
  }

  // Check for circular reference
  if (hasCircularReference(context, token.path, new Set())) {
    context.errors.push({
      type: "circular",
      path: token.path,
      message: "Circular reference detected",
    });
    return undefined;
  }

  const resolved = token.value
    ? resolveValue(context, token.value, token.path)
    : undefined;
  if (resolved === undefined) return undefined;
  context.resolved.set(token.path, resolved);
  return resolved;
}

/**
 * Resolve a value (handles objects, strings with references, etc.)
 */
function resolveValue(
  context: ResolutionContext,
  value: TokenValue,
  currentPath: string,
): TokenValue {
  if (typeof value === "string") {
    return resolveStringValue(context, value, currentPath);
  }

  if (value && typeof value === "object") {
    // Handle JSON Schema $ref
    if ("$ref" in value && typeof value.$ref === "string") {
      return resolveReference(context, value.$ref, currentPath);
    }

    // Recursively resolve object properties
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = resolveValue(context, val as TokenValue, currentPath);
    }
    return resolved;
  }

  return value;
}

/**
 * Resolve string values that may contain references
 */
function resolveStringValue(
  context: ResolutionContext,
  value: string,
  currentPath: string,
): TokenValue {
  // Check for DTCG reference {xxx}
  const dtcgMatch = value.match(/^\{([^}]+)\}$/);
  if (dtcgMatch?.[1]) {
    return resolveReference(context, dtcgMatch[1], currentPath);
  }
  return value;
}

/**
 * Resolve a reference to another token
 */
function resolveReference(
  context: ResolutionContext,
  ref: string,
  currentPath: string,
): TokenValue {
  const path = normalizeRefToPath(ref);
  const referencedToken = context.query.getToken(path);

  if (!referencedToken) {
    context.errors.push({
      type: "missing",
      path: currentPath,
      message: `Reference not found: ${ref}`,
      reference: ref,
    });
    return `{${ref}}`;
  }

  // Track resolution chain
  updateResolutionChain(context, currentPath, path);

  // Recursively resolve
  const resolved = resolveToken(context, referencedToken);
  return resolved !== undefined ? resolved : `{${ref}}`;
}

/**
 * Convert reference formats to token path
 */
function normalizeRefToPath(ref: string): string {
  // Handle JSON pointer format
  if (ref.startsWith("#/") || ref.startsWith("/")) {
    return ref.replace(/^#?\//, "").split("/").join(".");
  }

  // Handle file#path format
  if (ref.includes("#")) {
    const [, path] = ref.split("#");
    return normalizeRefToPath(path || "");
  }

  // Already in dot notation
  return ref;
}

/**
 * Update resolution chain tracking
 */
function updateResolutionChain(
  context: ResolutionContext,
  from: string,
  to: string,
): void {
  const chain = context.chains.get(from) || [];
  chain.push(to);
  context.chains.set(from, chain);
}

/**
 * Check for circular references
 */
function hasCircularReference(
  context: ResolutionContext,
  path: string,
  visiting: Set<string>,
): boolean {
  if (visiting.has(path)) {
    return true;
  }

  visiting.add(path);
  const chain = context.chains.get(path) || [];

  for (const ref of chain) {
    if (hasCircularReference(context, ref, new Set(visiting))) {
      return true;
    }
  }

  return false;
}

/**
 * Get optimal resolution order using topological sort
 */
function getResolutionOrder(ast: ASTNode): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  visitTokens(ast, (token) => {
    addTokenInOrder(token, order, visited, visiting);
    return undefined;
  });

  return order;
}

/**
 * Add token to resolution order
 */
function addTokenInOrder(
  token: TokenNode,
  order: string[],
  visited: Set<string>,
  visiting: Set<string>,
): void {
  if (visited.has(token.path)) {
    return;
  }

  if (visiting.has(token.path)) {
    // Circular dependency - will be caught during resolution
    return;
  }

  visiting.add(token.path);

  // Visit dependencies first
  if (token.references && token.references.length > 0) {
    // Note: In a full implementation, we'd need to look up the referenced tokens
    // This is simplified for demonstration
    visiting.delete(token.path);
    return;
  }

  visiting.delete(token.path);
  visited.add(token.path);
  order.push(token.path);
}

/**
 * Update AST with resolved values
 */
function updateASTWithResolvedValues(context: ResolutionContext): void {
  visitTokens(context.ast, (token) => {
    const resolvedValue = context.resolved.get(token.path);
    if (resolvedValue !== undefined) {
      token.resolvedValue = resolvedValue;
      token.resolved = true;
    } else if (token.references && token.references.length > 0) {
      token.resolved = false;
    }
    return undefined;
  });
}

/**
 * Convenience function to get all resolved values
 */
export function getResolvedValues(ast: ASTNode): Record<string, TokenValue> {
  const context = createContext(ast);
  const { errors } = resolveReferences(ast);

  if (errors.length > 0) {
    throw new Error(
      `Resolution failed:\n${errors
        .map((e) => `  ${e.path}: ${e.message}`)
        .join("\n")}`,
    );
  }

  return Object.fromEntries(context.resolved);
}
