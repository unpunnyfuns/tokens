/**
 * Deep merge utility for token-like documents.
 * - Recursively merges plain objects
 * - Arrays and primitives are replaced by source
 * - If either side looks like a token (has $value), source replaces target
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue(obj: unknown): boolean {
  return isPlainObject(obj) && Object.hasOwn(obj, "$value");
}

export function deepMerge<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
>(target: T, source: U): T & U {
  // If either side is not mergeable, or one side is a token leaf, prefer source
  if (
    !(isPlainObject(target) && isPlainObject(source)) ||
    hasValue(target) ||
    hasValue(source)
  ) {
    return source as unknown as T & U;
  }

  const result: Record<string, unknown> = { ...target };

  for (const [key, srcVal] of Object.entries(source)) {
    const tgtVal = (target as Record<string, unknown>)[key];

    if (
      isPlainObject(tgtVal) &&
      isPlainObject(srcVal) &&
      !hasValue(tgtVal) &&
      !hasValue(srcVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      // Replace arrays, primitives, or token leaves
      result[key] = srcVal;
    }
  }

  return result as T & U;
}
