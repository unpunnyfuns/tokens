/**
 * Functional CLI commands API
 * Creates command executors with pre-configured options
 */

import type { BundleWriteResult } from "../bundler/index.js";
import type { LintResult } from "../linter/index.js";
import type {
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../manifest/upft-types.js";
import type { CLICommandOptions } from "../types/options.js";
import type { TokenDocument, ValidationResult } from "../types.js";
import type {
  BundleCommandOptions,
  DiffCommandOptions,
  LintCommandOptions,
  ListOptions,
  ManifestInfo,
  ResolveCommandOptions,
  TokenDiff,
  TokenListItem,
} from "./commands/index.js";
import {
  buildTokens,
  bundleTokens,
  diffDocuments,
  diffPermutations,
  getManifestInfo,
  lintFile,
  listPermutations,
  listTokens,
  resolveTokens,
  validateDirectory,
  validateManifestObject,
  validateTokenFile,
} from "./commands/index.js";

export type { ValidationResult } from "../types.js";
export type { ManifestInfo, TokenDiff } from "./commands/index.js";
export type CommandOptions = CLICommandOptions;

/**
 * Build options object from CLI options
 */
function buildOptions(options: CommandOptions): BundleCommandOptions {
  const result: BundleCommandOptions = {};
  if (options.fileReader) result.fileReader = options.fileReader;
  if (options.fileWriter) result.fileWriter = options.fileWriter;
  if (options.basePath) result.basePath = options.basePath;
  return result;
}

/**
 * Build resolver options from CLI options
 */
function buildResolverOptions(options: CommandOptions): ResolveCommandOptions {
  const result: ResolveCommandOptions = {};
  if (options.fileReader) result.fileReader = options.fileReader;
  if (options.basePath) result.basePath = options.basePath;
  return result;
}

/**
 * Create CLI command executors with options
 */
export function createCLI(options: CommandOptions = {}) {
  const bundleOpts = buildOptions(options);
  const resolverOpts = buildResolverOptions(options);
  const diffOpts: DiffCommandOptions = resolverOpts;

  return {
    // Validation commands
    validate: async (
      pathOrManifest: string | unknown,
    ): Promise<ValidationResult> => {
      if (typeof pathOrManifest === "string") {
        return validateTokenFile(pathOrManifest);
      }
      return validateManifestObject(pathOrManifest);
    },

    validateManifest: (manifest: unknown): Promise<ValidationResult> =>
      validateManifestObject(manifest),

    validateTokenFile: (filePath: string): Promise<ValidationResult> =>
      validateTokenFile(filePath),

    validateDirectory: (dirPath: string): Promise<ValidationResult> =>
      validateDirectory(dirPath),

    // Bundle commands
    build: (manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> =>
      buildTokens(manifest, bundleOpts),

    bundle: (manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> =>
      bundleTokens(manifest, bundleOpts),

    // Resolve commands
    resolve: (
      manifest: UPFTResolverManifest,
      modifiers: ResolutionInput = {},
    ): Promise<ResolvedPermutation> =>
      resolveTokens(manifest, modifiers, resolverOpts),

    list: (manifest: UPFTResolverManifest): Promise<ResolvedPermutation[]> =>
      listPermutations(manifest, resolverOpts),

    // List tokens command
    listTokens: (
      filePath: string,
      listOpts?: ListOptions,
    ): Promise<TokenListItem[]> => listTokens(filePath, listOpts),

    // Diff commands
    diff: (
      manifest: UPFTResolverManifest,
      leftModifiers: ResolutionInput = {},
      rightModifiers: ResolutionInput = {},
    ): Promise<TokenDiff> =>
      diffPermutations(manifest, leftModifiers, rightModifiers, diffOpts),

    diffDocuments: (
      leftDoc: TokenDocument,
      rightDoc: TokenDocument,
    ): Promise<TokenDiff> => diffDocuments(leftDoc, rightDoc),

    // Info command
    info: (manifest: UPFTResolverManifest): Promise<ManifestInfo> =>
      getManifestInfo(manifest),

    // Lint command
    lint: (
      filePath: string,
      lintOpts?: LintCommandOptions,
    ): Promise<LintResult> => lintFile(filePath, lintOpts),
  };
}
