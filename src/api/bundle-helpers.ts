/**
 * Helper functions for bundling operations
 */

import { countGroups } from "../analysis/token-analyzer.js";
import { createAST } from "../ast/ast-builder.js";
import { findAllTokens, getStatistics } from "../ast/query.js";
import { resolveASTReferences } from "../ast/resolver.js";
import type { ASTNode, GroupNode, TokenNode } from "../ast/types.js";
import { mergeTokens } from "../core/merge.js";
import { TokenFileReader } from "../io/file-reader.js";
import { resolvePermutation } from "../manifest/manifest-core.js";
import { readManifest } from "../manifest/manifest-reader.js";
import type { TokenValidationResult } from "../types/validation.js";
import type { TokenDocument } from "../types.js";
import { validateTokens } from "../validation/index.js";
import type { ApiBundleOptions, BundleMetadata, TokenAST } from "./types.js";

/**
 * Build modifiers from bundle options
 */
export function buildModifiers(
  options: ApiBundleOptions,
): Record<string, string> {
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
    tokens = mergeTokens(tokens, fileData.tokens);
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
  const ast = createAST(tokens);
  const allTokens = findAllTokens(ast);
  const stats = getStatistics(ast);

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
    const validationResult = validateTokens(tokens, {
      strict: true,
    });

    // Get reference stats from AST
    const resolutionErrors = resolveASTReferences(ast);
    const stats = getStatistics(ast);

    const result: TokenValidationResult = {
      valid: validationResult.valid && resolutionErrors.length === 0,
      errors: [
        ...validationResult.errors,
        ...resolutionErrors.map((e) => ({
          path: e.path,
          message: e.message,
          severity: "error" as const,
          rule: "reference",
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

    return result;
  };
}

/**
 * Extract AST information for bundle
 */
export function extractASTInfo(tokens: TokenDocument, ast: ASTNode): TokenAST {
  const allTokens = findAllTokens(ast);
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
