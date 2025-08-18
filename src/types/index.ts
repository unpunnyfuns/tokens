/**
 * Centralized type exports
 *
 * This module re-exports all types from their specialized modules
 * for convenient importing throughout the codebase.
 */

// AST types
export type {
  ASTNode,
  ASTStatistics,
  GroupNode,
  ReferenceGraph,
  ResolutionError,
  TokenNode,
} from "../ast/types.js";

// Bundle types
export type {
  Bundle,
  BundleWriteResult,
  TokenTransform,
} from "../bundler/bundler-functional.js";

// API types
export type {
  ApiBundleOptions as BundleOptions,
  BundleResult,
  BundleMetadata,
} from "../api/types.js";

// Merge types
export type {
  MergeResult,
  MergeConflict,
  MergeTokensOptions,
} from "../core/merge.js";

// Reference types
export type {
  ResolveOptions,
  ResolveResult,
} from "../references/resolver.js";

export type { CycleDetectionResult } from "../references/cycle-detector.js";

// Path index type
export type { PathIndex } from "../core/path-index.js";
// Filesystem types
export type { CacheEntry, TokenFile } from "../io/types.js";
// Resolver types
export type {
  AnyOfModifier,
  GenerateSpec,
  InputValidation,
  OneOfModifier,
  ResolutionInput,
  ResolvedPermutation,
  TokenSet,
  UPFTResolverManifest,
} from "../manifest/upft-types.js";
// Core token types
export type {
  DTCGReference,
  JSONSchemaReference,
  Token,
  TokenDocument,
  TokenGroup,
  TokenValue,
} from "../types.js";
// Option types
export type {
  BaseFileSystemOptions,
  BundlerOptions,
  CLICommandOptions,
  FileSystemOptionsWithWriter,
  ResolverOptions,
} from "./options.js";
// Validation types
export type {
  ManifestValidationResult,
  TokenValidationResult,
  ValidationError,
  ValidationResult,
  ValidationResultWithStats,
  ValidationStats,
} from "./validation.js";
