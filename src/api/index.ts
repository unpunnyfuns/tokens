/**
 * API Convenience Layer
 * High-level functions for common token operations
 */

import { TokenAnalyzer } from "../analysis/token-analyzer.js";
import { buildASTFromDocument } from "../ast/ast-builder.js";
import { ASTQuery } from "../ast/ast-query.js";
import { ReferenceResolver } from "../ast/reference-resolver.js";
import type { GroupNode, TokenNode } from "../ast/types.js";
import { TokenBundler } from "../bundler/bundler.js";
import { dtcgMerge } from "../core/dtcg-merge.js";
import { TokenFileReader } from "../filesystem/file-reader.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import { ManifestReader } from "../filesystem/manifest-reader.js";
import { UPFTResolver } from "../resolver/upft-resolver.js";
import type { UPFTResolverManifest } from "../resolver/upft-types.js";
import type { TokenDocument } from "../types.js";
import { ManifestValidator } from "../validation/manifest-validator.js";
import {
  type TokenValidationResult,
  TokenValidator,
} from "../validation/validator.js";

export interface BundleOptions {
  manifest?: string;
  files?: string[];
  modifiers?: Record<string, string>;
  theme?: string;
  mode?: string;
  includeMetadata?: boolean;
  resolveValues?: boolean;
  format?: "json" | "json5" | "yaml";
}

export interface BundleResult {
  tokens: TokenDocument;
  metadata?: BundleMetadata;
  validate: () => Promise<TokenValidationResult>;
  getAST: () => TokenAST;
  write: (path: string) => Promise<void>;
}

export interface BundleMetadata {
  files: {
    count: number;
    paths: string[];
  };
  stats: {
    totalTokens: number;
    totalGroups: number;
    hasReferences: boolean;
  };
  bundleTime: number;
}

export interface TokenAST {
  tokens: TokenNode[];
  groups: GroupNode[];
  references?: string[];
}

/**
 * Helper to build modifiers from options
 */
function buildModifiers(options: BundleOptions): Record<string, string> {
  const modifiers: Record<string, string> = {};
  if (options.theme) modifiers.theme = options.theme;
  if (options.mode) modifiers.mode = options.mode;
  if (options.modifiers) Object.assign(modifiers, options.modifiers);
  return modifiers;
}

/**
 * Helper to load tokens from manifest
 */
async function loadFromManifest(
  manifestPath: string,
  modifiers: Record<string, string>,
): Promise<{ tokens: TokenDocument; filePaths: string[] }> {
  const manifestReader = new ManifestReader();
  const resolver = new UPFTResolver();
  const manifest = await manifestReader.readManifest(manifestPath);

  const resolvedTokens = await resolver.resolvePermutation(manifest, modifiers);
  const filePaths: string[] = [];

  if (manifest.sets) {
    for (const set of manifest.sets) {
      filePaths.push(...set.values);
    }
  }

  return { tokens: resolvedTokens.tokens, filePaths };
}

/**
 * Helper to load tokens from files
 */
async function loadFromFiles(
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
 * Bundle tokens with metadata and validation
 */
export async function bundleWithMetadata(
  options: BundleOptions,
): Promise<BundleResult> {
  const startTime = Date.now();
  const fileWriter = new TokenFileWriter();

  // Load tokens based on input type
  const { tokens, filePaths } = options.manifest
    ? await loadFromManifest(options.manifest, buildModifiers(options))
    : options.files
      ? await loadFromFiles(options.files)
      : { tokens: {}, filePaths: [] };

  // Build AST and analyze
  const ast = buildASTFromDocument(tokens);
  const query = new ASTQuery(ast);
  const allTokens = query.getAllTokens();
  const stats = query.getStatistics();

  // Count groups using the analyzer for consistency
  const analyzer = new TokenAnalyzer();
  const groupCount = analyzer.countGroups(tokens);

  // Build metadata
  const metadata: BundleMetadata = {
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

  // Create result object with methods
  const result: BundleResult = {
    tokens,
    ...(options.includeMetadata && { metadata }),

    async validate(): Promise<TokenValidationResult> {
      const validator = await TokenValidator.create({ strict: true });
      const validationResult = await validator.validateDocument(tokens);

      // Get reference stats from AST
      const referenceResolver = new ReferenceResolver(ast);
      const resolutionErrors = referenceResolver.resolve();

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
    },

    getAST(): TokenAST {
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
    },

    async write(path: string): Promise<void> {
      await fileWriter.writeFile(path, tokens, {
        format: {
          type: options.format || "json",
          sortKeys: false,
        },
      });
    },
  };

  return result;
}

/**
 * Format error for display
 */
export function formatError(error: unknown, verbose = false): string {
  if (error instanceof Error) {
    if (verbose) {
      return `${error.message}\n${error.stack}`;
    }
    return error.message;
  }
  return String(error);
}

/**
 * Create resolver API with convenience methods
 */
export function createResolverAPI() {
  const resolver = new UPFTResolver();
  const manifestReader = new ManifestReader();

  return {
    /**
     * Bundle tokens from manifest with modifiers
     */
    async bundleFromManifest(
      manifestPath: string,
      options: {
        modifiers?: Record<string, string>;
        format?: "dtcg" | "standard";
      } = {},
    ): Promise<TokenDocument> {
      const manifest = await manifestReader.readManifest(manifestPath);
      const result = await resolver.resolvePermutation(
        manifest,
        options.modifiers || {},
      );
      return result.tokens;
    },

    /**
     * Load and resolve with multiple actions
     */
    async loadAndResolve(
      manifestPath: string,
      modifiers: Record<string, string> = {},
    ) {
      const manifest = await manifestReader.readManifest(manifestPath);
      const result = await resolver.resolvePermutation(manifest, modifiers);
      const ast = buildASTFromDocument(result.tokens);

      return {
        ast,
        bundle: () => {
          // Just return the resolved tokens
          return result.tokens;
        },
        validate: async () => {
          const validator = await TokenValidator.create();
          return validator.validateDocument(result.tokens);
        },
        switchTo: async (newModifiers: Record<string, string>) => {
          const newResult = await resolver.resolvePermutation(
            manifest,
            newModifiers,
          );
          return buildASTFromDocument(newResult.tokens);
        },
      };
    },
  };
}

/**
 * Validate resolver manifest
 */
export async function validateResolver(
  manifestPath: string,
  options: {
    allPermutations?: boolean;
    crossPermutation?: boolean;
  } = {},
): Promise<{
  valid: boolean;
  errors: string[];
  permutationResults?: Array<{
    permutation: string;
    valid: boolean;
    errors: string[];
  }>;
}> {
  const validator = await TokenValidator.create();
  const resolver = new UPFTResolver();
  const manifestReader = new ManifestReader();
  const manifestValidator = new ManifestValidator();

  const manifest = await manifestReader.readManifest(manifestPath);

  // Validate manifest structure
  const manifestValidation = manifestValidator.validateManifest(manifest);
  if (!manifestValidation.valid) {
    return {
      valid: false,
      errors: manifestValidation.errors.map((e) => e.message),
    };
  }

  // Optionally validate all permutations
  if (options.allPermutations) {
    const permutationResults = [];
    const allModifierCombinations = generateAllCombinations(manifest.modifiers);

    for (const modifiers of allModifierCombinations) {
      const permId = Object.entries(modifiers)
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      try {
        const result = await resolver.resolvePermutation(manifest, modifiers);
        const validation = await validator.validateDocument(result.tokens);
        permutationResults.push({
          permutation: permId,
          valid: validation.valid,
          errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
        });
      } catch (error) {
        permutationResults.push({
          permutation: permId,
          valid: false,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    return {
      valid: permutationResults.every((r) => r.valid),
      errors: [],
      permutationResults,
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Generate all modifier combinations
 */
function generateAllCombinations(
  modifiers: Record<string, { oneOf?: string[]; anyOf?: string[] }>,
): Record<string, string>[] {
  const combinations: Record<string, string>[] = [];
  const modifierNames = Object.keys(modifiers || {});

  if (modifierNames.length === 0) return [{}];

  const getModifierValues = (modifier: {
    oneOf?: string[];
    anyOf?: string[];
  }): string[] => {
    if (modifier?.oneOf) return modifier.oneOf;
    if (modifier?.anyOf) return modifier.anyOf;
    return [];
  };

  function generate(index: number, current: Record<string, string>) {
    if (index === modifierNames.length) {
      combinations.push({ ...current });
      return;
    }

    const name = modifierNames[index];
    if (!name) return;

    const modifier = modifiers[name];
    if (!modifier) return;
    const values = getModifierValues(modifier);

    for (const value of values) {
      const newCurrent = { ...current, [name]: value };
      generate(index + 1, newCurrent);
    }
  }

  generate(0, {});
  return combinations;
}

// Export core modules
export {
  TokenValidator,
  UPFTResolver,
  TokenBundler,
  TokenFileReader,
  TokenFileWriter,
};
export { buildASTFromDocument, ASTQuery, ReferenceResolver };
export { type TokenAnalysis, TokenAnalyzer } from "../analysis/index.js";
export { ManifestReader } from "../filesystem/manifest-reader.js";
export { ManifestValidator } from "../validation/manifest-validator.js";
export { TokenFileSystem } from "./token-file-system.js";

// Wrapper class for ASTBuilder compatibility
export class ASTBuilder {
  build(tokens: TokenDocument) {
    return buildASTFromDocument(tokens);
  }
}
export type { TokenDocument, UPFTResolverManifest };
