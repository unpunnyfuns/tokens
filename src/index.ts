/**
 * UPFT (UnPunny Fun Tokens) - Design Token Platform
 *
 * High-level API for working with design tokens.
 *
 * For advanced use cases requiring direct class access, use:
 * import { TokenBundler, TokenValidator } from '@unpunnyfuns/tokens/core';
 *
 * @module @unpunnyfuns/tokens
 */

// ============================================================================
// High-Level API Functions
// ============================================================================

// Bundle and validation operations
export {
  bundleWithMetadata,
  validateResolver,
  formatError,
  type BundleOptions,
  type BundleResult,
  type BundleMetadata,
} from "./api/index.js";

// Workflow utilities
export {
  buildASTFromFileSystem,
  compare,
  validateTokens,
  workflows,
  type ASTWithMetadata,
} from "./api/workflows.js";

// Token file system
export { TokenFileSystem } from "./api/token-file-system.js";

// ============================================================================
// Convenience Functions
// ============================================================================

import { dtcgMerge } from "./core/dtcg-merge.js";
import type { TokenDocument } from "./types.js";

/**
 * Build AST from token document
 */
export { buildASTFromDocument } from "./ast/ast-builder.js";

/**
 * Resolve a specific permutation from a manifest
 */
export { resolvePermutation as resolveManifest } from "./resolver/resolver-core.js";

/**
 * Parse and validate a manifest
 */
export { parseManifest } from "./api/manifest-helpers.js";

/**
 * Merge two token documents using DTCG-aware merging
 */
export function mergeTokens(a: TokenDocument, b: TokenDocument): TokenDocument {
  return dtcgMerge(a, b);
}

/**
 * Format tokens for output
 */
export function formatTokens(tokens: TokenDocument): string {
  return JSON.stringify(tokens, null, 2);
}

// ============================================================================
// Essential Types
// ============================================================================

// Core token types
export type {
  Token,
  TokenDocument,
  TokenGroup,
  ValidationResult,
  ValidationError,
} from "./types.js";

// Resolver types
export type {
  UPFTResolverManifest,
  ResolutionInput,
  ResolvedPermutation,
  GenerateSpec,
} from "./resolver/upft-types.js";

// Options
export type { ResolverOptions } from "./types/options.js";
