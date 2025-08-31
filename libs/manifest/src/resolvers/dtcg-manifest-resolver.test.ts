/**
 * Comprehensive unit tests for DTCG manifest resolver
 */

import { describe, expect, it, vi } from "vitest";
import {
  type DTCGManifest,
  dtcgManifestResolver,
  isDTCGManifestFormat,
} from "./dtcg-manifest-resolver.js";

// Mock glob to avoid file system dependencies in tests
vi.mock("glob", () => ({
  glob: {
    sync: vi.fn((pattern: string) => {
      // Return predictable results for test patterns
      if (pattern.includes("tokens/*.json")) {
        return ["tokens/colors.json", "tokens/typography.json"];
      }
      if (pattern.includes("themes/*.json")) {
        return ["themes/light.json", "themes/dark.json"];
      }
      if (pattern === "base.json") {
        return ["base.json"];
      }
      return [];
    }),
  },
}));

describe("DTCG Manifest Resolver", () => {
  describe("isDTCGManifestFormat", () => {
    it("should detect valid DTCG manifest", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["tokens/*.json"],
          },
        ],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(true);
    });

    it("should detect DTCG manifest with themes", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [
          {
            id: "light",
            name: "Light Theme",
            conditions: { theme: "light" },
            sources: ["base"],
          },
        ],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(true);
    });

    it("should detect DTCG manifest with outputs", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        outputs: [
          {
            format: "css",
            destination: "output.css",
          },
        ],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(true);
    });

    it("should reject manifest without sources", () => {
      const manifest = {
        themes: [],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(false);
    });

    it("should reject manifest with empty sources", () => {
      const manifest = {
        sources: [],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(false);
    });

    it("should reject manifest with invalid source structure", () => {
      const manifest = {
        sources: [
          {
            // Missing name and include
            description: "Invalid source",
          },
        ],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(false);
    });

    it("should reject manifest with invalid themes", () => {
      const manifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [
          {
            // Missing required fields
            description: "Invalid theme",
          },
        ],
      };

      expect(isDTCGManifestFormat(manifest)).toBe(false);
    });

    it("should reject invalid input types", () => {
      expect(isDTCGManifestFormat(null)).toBe(false);
      expect(isDTCGManifestFormat(undefined)).toBe(false);
      expect(isDTCGManifestFormat("string")).toBe(false);
      expect(isDTCGManifestFormat(123)).toBe(false);
      expect(isDTCGManifestFormat([])).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse minimal DTCG manifest", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      expect(ast.type).toBe("manifest");
      expect(ast.name).toBe("dtcg-manifest");
      expect(ast.path).toBe("manifest.json");
      expect(ast.manifestType).toBe("dtcg-manifest");
      expect(ast.sets.size).toBe(1);
      expect(ast.modifiers.size).toBe(0);
    });

    it("should parse DTCG manifest with metadata", () => {
      const manifest: DTCGManifest = {
        $schema: "https://example.com/schema.json",
        name: "My Design Tokens",
        version: "1.0.0",
        description: "Comprehensive design token system",
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        outputs: [
          {
            format: "css",
            destination: "tokens.css",
          },
        ],
        $extensions: {
          tooling: {
            generator: "figma-tokens",
          },
        },
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      expect(ast.name).toBe("My Design Tokens");
      expect(ast.metadata?.description).toBe(
        "Comprehensive design token system",
      );
      expect(ast.metadata?.version).toBe("1.0.0");
      expect(ast.metadata?.extensions).toEqual({
        tooling: {
          generator: "figma-tokens",
        },
      });
      expect(ast.metadata?.dtcgOutputs).toEqual([
        {
          format: "css",
          destination: "tokens.css",
        },
      ]);
    });

    it("should parse sources with descriptions and conditions", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
            description: "Base design tokens",
          },
          {
            name: "platform-web",
            include: ["web/*.json"],
            conditions: { platform: "web" },
            description: "Web-specific tokens",
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      expect(ast.sets.size).toBe(2);

      const baseSet = ast.sets.get("base");
      expect(baseSet?.name).toBe("base");
      expect(baseSet?.metadata?.description).toBe("Base design tokens");
      expect(baseSet?.metadata?.dtcgSourceName).toBe("base");

      const webSet = ast.sets.get("platform-web");
      expect(webSet?.name).toBe("platform-web");
      expect(webSet?.metadata?.description).toBe("Web-specific tokens");
      expect(webSet?.metadata?.dtcgConditions).toEqual({ platform: "web" });
    });

    it("should resolve glob patterns in sources", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "tokens",
            include: ["tokens/*.json"],
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(
        manifest,
        "/project/manifest.json",
      );

      const tokenSet = ast.sets.get("tokens");
      expect(tokenSet?.files).toEqual([
        "tokens/colors.json",
        "tokens/typography.json",
      ]);
    });

    it("should handle glob failures gracefully", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "fallback",
            include: ["nonexistent/*.json"],
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      const fallbackSet = ast.sets.get("fallback");
      expect(fallbackSet?.files).toEqual(["nonexistent/*.json"]);
    });

    it("should parse themes into modifiers", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
          {
            name: "light-theme",
            include: ["light.json"],
          },
          {
            name: "dark-theme",
            include: ["dark.json"],
          },
        ],
        themes: [
          {
            id: "light",
            name: "Light Theme",
            conditions: { theme: "light" },
            sources: ["base", "light-theme"],
          },
          {
            id: "dark",
            name: "Dark Theme",
            conditions: { theme: "dark" },
            sources: ["base", "dark-theme"],
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      expect(ast.modifiers.size).toBe(1);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.constraintType).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark"]);
      expect(themeModifier?.values.get("light")).toEqual([
        "base",
        "light-theme",
      ]);
      expect(themeModifier?.values.get("dark")).toEqual(["base", "dark-theme"]);
    });

    it("should handle multiple condition keys in themes", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [
          {
            id: "light-web",
            name: "Light Web",
            conditions: { theme: "light", platform: "web" },
            sources: ["base"],
          },
          {
            id: "dark-mobile",
            name: "Dark Mobile",
            conditions: { theme: "dark", platform: "mobile" },
            sources: ["base"],
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      expect(ast.modifiers.size).toBe(2);
      expect(ast.modifiers.has("theme")).toBe(true);
      expect(ast.modifiers.has("platform")).toBe(true);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.options).toEqual(["light", "dark"]);

      const platformModifier = ast.modifiers.get("platform");
      expect(platformModifier?.options).toEqual(["web", "mobile"]);
    });

    it("should handle themes with shared sources", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
          {
            name: "shared",
            include: ["shared.json"],
          },
        ],
        themes: [
          {
            id: "theme1",
            name: "Theme 1",
            conditions: { theme: "light" },
            sources: ["base", "shared"],
          },
          {
            id: "theme2",
            name: "Theme 2",
            conditions: { theme: "light" },
            sources: ["shared"],
          },
        ],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.values.get("light")).toEqual(["base", "shared"]);
    });

    it("should handle empty themes array", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [],
      };

      const ast = dtcgManifestResolver.parse(manifest, "manifest.json");
      expect(ast.modifiers.size).toBe(0);
    });
  });

  describe("validate", () => {
    it("should validate correct DTCG manifest", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.errors).toHaveLength(0);
    });

    it("should validate DTCG manifest with themes and outputs", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [
          {
            id: "light",
            name: "Light",
            conditions: { theme: "light" },
            sources: ["base"],
          },
        ],
        outputs: [
          {
            format: "css",
            destination: "output.css",
          },
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
    });

    it("should reject invalid manifest structure", () => {
      const manifest = {
        invalid: "structure",
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(result?.errors[0]?.message).toBe(
        "Missing or invalid sources property",
      );
    });

    it("should reject manifest without sources", () => {
      const manifest = {
        themes: [],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Missing or invalid sources"),
        ),
      ).toBe(true);
    });

    it("should reject manifest with empty sources", () => {
      const manifest = {
        sources: [],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Sources array cannot be empty"),
        ),
      ).toBe(true);
    });

    it("should reject source without name", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            include: ["base.json"],
          } as any, // Missing name
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Source must have a name"),
        ),
      ).toBe(true);
    });

    it("should reject source with empty include", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "empty",
            include: [],
          },
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Source must have non-empty include array"),
        ),
      ).toBe(true);
    });

    it("should reject theme without required fields", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [
          {
            description: "Invalid theme",
          } as any, // Missing required fields
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(result?.errors.length).toBeGreaterThan(0);
    });

    it("should reject theme with unknown source reference", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        themes: [
          {
            id: "theme1",
            name: "Theme 1",
            conditions: { theme: "light" },
            sources: ["base", "unknown-source"],
          },
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("references unknown source"),
        ),
      ).toBe(true);
    });

    it("should reject output without required fields", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
        outputs: [
          {
            // Missing format and destination
            options: {},
          } as any,
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Output must have a format"),
        ),
      ).toBe(true);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Output must have a destination"),
        ),
      ).toBe(true);
    });

    it("should handle complex validation scenarios", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "valid",
            include: ["valid.json"],
          },
          {
            name: "", // Invalid: empty name
            include: ["invalid.json"],
          },
        ],
        themes: [
          {
            id: "valid-theme",
            name: "Valid Theme",
            conditions: { theme: "light" },
            sources: ["valid"],
          },
          {
            id: "invalid-theme",
            name: "Invalid Theme",
            conditions: { theme: "dark" },
            sources: ["nonexistent"], // Invalid: unknown source
          },
        ],
      };

      const result = dtcgManifestResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(result?.errors.length).toBeGreaterThan(1);
    });
  });

  describe("detect", () => {
    it("should use isDTCGManifestFormat for detection", () => {
      const manifest: DTCGManifest = {
        sources: [
          {
            name: "base",
            include: ["base.json"],
          },
        ],
      };

      expect(dtcgManifestResolver.detect(manifest)).toBe(true);
      expect(dtcgManifestResolver.detect({})).toBe(false);
    });
  });
});
