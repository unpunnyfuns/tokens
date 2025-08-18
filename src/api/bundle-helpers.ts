/**
 * Helper functions for bundling operations
 */

import { countGroups } from "../analysis/token-analyzer.js";
import { buildASTFromDocument } from "../ast/ast-builder.js";
import { getAllTokens, getASTStatistics } from "../ast/ast-statistics.js";
import { resolveReferences } from "../ast/reference-resolver.js";
import type { ASTNode, GroupNode, TokenNode } from "../ast/types.js";
import { dtcgMerge } from "../core/dtcg-merge.js";
import { TokenFileReader } from "../filesystem/file-reader.js";
import { readManifest } from "../resolver/manifest-reader.js";
import { resolvePermutation } from "../resolver/resolver-core.js";
import type { TokenDocument } from "../types.js";
import {
  TokenValidator,
  type TokenValidationResult,
} from "../validation/validator.js";
import type { BundleMetadata, BundleOptions, TokenAST } from "./types.js";

/**
 * Build modifiers from bundle options
 */
export function buildModifiers(options: BundleOptions): Record<string, string> {
  const modifiers: Record<string, string> = {};
  if (options.theme) modifiers.theme = options.theme;
  if (options.mode) modifiers.mode = options.mode;
  if (options.modifiers) Object.assign(modifiers, options.modifiers);
  return modifiers;
}

/**
 * Load tokens from manifest with modifiers
 */
export async function loadFromManifest(
  manifestPath: string,
  modifiers: Record<string, string>,
): Promise<{ tokens: TokenDocument; filePaths: string[] }> {
  const manifest = await readManifest(manifestPath);

  const resolvedTokens = await resolvePermutation(manifest, modifiers);
  const filePaths: string[] = [];

  if (manifest.sets) {
    for (const set of manifest.sets) {
      filePaths.push(...set.values);
    }
  }

  return { tokens: resolvedTokens.tokens, filePaths };
}

/**
 * Load tokens from file list
 */
export async function loadFromFiles(
  files: string[],
): Promise<{ tokens: TokenDocument; filePaths: string[] }> {
  const fileReader = new TokenFileReader();
  let tokens: TokenDocument = {};
  const filePaths: string[] = [];

  for (const file of files) {
    const fileData = await fileReader.readFile(file);
    tokens = dtcgMerge(tokens, fileData.tokens);
    filePaths.push(file);
  }

  return { tokens, filePaths };
}

/**
 * Create bundle metadata from tokens and file paths
 */
export function createBundleMetadata(
  tokens: TokenDocument,
  filePaths: string[],
  startTime: number,
): BundleMetadata {
  const ast = buildASTFromDocument(tokens);
  const allTokens = getAllTokens(ast);
  const stats = getASTStatistics(ast);

  // Count groups using the analyzer for consistency
  const groupCount = countGroups(tokens);

  return {
    files: {
      count: filePaths.length,
      paths: filePaths,
    },
    stats: {
      totalTokens: allTokens.length,
      totalGroups: groupCount,
      hasReferences: stats.tokensWithReferences > 0,
    },
    bundleTime: Date.now() - startTime,
  };
}

/**
 * Create validation function for bundle
 */
export function createValidationFunction(
  tokens: TokenDocument,
  ast: ASTNode,
): () => Promise<TokenValidationResult> {
  return async () => {
    const validator = await TokenValidator.create({ strict: true });
    const validationResult = await validator.validateDocument(tokens);

    // Get reference stats from AST
    const { errors: resolutionErrors } = resolveReferences(ast);
    const stats = getASTStatistics(ast);

    return {
      valid: validationResult.valid && resolutionErrors.length === 0,
      errors: [
        ...validationResult.errors,
        ...resolutionErrors.map((e) => ({
          path: e.path,
          message: e.message,
          severity: "error" as const,
        })),
      ],
      warnings: validationResult.warnings,
      stats: {
        totalTokens: stats.totalTokens,
        tokensWithReferences: stats.tokensWithReferences,
        validReferences: stats.tokensWithReferences - resolutionErrors.length,
        invalidReferences: resolutionErrors.length,
      },
    };
  };
}

/**
 * Extract AST information for bundle
 */
export function extractASTInfo(tokens: TokenDocument, ast: ASTNode): TokenAST {
  const allTokens = getAllTokens(ast);
  const groups: Record<string, unknown>[] = [];

  const isGroup = (obj: Record<string, unknown>): boolean => {
    return (
      !("$value" in obj) && Object.keys(obj).some((k) => !k.startsWith("$"))
    );
  };

  function collectGroups(node: unknown, path: string[] = []) {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    if (isGroup(obj)) {
      groups.push({ path: path.join("."), ...obj });
    }

    for (const key in obj) {
      if (!key.startsWith("$")) {
        collectGroups(obj[key], [...path, key]);
      }
    }
  }

  collectGroups(tokens);

  return {
    tokens: allTokens as TokenNode[],
    groups: groups as unknown as GroupNode[],
    references: [],
  };
}
