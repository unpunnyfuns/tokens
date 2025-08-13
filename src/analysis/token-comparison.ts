/**
 * Shared utilities for token document comparison
 */

import { buildASTFromDocument } from "../ast/ast-builder.js";
import { ASTQuery } from "../ast/ast-query.js";
import type { TokenDocument } from "../types.js";

export interface TokenComparison {
  added: string[];
  removed: string[];
  changed: string[];
}

export interface TokenDifference {
  path: string;
  leftValue: unknown;
  rightValue: unknown;
  type: "added" | "removed" | "changed";
}

export interface DetailedTokenComparison {
  differences: TokenDifference[];
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
}

/**
 * Compare two token documents and return simple added/removed/changed lists
 */
export function compareTokenDocuments(
  doc1: TokenDocument,
  doc2: TokenDocument,
): TokenComparison {
  const ast1 = buildASTFromDocument(doc1);
  const ast2 = buildASTFromDocument(doc2);
  const query1 = new ASTQuery(ast1);
  const query2 = new ASTQuery(ast2);

  const tokens1 = new Map(query1.getAllTokens().map((t) => [t.path, t]));
  const tokens2 = new Map(query2.getAllTokens().map((t) => [t.path, t]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  // Find removed and changed
  for (const [path, token1] of tokens1) {
    const token2 = tokens2.get(path);
    if (!token2) {
      removed.push(path);
    } else if (JSON.stringify(token1.value) !== JSON.stringify(token2.value)) {
      changed.push(path);
    }
  }

  // Find added
  for (const [path] of tokens2) {
    if (!tokens1.has(path)) {
      added.push(path);
    }
  }

  return { added, removed, changed };
}

/**
 * Compare two token documents and return detailed differences
 */
export function compareTokenDocumentsDetailed(
  doc1: TokenDocument,
  doc2: TokenDocument,
): DetailedTokenComparison {
  const ast1 = buildASTFromDocument(doc1);
  const ast2 = buildASTFromDocument(doc2);
  const query1 = new ASTQuery(ast1);
  const query2 = new ASTQuery(ast2);

  const tokens1 = new Map(query1.getAllTokens().map((t) => [t.path, t]));
  const tokens2 = new Map(query2.getAllTokens().map((t) => [t.path, t]));

  const differences: TokenDifference[] = [];

  // Find removed and changed
  for (const [path, token1] of tokens1) {
    const token2 = tokens2.get(path);
    if (!token2) {
      differences.push({
        path,
        leftValue: token1.value,
        rightValue: undefined,
        type: "removed",
      });
    } else if (JSON.stringify(token1.value) !== JSON.stringify(token2.value)) {
      differences.push({
        path,
        leftValue: token1.value,
        rightValue: token2.value,
        type: "changed",
      });
    }
  }

  // Find added
  for (const [path, token2] of tokens2) {
    if (!tokens1.has(path)) {
      differences.push({
        path,
        leftValue: undefined,
        rightValue: token2.value,
        type: "added",
      });
    }
  }

  // Generate summary
  const summary = {
    added: differences.filter((d) => d.type === "added").length,
    removed: differences.filter((d) => d.type === "removed").length,
    changed: differences.filter((d) => d.type === "changed").length,
  };

  return { differences, summary };
}
