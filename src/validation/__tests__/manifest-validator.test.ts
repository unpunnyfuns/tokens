import { beforeEach, describe, expect, test, vi } from "vitest";
import { resolveTokens, validateResolverManifest } from "../manifest-validator";

// Mock fs - matching the import style in resolver-validator.ts
vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
  },
}));

vi.mock("../utils", () => ({
  getProjectRoot: () => "/mocked/project/root",
}));

// Mock AJV to avoid actual schema validation
vi.mock("ajv/dist/2020.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockReturnValue(() => true),
    compileAsync: vi.fn().mockResolvedValue(() => true),
    addSchema: vi.fn(),
  })),
}));

// Mock schema that accepts our test manifests
const mockResolverSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://test.example.com/resolver.schema.json",
  type: "object",
  properties: {
    sets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          values: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    modifiers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          values: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                values: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
        required: ["name"],
      },
    },
  },
};

// Import fs to access mocked functions
import { promises as fs } from "node:fs";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateResolverManifest", () => {
  test("validates a valid manifest", async () => {
    const manifest = {
      sets: [
        {
          values: ["base/colors.json", "base/spacing.json"],
        },
      ],
      modifiers: [
        {
          name: "theme",
          values: [
            {
              name: "dark",
              values: ["themes/dark.json"],
            },
            {
              name: "light",
              values: ["themes/light.json"],
            },
          ],
        },
      ],
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("resolver.schema.json")) {
        return JSON.stringify(mockResolverSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateResolverManifest("/test/manifest.json");

    expect((result as any).valid).toBe(true);
    expect((result as any).errors).toHaveLength(0);
  });

  test("detects missing sets", async () => {
    const manifest = {
      modifiers: [
        {
          name: "theme",
          values: [],
        },
      ],
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("resolver.schema.json")) {
        return JSON.stringify(mockResolverSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await validateResolverManifest("/test/manifest.json");

    expect((result as any).valid).toBe(false);
    expect((result as any).errors).toContain(
      "Manifest must have at least one set",
    );
  });

  test("detects invalid modifier structure", async () => {
    const manifest = {
      sets: [{ values: ["base.json"] }],
      modifiers: [
        {
          // Missing name
          values: [],
        },
      ],
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("resolver.schema.json")) {
        return JSON.stringify(mockResolverSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    // The invalid modifier structure should fail validation

    const result = await validateResolverManifest("/test/manifest.json");

    expect((result as any).valid).toBe(false);
    expect((result as any).errors.length).toBeGreaterThan(0);
  });

  test("validates empty modifiers array", async () => {
    const manifest = {
      sets: [{ values: ["tokens.json"] }],
      modifiers: [],
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("resolver.schema.json")) {
        return JSON.stringify(mockResolverSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateResolverManifest("/test/manifest.json");

    expect((result as any).valid).toBe(true);
  });

  test("handles invalid JSON", async () => {
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return "not valid json {";
      }
      if (pathStr.includes("resolver.schema.json")) {
        return JSON.stringify(mockResolverSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await validateResolverManifest("/test/manifest.json");

    expect((result as any).valid).toBe(false);
    expect((result as any).errors.some((e: any) => e.includes("JSON"))).toBe(
      true,
    );
  });

  test("handles file read errors", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

    const result = await validateResolverManifest("/test/manifest.json");

    expect((result as any).valid).toBe(false);
    expect((result as any).errors).toContain("File not found");
  });
});

describe("resolveTokens", () => {
  test("resolves tokens from manifest with base sets", async () => {
    const manifest = {
      sets: [{ values: ["base.json"] }],
    };

    const baseTokens = {
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
      },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("base.json")) {
        return JSON.stringify(baseTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await resolveTokens("/test/manifest.json");

    expect(result).toEqual(baseTokens);
  });

  test("merges multiple base sets", async () => {
    const manifest = {
      sets: [{ values: ["colors.json", "spacing.json"] }],
    };

    const colors = {
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
      },
    };

    const spacing = {
      spacing: {
        small: {
          $type: "dimension",
          $value: "4px",
        },
      },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("colors.json")) {
        return JSON.stringify(colors);
      }
      if (pathStr.includes("spacing.json")) {
        return JSON.stringify(spacing);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await resolveTokens("/test/manifest.json");

    expect(result).toEqual({
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
      },
      spacing: {
        small: {
          $type: "dimension",
          $value: "4px",
        },
      },
    });
  });

  test("applies theme modifier", async () => {
    const manifest = {
      sets: [{ values: ["base.json"] }],
      modifiers: [
        {
          name: "theme",
          values: [
            {
              name: "dark",
              values: ["dark.json"],
            },
          ],
        },
      ],
    };

    const baseTokens = {
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
      },
    };

    const darkTokens = {
      colors: {
        primary: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [1, 1, 1],
            alpha: 1,
            hex: "#ffffff",
          },
        },
      },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("base.json")) {
        return JSON.stringify(baseTokens);
      }
      if (pathStr.includes("dark.json")) {
        return JSON.stringify(darkTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await resolveTokens("/test/manifest.json", {
      theme: "dark",
    });

    expect(result).toEqual({
      colors: {
        primary: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [1, 1, 1],
            alpha: 1,
            hex: "#ffffff",
          },
        },
      },
    });
  });

  test("applies multiple modifiers", async () => {
    const manifest = {
      sets: [{ values: ["base.json"] }],
      modifiers: [
        {
          name: "theme",
          values: [
            {
              name: "dark",
              values: ["dark.json"],
            },
          ],
        },
        {
          name: "mode",
          values: [
            {
              name: "compact",
              values: ["compact.json"],
            },
          ],
        },
      ],
    };

    const baseTokens = {
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
      },
      spacing: {
        small: {
          $type: "dimension",
          $value: "8px",
        },
      },
    };

    const darkTokens = {
      colors: {
        primary: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [1, 1, 1],
            alpha: 1,
            hex: "#ffffff",
          },
        },
      },
    };

    const compactTokens = {
      spacing: {
        small: {
          $type: "dimension",
          $value: "4px",
        },
      },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("base.json")) {
        return JSON.stringify(baseTokens);
      }
      if (pathStr.includes("dark.json")) {
        return JSON.stringify(darkTokens);
      }
      if (pathStr.includes("compact.json")) {
        return JSON.stringify(compactTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await resolveTokens("/test/manifest.json", {
      theme: "dark",
      mode: "compact",
    });

    expect(result).toEqual({
      colors: {
        primary: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [1, 1, 1],
            alpha: 1,
            hex: "#ffffff",
          },
        },
      },
      spacing: {
        small: {
          $type: "dimension",
          $value: "4px",
        },
      },
    });
  });

  test("handles missing manifest file", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

    const result = await resolveTokens("/test/manifest.json");

    expect(result).toBeNull();
  });

  test("handles invalid manifest JSON", async () => {
    vi.mocked(fs.readFile).mockResolvedValue("not valid json");

    const result = await resolveTokens("/test/manifest.json");

    expect(result).toBeNull();
  });

  test("handles missing token files gracefully", async () => {
    const manifest = {
      sets: [{ values: ["missing.json"] }],
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      throw new Error("File not found");
    });

    const result = await resolveTokens("/test/manifest.json");

    expect(result).toBeNull();
  });

  test("ignores unknown modifiers", async () => {
    const manifest = {
      sets: [{ values: ["base.json"] }],
      modifiers: [
        {
          name: "unknown",
          values: [],
        },
      ],
    };

    const baseTokens = {
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
      },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("base.json")) {
        return JSON.stringify(baseTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const result = await resolveTokens("/test/manifest.json", {
      unknown: "value",
    });

    expect(result).toEqual(baseTokens);
  });
});
