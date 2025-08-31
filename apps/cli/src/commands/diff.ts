/**
 * Diff command implementation using pure pipeline architecture
 */

import { compareTokenDocumentsDetailed } from "@upft/analysis";
import type { TokenDocument } from "@upft/foundation";
import {
  type PipelineOptions,
  type PipelineResolutionInput,
  resolvePermutation,
  runPipeline,
} from "@upft/loader";

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

export interface DiffCommandOptions {
  /** Optional file reader for custom file system access */
  fileReader?: import("@upft/foundation").TokenFileReader;
  /** Base path for relative file resolution */
  basePath?: string;
}

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
 * Compare two permutations from a manifest using pipeline architecture
 */
export async function diffPermutations(
  manifestPath: string,
  leftModifiers: PipelineResolutionInput = {},
  rightModifiers: PipelineResolutionInput = {},
  options: DiffCommandOptions = {},
): Promise<TokenDiff> {
  // Set up pipeline options
  const pipelineOptions: PipelineOptions = {
    validate: true,
    parseToAST: true,
  };

  if (options.basePath) {
    pipelineOptions.basePath = options.basePath;
  }

  // Run pipeline to get project structure
  const pipelineResult = await runPipeline(manifestPath, pipelineOptions);

  if (pipelineResult.errors.length > 0) {
    throw new Error(`Pipeline errors: ${pipelineResult.errors.join(", ")}`);
  }

  // Resolve both permutations using pipeline resolver
  const leftResolved = await resolvePermutation(
    pipelineResult.project,
    leftModifiers,
  );
  const rightResolved = await resolvePermutation(
    pipelineResult.project,
    rightModifiers,
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
