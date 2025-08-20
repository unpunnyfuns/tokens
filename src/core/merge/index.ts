/**
 * Token merging functionality
 *
 * This module provides DTCG-compliant token merging with type safety
 */

import type { TokenDocument } from "../../types.js";
import { detectConflicts } from "./conflict-detector.js";
import { mergeDocuments } from "./merge-documents.js";
import type { MergeConflict } from "./types.js";
import { DTCGMergeError } from "./types.js";

// Re-export error class
export { DTCGMergeError } from "./types.js";

/**
 * Merge two token documents
 *
 * Orchestrates merging of entire token documents including all tokens, groups, and metadata.
 * Performs type checking and deep merging for composite types (shadow, typography, etc.).
 * Throws on type conflicts or structure mismatches with detailed error messages.
 *
 * @example
 * ```typescript
 * const base = { color: { primary: { $value: "#000" } } };
 * const overrides = { color: { primary: { $value: "#fff" } } };
 * const merged = merge(base, overrides);
 * ```
 *
 * @throws {DTCGMergeError} When tokens have incompatible types or structure conflicts
 */
export function merge(a: TokenDocument, b: TokenDocument): TokenDocument {
  // First pass: detect any conflicts
  const conflicts = detectConflicts(a, b);

  // If conflicts found, throw with detailed error
  if (conflicts.length > 0) {
    const errorMessage = buildConflictErrorMessage(conflicts);
    const firstConflict = conflicts[0];
    throw new DTCGMergeError(errorMessage, firstConflict?.path || "");
  }

  // Second pass: perform the merge (we know there are no conflicts)
  return mergeDocuments(a, b);
}

/**
 * Build detailed error message from conflicts
 */
function buildConflictErrorMessage(conflicts: MergeConflict[]): string {
  const firstConflict = conflicts[0];
  if (!firstConflict) {
    return "Unknown merge conflict";
  }

  let message = `Token merge conflict at '${firstConflict.path}':\n`;
  message += `  ${firstConflict.message}\n`;

  // Add type-specific details
  if (firstConflict.type === "type-mismatch") {
    message += `  Cannot merge token of type '${firstConflict.leftValue}' with type '${firstConflict.rightValue}'.\n`;
    message += `  This would lead to undefined behavior.\n`;
  } else if (firstConflict.type === "group-token-conflict") {
    message += `  Cannot merge a token with a group (or vice versa) at the same path.\n`;
    message += `  One is a value, the other is a container.\n`;
  }

  // Add additional conflicts if present
  if (conflicts.length > 1) {
    message += formatAdditionalConflicts(conflicts);
  }

  return message;
}

/**
 * Format additional conflicts for error message
 */
function formatAdditionalConflicts(conflicts: MergeConflict[]): string {
  let message = `\nAdditional conflicts found (${conflicts.length - 1} more):\n`;

  const maxToShow = Math.min(conflicts.length, 4);
  for (let i = 1; i < maxToShow; i++) {
    const conflict = conflicts[i];
    if (conflict) {
      message += `  - ${conflict.path}: ${conflict.message}\n`;
    }
  }

  if (conflicts.length > 4) {
    message += `  ... and ${conflicts.length - 4} more\n`;
  }

  return message;
}
