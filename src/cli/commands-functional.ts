/**
 * Functional CLI commands API
 * Creates command executors with pre-configured options
 */

import type { BundleWriteResult } from "../bundler/bundler.js";
import type {
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../resolver/upft-types.js";
import type { TokenDocument, ValidationResult } from "../types.js";
import type { CLICommandOptions } from "../types/options.js";
import type {
  ManifestInfo,
  TokenDiff,
  ListOptions,
  TokenListItem,
  BundleCommandOptions,
  DiffCommandOptions,
  ResolveCommandOptions,
} from "./commands/index.js";
import {
  validateManifest,
  validateTokenFile,
  validateDirectory,
  buildTokens,
  bundleTokens,
  resolveTokens,
  listPermutations,
  listTokens,
  diffDocuments,
  diffPermutations,
  getManifestInfo,
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
      return validateManifest(pathOrManifest);
    },

    validateManifest: (manifest: unknown): Promise<ValidationResult> =>
      validateManifest(manifest),

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
  };
}

/**
 * Legacy class for backwards compatibility
 * @deprecated Use createCLI() instead
 */
export class TokenCLI {
  private cli: ReturnType<typeof createCLI>;

  constructor(options: CommandOptions = {}) {
    this.cli = createCLI(options);
  }

  async validate(pathOrManifest: string | unknown): Promise<ValidationResult> {
    return this.cli.validate(pathOrManifest);
  }

  async validateManifest(manifest: unknown): Promise<ValidationResult> {
    return this.cli.validateManifest(manifest);
  }

  async validateTokenFile(filePath: string): Promise<ValidationResult> {
    return this.cli.validateTokenFile(filePath);
  }

  async validateDirectory(dirPath: string): Promise<ValidationResult> {
    return this.cli.validateDirectory(dirPath);
  }

  async build(manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> {
    return this.cli.build(manifest);
  }

  async bundle(manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> {
    return this.cli.bundle(manifest);
  }

  async resolve(
    manifest: UPFTResolverManifest,
    modifiers: ResolutionInput = {},
  ): Promise<ResolvedPermutation> {
    return this.cli.resolve(manifest, modifiers);
  }

  async list(manifest: UPFTResolverManifest): Promise<ResolvedPermutation[]> {
    return this.cli.list(manifest);
  }

  async listTokens(
    filePath: string,
    options?: ListOptions,
  ): Promise<TokenListItem[]> {
    return this.cli.listTokens(filePath, options);
  }

  async diff(
    manifest: UPFTResolverManifest,
    leftModifiers: ResolutionInput = {},
    rightModifiers: ResolutionInput = {},
  ): Promise<TokenDiff> {
    return this.cli.diff(manifest, leftModifiers, rightModifiers);
  }

  async diffDocuments(
    leftDoc: TokenDocument,
    rightDoc: TokenDocument,
  ): Promise<TokenDiff> {
    return this.cli.diffDocuments(leftDoc, rightDoc);
  }

  async info(manifest: UPFTResolverManifest): Promise<ManifestInfo> {
    return this.cli.info(manifest);
  }
}
