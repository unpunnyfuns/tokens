/**
 * Functional utilities for AST statistics
 */

import { visitTokens, visitGroups, traverseAST } from "./ast-traverser.js";
import type { ASTNode, ASTStatistics, TokenNode } from "./types.js";

/**
 * Get all tokens from AST
 */
export function getAllTokens(ast: ASTNode): TokenNode[] {
  const tokens: TokenNode[] = [];
  visitTokens(ast, (token) => {
    tokens.push(token);
    return true;
  });
  return tokens;
}

/**
 * Calculate statistics for an AST
 */
export function getASTStatistics(ast: ASTNode): ASTStatistics {
  let totalTokens = 0;
  let totalGroups = 0;
  let tokensWithReferences = 0;
  let unresolvedTokens = 0;
  let maxDepth = 0;
  const tokensByType = new Map<string, number>();
  const depths = new Map<ASTNode, number>();

  // Calculate depths
  traverseAST(ast, (node) => {
    const parentDepth = node.parent ? depths.get(node.parent) || 0 : 0;
    const nodeDepth = node.parent ? parentDepth + 1 : 0;
    depths.set(node, nodeDepth);
    maxDepth = Math.max(maxDepth, nodeDepth);
    return true;
  });

  // Count tokens and references
  visitTokens(ast, (token) => {
    totalTokens++;

    if (token.tokenType) {
      const count = tokensByType.get(token.tokenType) || 0;
      tokensByType.set(token.tokenType, count + 1);
    }

    if (token.references && token.references.length > 0) {
      tokensWithReferences++;
    }

    if (!token.resolved) {
      unresolvedTokens++;
    }

    return true;
  });

  // Count groups
  visitGroups(ast, () => {
    totalGroups++;
    return true;
  });

  return {
    totalTokens,
    totalGroups,
    tokensWithReferences,
    unresolvedTokens,
    tokensByType: Object.fromEntries(tokensByType),
    maxDepth,
  };
}

/**
 * Get tokens with references from AST
 */
export function getTokensWithReferences(ast: ASTNode): TokenNode[] {
  const tokens: TokenNode[] = [];
  visitTokens(ast, (token) => {
    if (token.references && token.references.length > 0) {
      tokens.push(token);
    }
    return true;
  });
  return tokens;
}
