import { expect, test } from "vitest";
import { validateReferences } from "../../core/ast-validator";

test("validates tokens with no references", () => {
  const tokens = {
    colors: {
      primary: { $value: "#000" },
      secondary: { $value: "#fff" },
    },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(true);
  expect((result as any).errors).toEqual([]);
  expect((result as any).warnings).toEqual([]);
});

test("validates tokens with valid references", () => {
  const tokens = {
    base: { $value: "#000" },
    derived: { $value: { $ref: "#/base/$value" } },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(true);
  expect((result as any).errors).toEqual([]);
});

test("detects invalid references", () => {
  const tokens = {
    color: { $value: { $ref: "#/does/not/exist" } },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(false);
  expect((result as any).errors[0]).toContain(
    "Reference not found: #/does/not/exist",
  );
});

test("detects circular references", () => {
  const tokens = {
    a: { $value: { $ref: "#/b/$value" } },
    b: { $value: { $ref: "#/a/$value" } },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(false);
  expect(
    (result as any).errors.some((e: any) => e.includes("Circular reference")),
  ).toBe(true);
});

test("validates references in composite values", () => {
  const tokens = {
    color: { $value: "#000" },
    border: {
      $value: {
        color: { $ref: "#/color/$value" },
        width: "2px",
        style: "solid",
      },
    },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(true);
});

test("validates references in arrays", () => {
  const tokens = {
    base: { $value: "8px" },
    list: {
      $value: [{ $ref: "#/base/$value" }, "16px", { $ref: "#/base/$value" }],
    },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(true);
});

test("tracks reference statistics", () => {
  const tokens = {
    base1: { $value: "#000" },
    base2: { $value: "#fff" },
    ref1: { $value: { $ref: "#/base1/$value" } },
    ref2: { $value: { $ref: "#/base2/$value" } },
    broken: { $value: { $ref: "#/missing" } },
  };

  const result = validateReferences(tokens);

  expect((result as any).stats).toEqual({
    totalReferences: 3,
    validReferences: 2,
    invalidReferences: 1,
  });
});

test("warns about deep reference chains", () => {
  const tokens = {
    level0: { $value: "#000" },
    level1: { $value: { $ref: "#/level0/$value" } },
    level2: { $value: { $ref: "#/level1/$value" } },
    level3: { $value: { $ref: "#/level2/$value" } },
    level4: { $value: { $ref: "#/level3/$value" } },
  };

  const result = validateReferences(tokens, { warnDepth: 3 });

  expect((result as any).valid).toBe(true);
  expect(
    (result as any).warnings.some((w: any) =>
      w.includes("Deep reference chain"),
    ),
  ).toBe(true);
});

test("handles external references based on options", () => {
  const tokens = {
    color: { $value: { $ref: "external.json#/color" } },
  };

  // Default: external refs are warnings
  const result1 = validateReferences(tokens);
  expect(result1.valid).toBe(true);
  expect(result1.warnings.some((w) => w.includes("External reference"))).toBe(
    true,
  );

  // Strict mode: external refs are errors
  const result2 = validateReferences(tokens, { strict: true });
  expect(result2.valid).toBe(false);
  expect(result2.errors.some((e) => e.includes("External reference"))).toBe(
    true,
  );
});

test("validates empty token tree", () => {
  const result = validateReferences({});

  expect((result as any).valid).toBe(true);
  expect((result as any).errors).toEqual([]);
  expect((result as any).warnings).toEqual([]);
  expect((result as any).stats.totalReferences).toBe(0);
});

test("validates nested token structures", () => {
  const tokens = {
    theme: {
      colors: {
        primary: { $value: "#000" },
      },
    },
    components: {
      button: {
        background: { $value: { $ref: "#/theme/colors/primary/$value" } },
      },
    },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(true);
});

test("detects multiple issues", () => {
  const tokens = {
    // Circular reference
    a: { $value: { $ref: "#/b/$value" } },
    b: { $value: { $ref: "#/a/$value" } },
    // Invalid reference
    broken: { $value: { $ref: "#/missing" } },
    // External reference
    external: { $value: { $ref: "other.json#/token" } },
  };

  const result = validateReferences(tokens);

  expect((result as any).valid).toBe(false);
  expect((result as any).errors.length).toBeGreaterThan(1);
  expect((result as any).warnings.length).toBeGreaterThan(0);
});
