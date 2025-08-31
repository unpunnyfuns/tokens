/**
 * Resolve/Preview command implementation using pure pipeline architecture
 */

import { dirname } from "node:path";
import {
  generateAllPermutations,
  type PipelineOptions,
  type PipelineResolutionInput,
  type PipelineResolvedPermutation,
  resolvePermutation,
  runPipeline,
} from "@upft/loader";

export interface ResolveCommandOptions {
  /** Optional file reader for custom file system access */
  fileReader?: import("@upft/foundation").TokenFileReader;
  /** Base path for relative file resolution */
  basePath?: string;
}

/**
 * Resolve tokens with specific modifiers from a manifest file path using pipeline
 */
export async function resolveTokens(
  manifestPath: string,
  modifiers: PipelineResolutionInput = {},
  options: ResolveCommandOptions = {},
): Promise<PipelineResolvedPermutation> {
  // Use new pipeline architecture for loading and parsing
  const pipelineOptions: PipelineOptions = {
    validate: true,
    parseToAST: true,
    basePath: options.basePath || dirname(manifestPath),
  };

  // Run pipeline to get full project structure
  const pipelineResult = await runPipeline(manifestPath, pipelineOptions);

  if (pipelineResult.errors.length > 0) {
    throw new Error(`Pipeline errors: ${pipelineResult.errors.join(", ")}`);
  }

  // Use pure pipeline resolver with ProjectAST
  return resolvePermutation(pipelineResult.project, modifiers);
}

/**
 * List all possible permutations from a manifest file path using pipeline
 */
export async function listPermutations(
  manifestPath: string,
  options: ResolveCommandOptions = {},
): Promise<PipelineResolvedPermutation[]> {
  // Use new pipeline architecture for loading and parsing
  const pipelineOptions: PipelineOptions = {
    validate: true,
    parseToAST: true,
    basePath: options.basePath || dirname(manifestPath),
  };

  // Run pipeline to get full project structure
  const pipelineResult = await runPipeline(manifestPath, pipelineOptions);

  if (pipelineResult.errors.length > 0) {
    throw new Error(`Pipeline errors: ${pipelineResult.errors.join(", ")}`);
  }

  // Use pure pipeline permutation generator with ProjectAST
  return generateAllPermutations(pipelineResult.project);
}
