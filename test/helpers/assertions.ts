import { expect } from "vitest";

/**
 * Assert that a value is a valid token with required DTCG fields
 */
export function assertIsToken(value: unknown): void {
  expect(value).toBeDefined();
  expect(value).toBeTypeOf("object");

  const token = value as Record<string, unknown>;

  // Must have either $value or be a group
  if ("$value" in token) {
    expect(token.$value).toBeDefined();
  }
}

/**
 * Assert that a value is a valid token group
 */
export function assertIsTokenGroup(value: unknown): void {
  expect(value).toBeDefined();
  expect(value).toBeTypeOf("object");

  const group = value as Record<string, unknown>;

  // Groups should not have $value
  expect(group.$value).toBeUndefined();

  // Should have at least one nested token or group
  const hasNestedContent = Object.keys(group).some(
    (key) => !key.startsWith("$") && typeof group[key] === "object",
  );
  expect(hasNestedContent).toBe(true);
}

/**
 * Assert that a reference is valid (either DTCG {alias} or JSON Schema $ref)
 */
export function assertIsValidReference(ref: string): void {
  const isDTCGRef = /^\{[^}]+\}$/.test(ref);
  const isJSONSchemaRef = ref.startsWith("#/") || ref.includes("#/");

  expect(isDTCGRef || isJSONSchemaRef).toBe(true);
}

/**
 * Assert that an error contains expected message
 */
export function assertErrorContains(
  error: unknown,
  expectedMessage: string,
): void {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message.toLowerCase()).toContain(
    expectedMessage.toLowerCase(),
  );
}

/**
 * Assert that a path is in dot notation format
 */
export function assertIsDotPath(path: string): void {
  expect(path).toMatch(/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/);
}

/**
 * Assert that two token structures are equivalent (ignoring metadata)
 */
export function assertTokensEqual(actual: unknown, expected: unknown): void {
  const cleanToken = (obj: unknown): unknown => {
    if (typeof obj !== "object" || obj === null) return obj;

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata fields that don't affect equality
      if (key === "$extensions" || key === "_original") continue;
      cleaned[key] = cleanToken(value);
    }
    return cleaned;
  };

  expect(cleanToken(actual)).toEqual(cleanToken(expected));
}

/**
 * Assert that a value matches the expected token type
 */
export function assertTokenType(token: unknown, expectedType: string): void {
  expect(token).toBeTypeOf("object");
  const t = token as Record<string, unknown>;
  expect(t.$type).toBe(expectedType);
}

/**
 * Assert that a manifest has valid structure
 */
export function assertIsValidManifest(manifest: unknown): void {
  expect(manifest).toBeTypeOf("object");
  const m = manifest as Record<string, unknown>;

  // Required fields
  expect(m.sets).toBeDefined();
  expect(Array.isArray(m.sets)).toBe(true);
  expect(m.modifiers).toBeDefined();
  expect(Array.isArray(m.modifiers)).toBe(true);
}

/**
 * Assert that a permutation result is valid
 */
export function assertIsValidPermutation(permutation: unknown): void {
  expect(permutation).toBeTypeOf("object");
  const p = permutation as Record<string, unknown>;

  // Should have modifier values
  expect(p.modifiers).toBeTypeOf("object");

  // Should have tokens
  expect(p.tokens).toBeTypeOf("object");
}
