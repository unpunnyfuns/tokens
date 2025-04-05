interface ConversionStrategy {
  preserveExternal?: boolean;
  convertInternal?: boolean;
  warnOnConversion?: boolean;
}

type TokenValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

/**
 * Convert tokens from JSON Schema $ref format to DTCG alias format
 */
export function convertToDTCG(
  tokens: Record<string, unknown>,
  strategy: ConversionStrategy = {},
): Record<string, unknown> {
  const refStrategy = {
    preserveExternal: true,
    convertInternal: true,
    warnOnConversion: true,
    ...strategy,
  };

  return transformTokenTree(tokens, (ref: string) =>
    convertRefToAlias(ref, refStrategy as Required<ConversionStrategy>),
  ) as Record<string, unknown>;
}

/**
 * Transform a token tree with a given transformer function
 */
function transformTokenTree(
  obj: unknown,
  transformer: (ref: string) => string | { $ref: string },
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformTokenTree(item, transformer));
  }

  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    const value = record[key];

    if (
      key === "$value" &&
      typeof value === "object" &&
      value !== null &&
      (value as Record<string, unknown>).$ref
    ) {
      // Convert $ref in $value
      const converted = transformer(
        (value as Record<string, unknown>).$ref as string,
      );
      // If transformer returns an object with $ref, keep the structure
      result[key] =
        typeof converted === "object" &&
        (converted as Record<string, unknown>).$ref
          ? converted
          : converted;
    } else if (key === "$ref") {
      // Convert top-level $ref (for token aliases)
      const converted = transformer(value as string);
      // If transformer returns an object with $ref, keep the structure
      if (
        typeof converted === "object" &&
        (converted as Record<string, unknown>).$ref
      ) {
        return { $ref: (converted as Record<string, unknown>).$ref };
      }
      // Otherwise return the alias directly
      return converted;
    } else if (typeof value === "object" && value !== null) {
      // Recursively transform nested objects
      result[key] = transformTokenTree(value, transformer);
    } else {
      // Keep primitive values as-is
      result[key] = value;
    }
  }

  return result as unknown;
}

/**
 * Convert a JSON Pointer $ref to DTCG alias format
 */
function convertRefToAlias(
  ref: string,
  strategy: Required<ConversionStrategy>,
): string | { $ref: string } {
  // Handle external file references
  if (ref.includes(".json#") || ref.startsWith("./") || ref.startsWith("../")) {
    if (strategy.preserveExternal) {
      // Keep as $ref object for external references
      if (strategy.warnOnConversion) {
        console.warn(`Preserving external reference: ${ref}`);
      }
      return { $ref: ref };
    }
    if (strategy.warnOnConversion) {
      console.warn(
        `External reference ${ref} cannot be converted to DTCG alias format`,
      );
    }
    return ref;
  }

  // Handle internal references
  if (ref.startsWith("#/")) {
    if (!strategy.convertInternal) {
      // Keep as $ref if conversion disabled
      return { $ref: ref };
    }

    // Remove leading #/ and trailing /$value if present
    let path = ref.substring(2);
    if (path.endsWith("/$value")) {
      path = path.substring(0, path.length - 7);
    }

    // Convert slashes to dots for DTCG format
    const dtcgPath = path.replace(/\//g, ".");

    // Return as DTCG alias string
    return `{${dtcgPath}}`;
  }

  // Unknown format, return as-is
  if (strategy.warnOnConversion) {
    console.warn(`Unknown reference format: ${ref}`);
  }
  return ref;
}

/**
 * Convert DTCG aliases back to $ref format (for reference - not fully implementable)
 * This is shown for documentation purposes but has limitations:
 * - Can't handle string interpolation
 * - Can't determine if reference should target /$value or not
 * @param {string} alias - DTCG alias (e.g., "{colors.primary}")
 * @returns {string} JSON Pointer reference
 */
export function convertAliasToRef(alias: string): string {
  // This is intentionally limited and shown for reference
  console.warn(
    "Converting DTCG aliases to $ref is not fully supported due to ambiguity",
  );

  if (
    typeof alias === "string" &&
    alias.startsWith("{") &&
    alias.endsWith("}")
  ) {
    const path = alias.slice(1, -1).replace(/\./g, "/");
    // We can't know if this should be #/path or #/path/$value
    // This is why the conversion is one-way only
    return `#/${path}`;
  }

  return alias;
}
