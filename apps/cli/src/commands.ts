/**
 * Functional CLI commands API
 * Creates command executors with pre-configured options
 */

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BundleWriteResult } from "@upft/bundler";
import type {
  TokenDocument,
  UPFTResolverManifest,
  ValidationResult,
} from "@upft/foundation";
import type { LintResult } from "@upft/linter";
import type {
  PipelineResolutionInput,
  PipelineResolvedPermutation,
} from "@upft/loader";
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
import type { CLICommandOptions } from "./types.js";

export type { ValidationResult } from "@upft/foundation";
export type { ManifestInfo, TokenDiff } from "./commands/index.js";
export type CommandOptions = CLICommandOptions;

/**
 * Helper function to write manifest object to temporary file
 */
function writeManifestToTempFile(manifest: UPFTResolverManifest): string {
  const tempDir = tmpdir();
  const fileName = `upft-manifest-${randomUUID()}.json`;
  const tempPath = join(tempDir, fileName);

  writeFileSync(tempPath, JSON.stringify(manifest, null, 2), "utf-8");
  return tempPath;
}

/**
 * Helper function to handle manifest path or object
 */
function ensureManifestPath(
  manifestOrPath: string | UPFTResolverManifest,
): string {
  if (typeof manifestOrPath === "string") {
    return manifestOrPath;
  }
  return writeManifestToTempFile(manifestOrPath);
}

/**
 * Build options object from CLI options
 */
function buildOptions(options: CommandOptions): BundleCommandOptions {
  const result: BundleCommandOptions = {};
  if (options.fileReader) result.fileReader = options.fileReader;
  if (options.fileWriter) result.fileWriter = options.fileWriter;
  if (options.basePath) result.basePath = options.basePath;
  if (options.outputDir) result.outputDir = options.outputDir;
  if (options.skipValidation) result.skipValidation = options.skipValidation;
  if (options.strict) result.strict = options.strict;
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
      pathOrManifest: string | UPFTResolverManifest,
    ): Promise<ValidationResult> => {
      if (typeof pathOrManifest === "string") {
        return validateTokenFile(pathOrManifest);
      }
      const manifestPath = ensureManifestPath(pathOrManifest);
      return validateManifestObject(manifestPath);
    },

    validateManifest: (
      manifest: UPFTResolverManifest,
    ): Promise<ValidationResult> => {
      const manifestPath = ensureManifestPath(manifest);
      return validateManifestObject(manifestPath);
    },

    validateManifestFile: (manifestPath: string): Promise<ValidationResult> =>
      validateManifestObject(manifestPath),

    validateTokenFile: (filePath: string): Promise<ValidationResult> =>
      validateTokenFile(filePath),

    validateDirectory: (dirPath: string): Promise<ValidationResult> =>
      validateDirectory(dirPath),

    // Bundle commands
    build: (manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> => {
      const manifestPath = ensureManifestPath(manifest);
      return buildTokens(manifestPath, bundleOpts);
    },

    buildFromFile: (manifestPath: string): Promise<BundleWriteResult[]> =>
      buildTokens(manifestPath, bundleOpts),

    buildFromConfig: async (
      configPath: string,
      options: { dryRun?: boolean } = {},
    ): Promise<BundleWriteResult[]> => {
      const { loadBuildConfig } = await import("@upft/bundler");
      const configResult = await loadBuildConfig(configPath);

      if (configResult.errors.length > 0) {
        throw new Error(
          `Build config errors: ${configResult.errors.join(", ")}`,
        );
      }

      const { config } = configResult;
      const results: BundleWriteResult[] = [];

      for (const output of config.outputs) {
        // For now, create a simple result - actual implementation would generate bundles
        const filePath = output.output.path.replace(
          /\{([^}]+)\}/g,
          (_match, key) => {
            const value = output.modifiers[key];
            return Array.isArray(value) ? value.join("-") : String(value);
          },
        );

        if (options.dryRun) {
          results.push({
            filePath,
            success: true,
          });
        } else {
          // TODO: Implement actual bundle generation from config
          results.push({
            filePath,
            success: true,
            error: "Build from config not fully implemented yet",
          });
        }
      }

      return results;
    },

    bundle: (manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> => {
      const manifestPath = ensureManifestPath(manifest);
      return bundleTokens(manifestPath, bundleOpts);
    },

    bundleFromFile: (manifestPath: string): Promise<BundleWriteResult[]> =>
      bundleTokens(manifestPath, bundleOpts),

    // Resolve commands
    resolve: (
      manifest: UPFTResolverManifest,
      modifiers: PipelineResolutionInput = {},
    ): Promise<PipelineResolvedPermutation> => {
      const manifestPath = ensureManifestPath(manifest);
      return resolveTokens(manifestPath, modifiers, resolverOpts);
    },

    resolveFromFile: (
      manifestPath: string,
      modifiers: PipelineResolutionInput = {},
    ): Promise<PipelineResolvedPermutation> =>
      resolveTokens(manifestPath, modifiers, resolverOpts),

    list: (
      manifest: UPFTResolverManifest,
    ): Promise<PipelineResolvedPermutation[]> => {
      const manifestPath = ensureManifestPath(manifest);
      return listPermutations(manifestPath, resolverOpts);
    },

    listFromFile: (
      manifestPath: string,
    ): Promise<PipelineResolvedPermutation[]> =>
      listPermutations(manifestPath, resolverOpts),

    // List tokens command
    listTokens: (
      filePath: string,
      listOpts?: ListOptions,
    ): Promise<TokenListItem[]> => listTokens(filePath, listOpts),

    // Diff commands
    diff: (
      manifest: UPFTResolverManifest,
      leftModifiers: PipelineResolutionInput = {},
      rightModifiers: PipelineResolutionInput = {},
    ): Promise<TokenDiff> => {
      const manifestPath = ensureManifestPath(manifest);
      return diffPermutations(
        manifestPath,
        leftModifiers,
        rightModifiers,
        diffOpts,
      );
    },

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
