/**
 * Tests for W3C DTCG resolver
 */

import dtcgExample from "@upft/fixtures/test-scenarios/dtcg-resolver.json" with {
  type: "json",
};
import { describe, expect, it } from "vitest";
import { type DTCGResolverManifest, dtcgResolver } from "./dtcg-resolver.js";

describe("DTCG Resolver", () => {
  describe("detect", () => {
    it("should detect valid DTCG resolver manifest", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "tokens.json" }],
      };

      expect(dtcgResolver.detect(manifest)).toBe(true);
    });

    it("should detect example DTCG manifest", () => {
      expect(dtcgResolver.detect(dtcgExample)).toBe(true);
    });

    it("should reject manifest without version", () => {
      const manifest = {
        sets: [{ source: "tokens.json" }],
      };

      expect(dtcgResolver.detect(manifest)).toBe(false);
    });

    it("should detect manifest with any version string", () => {
      const manifest = {
        version: "1.0.0",
        sets: [{ source: "tokens.json" }],
      };

      expect(dtcgResolver.detect(manifest)).toBe(true);
    });

    it("should reject manifest without sets", () => {
      const manifest = {
        version: "2025-10-01",
      };

      expect(dtcgResolver.detect(manifest)).toBe(false);
    });

    it("should reject manifest with empty sets", () => {
      const manifest = {
        version: "2025-10-01",
        sets: [],
      };

      expect(dtcgResolver.detect(manifest)).toBe(false);
    });

    it("should reject invalid input", () => {
      expect(dtcgResolver.detect(null)).toBe(false);
      expect(dtcgResolver.detect(undefined)).toBe(false);
      expect(dtcgResolver.detect("string")).toBe(false);
      expect(dtcgResolver.detect(123)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse simple DTCG manifest", () => {
      const manifest: DTCGResolverManifest = {
        name: "Test Resolver",
        version: "2025-10-01",
        description: "Test description",
        sets: [
          {
            source: "base.json",
            description: "Base tokens",
          },
          {
            tokens: {
              color: { red: { $type: "color", $value: "#ff0000" } },
            },
            namespace: "inline",
          },
        ],
      };

      const ast = dtcgResolver.parse(manifest, "test.json");

      expect(ast.name).toBe("Test Resolver");
      expect(ast.manifestType).toBe("dtcg");
      expect(ast.path).toBe("test.json");
      expect(ast.metadata?.description).toBe("Test description");
      expect(ast.metadata?.version).toBe("2025-10-01");

      // Check sets
      expect(ast.sets.size).toBe(2);

      const firstSet = ast.sets.get("set-0");
      expect(firstSet?.files).toEqual(["base.json"]);
      expect(firstSet?.metadata?.description).toBe("Base tokens");

      const secondSet = ast.sets.get("set-1");
      expect(secondSet?.files).toEqual([]);
      expect(secondSet?.metadata?.dtcgInlineTokens).toEqual({
        color: { red: { $type: "color", $value: "#ff0000" } },
      });
      expect(secondSet?.metadata?.dtcgNamespace).toBe("inline");
    });

    it("should parse DTCG manifest with enumerated modifier", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "base.json" }],
        modifiers: [
          {
            name: "theme",
            type: "enumerated",
            values: ["light", "dark"],
            sets: {
              light: [{ source: "light.json" }],
              dark: [{ source: "dark.json" }],
            },
          },
        ],
      };

      const ast = dtcgResolver.parse(manifest, "test.json");

      expect(ast.modifiers.size).toBe(1);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.constraintType).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark"]);
      expect(themeModifier?.metadata?.dtcgType).toBe("enumerated");

      // Check modifier values (file paths)
      expect(themeModifier?.values.get("light")).toEqual(["light.json"]);
      expect(themeModifier?.values.get("dark")).toEqual(["dark.json"]);
    });

    it("should parse DTCG manifest with include modifier", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "base.json" }],
        modifiers: [
          {
            name: "platform",
            type: "include",
            include: [{ source: "web.json" }, { source: "mobile.json" }],
          },
        ],
      };

      const ast = dtcgResolver.parse(manifest, "test.json");

      const platformModifier = ast.modifiers.get("platform");
      expect(platformModifier?.constraintType).toBe("anyOf");
      expect(platformModifier?.values.get("*")).toEqual([
        "web.json",
        "mobile.json",
      ]);
    });

    it("should parse example DTCG manifest", () => {
      const ast = dtcgResolver.parse(dtcgExample, "dtcg-resolver.json");

      expect(ast.name).toBe("DTCG Example Resolver");
      expect(ast.manifestType).toBe("dtcg");
      expect(ast.metadata?.description).toBe(
        "Example W3C DTCG resolver manifest",
      );
      expect(ast.metadata?.extensions).toEqual({
        tooling: {
          generator: "tokens-studio",
          version: "1.0.0",
        },
      });

      // Check sets
      expect(ast.sets.size).toBe(3); // 3 base sets

      // Check modifiers
      expect(ast.modifiers.size).toBe(2);
      expect(ast.modifiers.has("theme")).toBe(true);
      expect(ast.modifiers.has("platform")).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate correct DTCG manifest", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "tokens.json" }],
      };

      const result = dtcgResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.errors).toHaveLength(0);
    });

    it("should accept any version string", () => {
      const manifest = {
        version: "1.2.3",
        sets: [{ source: "tokens.json" }],
      };

      const result = dtcgResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.errors).toHaveLength(0);
    });

    it("should reject set without source or tokens", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [
          { description: "Invalid set" }, // No source or tokens
        ],
      };

      const result = dtcgResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("must have either 'source' or 'tokens'"),
        ),
      ).toBe(true);
    });

    it("should warn about set with both source and tokens", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [
          {
            source: "tokens.json",
            tokens: { color: { red: { $type: "color", $value: "#ff0000" } } },
          },
        ],
      };

      const result = dtcgResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(
        result?.warnings.some((w) =>
          w.message.includes("both 'source' and 'tokens'"),
        ),
      ).toBe(true);
    });

    it("should reject enumerated modifier without values", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "base.json" }],
        modifiers: [
          {
            name: "theme",
            type: "enumerated",
            // Missing values
          },
        ],
      };

      const result = dtcgResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) => e.message.includes("must have values")),
      ).toBe(true);
    });

    it("should reject modifier without name", () => {
      const manifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "base.json" }],
        modifiers: [
          {
            type: "enumerated",
            values: ["light", "dark"],
            // Missing name
          } as any,
        ],
      };

      const result = dtcgResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) => e.message.includes("must have a name")),
      ).toBe(true);
    });

    it("should validate example DTCG manifest", () => {
      const result = dtcgResolver.validate?.(dtcgExample);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
    });
  });
});
