/**
 * Core API for Advanced Users
 *
 * This module exports the core classes and utilities needed to build
 * tools, CLIs, and extensions on top of the token platform.
 *
 * For most use cases, use the high-level API from the main export instead.
 *
 * @module @unpunnyfuns/tokens/core
 */

// ============================================================================
// Core Classes for Tool Builders
// ============================================================================

// Bundler for creating token bundles
export { TokenBundler } from "./bundler/bundler.js";
export type {
  TokenBundlerOptions,
  BundleWriteResult,
  Bundle,
} from "./bundler/bundler.js";

// Validators
export { TokenValidator } from "./validation/validator.js";
export { ManifestValidator } from "./validation/manifest-validator.js";

// File system utilities
export { TokenFileReader } from "./filesystem/file-reader.js";
export { TokenFileWriter } from "./filesystem/file-writer.js";
export { TokenFileWatcher } from "./filesystem/file-watcher.js";
export { FileCache as TokenFileCache } from "./filesystem/cache.js";

// ============================================================================
// Resolver Functional API
// ============================================================================

export {
  resolvePermutation,
  generateAll as generateAllPermutations,
  type ResolverOptions,
} from "./resolver/resolver-core.js";

export { readManifest } from "./resolver/manifest-reader.js";

// ============================================================================
// AST and Analysis Tools
// ============================================================================

// AST building and querying
export { buildASTFromDocument } from "./ast/ast-builder.js";
export { ASTQuery } from "./ast/ast-query.js";
export { traverseAST } from "./ast/ast-traverser.js";
export { ReferenceResolver } from "./ast/reference-resolver.js";

// AST types for extension
export type {
  ASTNode,
  TokenNode,
  GroupNode,
} from "./ast/types.js";

// Analysis tools
export {
  analyzeTokens,
  countGroups,
  countTokens,
  findTokensByType,
  getTokenTypes,
} from "./analysis/token-analyzer.js";
export type { TokenAnalysis } from "./analysis/token-analyzer.js";

// Token comparison for diff tools
export {
  compareTokenDocuments,
  compareTokenDocumentsDetailed,
} from "./analysis/token-comparison.js";

// ============================================================================
// Core Types
// ============================================================================

export type {
  Token,
  TokenDocument,
  TokenGroup,
  ValidationResult,
  ValidationError,
} from "./types.js";

export type {
  UPFTResolverManifest,
  ResolutionInput,
  ResolvedPermutation,
  GenerateSpec,
  TokenSet,
  OneOfModifier,
  AnyOfModifier,
} from "./resolver/upft-types.js";

// ============================================================================
// Core Utilities
// ============================================================================

// DTCG-aware merge
export { dtcgMerge } from "./core/dtcg-merge.js";

// Token guards
export {
  isToken,
  isTokenGroup,
  isTokenDocument,
  isDTCGReference,
  isReference,
  hasValue,
  hasType,
} from "./core/token/guards.js";

// Token operations
export {
  mergeTokens,
  cloneToken,
  traverseTokens,
  extractReferences,
  hasCircularReference,
} from "./core/token/operations.js";

// Token path utilities
export {
  parsePath,
  joinPath,
  getParentPath,
  getTokenName,
  resolvePath,
  getTokenAtPath,
  setTokenAtPath,
  deleteTokenAtPath,
  getAllPaths,
} from "./core/token/path.js";
