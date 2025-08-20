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

export * from "./api/index.js";
export * from "./ast/index.js";
export * from "./bundler/index.js";
export * from "./core/index.js";
export * from "./io/index.js";
export * from "./manifest/index.js";
export * from "./references/index.js";
// Export all types from central location
export type {
  // AST types
  ASTNode,
  // Bundle types
  Bundle,
  BundleOptions,
  BundleResult,
  BundlerOptions,
  BundleWriteResult,
  CycleDetectionResult,
  GenerateSpec,
  GroupNode,
  ManifestValidationResult,
  // Path index types
  PathIndex,
  // Reference types
  ResolutionError,
  ResolutionInput,
  ResolvedPermutation,
  ResolveOptions,
  ResolveResult,
  // Options
  ResolverOptions,
  // Core token types
  Token,
  TokenDocument,
  TokenGroup,
  TokenNode,
  TokenValidationResult,
  TokenValue,
  // Manifest types
  UPFTResolverManifest,
  // Validation types
  ValidationError,
  ValidationResult,
  ValidationResultWithStats,
} from "./types/index.js";
export * from "./validation/index.js";
