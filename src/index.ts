/**
 * UPFT (UnPunny Fun Tokens) - Design Token Platform
 *
 * Main entry point for the token platform.
 * Import specific functionality from submodules:
 *
 * @example
 * ```typescript
 * // Token operations
 * import { validate } from '@unpunnyfuns/tokens/validation';
 * import { bundle } from '@unpunnyfuns/tokens/bundler';
 * import { resolveReferences } from '@unpunnyfuns/tokens/references';
 *
 * // AST operations
 * import { createAST, loadAST } from '@unpunnyfuns/tokens/ast';
 *
 * // I/O operations
 * import { TokenFileReader, TokenFileWriter } from '@unpunnyfuns/tokens/io';
 * ```
 *
 * @module @unpunnyfuns/tokens
 */

// Re-export all submodules for convenient access
// Each submodule has its own focused exports

export * from "./ast/index.js";
export * from "./bundler/index.js";
export * from "./validation/index.js";
export * from "./references/index.js";
export * from "./manifest/index.js";
export * from "./io/index.js";
export * from "./api/index.js";
export * from "./core/index.js";

// Export all types from central location
export type {
  // Core token types
  Token,
  TokenDocument,
  TokenGroup,
  TokenValue,
  // Validation types
  ValidationError,
  ValidationResult,
  ValidationResultWithStats,
  TokenValidationResult,
  ManifestValidationResult,
  // Bundle types
  Bundle,
  BundleOptions,
  BundleResult,
  BundleWriteResult,
  BundlerOptions,
  // AST types
  ASTNode,
  TokenNode,
  GroupNode,
  // Manifest types
  UPFTResolverManifest,
  ResolvedPermutation,
  GenerateSpec,
  ResolutionInput,
  // Options
  ResolverOptions,
  // Merge types
  MergeResult,
  MergeConflict,
  MergeTokensOptions,
  // Reference types
  ResolutionError,
  ResolveOptions,
  ResolveResult,
  CycleDetectionResult,
  // Path index types
  PathIndex,
} from "./types/index.js";
