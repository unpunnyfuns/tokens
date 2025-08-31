/**
 * Type definitions for token merging operations
 */

import type { TokenDocument } from "@upft/foundation";

/**
 * Type for token/group values
 */
export type TokenValue = Record<string, unknown>;

/**
 * Composite types that support deep merging of $value
 */
export const COMPOSITE_TYPES = new Set([
  "shadow",
  "typography",
  "border",
  "transition",
  "gradient",
  "strokeStyle",
]);

/**
 * Error thrown when merge operations encounter conflicts
 */
export class DTCGMergeError extends Error {
  constructor(
    message: string,
    public path: string,
  ) {
    super(`${message} at path: ${path}`);
    this.name = "DTCGMergeError";
  }
}

/**
 * Result of a merge operation with conflicts
 */
export interface MergeResult {
  document: TokenDocument;
  conflicts: MergeConflict[];
}

/**
 * Describes a conflict encountered during merge
 */
export interface MergeConflict {
  path: string;
  type: "type-mismatch" | "value-conflict" | "group-token-conflict";
  leftValue: unknown;
  rightValue: unknown;
  resolution: "left" | "right";
  message: string;
}

/**
 * Options for controlling merge behavior
 */
export interface MergeTokensOptions {
  /** Paths to include in the merge */
  include?: string[];
  /** Paths to exclude from the merge */
  exclude?: string[];
  /** Token types to merge */
  types?: string[];
  /** Prefer right value in conflicts */
  preferRight?: boolean;
  /** Return conflicts instead of throwing */
  safe?: boolean;
}
