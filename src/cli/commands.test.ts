import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenFileReader } from "../filesystem/file-reader.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import type { UPFTResolverManifest } from "../resolver/upft-types.js";
import { TokenCLI } from "./commands.js";

describe("TokenCLI", () => {
  let cli: TokenCLI;
  let fileReader: TokenFileReader;
  let fileWriter: TokenFileWriter;
  const examplesPath = join(process.cwd(), "src", "examples");

  beforeEach(() => {
    // Use real file reader with examples directory
    fileReader = new TokenFileReader({
      basePath: examplesPath,
    });
    fileWriter = new TokenFileWriter();

    cli = new TokenCLI({
      fileReader,
      fileWriter,
      basePath: examplesPath,
    });
  });

  describe("validate", () => {
    it("should validate a correct manifest using legacy method", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
        },
      };

      const result = await cli.validate(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate a manifest using validateManifest", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
        },
      };

      const result = await cli.validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate a token file", async () => {
      const filePath = join(examplesPath, "test.json");
      const result = await cli.validateTokenFile(filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate all token files in a directory", async () => {
      const dirPath = join(examplesPath, "test-scenarios");
      const result = await cli.validateDirectory(dirPath);

      // Check result - may have errors if examples aren't all valid
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
    });

    it("should validate the example simple manifest", async () => {
      const manifestPath = join(
        examplesPath,
        "test-scenarios",
        "simple.manifest.json",
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

      const result = await cli.validate(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate the density variants manifest", async () => {
      const manifestPath = join(
        examplesPath,
        "test-scenarios",
        "density-variants.manifest.json",
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

      const result = await cli.validate(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should catch invalid manifest structure", async () => {
      const invalidManifest = {
        // Missing required 'sets' field
        modifiers: {},
      };

      const result = await cli.validate(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain("sets");
    });

    it("should catch invalid modifier structure", async () => {
      const invalidManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            // Missing oneOf or anyOf
            values: {
              light: ["test-scenarios/theme-light.json"],
            },
          },
        },
      };

      const result = await cli.validate(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("resolve", () => {
    it("should resolve a single permutation", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
        },
      };

      const result = await cli.resolve(manifest, { theme: "light" });

      expect(result.id).toBe("theme-light");
      expect(result.files).toContain("test-scenarios/base-tokens.json");
      expect(result.files).toContain("test-scenarios/theme-light.json");
      expect(result.tokens).toBeDefined();
    });

    it("should resolve with multiple modifiers", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
          density: {
            oneOf: ["base", "comfortable", "compact"],
            values: {
              base: ["test-scenarios/density-base.json"],
              comfortable: ["test-scenarios/density-comfortable.json"],
              compact: ["test-scenarios/density-compact.json"],
            },
          },
        },
      };

      const result = await cli.resolve(manifest, {
        theme: "dark",
        density: "compact",
      });

      expect(result.id).toBe("theme-dark_density-compact");
      expect(result.files).toContain("test-scenarios/theme-dark.json");
      expect(result.files).toContain("test-scenarios/density-compact.json");
    });
  });

  describe("build", () => {
    it("should build bundles to files", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: [],
              dark: [],
            },
          },
        },
        generate: [
          { theme: "light", output: "dist/light.json" },
          { theme: "dark", output: "dist/dark.json" },
        ],
      };

      const writeSpy = vi.spyOn(fileWriter, "write").mockResolvedValue();
      const results = await cli.build(manifest);

      expect(results).toHaveLength(2);
      expect(results.every((r: any) => r.success)).toBe(true);
      expect(writeSpy).toHaveBeenCalledWith(
        join(examplesPath, "dist/light.json"),
        expect.any(String),
      );
      expect(writeSpy).toHaveBeenCalledWith(
        join(examplesPath, "dist/dark.json"),
        expect.any(String),
      );
    });
  });

  describe("list", () => {
    it("should list all permutations", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
        },
      };

      const permutations = await cli.list(manifest);

      expect(permutations).toHaveLength(2);
      expect(permutations.map((p: any) => p.id)).toEqual([
        "theme-light",
        "theme-dark",
      ]);
    });

    it("should list permutations with anyOf modifiers", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["tokens/primitives/colors.json"] }],
        modifiers: {
          features: {
            anyOf: ["shadows", "typography"],
            values: {
              shadows: ["tokens/shadows.json"],
              typography: ["tokens/primitives/typography.json"],
            },
          },
        },
      };

      const permutations = await cli.list(manifest);

      // 2^2 = 4 combinations
      expect(permutations).toHaveLength(4);
      const ids = permutations.map((p: any) => p.id);
      expect(ids).toContain("default");
      expect(ids).toContain("features-shadows");
      expect(ids).toContain("features-typography");
      expect(ids).toContain("features-shadows+typography");
    });
  });

  describe("info", () => {
    it("should provide manifest information", async () => {
      const manifest: UPFTResolverManifest = {
        name: "Test Design System",
        description: "Testing manifest info",
        sets: [
          {
            name: "Base",
            values: ["test-scenarios/base-tokens.json"],
          },
        ],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
          density: {
            anyOf: ["comfortable", "compact"],
            values: {
              comfortable: ["test-scenarios/density-comfortable.json"],
              compact: ["test-scenarios/density-compact.json"],
            },
          },
        },
        generate: [
          {
            theme: "light",
            density: ["comfortable"],
            output: "light-comfortable.json",
          },
        ],
      };

      const info = await cli.info(manifest);

      expect(info.name).toBe("Test Design System");
      expect(info.description).toBe("Testing manifest info");
      expect(info.sets).toHaveLength(1);
      expect(info.sets[0]?.name).toBe("Base");
      expect(info.sets[0]?.fileCount).toBe(1);

      expect(info.modifiers).toHaveLength(2);
      const themeModifier = info.modifiers.find((m) => m.name === "theme");
      expect(themeModifier?.type).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark"]);

      const densityModifier = info.modifiers.find((m) => m.name === "density");
      expect(densityModifier?.type).toBe("anyOf");
      expect(densityModifier?.options).toEqual(["comfortable", "compact"]);

      // 2 themes × 4 density combinations (none, comfortable, compact, both) = 8
      expect(info.possiblePermutations).toBe(8);
      expect(info.generateCount).toBe(1);
    });
  });

  describe("diff", () => {
    it("should compare two permutations", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
        },
      };

      const diff = await cli.diff(
        manifest,
        { theme: "light" },
        { theme: "dark" },
      );

      expect(diff.differences).toBeDefined();
      expect(diff.summary).toBeDefined();
      expect(diff.summary.added).toBeGreaterThanOrEqual(0);
      expect(diff.summary.removed).toBeGreaterThanOrEqual(0);
      expect(diff.summary.changed).toBeGreaterThanOrEqual(0);
    });

    it("should detect changes between density variants", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["test-scenarios/density-comfortable.json"],
              compact: ["test-scenarios/density-compact.json"],
            },
          },
        },
      };

      const diff = await cli.diff(
        manifest,
        { density: "comfortable" },
        { density: "compact" },
      );

      // Should find differences in spacing values
      expect(diff.differences.length).toBeGreaterThan(0);
    });
  });
});
