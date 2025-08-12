/**
 * @module bundler/api
 * @description Programmatic API for token bundling with metadata and validation.
 * Designed for integration with build tools and token processors like Terrazzo.
 */

import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildEnhancedAST } from "../core/ast.ts";
import { validateReferences } from "../core/ast-validator.ts";
import { getTokenStats, hasReference } from "../core/utils.ts";
import { bundle as bundleCore } from "./index.ts";

/**
 * Options for bundling tokens with metadata.
 */
export interface BundleOptions {
  /** Path to the manifest.json file */
  manifest: string;
  /** Theme modifier to apply */
  theme?: string;
  /** Mode modifier to apply */
  mode?: string;
  /** Whether to resolve all references to actual values */
  resolveValues?: boolean;
  /** Output format for references */
  format?: "dtcg" | "json-schema" | "preserve";
  /** Whether to include metadata in the result */
  includeMetadata?: boolean;
}

// Re-export TokenStats from utils
import type { TokenStats as CoreTokenStats } from "../core/utils.ts";

/**
 * Extended statistics about the bundled tokens.
 */
export interface BundleTokenStats extends CoreTokenStats {
  /** Whether the bundle contains references */
  hasReferences: boolean;
}

/**
 * Metadata about the bundle operation.
 */
export interface BundleMetadata {
  /** Time taken to bundle in milliseconds */
  bundleTime: number;
  /** Path to the manifest file used */
  manifest: string;
  /** Theme modifier applied */
  theme: string | null;
  /** Mode modifier applied */
  mode: string | null;
  /** Output format used */
  format: string;
  /** Whether values were resolved */
  resolvedValues: boolean;
  /** Information about loaded files */
  files: {
    /** List of files loaded during bundling */
    loaded: string[];
    /** Total number of files loaded */
    count: number;
  };
  /** Token statistics */
  stats: BundleTokenStats;
}

/**
 * Result of a bundle operation with utility methods.
 */
export interface BundleResult {
  /** The bundled token tree */
  tokens: Record<string, unknown>;
  /** Bundle metadata (if includeMetadata was true) */
  metadata: BundleMetadata | null;
  /** Convert tokens to formatted JSON string */
  toJSON: () => string;
  /** Get enhanced AST representation of tokens */
  getAST: () => Record<string, unknown>;
  /** Validate all references in the bundle */
  validate: () => Promise<ValidationResult>;
}

/**
 * Result of reference validation.
 */
export interface ValidationResult {
  /** Whether all references are valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Reference validation statistics */
  stats: {
    /** Total number of references found */
    totalReferences: number;
    /** Number of valid references */
    validReferences: number;
    /** Number of invalid references */
    invalidReferences: number;
  };
}

// Token type definition
export interface Token {
  $type?: string;
  $value?: unknown;
  $description?: string;
  [key: string]: unknown;
}

/**
 * Bundles tokens with detailed metadata and validation support.
 * @param options - Bundle configuration
 * @returns Bundle result with tokens, metadata, and utility methods
 * @example
 * const result = await bundleWithMetadata({
 *   manifest: "/project/manifest.json",
 *   theme: "dark",
 *   format: "dtcg",
 *   includeMetadata: true
 * })
 * console.log(result.metadata.stats.totalTokens)
 * const valid = await result.validate()
 */
export async function bundleWithMetadata(
  options: BundleOptions,
): Promise<BundleResult> {
  const startTime = Date.now();
  const { includeMetadata = true, ...bundleOptions } = options;

  // Track what files were loaded
  const loadedFiles = new Set<string>();
  const _originalBundle = bundleCore.bind(null);

  // Temporarily patch readFile to track loaded files
  const globalWithReadFile = global as unknown as { _readFile?: unknown };
  const originalReadFile = globalWithReadFile._readFile || readFile;
  if (includeMetadata) {
    globalWithReadFile._readFile = async (path: string, ...args: unknown[]) => {
      loadedFiles.add(path);
      return (originalReadFile as unknown as (...args: unknown[]) => unknown)(
        path,
        ...args,
      );
    };
  }

  try {
    // Bundle the tokens
    const tokens = await bundleCore(bundleOptions);

    // Build metadata if requested
    const metadata = includeMetadata
      ? {
          bundleTime: Date.now() - startTime,
          manifest: options.manifest,
          theme: options.theme || null,
          mode: options.mode || null,
          format: options.format || "dtcg",
          resolvedValues: options.resolveValues || false,
          files: {
            loaded: Array.from(loadedFiles),
            count: loadedFiles.size,
          },
          stats: (() => {
            const baseStats = getTokenStats(tokens);
            return {
              ...baseStats,
              hasReferences: hasReference(tokens),
            };
          })(),
        }
      : null;

    return {
      tokens,
      metadata,
      // Methods for further processing
      toJSON: () => JSON.stringify(tokens, null, 2),
      getAST: () =>
        buildEnhancedAST(tokens) as unknown as Record<string, unknown>,
      validate: async () =>
        validateReferences(tokens, { basePath: dirname(options.manifest) }),
    };
  } finally {
    // Restore original readFile
    if (includeMetadata) {
      globalWithReadFile._readFile = originalReadFile;
    }
  }
}

/**
 * Options for plugin operations.
 */
interface PluginOptions {
  /** Whether to resolve references to values */
  resolveValues?: boolean;
  /** Output format */
  format?: string;
  /** Base path for file resolution */
  basePath?: string;
  /** Whether to use strict validation */
  strict?: boolean;
}

/**
 * Creates a plugin for Terrazzo or similar token processing tools.
 * @param config - Default configuration for the plugin
 * @returns Plugin interface with parse, transform, and validate methods
 * @example
 * const plugin = createBundlerPlugin({
 *   format: "dtcg",
 *   resolveValues: false
 * })
 * const { tokens, ast, metadata } = await plugin.parse({ manifest: "./manifest.json" })
 */
export function createBundlerPlugin(config: Partial<BundleOptions> = {}) {
  return {
    name: "@unpunnyfuns/tokens-bundler",
    version: "0.1.0",

    /**
     * Parses tokens from a manifest file.
     * @param options - Override options for this parse operation
     * @returns Tokens, AST, and metadata
     */
    async parse(options: Partial<BundleOptions> = {}) {
      const mergedOptions: BundleOptions = {
        manifest: options.manifest || config.manifest || "",
        ...config,
        ...options,
        includeMetadata: true,
      };
      const result = await bundleWithMetadata(mergedOptions);

      return {
        tokens: result.tokens,
        ast: result.getAST(),
        metadata: result.metadata,
      };
    },

    /**
     * Transforms tokens based on options.
     * @param tokens - Token tree to transform
     * @param options - Transformation options
     * @returns Transformed tokens
     */
    async transform(tokens: unknown, options: PluginOptions) {
      // Apply any transformations
      if (options.resolveValues) {
        const { resolveReferences } = await import("../core/resolver.ts");
        return resolveReferences(tokens as Record<string, unknown>, {
          mode: true,
        });
      }

      if (options.format === "dtcg") {
        const { convertToDTCG } = await import("./dtcg-exporter.ts");
        return convertToDTCG(tokens as Record<string, unknown>);
      }

      return tokens;
    },

    /**
     * Validates token references.
     * @param tokens - Token tree to validate
     * @param options - Validation options
     * @returns Validation result
     */
    async validate(tokens: unknown, options: PluginOptions) {
      return validateReferences(tokens as Record<string, unknown>, {
        basePath: options.basePath || process.cwd(),
        strict: options.strict || false,
      });
    },
  };
}

/**
 * Extracts extension properties from a token (properties starting with $ except standard ones).
 * @param token - Token to extract extensions from
 * @returns Extension properties or null if none found
 * @private
 */
function _getExtensions(token: Token): Record<string, unknown> | null {
  const extensions: Record<string, unknown> = {};
  for (const key in token) {
    if (
      key.startsWith("$") &&
      key !== "$type" &&
      key !== "$value" &&
      key !== "$description"
    ) {
      extensions[key] = token[key];
    }
  }
  return Object.keys(extensions).length > 0 ? extensions : null;
}

/**
 * Default export for use in build tools.
 * Provides bundling, AST building, and plugin creation utilities.
 */
export default {
  bundle: bundleWithMetadata,
  buildAST: buildEnhancedAST,
  createPlugin: createBundlerPlugin,
};
