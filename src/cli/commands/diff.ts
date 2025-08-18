/**
 * Diff command implementation
 */

// Use the core API instead of direct imports
import {
  compareTokenDocumentsDetailed,
  resolvePermutation,
  type ResolutionInput,
  type UPFTResolverManifest,
  type TokenDocument,
  type ResolverOptions,
} from "../../public-core.js";
import type { BaseFileSystemOptions } from "../../types/options.js";

export interface TokenDiff {
  differences: Array<{
    path: string;
    leftValue: unknown;
    rightValue: unknown;
    type: "added" | "removed" | "changed";
  }>;
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
}

export type DiffCommandOptions = BaseFileSystemOptions;

/**
 * Compare two token documents directly
 */
export async function diffDocuments(
  leftDoc: TokenDocument,
  rightDoc: TokenDocument,
): Promise<TokenDiff> {
  const comparison = compareTokenDocumentsDetailed(leftDoc, rightDoc);
  return {
    differences: comparison.differences,
    summary: comparison.summary,
  };
}

/**
 * Compare two permutations from a manifest
 */
export async function diffPermutations(
  manifest: UPFTResolverManifest,
  leftModifiers: ResolutionInput = {},
  rightModifiers: ResolutionInput = {},
  options: DiffCommandOptions = {},
): Promise<TokenDiff> {
  const resolverOptions: ResolverOptions = {};
  if (options.fileReader) {
    resolverOptions.fileReader = options.fileReader;
  }
  if (options.basePath) {
    resolverOptions.basePath = options.basePath;
  }

  const leftResolved = await resolvePermutation(
    manifest,
    leftModifiers,
    resolverOptions,
  );
  const rightResolved = await resolvePermutation(
    manifest,
    rightModifiers,
    resolverOptions,
  );

  const comparison = compareTokenDocumentsDetailed(
    leftResolved.tokens,
    rightResolved.tokens,
  );

  return {
    differences: comparison.differences,
    summary: comparison.summary,
  };
}
