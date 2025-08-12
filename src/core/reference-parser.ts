/**
 * @module core/reference-parser
 * @description Reference parsing and validation utilities
 */

/**
 * Parse a reference string into its components
 * @param ref - Reference string (e.g., "#/colors/primary" or "./file.json#/path")
 * @returns Parsed reference components
 */
export function parseReference(ref: string): {
  type: "internal" | "external";
  filePath?: string;
  fragment?: string;
} {
  // External reference with file path
  if (ref.includes(".json")) {
    const [filePath, fragment] = ref.split("#");
    return {
      type: "external",
      filePath,
      fragment: fragment ? `#${fragment}` : undefined,
    };
  }

  // Internal reference
  if (ref.startsWith("#")) {
    return {
      type: "internal",
      fragment: ref,
    };
  }

  // External reference without .json extension
  if (ref.startsWith("./") || ref.startsWith("../")) {
    const [filePath, fragment] = ref.split("#");
    return {
      type: "external",
      filePath,
      fragment: fragment || undefined,
    };
  }

  // Default to internal
  return {
    type: "internal",
    fragment: ref,
  };
}

/**
 * Validate a reference string format
 * @param ref - Reference string to validate
 * @returns True if reference format is valid
 */
export function isValidReferenceFormat(ref: string): boolean {
  // Must be non-empty string
  if (typeof ref !== "string" || ref.length === 0) {
    return false;
  }

  // Internal references must start with #
  if (!ref.includes(".") && !ref.startsWith("#")) {
    return false;
  }

  // External references should have valid file extension
  if (ref.includes(".") && !ref.includes(".json")) {
    return false;
  }

  return true;
}

/**
 * Normalize a reference path for consistent comparison
 * @param ref - Reference string to normalize
 * @returns Normalized reference path
 */
export function normalizeReference(ref: string): string {
  const parsed = parseReference(ref);

  if (parsed.type === "internal") {
    // Ensure internal refs start with #/
    const fragment = parsed.fragment || "";
    if (fragment.startsWith("#")) {
      return fragment;
    }
    return `#/${fragment}`;
  }

  // External reference - reconstruct normalized form
  let normalized = parsed.filePath || "";
  if (parsed.fragment) {
    normalized += parsed.fragment;
  }

  return normalized;
}
