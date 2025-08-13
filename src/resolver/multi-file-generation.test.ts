import { describe, expect, it } from "vitest";
import { UPFTResolver } from "./upft-resolver.js";
import type { UPFTResolverManifest } from "./upft-types.js";

describe("Multi-File Generation", () => {
  const resolver = new UPFTResolver();

  describe("expandGenerateSpecWithFiltering", () => {
    it("should return single spec when no expansion needed", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {},
      };

      const spec = {
        output: "test.json",
        includeSets: ["base"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(1);
      expect(result[0]?.output).toBe("test.json");
    });

    it("should expand oneOf modifier to multiple files", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme-light.json"],
              dark: ["theme-dark.json"],
            },
          },
        },
      };

      const spec = {
        output: "tokens.json",
        includeModifiers: ["theme"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(2);
      expect(result[0]?.output).toBe("tokens-light.json");
      expect(result[1]?.output).toBe("tokens-dark.json");
    });

    it("should handle multiple oneOf modifiers", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme-light.json"],
              dark: ["theme-dark.json"],
            },
          },
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["density-comfortable.json"],
              compact: ["density-compact.json"],
            },
          },
        },
      };

      const spec = {
        output: "tokens.json",
        includeModifiers: ["theme", "density"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(4);
      expect(result.map((r) => r.output)).toEqual([
        "tokens-light-comfortable.json",
        "tokens-light-compact.json",
        "tokens-dark-comfortable.json",
        "tokens-dark-compact.json",
      ]);
    });

    it("should not expand specific modifier values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme-light.json"],
              dark: ["theme-dark.json"],
            },
          },
        },
      };

      const spec = {
        output: "tokens.json",
        includeModifiers: ["theme:light"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(1);
      expect(result[0]?.output).toBe("tokens.json");
    });

    it("should handle mixed general and specific modifiers", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme-light.json"],
              dark: ["theme-dark.json"],
            },
          },
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["density-comfortable.json"],
              compact: ["density-compact.json"],
            },
          },
        },
      };

      const spec = {
        output: "tokens.json",
        includeModifiers: ["theme", "density:compact"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.output)).toEqual([
        "tokens-light.json",
        "tokens-dark.json",
      ]);
    });
  });

  describe("filtering logic", () => {
    it("should handle includeSets filtering", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {},
      };

      const spec = {
        output: "test.json",
        includeSets: ["base"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(1);
      expect(result[0]?.output).toBe("test.json");
      // The filtering should be applied when the files are collected
    });

    it("should handle excludeSets filtering", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {},
      };

      const spec = {
        output: "test.json",
        excludeSets: ["components"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(1);
      expect(result[0]?.output).toBe("test.json");
    });

    it("should handle includeModifiers filtering", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme-light.json"],
              dark: ["theme-dark.json"],
            },
          },
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["density-comfortable.json"],
              compact: ["density-compact.json"],
            },
          },
        },
      };

      const spec = {
        output: "test.json",
        includeModifiers: ["theme:light"],
        excludeModifiers: ["density"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(1);
      expect(result[0]?.output).toBe("test.json");
    });

    it("should combine set and modifier filtering", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme-light.json"],
              dark: ["theme-dark.json"],
            },
          },
        },
      };

      const spec = {
        output: "filtered.json",
        includeSets: ["base"],
        includeModifiers: ["theme"],
      };

      const result = resolver.expandGenerateSpecWithFiltering(manifest, spec);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.output)).toEqual([
        "filtered-light.json",
        "filtered-dark.json",
      ]);
    });
  });
});
