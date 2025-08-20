import { createAST } from "../ast/ast-builder.js";
import { detectCycles } from "../ast/cycle-detector/index.js";
import {
  findTokensByType as findTokensByTypeInAST,
  getStatistics,
  resolveASTReferences,
} from "../ast/index.js";
import type { TokenDocument } from "../types.js";

/**
 * Analysis result for a token document
 */
export interface TokenAnalysis {
  tokenCount: number;
  groupCount: number;
  tokensByType: Record<string, number>;
  depth: number;
  hasReferences: boolean;
  referenceCount: number;
  unresolvedReferences: string[];
  circularReferences: string[];
}

/**
 * Analyze a token document
 */
export function analyzeTokens(document: TokenDocument): TokenAnalysis {
  const ast = createAST(document);
  const stats = getStatistics(ast);

  const resolutionErrors = resolveASTReferences(ast);
  const cycleResult = detectCycles(ast);

  return {
    tokenCount: stats.totalTokens,
    groupCount: stats.totalGroups,
    tokensByType: stats.tokensByType,
    depth: stats.maxDepth,
    hasReferences: stats.tokensWithReferences > 0,
    referenceCount: stats.tokensWithReferences,
    unresolvedReferences: resolutionErrors
      .filter((e) => e.type === "missing")
      .map((e) => e.path),
    circularReferences: cycleResult.hasCycles
      ? Array.from(cycleResult.cyclicTokens)
      : [],
  };
}

/**
 * Count groups in a document (excluding root)
 */
export function countGroups(doc: TokenDocument): number {
  const ast = createAST(doc);
  const stats = getStatistics(ast);
  // Subtract 1 to exclude the root group from count
  return Math.max(0, stats.totalGroups - 1);
}

/**
 * Find all tokens of a specific type
 */
export function findTokensByType(
  document: TokenDocument,
  type: string,
): Array<{ path: string; value: unknown }> {
  const ast = createAST(document);
  const tokens = findTokensByTypeInAST(ast, type);

  return tokens.map((token) => ({
    path: token.path,
    value: token.value,
  }));
}

/**
 * Get all unique token types in document
 */
export function getTokenTypes(document: TokenDocument): string[] {
  const ast = createAST(document);
  const stats = getStatistics(ast);

  return Object.keys(stats.tokensByType);
}

/**
 * Count total tokens in a document
 */
export function countTokens(document: TokenDocument): number {
  const ast = createAST(document);
  const stats = getStatistics(ast);
  return stats.totalTokens;
}

// Re-export for convenience
export { compareTokenDocuments } from "./token-comparison.js";
