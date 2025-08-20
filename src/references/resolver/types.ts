/**
 * Types for reference resolution
 */

import type { TokenDocument, TokenValue } from "../../types.js";

/**
 * Options for reference resolution
 */
export interface ResolveOptions {
  /** Whether to preserve original reference strings on error */
  preserveOnError?: boolean;
  /** Maximum depth for reference chains to prevent infinite loops */
  maxDepth?: number;
  /** Whether to allow partial resolution (continue on errors) */
  partial?: boolean;
}

/**
 * Result of reference resolution
 */
export interface ResolveResult {
  /** The resolved token document */
  tokens: TokenDocument;
  /** Any errors encountered during resolution */
  errors: ResolutionError[];
  /** Whether resolution completed without errors */
  success: boolean;
  /** Map of resolved paths to their final values */
  resolved: Map<string, TokenValue>;
  /** Reference chains for debugging */
  chains: Map<string, string[]>;
}

/**
 * Describes a resolution error
 */
export interface ResolutionError {
  /** Type of error */
  type: "missing" | "circular" | "depth" | "invalid";
  /** Path where the error occurred */
  path: string;
  /** Error message */
  message: string;
  /** The reference that caused the error */
  reference?: string;
  /** The chain of references that led to this error */
  chain?: string[];
}
