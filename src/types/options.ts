/**
 * Unified options interfaces to reduce duplication
 */

import type { TokenFileReader } from "../filesystem/file-reader.js";
import type { TokenFileWriter } from "../filesystem/file-writer.js";

/**
 * Base filesystem options used across many modules
 */
export interface BaseFileSystemOptions {
  /** Optional file reader for custom file system access */
  fileReader?: TokenFileReader;
  /** Base path for relative file resolution */
  basePath?: string;
}

/**
 * Options that include writing capabilities
 */
export interface FileSystemOptionsWithWriter extends BaseFileSystemOptions {
  /** Optional file writer for output operations */
  fileWriter?: TokenFileWriter;
}

/**
 * Resolver-specific options
 */
export interface ResolverOptions extends BaseFileSystemOptions {
  /** Whether to validate the manifest structure */
  validateManifest?: boolean;
}

/**
 * Bundler-specific options
 */
export interface BundlerOptions extends FileSystemOptionsWithWriter {
  /** Output format for bundles */
  outputFormat?: "dtcg" | "custom";
  /** Whether to prettify output */
  prettify?: boolean;
  /** Transform functions to apply */
  transforms?: Array<(tokens: unknown) => unknown>;
}

/**
 * CLI command options
 */
export interface CLICommandOptions extends FileSystemOptionsWithWriter {
  /** Additional command-specific options can extend this */
}

/**
 * Re-export specific option types for backward compatibility
 */
export type TokenCLIOptions = CLICommandOptions;
export type TokenBundlerOptions = BundlerOptions;
