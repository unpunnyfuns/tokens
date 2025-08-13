import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { TokenFileReader } from "../filesystem/file-reader.js";
import { UPFTResolver } from "./upft-resolver.js";
import type { ResolutionInput, UPFTResolverManifest } from "./upft-types.js";

describe("UPFTResolver", () => {
  let resolver: UPFTResolver;
  let fileReader: TokenFileReader;
  const examplesPath = join(process.cwd(), "src", "examples");

  beforeEach(() => {
    // Use real file reader with examples directory
    fileReader = new TokenFileReader({
      basePath: examplesPath,
    });
    resolver = new UPFTResolver({
      fileReader,
      basePath: examplesPath,
    });
  });

  describe("input validation", () => {
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
          anyOf: ["comfortable", "compact"],
          values: {
            comfortable: ["test-scenarios/density-comfortable.json"],
            compact: ["test-scenarios/density-compact.json"],
          },
        },
      },
    };

    it("should validate valid oneOf input", () => {
      const validation = resolver.validateInput(manifest, { theme: "light" });
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it("should validate valid anyOf input", () => {
      const validation = resolver.validateInput(manifest, {
        density: ["comfortable", "compact"],
      });
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it("should reject invalid oneOf value", () => {
      const validation = resolver.validateInput(manifest, {
        theme: "invalid",
      });
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]?.modifier).toBe("theme");
      expect(validation.errors[0]?.message).toContain("Invalid value");
    });

    it("should reject array for oneOf", () => {
      const validation = resolver.validateInput(manifest, {
        theme: ["light", "dark"],
      });
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]?.modifier).toBe("theme");
      expect(validation.errors[0]?.message).toContain("single string");
    });

    it("should reject string for anyOf", () => {
      const validation = resolver.validateInput(manifest, {
        density: "comfortable",
      });
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]?.modifier).toBe("density");
      expect(validation.errors[0]?.message).toContain("array");
    });

    it("should reject unknown modifiers", () => {
      const validation = resolver.validateInput(manifest, {
        unknown: "value",
      });
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]?.modifier).toBe("unknown");
      expect(validation.errors[0]?.message).toContain("Unknown modifier");
    });

    it("should allow empty anyOf", () => {
      const validation = resolver.validateInput(manifest, {
        density: [],
      });
      expect(validation.valid).toBe(true);
    });

    it("should use default for unspecified oneOf", () => {
      const validation = resolver.validateInput(manifest, {});
      expect(validation.valid).toBe(true);
    });
  });

  describe("file resolution", () => {
    it("should resolve files from base sets", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { values: ["test-scenarios/base-tokens.json"] },
          { values: ["tokens/primitives/colors.json"] },
        ],
        modifiers: {},
      };

      const files = await resolver.getFilesForInput(manifest, {});

      expect(files).toContain("test-scenarios/base-tokens.json");
      expect(files).toContain("tokens/primitives/colors.json");
    });

    it("should resolve files for oneOf modifier", async () => {
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

      const files = await resolver.getFilesForInput(manifest, {
        theme: "dark",
      });

      expect(files).toContain("test-scenarios/base-tokens.json");
      expect(files).toContain("test-scenarios/theme-dark.json");
      expect(files).not.toContain("test-scenarios/theme-light.json");
    });

    it("should resolve files for anyOf modifier", async () => {
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

      const files = await resolver.getFilesForInput(manifest, {
        features: ["shadows", "typography"],
      });

      expect(files).toContain("tokens/primitives/colors.json");
      expect(files).toContain("tokens/shadows.json");
      expect(files).toContain("tokens/primitives/typography.json");
    });

    it("should use default for unspecified oneOf", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
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

      const files = await resolver.getFilesForInput(manifest, {});

      // Should use first option (light) as default
      expect(files).toContain("test-scenarios/theme-light.json");
    });
  });

  describe("permutation resolution", () => {
    it("should resolve a simple permutation", async () => {
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

      const result = await resolver.resolvePermutation(manifest, {
        theme: "light",
      });

      expect(result.id).toBe("theme-light");
      expect(result.input).toEqual({ theme: "light" });
      expect(result.files).toContain("test-scenarios/base-tokens.json");
      expect(result.files).toContain("test-scenarios/theme-light.json");
      expect(result.tokens).toBeDefined();
    });

    it("should merge tokens in correct order", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { values: ["tokens/primitives/colors.json"] },
          { values: ["tokens/semantic/colors.json"] },
        ],
        modifiers: {
          theme: {
            oneOf: ["dark"],
            values: {
              dark: ["tokens/themes/dark.json"],
            },
          },
        },
      };

      const result = await resolver.resolvePermutation(manifest, {
        theme: "dark",
      });

      // Later files should override earlier ones
      expect(result.tokens).toBeDefined();
      expect(result.files).toHaveLength(3);
    });

    it("should handle output specification", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {},
      };

      const result = await resolver.resolvePermutation(manifest, {
        output: "custom-output.json",
      } as ResolutionInput & { output: string });

      expect(result.output).toBe("custom-output.json");
    });

    it("should handle reference resolution when enabled", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { values: ["tokens/primitives/colors.json"] },
          { values: ["tokens/semantic/colors.json"] },
        ],
        modifiers: {},
        options: {
          resolveReferences: true,
        },
      };

      const result = await resolver.resolvePermutation(manifest, {});

      expect(result.resolvedTokens).toBeDefined();
    });
  });

  describe("permutation generation", () => {
    it("should generate all permutations for oneOf modifiers", async () => {
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
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["test-scenarios/density-comfortable.json"],
              compact: ["test-scenarios/density-compact.json"],
            },
          },
        },
      };

      const permutations = await resolver.generateAll(manifest);

      // 2 themes × 2 densities = 4 permutations
      expect(permutations).toHaveLength(4);

      const ids = permutations.map((p) => p.id);
      expect(ids).toContain("theme-light_density-comfortable");
      expect(ids).toContain("theme-light_density-compact");
      expect(ids).toContain("theme-dark_density-comfortable");
      expect(ids).toContain("theme-dark_density-compact");
    });

    it("should generate all permutations for anyOf modifiers", async () => {
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

      const permutations = await resolver.generateAll(manifest);

      // 2^2 = 4 permutations (power set)
      expect(permutations).toHaveLength(4);

      const ids = permutations.map((p) => p.id);
      expect(ids).toContain("default"); // No features
      expect(ids).toContain("features-shadows");
      expect(ids).toContain("features-typography");
      expect(ids).toContain("features-shadows+typography");
    });

    it("should respect generate field", async () => {
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
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["test-scenarios/density-comfortable.json"],
              compact: ["test-scenarios/density-compact.json"],
            },
          },
        },
        generate: [
          {
            theme: "light",
            density: "comfortable",
            output: "light-comfy.json",
          },
          { theme: "dark", density: "compact", output: "dark-compact.json" },
        ],
      };

      const permutations = await resolver.generateAll(manifest);

      // Only specified combinations
      expect(permutations).toHaveLength(2);

      expect(permutations[0]?.id).toBe("theme-light_density-comfortable");
      expect(permutations[0]?.output).toBe("light-comfy.json");

      expect(permutations[1]?.id).toBe("theme-dark_density-compact");
      expect(permutations[1]?.output).toBe("dark-compact.json");
    });

    it("should expand wildcard in anyOf", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["tokens/primitives/colors.json"] }],
        modifiers: {
          features: {
            anyOf: ["shadows", "typography", "animations"],
            values: {
              shadows: ["tokens/shadows.json"],
              typography: ["tokens/primitives/typography.json"],
              animations: [],
            },
          },
        },
        generate: [{ features: "*", output: "all-features.json" }],
      };

      const permutations = await resolver.generateAll(manifest);

      expect(permutations).toHaveLength(1);
      expect(permutations[0]?.input.features).toEqual([
        "shadows",
        "typography",
        "animations",
      ]);
      expect(permutations[0]?.output).toBe("all-features.json");
    });
  });

  describe("real manifest files", () => {
    it("should handle the simple manifest example", async () => {
      const manifestPath = join(
        examplesPath,
        "test-scenarios",
        "simple.manifest.json",
      );
      const manifest: UPFTResolverManifest = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      );

      // Create resolver with correct base path for test-scenarios
      const testResolver = new UPFTResolver({
        fileReader: new TokenFileReader({
          basePath: join(examplesPath, "test-scenarios"),
        }),
        basePath: join(examplesPath, "test-scenarios"),
      });

      const permutations = await testResolver.generateAll(manifest);
      expect(permutations.length).toBeGreaterThan(0);

      // Check that all permutations resolve successfully
      for (const perm of permutations) {
        expect(perm.tokens).toBeDefined();
        expect(perm.files.length).toBeGreaterThan(0);
      }
    });

    it("should handle the density variants manifest", async () => {
      const manifestPath = join(
        examplesPath,
        "test-scenarios",
        "density-variants.manifest.json",
      );
      const manifest: UPFTResolverManifest = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      );

      // Create resolver with correct base path for test-scenarios
      const testResolver = new UPFTResolver({
        fileReader: new TokenFileReader({
          basePath: join(examplesPath, "test-scenarios"),
        }),
        basePath: join(examplesPath, "test-scenarios"),
      });

      const permutations = await testResolver.generateAll(manifest);

      // Should have the density variants
      const ids = permutations.map((p) => p.id);
      expect(ids).toContain("density-comfortable");
      expect(ids).toContain("density-compact");
    });

    it("should handle the group mode manifest", async () => {
      const manifestPath = join(
        examplesPath,
        "test-scenarios",
        "group-mode.manifest.json",
      );
      const manifest: UPFTResolverManifest = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      );

      // Create resolver with correct base path for test-scenarios
      const testResolver = new UPFTResolver({
        fileReader: new TokenFileReader({
          basePath: join(examplesPath, "test-scenarios"),
        }),
        basePath: join(examplesPath, "test-scenarios"),
      });

      const permutations = await testResolver.generateAll(manifest);
      expect(permutations.length).toBeGreaterThan(0);
    });
  });
});
