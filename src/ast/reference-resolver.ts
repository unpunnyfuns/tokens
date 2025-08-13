import type { TokenValue } from "../types.js";
import { ASTQuery } from "./ast-query.js";
import { visitTokens } from "./ast-traverser.js";
import type {
  ASTNode,
  ReferenceGraph,
  ResolutionError,
  TokenNode,
} from "./types.js";

/**
 * Resolves references in an AST
 */
export class ReferenceResolver {
  private resolved = new Map<string, TokenValue>();
  private chains = new Map<string, string[]>();
  private errors: ResolutionError[] = [];
  private query: ASTQuery;

  constructor(private ast: ASTNode) {
    this.query = new ASTQuery(ast);
  }

  /**
   * Resolve all references in the AST
   */
  resolve(): ResolutionError[] {
    this.errors = [];
    this.resolved.clear();
    this.chains.clear();

    // Get resolution order
    const order = getResolutionOrder(this.ast);

    // Resolve tokens in order
    for (const path of order) {
      const token = this.query.getToken(path);
      if (token) {
        this.resolveToken(token);
      }
    }

    // Update AST with resolved values
    visitTokens(this.ast, (token) => {
      const resolvedValue = this.resolved.get(token.path);
      if (resolvedValue !== undefined) {
        token.resolvedValue = resolvedValue;
        token.resolved = true;
      } else if (token.references && token.references.length > 0) {
        token.resolved = false;
      }
      return true;
    });

    return this.errors;
  }

  private resolveToken(token: TokenNode): TokenValue | undefined {
    // Already resolved
    if (this.resolved.has(token.path)) {
      return this.resolved.get(token.path);
    }

    // No references, use original value
    if (!token.references || token.references.length === 0) {
      if (token.value !== undefined) {
        this.resolved.set(token.path, token.value);
      }
      return token.value;
    }

    // Check for circular references
    if (this.hasCircularReference(token.path, new Set())) {
      this.errors.push({
        type: "circular",
        path: token.path,
        message: `Circular reference detected at ${token.path}`,
      });
      return token.value;
    }

    // Resolve the value
    if (token.value !== undefined) {
      const resolvedValue = this.resolveValue(token.value, token.path);
      this.resolved.set(token.path, resolvedValue);
      return resolvedValue;
    }

    return undefined;
  }

  private resolveValue(value: TokenValue, currentPath: string): TokenValue {
    if (typeof value === "string") {
      return this.resolveStringValue(value, currentPath);
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.resolveValue(item as TokenValue, currentPath),
      );
    }

    if (value && typeof value === "object") {
      // Handle JSON Schema $ref as the entire value
      if (
        "$ref" in value &&
        typeof (value as Record<string, unknown>).$ref === "string"
      ) {
        return this.resolveReference(
          (value as Record<string, unknown>).$ref as string,
          currentPath,
        );
      }

      const resolved: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveValue(val as TokenValue, currentPath);
      }

      return resolved;
    }

    return value;
  }

  private resolveStringValue(value: string, currentPath: string): TokenValue {
    // Check for DTCG reference {xxx}
    const dtcgMatch = value.match(/^\{([^}]+)\}$/);
    if (dtcgMatch?.[1]) {
      return this.resolveReference(dtcgMatch[1], currentPath);
    }

    return value;
  }

  private resolveReference(ref: string, currentPath: string): TokenValue {
    // Convert JSON pointer to path if needed
    const path = this.normalizeRefToPath(ref);

    // Find the referenced token
    const referencedToken = this.query.getToken(path);

    if (!referencedToken) {
      return this.handleMissingReference(ref, currentPath);
    }

    // Recursively resolve the referenced token
    const resolvedValue = this.resolveToken(referencedToken);
    const finalValue =
      resolvedValue !== undefined ? resolvedValue : referencedToken.value;

    // Track resolution chain
    this.updateResolutionChain(currentPath, path);

    return finalValue !== undefined ? finalValue : `{${path}}`;
  }

  private normalizeRefToPath(ref: string): string {
    let normalizedRef = ref;
    // Handle external file references - strip the file path part
    if (normalizedRef.includes("#/")) {
      const hashIndex = normalizedRef.indexOf("#/");
      normalizedRef = normalizedRef.substring(hashIndex);
    }

    if (normalizedRef.startsWith("#/")) {
      return normalizedRef
        .substring(2)
        .replace(/\//g, ".")
        .replace(/\/?\$value$/, "")
        .replace(/\.$/, "");
    }
    return normalizedRef;
  }

  private handleMissingReference(ref: string, currentPath: string): TokenValue {
    const originalRef = ref.startsWith("#/") ? ref : `{${ref}}`;
    this.errors.push({
      type: "missing",
      path: currentPath,
      message: `Reference to non-existent token: ${originalRef}`,
      reference: originalRef,
    });
    return ref.startsWith("#/") ? { $ref: ref } : `{${ref}}`;
  }

  private updateResolutionChain(currentPath: string, path: string): void {
    const chain = this.chains.get(currentPath) ?? [currentPath];
    if (!chain.includes(path)) {
      chain.push(path);
    }

    // Add the referenced token's chain if it has one
    const refChain = this.chains.get(path);
    if (refChain) {
      for (const item of refChain) {
        if (item !== path && !chain.includes(item)) {
          chain.push(item);
        }
      }
    }
    this.chains.set(currentPath, chain);
  }

  private hasCircularReference(path: string, visited: Set<string>): boolean {
    if (visited.has(path)) return true;

    const token = this.query.getToken(path);
    if (!token?.references) return false;

    visited.add(path);

    for (const ref of token.references) {
      // Convert reference to path
      const refPath = ref.startsWith("#/")
        ? ref
            .substring(2)
            .replace(/\//g, ".")
            .replace(/\/?\$value$/, "")
            .replace(/\.$/, "")
        : ref.replace(/^\{|\}$/g, "");

      if (this.hasCircularReference(refPath, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get resolved value for a token path
   */
  getResolvedValue(path: string): TokenValue | undefined {
    return this.resolved.get(path);
  }

  /**
   * Get all resolved values
   */
  getAllResolvedValues(): Record<string, TokenValue> {
    const values: Record<string, TokenValue> = {};

    for (const [path, value] of this.resolved) {
      values[path] = value;
    }

    return values;
  }

  /**
   * Get resolution chain for a token
   */
  getResolutionChain(path: string): string[] {
    return this.chains.get(path) ?? [path];
  }
}

/**
 * Resolve all references in an AST
 */
export function resolveReferences(ast: ASTNode): {
  resolved: ASTNode;
  errors: ResolutionError[];
} {
  const resolver = new ReferenceResolver(ast);
  const errors = resolver.resolve();

  return { resolved: ast, errors };
}

/**
 * Resolve a single token value
 */
export function resolveTokenValue(
  value: TokenValue,
  tokens: Record<string, { $value: TokenValue }>,
): TokenValue {
  if (typeof value === "string") {
    return resolveStringValue(value, tokens);
  }

  if (Array.isArray(value)) {
    return resolveArrayValue(value, tokens);
  }

  if (value && typeof value === "object") {
    return resolveObjectValue(value, tokens);
  }

  return value;
}

/**
 * Resolve string values that may contain references
 */
function resolveStringValue(
  value: string,
  tokens: Record<string, { $value: TokenValue }>,
): TokenValue {
  const dtcgMatch = value.match(/^\{([^}]+)\}$/);
  if (!dtcgMatch?.[1]) {
    return value;
  }

  const token = tokens[dtcgMatch[1]];
  return token ? resolveTokenValue(token.$value, tokens) : value;
}

/**
 * Resolve array values recursively
 */
function resolveArrayValue(
  value: unknown[],
  tokens: Record<string, { $value: TokenValue }>,
): TokenValue {
  return value.map((item) => resolveTokenValue(item as TokenValue, tokens));
}

/**
 * Resolve object values, handling JSON Schema $ref
 */
function resolveObjectValue(
  value: object,
  tokens: Record<string, { $value: TokenValue }>,
): TokenValue {
  const entries = Object.entries(value);

  // Check for JSON Schema $ref as the entire object
  const refEntry = entries.find(([key]) => key === "$ref");
  if (refEntry && typeof refEntry[1] === "string") {
    return resolveJsonSchemaRef(refEntry[1], tokens, value as TokenValue);
  }

  // Recursively resolve all properties
  const resolved: Record<string, unknown> = {};
  for (const [key, val] of entries) {
    resolved[key] = resolveTokenValue(val as TokenValue, tokens);
  }
  return resolved;
}

/**
 * Resolve a JSON Schema $ref reference
 */
function resolveJsonSchemaRef(
  ref: string,
  tokens: Record<string, { $value: TokenValue }>,
  originalValue: TokenValue,
): TokenValue {
  const path = convertJsonPointerToPath(ref);
  const token = tokens[path];
  return token ? resolveTokenValue(token.$value, tokens) : originalValue;
}

/**
 * Convert JSON pointer to dot notation path
 */
function convertJsonPointerToPath(pointer: string): string {
  return pointer
    .substring(2)
    .replace(/\//g, ".")
    .replace(/\/?\$value$/, "")
    .replace(/\.$/, "");
}

/**
 * Get optimal resolution order for tokens
 */
export function getResolutionOrder(ast: ASTNode): string[] {
  const query = new ASTQuery(ast);
  const graph = query.getReferenceGraph();
  const tokens = query.getAllTokens();

  const resolver = new ResolutionOrderBuilder(graph);

  // Add tokens without references first
  resolver.addIndependentTokens(tokens);

  // Add remaining tokens in dependency order
  resolver.addDependentTokens(tokens);

  return resolver.getOrder();
}

/**
 * Helper class to build resolution order
 */
class ResolutionOrderBuilder {
  private order: string[] = [];
  private visited = new Set<string>();

  constructor(private graph: ReferenceGraph) {}

  /**
   * Add tokens that have no references
   */
  addIndependentTokens(tokens: TokenNode[]): void {
    for (const token of tokens) {
      if (!token.references || token.references.length === 0) {
        this.markVisited(token.path);
      }
    }
  }

  /**
   * Add tokens in dependency order
   */
  addDependentTokens(tokens: TokenNode[]): void {
    for (const token of tokens) {
      this.addTokenInOrder(token.path);
    }
  }

  /**
   * Get the final resolution order
   */
  getOrder(): string[] {
    return this.order;
  }

  /**
   * Mark a path as visited and add to order
   */
  private markVisited(path: string): void {
    if (!this.visited.has(path)) {
      this.order.push(path);
      this.visited.add(path);
    }
  }

  /**
   * Add a token and its dependencies in correct order
   */
  private addTokenInOrder(path: string, visiting = new Set<string>()): void {
    // Skip if already processed or circular reference detected
    if (this.visited.has(path) || visiting.has(path)) {
      return;
    }

    visiting.add(path);

    // Process dependencies first
    const references = this.graph.references.get(path);
    if (references) {
      for (const ref of references) {
        const refPath = this.normalizeReference(ref);
        this.addTokenInOrder(refPath, new Set(visiting));
      }
    }

    // Then add this token
    this.markVisited(path);
  }

  /**
   * Normalize a reference to a path
   */
  private normalizeReference(ref: string): string {
    if (ref.startsWith("#/")) {
      return convertJsonPointerToPath(ref);
    }
    return ref.replace(/^\{|\}$/g, "");
  }
}
