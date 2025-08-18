import type { TokenDocument, TokenOrGroup } from "../../types.js";

/**
 * Create a deep copy of a token or token group
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
 * Traverse all tokens in a document
 * Returns false from visitor to stop traversal
 */
export function traverseTokens(
  tokens: TokenDocument,
  visitor: (path: string, token: TokenOrGroup) => undefined | boolean,
  currentPath = "",
): boolean {
  for (const [key, value] of Object.entries(tokens)) {
    // Skip metadata fields
    if (key.startsWith("$") || !value || typeof value === "string") continue;

    const tokenValue = value as TokenOrGroup;
    const path = currentPath ? `${currentPath}.${key}` : key;

    // Visit current node
    const continueTraversal = visitor(path, tokenValue);
    if (continueTraversal === false) {
      return false;
    }

    // Traverse children if it's a group
    if (isGroup(tokenValue)) {
      const childrenContinue = traverseTokens(
        tokenValue as TokenDocument,
        visitor,
        path,
      );
      if (!childrenContinue) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Extract all references from a token
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

/**
 * Check if a token has circular references
 */
export function hasCircularReference(
  tokens: TokenDocument,
  startPath: string,
  visited = new Set<string>(),
): boolean {
  if (visited.has(startPath)) {
    return true;
  }

  const token = getTokenAtPath(tokens, startPath);
  if (!token) {
    return false;
  }

  const references = extractReferences(token);
  if (references.length === 0) {
    return false;
  }

  visited.add(startPath);

  for (const ref of references) {
    // Convert reference to path
    const refPath = ref
      .replace(/^\{|\}$/g, "")
      .replace(/^#\//, "")
      .replace(/\//g, ".")
      .replace(/\$value$/, "");

    if (hasCircularReference(tokens, refPath, new Set(visited))) {
      return true;
    }
  }

  return false;
}

// Helper function to check if value is a group
function isGroup(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  // Has $value means it's a token, not a group
  if ("$value" in (value as Record<string, unknown>)) {
    return false;
  }

  // Check if it has nested objects (tokens or groups)
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (!key.startsWith("$") && typeof val === "object" && val !== null) {
      return true;
    }
  }

  return false;
}

// Helper function to get token at path
function getTokenAtPath(
  tokens: TokenDocument,
  path: string,
): TokenOrGroup | undefined {
  const segments = path.split(".");
  let current: unknown = tokens;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as TokenOrGroup;
}
