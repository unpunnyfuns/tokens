/**
 * UPFT (UnPunny Fun Tokens) - Design Token Platform
 *
 * A comprehensive design token platform with DTCG-aware merging,
 * clean resolver format, and powerful tooling.
 */

// API exports
export {
  bundleWithMetadata,
  createResolverAPI,
  formatError,
  validateResolver,
} from "./api/index.js";
export {
  buildASTFromFileSystem,
  compare,
  TokenFileSystem,
  validateTokens,
  workflows,
} from "./api/workflows.js";
// Utilities
export { buildASTFromDocument } from "./ast/ast-builder.js";
export { ASTQuery } from "./ast/ast-query.js";
export {
  traverseAST,
  visitGroups,
  visitTokens,
  walkAST,
} from "./ast/ast-traverser.js";
export { resolveReferences } from "./ast/reference-resolver.js";
export { BundlerAPI, bundlerAPI } from "./bundler/api.js";
export type { Bundle, BundleWriteResult } from "./bundler/bundler.js";
export { TokenBundler } from "./bundler/bundler.js";
export type {
  ManifestInfo,
  TokenDiff,
  ValidationResult,
} from "./cli/commands.js";
export { TokenCLI } from "./cli/commands.js";
export { dtcgMerge } from "./core/dtcg-merge.js";
// Type guards
export {
  isReference,
  isToken,
  isTokenDocument,
  isTokenGroup as isGroup,
} from "./core/token/guards.js";
// Filesystem utilities
export { FileCache } from "./filesystem/cache.js";
export { TokenFileReader as FileReader } from "./filesystem/file-reader.js";
export { TokenFileWatcher as FileWatcher } from "./filesystem/file-watcher.js";
export { TokenFileWriter as FileWriter } from "./filesystem/file-writer.js";
export { UPFTResolver } from "./resolver/upft-resolver.js";
export type {
  AnyOfModifier,
  GenerateSpec,
  OneOfModifier,
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "./resolver/upft-types.js";
export {
  isAnyOfModifier,
  isOneOfModifier,
  isUPFTManifest,
} from "./resolver/upft-types.js";
// Types
export type { Token, TokenDocument, TokenGroup } from "./types.js";
export { ManifestValidator } from "./validation/manifest-validator.js";
export type { ValidationResult as TokenValidationResult } from "./validation/validator.js";
// Core modules
export { TokenValidator } from "./validation/validator.js";

// Re-export convenience functions from API modules

import { dtcgMerge } from "./core/dtcg-merge.js";
import type { TokenFileReader } from "./filesystem/file-reader.js";
import type { TokenFileWriter } from "./filesystem/file-writer.js";
import type {
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "./resolver/upft-types.js";
// Types for convenience functions
import type { TokenDocument } from "./types.js";

export interface ResolverOptions {
  fileReader?: TokenFileReader;
  basePath?: string;
}

export interface ParsedManifest {
  valid: boolean;
  manifest?: UPFTResolverManifest;
  errors: string[];
}

/**
 * Resolve a specific permutation from a manifest
 */
export async function resolveManifest(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
  options: ResolverOptions = {},
): Promise<ResolvedPermutation> {
  const { UPFTResolver } = await import("./resolver/upft-resolver.js");
  const resolver = new UPFTResolver(options);
  return resolver.resolvePermutation(manifest, input);
}

/**
 * Parse and validate a manifest
 */
export async function parseManifest(
  manifest: unknown,
): Promise<ParsedManifest> {
  const { ManifestValidator } = await import(
    "./validation/manifest-validator.js"
  );
  const validator = new ManifestValidator();

  try {
    const validation = validator.validateManifest(manifest);

    const result: ParsedManifest = {
      valid: validation.valid,
      errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
    };

    if (validation.valid) {
      result.manifest = manifest as UPFTResolverManifest;
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Merge two token documents using DTCG-aware merging
 */
export function mergeTokens(a: TokenDocument, b: TokenDocument): TokenDocument {
  return dtcgMerge(a, b);
}

/**
 * Create AST from token document
 */
export async function createAST(tokens: TokenDocument) {
  const { buildASTFromDocument } = await import("./ast/ast-builder.js");
  return buildASTFromDocument(tokens);
}

/**
 * Build all bundles from manifest
 */
export async function buildBundles(
  manifest: UPFTResolverManifest,
  options: ResolverOptions & { fileWriter?: TokenFileWriter } = {},
): Promise<unknown[]> {
  const { TokenCLI } = await import("./cli/commands.js");
  const cli = new TokenCLI(options);
  return cli.build(manifest);
}

/**
 * Format tokens for different output formats
 */
export function formatTokens(tokens: TokenDocument): string {
  // DTCG format only
  return JSON.stringify(tokens, null, 2);
}
