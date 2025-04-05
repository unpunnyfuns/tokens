/**
 * Programmatic API for token bundling
 * Designed for integration with build tools and token processors like Terrazzo
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { bundle as bundleCore } from "./index.ts";
import { validateReferences } from "./reference-validator.ts";

export interface BundleOptions {
  manifest: string;
  theme?: string;
  mode?: string;
  resolveValues?: boolean;
  format?: "dtcg" | "json-schema" | "preserve";
  includeMetadata?: boolean;
}

export interface TokenStats {
  totalTokens: number;
  tokensByType: Record<string, number>;
  groups: number;
  maxDepth: number;
  hasReferences: boolean;
}

export interface BundleMetadata {
  bundleTime: number;
  manifest: string;
  theme: string | null;
  mode: string | null;
  format: string;
  resolvedValues: boolean;
  files: {
    loaded: string[];
    count: number;
  };
  stats: TokenStats;
}

export interface BundleResult {
  tokens: Record<string, unknown>;
  metadata: BundleMetadata | null;
  toJSON: () => string;
  getAST: () => Record<string, unknown>;
  validate: () => Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalReferences: number;
    validReferences: number;
    invalidReferences: number;
  };
}

export interface Token {
  $type?: string;
  $value?: unknown;
  $description?: string;
  $ref?: string;
  [key: string]: unknown;
}

export async function bundleWithMetadata(
  options: BundleOptions,
): Promise<BundleResult> {
  const startTime = Date.now();
  const { includeMetadata = true, ...bundleOptions } = options;

  // Track what files were loaded
  const loadedFiles = new Set<string>();
  const originalBundle = bundleCore.bind(null);

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
          stats: getTokenStats(tokens),
        }
      : null;

    return {
      tokens,
      metadata,
      // Methods for further processing
      toJSON: () => JSON.stringify(tokens, null, 2),
      getAST: () => buildAST(tokens) as unknown as Record<string, unknown>,
      validate: () =>
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
 * Build an AST representation of tokens
 * This provides a structured view that's easier for tools to process
 *
 * @param {Object} tokens - Token tree
 * @returns {Object} AST representation
 */
interface ASTNode {
  type: string;
  path: string;
  name: string;
  [key: string]: unknown;
}

interface AST {
  type: string;
  children: ASTNode[];
  tokens: ASTNode[];
  groups: ASTNode[];
  references: Array<{ from: string; to: string | null }>;
}

export function buildAST(tokens: Record<string, unknown>): AST {
  const ast: AST = {
    type: "TokenTree",
    children: [],
    tokens: [],
    groups: [],
    references: [],
  };

  function processNode(
    obj: Record<string, unknown>,
    path = "",
    parent: unknown = ast,
  ): void {
    for (const key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (isToken(value)) {
        const tokenValue = value as Token;
        const token = {
          type: "Token",
          path: currentPath,
          name: key,
          tokenType: tokenValue.$type,
          value: tokenValue.$value,
          description: tokenValue.$description,
          extensions: getExtensions(tokenValue),
          hasReference: hasReference(tokenValue.$value),
        };

        const parentWithTokens = parent as { tokens: ASTNode[] };
        parentWithTokens.tokens.push(token);
        ast.tokens.push(token);

        // Track references
        if (token.hasReference) {
          ast.references.push({
            from: currentPath,
            to: extractReference(tokenValue.$value),
          });
        }
      } else if (typeof value === "object" && value !== null) {
        const valueObj = value as Record<string, unknown>;
        const group = {
          type: "TokenGroup",
          path: currentPath,
          name: key,
          description: valueObj.$description,
          children: [],
          tokens: [],
          groups: [],
        };

        const parentWithGroups = parent as {
          groups: ASTNode[];
          children: ASTNode[];
        };
        parentWithGroups.groups.push(group);
        parentWithGroups.children.push(group);
        ast.groups.push(group);

        processNode(valueObj, currentPath, group);
      }
    }
  }

  processNode(tokens);

  return ast;
}

/**
 * Create a plugin for Terrazzo or similar tools
 *
 * @param {Object} config - Plugin configuration
 * @returns {Object} Plugin interface
 */
interface PluginOptions {
  resolveValues?: boolean;
  format?: string;
  basePath?: string;
  strict?: boolean;
}

export function createBundlerPlugin(config: Partial<BundleOptions> = {}) {
  return {
    name: "@unpunnyfuns/tokens-bundler",
    version: "0.1.0",

    /**
     * Parse tokens from manifest
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
     * Transform tokens
     */
    async transform(tokens: unknown, options: PluginOptions) {
      // Apply any transformations
      if (options.resolveValues) {
        const { resolveReferences } = await import("./resolver.ts");
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
     * Validate tokens
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
 * Get statistics about tokens
 */
function getTokenStats(tokens: Record<string, unknown>): TokenStats {
  const stats = {
    totalTokens: 0,
    tokensByType: {},
    groups: 0,
    maxDepth: 0,
    hasReferences: false,
  };

  function count(obj: Record<string, unknown>, depth = 0): void {
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    for (const key in obj) {
      const value = obj[key];

      if (isToken(value)) {
        const tokenValue = value as Token;
        stats.totalTokens++;
        const type = tokenValue.$type || "unknown";
        (stats.tokensByType as Record<string, number>)[type] =
          ((stats.tokensByType as Record<string, number>)[type] || 0) + 1;

        if (hasReference(tokenValue.$value)) {
          stats.hasReferences = true;
        }
      } else if (typeof value === "object" && value !== null) {
        stats.groups++;
        count(value as Record<string, unknown>, depth + 1);
      }
    }
  }

  count(tokens);
  return stats;
}

/**
 * Helper functions
 */

function isToken(obj: unknown): obj is Token {
  if (!obj || typeof obj !== "object") return false;
  const record = obj as Record<string, unknown>;
  return record.$value !== undefined || record.$ref !== undefined;
}

function hasReference(value: unknown): boolean {
  if (typeof value === "string") {
    return value.startsWith("{") && value.endsWith("}");
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return record.$ref !== undefined;
  }
  return false;
}

function extractReference(value: unknown): string | null {
  if (
    typeof value === "string" &&
    value.startsWith("{") &&
    value.endsWith("}")
  ) {
    return value.slice(1, -1);
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (record.$ref) return record.$ref as string;
  }
  return null;
}

function getExtensions(token: Token): Record<string, unknown> | null {
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
 * Export for use in build tools
 */
export default {
  bundle: bundleWithMetadata,
  buildAST,
  createPlugin: createBundlerPlugin,
};
