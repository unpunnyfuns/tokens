/**
 * Token structure validation utilities
 */

/**
 * Check if value has token structure
 */
export function checkValueForTokens(value: unknown): boolean {
  if (value && typeof value === "object") {
    if ("$value" in value) return true;
    if (hasTokenStructure(value)) return true;
  }
  return false;
}

/**
 * Check if object has token structure
 */
export function hasTokenStructure(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;

  for (const value of Object.values(obj)) {
    if (checkValueForTokens(value)) return true;
  }

  return false;
}
