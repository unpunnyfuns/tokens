import { buildASTFromDocument } from "../ast/ast-builder.js";
import { ASTQuery } from "../ast/ast-query.js";
import { ReferenceResolver } from "../ast/reference-resolver.js";
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
  const ast = buildASTFromDocument(document);
  const query = new ASTQuery(ast);
  const stats = query.getStatistics();

  const referenceResolver = new ReferenceResolver(ast);
  const resolutionErrors = referenceResolver.resolve();
  const circularRefs = query.getCircularReferences();

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
    circularReferences: circularRefs.map((t) => t.path),
  };
}

/**
 * Count groups in a document
 */
export function countGroups(doc: TokenDocument): number {
  let count = 0;

  const isGroup = (obj: Record<string, unknown>): boolean => {
    if ("$value" in obj) return false;
    return Object.keys(obj).some((k) => !k.startsWith("$"));
  };

  function traverse(obj: unknown) {
    if (!obj || typeof obj !== "object") return;
    const record = obj as Record<string, unknown>;
    if (isGroup(record)) count++;

    for (const key in record) {
      if (!key.startsWith("$")) {
        traverse(record[key]);
      }
    }
  }

  traverse(doc);
  return count;
}

/**
 * Find all tokens of a specific type
 */
export function findTokensByType(
  document: TokenDocument,
  type: string,
): Array<{ path: string; value: unknown }> {
  const ast = buildASTFromDocument(document);
  const query = new ASTQuery(ast);
  const tokens = query.getTokensByType(type);

  return tokens.map((token) => ({
    path: token.path,
    value: token.value,
  }));
}

/**
 * Get all unique token types in document
 */
export function getTokenTypes(document: TokenDocument): string[] {
  const ast = buildASTFromDocument(document);
  const query = new ASTQuery(ast);
  const stats = query.getStatistics();

  return Object.keys(stats.tokensByType);
}

// Re-export for convenience
export { countTokens } from "../utils/token-helpers.js";
export { compareTokenDocuments } from "./token-comparison.js";
