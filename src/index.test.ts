import { beforeEach, describe, expect, it, vi } from "vitest";
import * as UPFT from "./index.js";

describe("UPFT Public API", () => {
  describe("exports", () => {
    it("should export high-level functions", () => {
      expect(UPFT.validateTokens).toBeDefined();
      expect(UPFT.resolveManifest).toBeDefined();
      expect(UPFT.bundleWithMetadata).toBeDefined();
      expect(UPFT.buildASTFromDocument).toBeDefined();
    });

    it("should export utility functions", () => {
      expect(UPFT.mergeTokens).toBeDefined();
      expect(UPFT.buildASTFromDocument).toBeDefined();
      expect(UPFT.formatTokens).toBeDefined();
      expect(UPFT.parseManifest).toBeDefined();
    });

    it("should export API module functions", () => {
      expect(UPFT.bundleWithMetadata).toBeDefined();
      expect(UPFT.validateResolver).toBeDefined();
      expect(UPFT.formatError).toBeDefined();
    });

    it("should export helper functions", () => {
      expect(UPFT.validateTokens).toBeDefined();
      expect(UPFT.parseManifest).toBeDefined();
      expect(UPFT.resolveManifest).toBeDefined();
    });
  });

  describe("convenience functions", () => {
    let mockFileReader: any;

    beforeEach(() => {
      mockFileReader = vi.mocked({
        readFile: vi.fn(
          async (): Promise<any> => ({
            filePath: "test.json",
            tokens: {
              color: {
                red: {
                  $value: {
                    colorSpace: "srgb",
                    components: [1, 0, 0],
                    alpha: 1,
                  },
                  $type: "color",
                },
              },
            },
            format: "json",
            metadata: {},
          }),
        ),
        readDirectory: vi.fn(),
        watchFiles: vi.fn(),
      } as any);
    });

    it("should validate tokens with convenience function", async () => {
      const tokens = {
        color: {
          red: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      const result = await UPFT.validateTokens(tokens);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should resolve manifest with convenience function", async () => {
      const manifest = {
        sets: [{ values: ["core.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
      };

      const input = { theme: "light" };

      const result = await UPFT.resolveManifest(manifest, input, {
        fileReader: mockFileReader,
      });

      expect(result.id).toBe("theme-light");
      expect((result.tokens.color as any)?.red?.$value).toEqual({
        colorSpace: "srgb",
        components: [1, 0, 0],
        alpha: 1,
      });
    });

    it.skip("should build bundles with convenience function", async () => {
      // buildBundles was removed from public API
    });

    it("should parse and validate manifest", async () => {
      const validManifest = {
        sets: [{ values: ["core.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
      };

      const result = await UPFT.parseManifest(validManifest);

      expect(result.valid).toBe(true);
      expect(result.manifest).toEqual(validManifest);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid manifest", async () => {
      const invalidManifest = {
        // Missing required fields
        modifiers: {},
      };

      const result = await UPFT.parseManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should merge token documents", () => {
      const a = {
        color: {
          red: { $value: "#ff0000", $type: "color" },
        },
      };

      const b = {
        color: {
          blue: { $value: "#0000ff", $type: "color" },
        },
      };

      const result = UPFT.mergeTokens(a, b);

      expect((result.color as any)?.red?.$value).toBe("#ff0000");
      expect((result.color as any)?.blue?.$value).toBe("#0000ff");
    });

    it("should create AST from tokens", async () => {
      const tokens = {
        color: {
          red: { $value: "#ff0000", $type: "color" },
        },
      };

      const ast = UPFT.buildASTFromDocument(tokens);

      expect(ast.type).toBe("group");
      expect(ast.name).toBe("root");
    });

    it("should format tokens in DTCG format", () => {
      const tokens = {
        color: {
          red: { $value: "#ff0000", $type: "color" },
        },
      };

      const formatted = UPFT.formatTokens(tokens);

      expect(formatted).toContain('"$value": "#ff0000"');
    });
  });

  describe("error handling", () => {
    it("should handle file reader errors gracefully", async () => {
      const failingFileReader = vi.mocked({
        readFile: vi.fn().mockRejectedValue(new Error("File not found")),
        readDirectory: vi.fn(),
        watchFiles: vi.fn(),
      } as any);

      const manifest = {
        sets: [{ values: ["missing.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light"],
            values: {
              light: ["light.json"],
            },
          },
        },
      };

      await expect(
        UPFT.resolveManifest(
          manifest,
          { theme: "light" },
          { fileReader: failingFileReader },
        ),
      ).rejects.toThrow("File not found");
    });

    it("should handle validation errors", async () => {
      const invalidTokens = {
        color: {
          // Missing $value
          red: { $type: "color" },
        },
      };

      const result = await UPFT.validateTokens(invalidTokens);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
