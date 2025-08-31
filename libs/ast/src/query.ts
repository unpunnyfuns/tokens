import { findNode, traverseAST, visitTokens } from "./ast-traverser.js";
import type {
  ASTNode,
  ASTStatistics,
  GroupNode,
  ReferenceGraph,
  TokenNode,
} from "./types.js";

/**
 * Get a token by path
 *
 * @param root - Root AST node to search from
 * @param path - Dot-separated token path
 * @returns Token node or undefined if not found
 */
export function getToken(root: ASTNode, path: string): TokenNode | undefined {
  const node = getNode(root, path);
  return node?.type === "token" ? (node as TokenNode) : undefined;
}

/**
 * Get a group by path
 *
 * @param root - Root AST node to search from
 * @param path - Dot-separated group path
 * @returns Group node or undefined if not found
 */
export function getGroup(root: ASTNode, path: string): GroupNode | undefined {
  const node = getNode(root, path);
  return node?.type === "group" ? (node as GroupNode) : undefined;
}

/**
 * Get any node by path
 *
 * @param root - Root AST node to search from
 * @param path - Dot-separated node path
 * @returns AST node or undefined if not found
 */
export function getNode(root: ASTNode, path: string): ASTNode | undefined {
  return findNode(root, path);
}

/**
 * Find all tokens in the tree
 *
 * @param root - Root AST node to search from
 * @returns Array of all token nodes found
 */
export function findAllTokens(root: ASTNode): TokenNode[] {
  const tokens: TokenNode[] = [];
  visitTokens(root, (token) => {
    tokens.push(token);
    return true;
  });
  return tokens;
}

/**
 * Find tokens by type
 *
 * @param root - Root AST node to search from
 * @param type - Token type to filter by
 * @returns Array of matching token nodes
 */
export function findTokensByType(root: ASTNode, type: string): TokenNode[] {
  return filterTokens(root, (token) => token.tokenType === type);
}

/**
 * Find tokens with references
 */
export function findTokensWithReferences(root: ASTNode): TokenNode[] {
  return filterTokens(
    root,
    (token) => token.references !== undefined && token.references.length > 0,
  );
}

/**
 * Find unresolved tokens
 */
export function findUnresolvedTokens(root: ASTNode): TokenNode[] {
  return filterTokens(root, (token) => !token.resolved);
}

/**
 * Filter tokens by predicate
 */
export function filterTokens(
  root: ASTNode,
  predicate: (token: TokenNode) => boolean,
): TokenNode[] {
  const tokens: TokenNode[] = [];
  visitTokens(root, (token) => {
    if (predicate(token)) {
      tokens.push(token);
    }
    return true;
  });
  return tokens;
}

/**
 * Find token dependencies (tokens this token references)
 */
export function findDependencies(
  root: ASTNode,
  tokenPath: string,
): TokenNode[] {
  const token = getToken(root, tokenPath);
  if (!token?.references) return [];

  const deps: TokenNode[] = [];
  const visited = new Set<string>();

  const collectDeps = (refs: string[]) => {
    for (const ref of refs) {
      if (visited.has(ref)) continue;
      visited.add(ref);

      const depToken = getToken(root, ref);
      if (depToken) {
        deps.push(depToken);
        if (depToken.references) {
          collectDeps(depToken.references);
        }
      }
    }
  };

  collectDeps(token.references);
  return deps;
}

/**
 * Find token dependents (tokens that reference this token)
 * This is also known as finding "aliases" of a token
 */
export function findDependents(root: ASTNode, tokenPath: string): TokenNode[] {
  const dependents: TokenNode[] = [];
  visitTokens(root, (token) => {
    // Check modern token reference format
    const hasReference = token.references?.some(
      (ref) => cleanReference(ref) === tokenPath,
    );
    if (hasReference) {
      dependents.push(token);
    }
    return true;
  });
  return dependents;
}

/**
 * Find token aliases (same as findDependents but with clearer naming)
 * Returns all tokens that reference/alias the specified token
 */
export function findTokenAliases(
  root: ASTNode,
  tokenPath: string,
): TokenNode[] {
  return findDependents(root, tokenPath);
}

/**
 * Find all tokens that directly or indirectly reference a token (transitive aliases)
 */
export function findAllDependents(
  root: ASTNode,
  tokenPath: string,
): TokenNode[] {
  const allDependents = new Set<TokenNode>();
  const visited = new Set<string>();

  const collectDependents = (currentPath: string) => {
    if (visited.has(currentPath)) return;
    visited.add(currentPath);

    const directDependents = findDependents(root, currentPath);
    for (const dependent of directDependents) {
      allDependents.add(dependent);
      collectDependents(dependent.path);
    }
  };

  collectDependents(tokenPath);
  return Array.from(allDependents);
}

/**
 * Get reference information for a token (what it references and what references it)
 */
export function getTokenReferenceInfo(root: ASTNode, tokenPath: string) {
  const token = getToken(root, tokenPath);
  const dependencies = findDependencies(root, tokenPath);
  const dependents = findDependents(root, tokenPath);
  const allDependents = findAllDependents(root, tokenPath);

  return {
    token,
    exists: !!token,
    // What this token references
    dependencies,
    dependencyPaths: dependencies.map((t) => t.path),
    // What references this token
    dependents,
    dependentPaths: dependents.map((t) => t.path),
    aliases: dependents, // Clearer alias for dependents
    // Transitive dependents (including chains)
    allDependents,
    allDependentPaths: allDependents.map((t) => t.path),
    // Summary stats
    isReferenced: dependents.length > 0,
    hasReferences: dependencies.length > 0,
    referenceCount: dependents.length,
    aliasCount: dependents.length,
  };
}

/**
 * Clean reference format by removing curly braces
 */
function cleanReference(ref: string): string {
  return ref.replace(/^\{|\}$/g, "");
}

/**
 * Get statistics about the AST
 */
export function getStatistics(root: ASTNode): ASTStatistics {
  let totalTokens = 0;
  let totalGroups = 0;
  let maxDepth = 0;
  let tokensWithReferences = 0;
  let unresolvedTokens = 0;

  const typeCount = new Map<string, number>();

  traverseAST(root, (node, depth = 0) => {
    maxDepth = Math.max(maxDepth, depth);

    if (node.type === "token") {
      totalTokens++;
      const token = node as TokenNode;

      if (token.tokenType) {
        typeCount.set(
          token.tokenType,
          (typeCount.get(token.tokenType) || 0) + 1,
        );
      }

      if (token.references && token.references.length > 0) {
        tokensWithReferences++;
      }

      if (!token.resolved) {
        unresolvedTokens++;
      }
    } else {
      totalGroups++;
    }

    return true;
  });

  return {
    totalTokens,
    totalGroups,
    totalNodes: totalTokens + totalGroups,
    maxDepth,
    tokensWithReferences,
    unresolvedTokens,
    tokensByType: Object.fromEntries(typeCount),
  };
}

/**
 * Create a reference graph from the AST
 */
export function createReferenceGraph(root: ASTNode): ReferenceGraph {
  const nodes = new Map<string, TokenNode>();
  const edges = new Map<string, Set<string>>();

  // Collect all tokens
  visitTokens(root, (token) => {
    nodes.set(token.path, token);
    if (token.references) {
      edges.set(token.path, new Set(token.references));
    }
    return true;
  });

  // Build reverse edges (dependents)
  const reverseEdges = new Map<string, Set<string>>();
  for (const [source, targets] of edges) {
    for (const target of targets) {
      if (!reverseEdges.has(target)) {
        reverseEdges.set(target, new Set());
      }
      reverseEdges.get(target)?.add(source);
    }
  }

  return {
    nodes,
    edges,
    reverseEdges,
  };
}
