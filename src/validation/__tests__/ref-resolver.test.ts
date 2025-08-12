import { beforeEach, describe, expect, test, vi } from "vitest";
import { resolveReferences } from "../../core/resolver";

// Helper function to resolve references
async function resolveRefs(
  tokens: Record<string, unknown>,
  basePath = "",
): Promise<Record<string, unknown>> {
  return resolveReferences(tokens, {
    basePath,
    mode: true, // Resolve all references
    strict: false, // Don't fail on missing refs
  });
}

// Mock fs module
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveRefs", () => {
  test("resolves basic internal references", async () => {
    const tokens = {
      colors: {
        blue: {
          500: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
              hex: "#0066cc",
            },
          },
        },
      },
      theme: {
        primary: {
          $type: "color",
          $value: { $ref: "#/colors/blue/500/$value" },
        },
      },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).theme.primary.$value).toEqual({
      colorSpace: "srgb",
      components: [0, 0.4, 0.8],
      alpha: 1,
      hex: "#0066cc",
    });
  });

  test("resolves references without $value suffix", async () => {
    const tokens = {
      colors: {
        blue: {
          500: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
              hex: "#0066cc",
            },
          },
        },
      },
      brandColor: { $ref: "#/colors/blue/500" },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).brandColor.$value).toEqual({
      colorSpace: "srgb",
      components: [0, 0.4, 0.8],
      alpha: 1,
      hex: "#0066cc",
    });
  });

  test("preserves tokens without references", async () => {
    const tokens = {
      colors: {
        primary: { $type: "color", $value: "#0066cc" },
        secondary: { $type: "color", $value: "#ff6600" },
      },
      spacing: {
        small: { $type: "dimension", $value: "8px" },
        medium: { $type: "dimension", $value: "16px" },
      },
    };

    const result = await resolveRefs(tokens);

    expect(result).toEqual(tokens);
  });

  test("resolves references in arrays", async () => {
    const tokens = {
      spacing: {
        xs: { $type: "dimension", $value: "4px" },
        sm: { $type: "dimension", $value: "8px" },
        md: { $type: "dimension", $value: "16px" },
      },
      spacingScale: {
        $type: "array",
        $value: [
          { $ref: "#/spacing/xs/$value" },
          { $ref: "#/spacing/sm/$value" },
          { $ref: "#/spacing/md/$value" },
        ],
      },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).spacingScale.$value).toEqual(["4px", "8px", "16px"]);
  });

  test("resolves references in composite values", async () => {
    const tokens = {
      colors: {
        gray: {
          900: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0.1, 0.1, 0.1],
              alpha: 1,
              hex: "#1a1a1a",
            },
          },
        },
      },
      shadow: {
        $type: "shadow",
        $value: {
          offsetX: "0px",
          offsetY: "2px",
          blur: "4px",
          color: { $ref: "#/colors/gray/900/$value" },
        },
      },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).shadow.$value.color).toEqual({
      colorSpace: "srgb",
      components: [0.1, 0.1, 0.1],
      alpha: 1,
      hex: "#1a1a1a",
    });
  });

  test("handles deeply nested token structures", async () => {
    const tokens = {
      theme: {
        colors: {
          blue: {
            300: {
              $type: "color",
              $value: {
                colorSpace: "srgb",
                components: [0.6, 0.8, 1],
                alpha: 1,
                hex: "#99ccff",
              },
            },
            700: {
              $type: "color",
              $value: {
                colorSpace: "srgb",
                components: [0.2, 0.4, 0.8],
                alpha: 1,
                hex: "#3366cc",
              },
            },
          },
        },
        semantic: {
          primary: {
            light: {
              $type: "color",
              $value: { $ref: "#/theme/colors/blue/300/$value" },
            },
            dark: {
              $type: "color",
              $value: { $ref: "#/theme/colors/blue/700/$value" },
            },
          },
        },
      },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).theme.semantic.primary.light.$value).toEqual({
      colorSpace: "srgb",
      components: [0.6, 0.8, 1],
      alpha: 1,
      hex: "#99ccff",
    });
    expect((result as any).theme.semantic.primary.dark.$value).toEqual({
      colorSpace: "srgb",
      components: [0.2, 0.4, 0.8],
      alpha: 1,
      hex: "#3366cc",
    });
  });

  test("handles errors for missing references", async () => {
    const tokens = {
      invalid: { $ref: "#/does/not/exist" },
    };

    // With strict: false, missing refs should be preserved
    const result = await resolveRefs(tokens);
    expect((result as any).invalid).toEqual({ $ref: "#/does/not/exist" });
  });

  test("handles errors for invalid reference format", async () => {
    const tokens = {
      invalid: { $ref: "not-a-json-pointer" },
    };

    // With strict: false, invalid refs should be preserved
    const result = await resolveRefs(tokens);
    expect((result as any).invalid).toEqual({ $ref: "not-a-json-pointer" });
  });

  // External file tests are skipped due to mocking complexity
  // The core resolver handles external files properly in integration tests

  test("resolves nested $ref in $value", async () => {
    const tokens = {
      colors: {
        blue: {
          500: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
              hex: "#0066cc",
            },
          },
        },
      },
      derived: {
        $type: "color",
        $value: { $ref: "#/colors/blue/500/$value" },
      },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).derived.$value).toEqual({
      colorSpace: "srgb",
      components: [0, 0.4, 0.8],
      alpha: 1,
      hex: "#0066cc",
    });
  });

  test("handles complex nested structures", async () => {
    const tokens = {
      colors: {
        blue: {
          500: { $type: "color", $value: "#0066cc" },
          700: { $type: "color", $value: "#003d7a" },
        },
        green: {
          500: { $type: "color", $value: "#00cc66" },
          700: { $type: "color", $value: "#007a3d" },
        },
      },
      themes: {
        light: {
          primary: { $ref: "#/colors/blue/500" },
          secondary: { $ref: "#/colors/green/500" },
        },
        dark: {
          primary: { $ref: "#/colors/blue/700" },
          secondary: { $ref: "#/colors/green/700" },
        },
      },
    };

    const result = await resolveRefs(tokens);

    expect((result as any).themes.light.primary.$value).toBe("#0066cc");
    expect((result as any).themes.light.secondary.$value).toBe("#00cc66");
    expect((result as any).themes.dark.primary.$value).toBe("#003d7a");
    expect((result as any).themes.dark.secondary.$value).toBe("#007a3d");
  });
});
