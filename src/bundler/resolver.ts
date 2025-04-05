interface ResolveOptions {
  mode?: boolean | "external-only";
}

type TokenValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

/**
 * Resolve $ref references in tokens to their actual values
 */
export async function resolveReferences(
  tokens: Record<string, unknown>,
  options: ResolveOptions = {},
): Promise<Record<string, unknown>> {
  const { mode = true } = options;

  if (!mode) {
    return tokens;
  }

  // Build reference map for efficient lookup
  const refMap = buildReferenceMap(tokens);

  // Resolve references
  return resolveTokenTree(tokens, refMap, mode) as Record<string, unknown>;
}

/**
 * Build a map of all referenceable tokens
 */
function buildReferenceMap(
  tokens: Record<string, unknown>,
  path = "",
  map = new Map<string, TokenValue>(),
): Map<string, TokenValue> {
  for (const key in tokens) {
    const value = tokens[key];
    const currentPath = path ? `${path}/${key}` : key;

    if (isTokenLeaf(value)) {
      // Store both the full token and its value
      map.set(`#/${currentPath}`, value as TokenValue);
      const tokenValue = value as Record<string, unknown>;
      if (tokenValue.$value !== undefined) {
        map.set(`#/${currentPath}/$value`, tokenValue.$value as TokenValue);
      }
    } else if (typeof value === "object" && value !== null) {
      // Recurse into groups
      buildReferenceMap(value as Record<string, unknown>, currentPath, map);
    }
  }

  return map;
}

/**
 * Resolve references in a token tree
 */
function resolveTokenTree(
  obj: unknown,
  refMap: Map<string, TokenValue>,
  mode: boolean | "external-only",
  visited = new Set<string>(),
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTokenTree(item, refMap, mode, visited));
  }

  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  // Handle token with $ref
  const record = obj as Record<string, unknown>;
  if (record.$ref) {
    const ref = record.$ref as string;

    // Skip external references if mode is 'external-only'
    if (mode === "external-only" && !ref.includes(".json")) {
      return record;
    }

    // Check for circular reference
    if (visited.has(ref)) {
      console.warn(`Circular reference detected: ${ref}`);
      return record;
    }

    // Resolve the reference
    const resolved = resolveReference(ref, refMap, new Set([...visited, ref]));
    if (resolved !== undefined) {
      // For top-level $ref (token alias), return the entire resolved token
      return resolveTokenTree(resolved, refMap, mode, visited);
    }

    // Reference not found, keep as-is
    console.warn(`Reference not found: ${ref}`);
    return record;
  }

  // Handle $value with embedded $ref
  if (
    record.$value &&
    typeof record.$value === "object" &&
    (record.$value as Record<string, unknown>).$ref
  ) {
    const ref = (record.$value as Record<string, unknown>).$ref as string;

    // Skip external references if needed
    if (mode === "external-only" && !ref.includes(".json")) {
      return record;
    }

    // Check for circular reference
    if (visited.has(ref)) {
      console.warn(`Circular reference detected: ${ref}`);
      return record;
    }

    // Resolve the reference
    const resolved = resolveReference(ref, refMap, new Set([...visited, ref]));
    if (resolved !== undefined) {
      return {
        ...record,
        $value: resolveTokenTree(resolved, refMap, mode, visited),
      };
    }

    // Reference not found, keep as-is
    console.warn(`Reference not found: ${ref}`);
    return record;
  }

  // Recursively resolve nested objects
  const result: Record<string, unknown> = {};
  for (const key in record) {
    result[key] = resolveTokenTree(record[key], refMap, mode, visited);
  }

  return result;
}

/**
 * Resolve a single reference
 */
function resolveReference(
  ref: string,
  refMap: Map<string, TokenValue>,
  visited: Set<string>,
): TokenValue | undefined {
  // Handle internal references
  if (ref.startsWith("#/")) {
    const value = refMap.get(ref);
    if (value !== undefined) {
      // If the resolved value itself contains a reference, resolve it recursively
      if (typeof value === "object" && value !== null) {
        const valueRecord = value as Record<string, unknown>;
        if (valueRecord.$ref) {
          const refStr = valueRecord.$ref as string;
          if (visited.has(refStr)) {
            console.warn(`Circular reference detected: ${refStr}`);
            return value;
          }
          return resolveReference(
            refStr,
            refMap,
            new Set([...visited, refStr]),
          );
        }
        if (
          valueRecord.$value &&
          typeof valueRecord.$value === "object" &&
          (valueRecord.$value as Record<string, unknown>).$ref
        ) {
          const nestedRef = (valueRecord.$value as Record<string, unknown>)
            .$ref as string;
          if (visited.has(nestedRef)) {
            console.warn(`Circular reference detected: ${nestedRef}`);
            return value;
          }
          const resolved = resolveReference(
            nestedRef,
            refMap,
            new Set([...visited, nestedRef]),
          );
          return resolved !== undefined
            ? resolved
            : (valueRecord.$value as TokenValue);
        }
      }
      return value;
    }
  }

  // Handle external references (not implemented in this version)
  if (ref.includes(".json#")) {
    console.warn(`External references not yet supported: ${ref}`);
    return undefined;
  }

  return undefined;
}

/**
 * Check if an object is a token leaf
 */
function isTokenLeaf(obj: unknown): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return record.$value !== undefined || record.$ref !== undefined;
}
