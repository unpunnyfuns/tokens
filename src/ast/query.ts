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
 */
export function getToken(root: ASTNode, path: string): TokenNode | undefined {
  const node = getNode(root, path);
  return node?.type === "token" ? (node as TokenNode) : undefined;
}

/**
 * Get a group by path
 */
export function getGroup(root: ASTNode, path: string): GroupNode | undefined {
  const node = getNode(root, path);
  return node?.type === "group" ? (node as GroupNode) : undefined;
}

/**
 * Get any node by path
 */
export function getNode(root: ASTNode, path: string): ASTNode | undefined {
  return findNode(root, path);
}

/**
 * Find all tokens in the tree
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
 */
export function findDependents(root: ASTNode, tokenPath: string): TokenNode[] {
  const dependents: TokenNode[] = [];
  visitTokens(root, (token) => {
    if (token.references?.includes(tokenPath)) {
      dependents.push(token);
    }
    return true;
  });
  return dependents;
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

/**
 * Find circular references in the AST
 */
export function findCircularReferences(root: ASTNode): TokenNode[] {
  const circular: TokenNode[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const checkCycle = (token: TokenNode): boolean => {
    if (recursionStack.has(token.path)) {
      return true;
    }
    if (visited.has(token.path)) {
      return false;
    }

    visited.add(token.path);
    recursionStack.add(token.path);

    if (token.references) {
      for (const ref of token.references) {
        const refToken = getToken(root, ref);
        if (refToken && checkCycle(refToken)) {
          circular.push(token);
          return true;
        }
      }
    }

    recursionStack.delete(token.path);
    return false;
  };

  visitTokens(root, (token) => {
    if (!visited.has(token.path)) {
      checkCycle(token);
    }
    return true;
  });

  return circular;
}
