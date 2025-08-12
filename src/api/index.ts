/**
 * @module api
 * @description Public API for the DTCG Schema library
 */

// Bundler API
export {
  type BundleMetadata,
  type BundleOptions,
  type BundleResult,
  type BundleTokenStats,
  bundleWithMetadata,
  createBundlerPlugin,
  type Token,
  type ValidationResult as BundlerValidationResult,
} from "../bundler/api.ts";
export {
  convertRefToAlias,
  convertToDTCG,
} from "../bundler/dtcg-exporter.ts";
export {
  checkForExternalReferences,
  loadExternalFile,
  resolveExternalReferences,
} from "../bundler/external-resolver.ts";
export { bundle } from "../bundler/index.ts";
// Re-export commonly used types
export type {
  ASTStats,
  ReferenceInfo,
} from "../core/ast.ts";
// Core functionality
export {
  type ASTGroup,
  type ASTToken,
  buildEnhancedAST,
  type EnhancedAST,
} from "../core/ast.ts";
export {
  getEnhancedAST,
  type ValidationIssue,
  type ValidationOptions,
  type ValidationResult,
  validateReferences,
  validateWithAST,
} from "../core/ast-validator.ts";
export {
  isValidReferenceFormat,
  parseReference,
  ReferenceResolver,
  type ResolverOptions,
  resolveReferences,
} from "../core/resolver.ts";
// Utility functions
export { getTokenStats, type TokenStats } from "../core/utils.ts";
// Validation API
export { validateFiles } from "../validation/index.ts";
export {
  resolveTokens,
  validateResolverManifest,
} from "../validation/manifest-validator.ts";
export {
  type FileValidationResult,
  validateTokenFile,
} from "../validation/token-validator.ts";
export { getProjectRoot } from "../validation/utils.ts";
// CLI Commands API
export {
  type ASTCommandOptions,
  type ASTCommandResult,
  type BundleCommandOptions,
  type BundleCommandResult,
  executeAST,
  executeBundle,
  executeValidate,
  formatError,
  getExitCode,
  type ValidateCommandOptions,
  type ValidateResult,
} from "./cli-commands.ts";
