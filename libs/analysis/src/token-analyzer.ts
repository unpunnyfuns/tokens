import type { TokenAST, TokenNode } from "@upft/ast";
import {
  createAST,
  detectCycles,
  findAllTokens,
  findTokensByType,
  getStatistics,
  resolveASTReferences,
} from "@upft/ast";
// Legacy resolver removed - using AST resolver instead
import type { TokenDocument } from "@upft/foundation";

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

  // Convert GroupNode to TokenAST for resolution analysis
  const fileAST: TokenAST = {
    ...ast,
    type: "file",
    filePath: "analysis.json",
    lastModified: new Date(),
    checksum: "analysis",
    crossFileReferences: new Map(),
  };

  // Use AST resolver instead of legacy resolver
  const resolutionErrors = resolveASTReferences(fileAST);
  const cycleResult = detectCycles(ast);

  return {
    tokenCount: stats.totalTokens,
    groupCount: stats.totalGroups,
    tokensByType: stats.tokensByType,
    depth: stats.maxDepth,
    hasReferences: stats.tokensWithReferences > 0,
    referenceCount: stats.tokensWithReferences,
    unresolvedReferences: resolutionErrors
      .filter((e: { type: string }) => e.type === "missing")
      .map((e: { path: string }) => e.path),
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

/**
 * Options for listing tokens
 */
export interface ListTokensOptions {
  type?: string;
  group?: string;
  resolveReferences?: boolean;
}

/**
 * Token list item
 */
export interface TokenListItem {
  path: string;
  type?: string;
  value?: unknown;
  resolvedValue?: unknown;
  hasReference?: boolean;
}

/**
 * List tokens from a document with optional filtering
 */
export function listTokens(
  document: TokenDocument,
  options: ListTokensOptions = {},
): TokenListItem[] {
  // Build AST from the document
  const ast = createAST(document);

  // Query tokens based on options
  let tokens: TokenNode[];
  if (options.type) {
    tokens = findTokensByType(ast, options.type);
  } else if (options.group) {
    // For group filtering, get tokens at that path
    tokens = findAllTokens(ast).filter((t: TokenNode) =>
      t.path.startsWith(`${options.group}.`),
    );
  } else {
    tokens = findAllTokens(ast);
  }

  // Optionally resolve references
  if (options.resolveReferences) {
    resolveASTReferences(ast);
  }

  // Map tokens to the expected format
  return tokens.map((token) => {
    const tokenValue = token.typedValue?.$value || token.resolvedValue?.$value;
    const isObject = tokenValue && typeof tokenValue === "object";
    const hasReference = !!(isObject && "$ref" in tokenValue);

    return {
      path: token.path,
      ...(token.tokenType && { type: token.tokenType }),
      value:
        isObject && "$value" in tokenValue
          ? tokenValue.$value
          : token.typedValue?.$value || token.resolvedValue?.$value,
      resolvedValue: options.resolveReferences
        ? token.resolvedValue?.$value || token.typedValue?.$value
        : undefined,
      hasReference,
    };
  });
}

// Re-export for convenience
export { compareTokenDocuments } from "./token-comparison.js";
