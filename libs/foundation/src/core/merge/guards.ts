/**
 * Type guards and validation functions for token merging
 */

import type { TokenValue } from "./types.js";
import { COMPOSITE_TYPES } from "./types.js";

/**
 * Check if an object is a token (has $value property)
 */
export function isToken(obj: unknown): boolean {
  return obj !== null && typeof obj === "object" && "$value" in obj;
}

/**
 * Check if an object is a group (any object without $value)
 * Groups can have $type and other $ properties, just not $value
 */
export function isGroup(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  if ("$value" in obj) return false;

  // Any object without $value is a group (including empty objects)
  return true;
}

/**
 * Get the effective type of a token, considering inheritance
 */
export function getEffectiveType(
  token: TokenValue,
  groupType: string | undefined,
): string | undefined {
  return (token.$type as string) || groupType;
}

/**
 * Check if a type is composite (supports deep merging)
 */
export function isCompositeType(type: string | undefined): boolean {
  return type ? COMPOSITE_TYPES.has(type) : false;
}

/**
 * Determine the $type property from a group
 */
export function getGroupType(
  group: TokenValue,
  parentType?: string,
): string | undefined {
  // Direct $type on group
  if ("$type" in group && typeof group.$type === "string") {
    return group.$type;
  }

  // Inherited from parent
  if (parentType) {
    return parentType;
  }

  // No type available
  return undefined;
}
