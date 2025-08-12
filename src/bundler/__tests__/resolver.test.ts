import { beforeEach, describe, expect, test, vi } from "vitest";
import { resolveReferences } from "../../core/resolver";

// Mock fs
vi.mock("node:fs/promises");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveReferences", () => {
  test("resolves basic internal references", async () => {
    const tokens = {
      colors: {
        primary: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [0, 0, 0],
            alpha: 1,
            hex: "#000000",
          },
        },
        secondary: {
          $type: "color",
          $value: { $ref: "#/colors/primary/$value" },
        },
      },
    };

    const result = await resolveReferences(tokens);

    expect((result as any).colors.primary.$value).toEqual({
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 1,
      hex: "#000000",
    });
    expect((result as any).colors.secondary.$value).toEqual({
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 1,
      hex: "#000000",
    });
  });

  test("resolves multi-level references", async () => {
    const baseColor = {
      $type: "color",
      $value: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
        hex: "#000000",
      },
    };
    const tokens = {
      base: baseColor,
      level1: {
        $type: "color",
        $value: { $ref: "#/base/$value" },
      },
      level2: {
        $type: "color",
        $value: { $ref: "#/level1/$value" },
      },
      level3: {
        $type: "color",
        $value: { $ref: "#/level2/$value" },
      },
    };

    const result = await resolveReferences(tokens);

    const expectedValue = {
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 1,
      hex: "#000000",
    };

    expect((result as any).base.$value).toEqual(expectedValue);
    expect((result as any).level1.$value).toEqual(expectedValue);
    expect((result as any).level2.$value).toEqual(expectedValue);
    expect((result as any).level3.$value).toEqual(expectedValue);
  });

  test("handles references without $value suffix", async () => {
    const tokens = {
      color: { $value: "#000", $type: "color" },
      ref: { $ref: "#/color" },
    };

    const result = await resolveReferences(tokens);

    expect((result as any).ref).toEqual({ $value: "#000", $type: "color" });
  });

  test("preserves tokens without references", async () => {
    const tokens = {
      color: {
        $type: "color",
        $value: {
          colorSpace: "srgb",
          components: [0, 0, 0],
          alpha: 1,
          hex: "#000000",
        },
      },
      size: {
        $type: "dimension",
        $value: "16px",
      },
      flag: { $type: "boolean", $value: true },
    };

    const result = await resolveReferences(tokens);

    expect(result).toEqual(tokens);
  });

  test("resolves references in arrays", async () => {
    const tokens = {
      base: {
        $type: "dimension",
        $value: "8px",
      },
      list: {
        $type: "array",
        $value: [{ $ref: "#/base/$value" }, "16px", { $ref: "#/base/$value" }],
      },
    };

    const result = await resolveReferences(tokens);

    expect((result as any).list.$value).toEqual(["8px", "16px", "8px"]);
  });

  test("resolves references in composite values", async () => {
    const colorToken = {
      $type: "color",
      $value: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
        hex: "#000000",
      },
    };
    const widthToken = {
      $type: "dimension",
      $value: "2px",
    };

    const tokens = {
      color: colorToken,
      width: widthToken,
      border: {
        $type: "border",
        $value: {
          color: { $ref: "#/color/$value" },
          width: { $ref: "#/width/$value" },
          style: "solid",
        },
      },
    };

    const result = await resolveReferences(tokens);

    expect((result as any).border.$value).toEqual({
      color: colorToken.$value,
      width: "2px",
      style: "solid",
    });
  });

  test("handles deeply nested token structures", async () => {
    const primaryColor = {
      $type: "color",
      $value: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
        hex: "#000000",
      },
    };

    const tokens = {
      theme: {
        colors: {
          primary: primaryColor,
        },
      },
      components: {
        button: {
          background: {
            $type: "color",
            $value: { $ref: "#/theme/colors/primary/$value" },
          },
        },
      },
    };

    const result = await resolveReferences(tokens);

    expect((result as any).components.button.background.$value).toEqual(
      primaryColor.$value,
    );
  });

  test("handles missing references gracefully", async () => {
    const tokens = {
      broken: { $value: { $ref: "#/does/not/exist" } },
    };

    const result = await resolveReferences(tokens, { strict: false });

    // Should preserve the reference if target doesn't exist in non-strict mode
    expect((result as any).broken.$value).toEqual({ $ref: "#/does/not/exist" });
  });

  test("handles circular references by preserving them", async () => {
    const tokens = {
      a: { $value: { $ref: "#/b/$value" } },
      b: { $value: { $ref: "#/a/$value" } },
    };

    // Circular references should throw an error in strict mode (default)
    await expect(resolveReferences(tokens)).rejects.toThrow(
      "Circular reference detected",
    );
  });

  test("handles null and undefined values", async () => {
    const tokens = {
      nullValue: { $type: "other", $value: null },
      undefinedValue: { $type: "other", $value: undefined },
      ref: {
        $type: "other",
        $value: { $ref: "#/nullValue/$value" },
      },
    };

    const result = await resolveReferences(tokens);

    expect((result as any).nullValue.$value).toBe(null);
    expect((result as any).undefinedValue.$value).toBe(undefined);
    expect((result as any).ref.$value).toBe(null);
  });

  test("handles mode option false", async () => {
    const tokens = {
      base: { $value: "#000" },
      ref: { $value: { $ref: "#/base/$value" } },
    };

    const result = await resolveReferences(tokens, { mode: false });

    // Mode false should return unchanged tokens
    expect(result).toEqual(tokens);
  });

  test("handles mode option true", async () => {
    const tokens = {
      base: { $value: "#000" },
      ref: { $value: { $ref: "#/base/$value" } },
    };

    const result = await resolveReferences(tokens, { mode: true });

    expect((result as any).ref.$value).toBe("#000");
  });
});
