import type { Token, TokenDocument, TokenGroup } from "../../types.js";

/**
 * Check if a value is a token (has $value or $ref property)
 */
export function isToken(value: unknown): value is Token {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    ("$value" in value || "$ref" in value)
  );
}

/**
 * Check if a value is a token group
 */
export function isTokenGroup(value: unknown): value is TokenGroup {
  if (!value || typeof value !== "object") {
    return false;
  }

  // Has $value or $ref means it's a token, not a group
  if ("$value" in value || "$ref" in value) {
    return false;
  }

  // Must have at least one nested token or group
  for (const [key, val] of Object.entries(value)) {
    if (!key.startsWith("$") && typeof val === "object" && val !== null) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a value is a valid token document
 */
export function isTokenDocument(value: unknown): value is TokenDocument {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/**
 * Check if a string is a DTCG format reference
 */
export function isDTCGReference(value: string): boolean {
  return /^\{[^}]+\}$/.test(value);
}

/**
 * Check if a string is a JSON Schema reference
 */
export function isJSONSchemaReference(value: string): boolean {
  return value.includes("#/");
}

/**
 * Check if a string is any kind of reference
 */
export function isReference(value: string): boolean {
  return isDTCGReference(value) || isJSONSchemaReference(value);
}

/**
 * Check if a token has a $value property
 */
export function hasValue(token: unknown): token is Token {
  return (
    token !== null &&
    token !== undefined &&
    typeof token === "object" &&
    "$value" in token
  );
}

/**
 * Check if a token has a $type property
 */
export function hasType(token: unknown, type?: string): boolean {
  if (!token || typeof token !== "object") {
    return false;
  }

  const hasTypeProperty = "$type" in token;

  if (type === undefined) {
    return hasTypeProperty;
  }

  return hasTypeProperty && (token as Record<string, unknown>).$type === type;
}

/**
 * Check if a token is a color token
 */
export function isColorToken(token: unknown): boolean {
  return hasType(token, "color");
}

/**
 * Check if a token is a dimension token
 */
export function isDimensionToken(token: unknown): boolean {
  return hasType(token, "dimension");
}

/**
 * Check if a token is a typography token
 */
export function isTypographyToken(token: unknown): boolean {
  return hasType(token, "typography");
}

/**
 * Check if a token is a shadow token
 */
export function isShadowToken(token: unknown): boolean {
  return hasType(token, "shadow");
}

/**
 * Check if a token is a border token
 */
export function isBorderToken(token: unknown): boolean {
  return hasType(token, "border");
}

/**
 * Validate that a value is a valid token document
 */
export function isValidTokenDocument(value: unknown): boolean {
  if (!isTokenDocument(value)) return false;

  // Empty object is not a valid token document
  const entries = Object.entries(value);
  const nonMetadataEntries = entries.filter(([key]) => !key.startsWith("$"));
  if (nonMetadataEntries.length === 0) return false;

  // Recursive check for valid structure
  function isValidNode(node: unknown): boolean {
    if (!node || typeof node !== "object") return false;

    // Check if it's a token
    if (isToken(node)) return true;

    // Must be a group - check all children
    for (const [key, val] of Object.entries(node)) {
      // Skip metadata fields
      if (key.startsWith("$")) continue;

      // Each child must be either a token or valid group
      if (!isValidNode(val)) return false;
    }

    return true;
  }

  // Check each property
  for (const [key, val] of entries) {
    // Skip metadata fields
    if (key.startsWith("$")) continue;

    // Must be either a token or valid group
    if (!isValidNode(val)) {
      return false;
    }
  }

  return true;
}
