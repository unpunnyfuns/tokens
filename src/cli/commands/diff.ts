/**
 * Diff command implementation
 */

import { compareTokenDocumentsDetailed } from "../../analysis/token-comparison.js";
import { resolvePermutation } from "../../manifest/manifest-core.js";
import type {
  ResolutionInput,
  UPFTResolverManifest,
} from "../../manifest/upft-types.js";
import type { TokenDocument } from "../../types.js";
import type { ResolverOptions } from "../../types/options.js";
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
