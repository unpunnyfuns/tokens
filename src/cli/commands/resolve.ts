/**
 * Resolve/Preview command implementation
 */

import {
  generateAll as generateAllPermutations,
  resolvePermutation,
} from "../../manifest/manifest-core.js";
import type {
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../../manifest/upft-types.js";
import type { ResolverOptions } from "../../types/options.js";
import type { BaseFileSystemOptions } from "../../types/options.js";

export type ResolveCommandOptions = BaseFileSystemOptions;

/**
 * Resolve tokens with specific modifiers
 */
export async function resolveTokens(
  manifest: UPFTResolverManifest,
  modifiers: ResolutionInput = {},
  options: ResolveCommandOptions = {},
): Promise<ResolvedPermutation> {
  const resolverOptions: ResolverOptions = {};
  if (options.fileReader) {
    resolverOptions.fileReader = options.fileReader;
  }
  if (options.basePath) {
    resolverOptions.basePath = options.basePath;
  }
  return resolvePermutation(manifest, modifiers, resolverOptions);
}

/**
 * List all possible permutations from a manifest
 */
export async function listPermutations(
  manifest: UPFTResolverManifest,
  options: ResolveCommandOptions = {},
): Promise<ResolvedPermutation[]> {
  const resolverOptions: ResolverOptions = {};
  if (options.fileReader) {
    resolverOptions.fileReader = options.fileReader;
  }
  if (options.basePath) {
    resolverOptions.basePath = options.basePath;
  }
  return generateAllPermutations(manifest, resolverOptions);
}
