/**
 * @module api/cli-commands
 * @description High-level API functions for CLI commands
 */

import { writeFile } from "node:fs/promises";
import { type BundleOptions, bundleWithMetadata } from "../bundler/api.ts";
import { validateFiles } from "../validation/index.ts";

/**
 * Options for the validate command
 */
export interface ValidateCommandOptions {
  path: string;
  verbose?: boolean;
}

/**
 * Result of the validate command
 */
export interface ValidateResult {
  valid: boolean;
  message: string;
  details?: string;
}

/**
 * Options for the bundle command
 */
export interface BundleCommandOptions {
  manifest: string;
  output?: string;
  theme?: string;
  mode?: string;
  format?: "json-schema" | "dtcg" | "preserve";
  resolveRefs?: boolean;
  resolveExternal?: boolean;
  preserveExternal?: boolean;
  convertInternal?: boolean;
  quiet?: boolean;
  pretty?: boolean;
}

/**
 * Result of the bundle command
 */
export interface BundleCommandResult {
  tokens: Record<string, unknown>;
  output: string;
  metadata?: {
    filesLoaded: number;
    totalTokens: number;
    hasReferences: boolean;
    validationErrors?: string[];
  };
}

/**
 * Options for the AST command
 */
export interface ASTCommandOptions {
  manifest: string;
  theme?: string;
  mode?: string;
  output?: string;
  pretty?: boolean;
}

/**
 * Result of the AST command
 */
export interface ASTCommandResult {
  ast: Record<string, unknown>;
  output: string;
  metadata: {
    generated: string;
    manifest: string;
    theme: string | null;
    mode: string | null;
    stats?: unknown;
  };
}

/**
 * Execute the validate command logic
 */
export async function executeValidate(
  options: ValidateCommandOptions,
): Promise<ValidateResult> {
  try {
    const valid = await validateFiles(options.path);

    return {
      valid,
      message: valid
        ? "✅ Token validation passed!"
        : "❌ Token validation failed",
    };
  } catch (error) {
    const err = error as Error;
    return {
      valid: false,
      message: `Validation error: ${err.message}`,
      details: options.verbose ? err.stack : undefined,
    };
  }
}

/**
 * Execute the bundle command logic
 */
export async function executeBundle(
  options: BundleCommandOptions,
): Promise<BundleCommandResult> {
  // Prepare bundle options
  const bundleOptions: BundleOptions = {
    manifest: options.manifest,
    theme: options.theme,
    mode: options.mode,
    format: options.format || "json-schema",
    resolveValues: options.resolveRefs && !options.resolveExternal,
    includeMetadata: !options.quiet,
  };

  // Execute bundling
  const result = await bundleWithMetadata(bundleOptions);

  // Prepare metadata
  const metadata: BundleCommandResult["metadata"] = result.metadata
    ? {
        filesLoaded: result.metadata.files.count,
        totalTokens: result.metadata.stats.totalTokens,
        hasReferences: result.metadata.stats.hasReferences,
      }
    : undefined;

  // Validate references if not resolving
  if (!bundleOptions.resolveValues && !options.quiet) {
    const validation = await result.validate();
    if (!validation.valid && metadata) {
      metadata.validationErrors = validation.errors;
    }
  }

  // Format output
  const output =
    options.pretty !== false ? result.toJSON() : JSON.stringify(result.tokens);

  // Write to file if specified
  if (options.output) {
    await writeFile(options.output, output);
  }

  return {
    tokens: result.tokens,
    output,
    metadata,
  };
}

/**
 * Execute the AST command logic
 */
export async function executeAST(
  options: ASTCommandOptions,
): Promise<ASTCommandResult> {
  // Use bundler API to get tokens and AST
  const result = await bundleWithMetadata({
    manifest: options.manifest,
    theme: options.theme,
    mode: options.mode,
    format: "preserve",
    includeMetadata: true,
  });

  const ast = result.getAST();

  // Prepare metadata
  const metadata: ASTCommandResult["metadata"] = {
    generated: new Date().toISOString(),
    manifest: options.manifest,
    theme: options.theme || null,
    mode: options.mode || null,
    stats: result.metadata ? result.metadata.stats : undefined,
  };

  // Create full output structure
  const astOutput = {
    ast,
    metadata,
  };

  // Format output
  const output =
    options.pretty !== false
      ? JSON.stringify(astOutput, null, 2)
      : JSON.stringify(astOutput);

  // Write to file if specified
  if (options.output) {
    await writeFile(options.output, output);
  }

  return {
    ast,
    output,
    metadata,
  };
}

/**
 * Helper to format error messages consistently
 */
export function formatError(error: unknown, verbose = false): string {
  const err = error as Error;
  const message = err.message || String(error);
  return verbose && err.stack ? `${message}\n${err.stack}` : message;
}

/**
 * Helper to determine exit code based on result
 */
export function getExitCode(result: { valid?: boolean } | boolean): number {
  if (typeof result === "boolean") {
    return result ? 0 : 1;
  }
  return result.valid ? 0 : 1;
}
