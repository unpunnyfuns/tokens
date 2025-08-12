/**
 * @module core/reference-map
 * @description Reference map building and value lookup utilities
 */

/**
 * Token value types
 */
export type TokenValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

/**
 * Build a reference map for quick lookups
 * Maps JSON pointer paths to their values
 */
export function buildReferenceMap(
  tokens: Record<string, unknown>,
  prefix = "#",
): Map<string, TokenValue> {
  const map = new Map<string, TokenValue>();

  function traverse(obj: unknown, path: string[]): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => traverse(item, [...path, index.toString()]));
      return;
    }

    const record = obj as Record<string, unknown>;
    const currentPath =
      path.length > 0 ? `${prefix}/${path.join("/")}` : prefix;

    // Add the current object to the map
    map.set(currentPath, record);

    for (const [key, value] of Object.entries(record)) {
      // Skip meta properties
      if (key.startsWith("$") && key !== "$value") {
        continue;
      }

      const keyPath = [...path, key];
      const fullPath = `${prefix}/${keyPath.join("/")}`;

      if (key === "$value") {
        // Add both the token and its value
        map.set(fullPath, value as TokenValue);
      } else if (typeof value === "object" && value !== null) {
        const valueObj = value as Record<string, unknown>;

        // If it has a $value, add both the token and the value
        if ("$value" in valueObj) {
          map.set(fullPath, valueObj);
          map.set(`${fullPath}/$value`, valueObj.$value as TokenValue);
        }

        // Continue traversing
        traverse(valueObj, keyPath);
      } else {
        // Primitive value
        map.set(fullPath, value as TokenValue);
      }
    }
  }

  traverse(tokens, []);
  return map;
}

/**
 * Get a value by its path from an object
 */
export function getValueByPath(obj: unknown, path: string[]): unknown {
  let current = obj;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      throw new Error(`Path not found: #/${path.join("/")}`);
    }

    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (Number.isNaN(index) || index >= current.length) {
        throw new Error(`Invalid array index: ${segment}`);
      }
      current = current[index];
    } else {
      const record = current as Record<string, unknown>;
      if (!(segment in record)) {
        throw new Error(`Path not found: #/${path.join("/")}`);
      }
      current = record[segment];
    }
  }

  // If current is a token object with $value, return the $value
  if (current && typeof current === "object" && !Array.isArray(current)) {
    const record = current as Record<string, unknown>;
    if ("$value" in record) {
      return record.$value;
    }
  }

  return current;
}

/**
 * Extract the path segments from a JSON pointer
 * @param pointer - JSON pointer string (e.g., "#/colors/primary")
 * @returns Array of path segments
 */
export function getPathFromPointer(pointer: string): string[] {
  if (!pointer.startsWith("#/")) {
    throw new Error(`Invalid JSON pointer: ${pointer}`);
  }

  const pathPart = pointer.substring(2); // Remove "#/"
  return pathPart === "" ? [] : pathPart.split("/");
}

/**
 * Create a JSON pointer from path segments
 * @param path - Array of path segments
 * @returns JSON pointer string
 */
export function createPointerFromPath(path: string[]): string {
  return path.length === 0 ? "#" : `#/${path.join("/")}`;
}
