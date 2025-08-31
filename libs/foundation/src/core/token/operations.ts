import type { TokenOrGroup } from "../../types.js";

/**
 * Create a deep copy of a token or token group
 *
 * @param token - Token or group to clone
 * @returns Deep cloned copy
 */
export function cloneToken<T extends TokenOrGroup>(token: T): T {
  if (token === null || token === undefined) {
    return token;
  }

  if (typeof token !== "object") {
    return token;
  }

  if (Array.isArray(token)) {
    return token.map((item) => cloneToken(item)) as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(token)) {
    cloned[key] = cloneToken(value as TokenOrGroup);
  }

  return cloned as T;
}

/**
 * Extract all references from a token (both DTCG {ref} and JSON Schema $ref)
 *
 * @param token - Token to extract references from
 * @returns Array of reference paths found
 */
export function extractReferences(token: TokenOrGroup): string[] {
  const references: string[] = [];

  function extractFromValue(value: unknown): void {
    if (typeof value === "string") {
      extractStringReference(value, references);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        extractFromValue(item);
      }
    } else if (typeof value === "object" && value !== null) {
      extractObjectReferences(value, references, extractFromValue);
    }
  }

  // Check for $ref at token level (JSON Schema style)
  if ("$ref" in token && typeof token.$ref === "string") {
    references.push(token.$ref);
  }

  // Check for references in $value (DTCG style)
  if ("$value" in token) {
    extractFromValue(token.$value);
  }

  return references;
}

// Helper to extract DTCG references from strings
function extractStringReference(value: string, references: string[]): void {
  const dtcgMatch = value.match(/^\{([^}]+)\}$/);
  if (dtcgMatch?.[1]) {
    references.push(dtcgMatch[1]);
  }
}

// Helper to extract references from objects
function extractObjectReferences(
  value: object,
  references: string[],
  extractFromValue: (val: unknown) => void,
): void {
  const record = value as Record<string, unknown>;

  // Check for JSON Schema $ref as entire value object
  if (
    "$ref" in record &&
    typeof record.$ref === "string" &&
    Object.keys(record).length === 1
  ) {
    references.push(record.$ref as string);
    return;
  }

  // Recursively check object properties for nested references
  for (const val of Object.values(record)) {
    extractFromValue(val);
  }
}
