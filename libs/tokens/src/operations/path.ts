import type { TokenDocument, TokenOrGroup } from "@upft/foundation";
import { isToken, isTokenGroup } from "@upft/foundation";

/**
 * Parse a path string into segments
 * Handles both dot notation and JSON pointer format
 */
export function parsePath(path: string): string[] {
  if (!path) return [];

  // Handle JSON pointer format
  if (path.startsWith("#/")) {
    return path.substring(2).split("/");
  }

  // Handle dot notation
  return path.split(".");
}

/**
 * Join path segments into a dot notation path
 */
export function joinPath(segments: string[]): string {
  return segments.join(".");
}

/**
 * Get the parent path
 */
export function getParentPath(path: string): string {
  const segments = parsePath(path);
  if (segments.length <= 1) return "";
  return joinPath(segments.slice(0, -1));
}

/**
 * Get the token name (last segment of path)
 */
export function getTokenName(path: string): string {
  const segments = parsePath(path);
  return segments[segments.length - 1] || "";
}

/**
 * Resolve a relative path from a base path
 */
export function resolvePath(basePath: string, relativePath: string): string {
  // If not a relative path, return as-is
  if (!relativePath.startsWith(".")) {
    return relativePath;
  }

  const baseSegments = parsePath(basePath);
  const relativeSegments = relativePath.split("/");

  for (const segment of relativeSegments) {
    if (segment === "..") {
      baseSegments.pop();
    } else if (segment === ".") {
      // Current directory, do nothing
    } else if (segment) {
      // Remove leading dot if present
      const cleanSegment = segment.startsWith(".")
        ? segment.substring(1)
        : segment;
      if (cleanSegment) {
        baseSegments.push(cleanSegment);
      }
    }
  }

  return joinPath(baseSegments);
}

/**
 * Get token at specified path
 */
export function getTokenAtPath(
  tokens: TokenDocument,
  path: string,
): TokenOrGroup | undefined {
  const segments = parsePath(path);
  let current: unknown = tokens;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as TokenOrGroup | undefined;
}

/**
 * Set token at specified path, creating intermediate groups as needed
 */
export function setTokenAtPath(
  tokens: TokenDocument,
  path: string,
  value: TokenOrGroup,
): void {
  const segments = parsePath(path);
  let current: Record<string, unknown> = tokens as Record<string, unknown>;

  // Navigate/create path up to the parent
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    if (segment) {
      if (!(segment in current) || typeof current[segment] !== "object") {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }
  }

  // Set the value at the final segment
  const lastSegment = segments[segments.length - 1];
  if (lastSegment) {
    current[lastSegment] = value;
  }
}

/**
 * Delete token at specified path
 */
export function deleteTokenAtPath(
  tokens: TokenDocument,
  path: string,
): boolean {
  const segments = parsePath(path);
  if (segments.length === 0) return false;

  let current: unknown = tokens;

  // Navigate to parent
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (
      !(segment && current) ||
      typeof current !== "object" ||
      !(segment in (current as Record<string, unknown>))
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  const lastSegment = segments[segments.length - 1];
  if (
    lastSegment &&
    typeof current === "object" &&
    current !== null &&
    lastSegment in (current as Record<string, unknown>)
  ) {
    delete (current as Record<string, unknown>)[lastSegment];
    return true;
  }

  return false;
}

/**
 * Get all paths in a token document
 */
export function getAllPaths(
  tokens: TokenDocument,
  tokensOnly = false,
  currentPath = "",
): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(tokens)) {
    const path = currentPath ? `${currentPath}.${key}` : key;

    if (isToken(value)) {
      paths.push(path);
    } else if (isTokenGroup(value)) {
      if (!tokensOnly) {
        paths.push(path);
      }
      // Recursively get paths from group
      const childPaths = getAllPaths(value as TokenDocument, tokensOnly, path);
      paths.push(...childPaths);
    }
  }

  return paths;
}

/**
 * Convert DTCG reference to JSON pointer format
 */
export function convertDTCGToJSONPath(reference: string): string {
  // Check if it's a DTCG reference
  const match = reference.match(/^\{([^}]+)\}$/);
  if (!match) {
    return reference;
  }

  const path = match[1] ?? "";
  const segments = path.split(".");
  return `#/${segments.join("/")}/$value`;
}

/**
 * Convert JSON pointer to DTCG format
 */
export function convertJSONPathToDTCG(reference: string): string {
  // Check if it's a JSON pointer
  if (!reference.startsWith("#/")) {
    return reference;
  }

  // Remove #/ prefix and /$value suffix if present
  let path = reference.substring(2);
  if (path.endsWith("/$value")) {
    path = path.substring(0, path.length - 7);
  }

  // Convert slashes to dots
  const dotPath = path.replace(/\//g, ".");
  return `{${dotPath}}`;
}
