/**
 * Types for the pipeline loader
 */

import type { ManifestAST, TokenAST } from "@upft/ast";
import type { ValidationResult } from "@upft/foundation";

export interface LoadOptions {
  /** Base directory for resolving relative paths */
  basePath?: string;
  /** Validate files against schema */
  validate?: boolean;
  /** Parse files to AST */
  parseToAST?: boolean;
}

export interface FileInfo {
  /** Absolute path to the file */
  path: string;
  /** File content as string */
  content: string;
  /** Detected file type */
  type: "manifest" | "tokens" | "unknown";
}

export interface LoadedFile {
  /** File information */
  info: FileInfo;
  /** Parsed JSON data */
  data: unknown;
  /** Schema validation result */
  validation: ValidationResult;
  /** Generated AST (if parseToAST enabled) */
  ast?: TokenAST | ManifestAST;
  /** Parsing warnings */
  parseWarnings?: string[];
}

export interface LoadResult {
  /** Successfully loaded files */
  files: LoadedFile[];
  /** Any errors encountered during loading */
  errors: string[];
  /** Entry point file (first file loaded) */
  entryPoint: string;
}
