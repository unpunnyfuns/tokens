/**
 * Utility functions for reference handling
 */

/**
 * Check if a value contains references
 */
export function hasReferences(value: unknown): boolean {
  if (typeof value === "string") {
    return /^\{[^}]+\}$/.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(hasReferences);
  }

  if (value && typeof value === "object") {
    // Check for JSON Schema $ref
    const objValue = value as Record<string, unknown>;
    if ("$ref" in objValue && typeof objValue.$ref === "string") {
      return true;
    }
    return Object.values(objValue).some(hasReferences);
  }

  return false;
}

/**
 * Extract reference path from a reference string
 */
export function extractReference(value: string): string | null {
  // DTCG reference format: {path.to.token}
  const match = value.match(/^\{([^}]+)\}$/);
  return match?.[1] ?? null;
}

/**
 * Normalize a reference path (handles JSON pointer format)
 */
export function normalizeReference(ref: string): string {
  // Handle external file references - strip the file path part
  let normalized = ref;
  if (normalized.includes("#/")) {
    const hashIndex = normalized.indexOf("#/");
    normalized = normalized.substring(hashIndex);
  }

  // Convert JSON pointer to dot notation
  if (normalized.startsWith("#/")) {
    return normalized
      .substring(2)
      .replace(/\//g, ".")
      .replace(/\/?\$value$/, "")
      .replace(/\.$/, "");
  }

  return normalized;
}

/**
 * Extract all references from a token
 */
export function extractReferencesFromToken(token: unknown): string[] {
  const refs: string[] = [];

  function extractFromValue(value: unknown): void {
    if (typeof value === "string") {
      const ref = extractReference(value);
      if (ref) {
        refs.push(ref);
      }
    } else if (Array.isArray(value)) {
      value.forEach(extractFromValue);
    } else if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("$ref" in obj && typeof obj.$ref === "string") {
        refs.push(normalizeReference(obj.$ref));
      } else {
        Object.values(obj).forEach(extractFromValue);
      }
    }
  }

  if (token && typeof token === "object" && "$value" in token) {
    const tokenObj = token as Record<string, unknown>;
    extractFromValue(tokenObj.$value);
  }

  return refs;
}
