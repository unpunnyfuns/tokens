/**
 * Comprehensive unit tests for UPFT resolver
 */

import type { UPFTResolverManifest } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import { upftResolver } from "./upft-resolver.js";

describe("UPFT Resolver", () => {
  describe("detect", () => {
    it("should detect valid UPFT manifest", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {},
      };

      expect(upftResolver.detect(manifest)).toBe(true);
    });

    it("should detect UPFT manifest with minimal structure", () => {
      const manifest = {
        sets: [{}],
        modifiers: {},
      };

      expect(upftResolver.detect(manifest)).toBe(true);
    });

    it("should detect manifest without sets if it has modifiers", () => {
      const manifest = {
        modifiers: {},
      };

      // isUPFTManifest only requires modifiers, not sets
      expect(upftResolver.detect(manifest)).toBe(true);
    });

    it("should reject manifest without modifiers", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
      };

      expect(upftResolver.detect(manifest)).toBe(false);
    });

    it("should reject invalid input types", () => {
      expect(upftResolver.detect(null)).toBe(false);
      expect(upftResolver.detect(undefined)).toBe(false);
      expect(upftResolver.detect("string")).toBe(false);
      expect(upftResolver.detect(123)).toBe(false);
      expect(upftResolver.detect([])).toBe(false);
    });

    it("should detect manifest with non-array sets if it has valid modifiers", () => {
      const manifest = {
        sets: "not-an-array",
        modifiers: {},
      };

      // isUPFTManifest only validates the modifiers structure
      expect(upftResolver.detect(manifest)).toBe(true);
    });

    it("should reject manifest with non-object modifiers", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: "not-an-object",
      };

      expect(upftResolver.detect(manifest)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse minimal UPFT manifest", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");

      expect(ast.type).toBe("manifest");
      expect(ast.name).toBe("manifest");
      expect(ast.path).toBe("test.json");
      expect(ast.manifestType).toBe("upft");
      expect(ast.sets.size).toBe(1);
      expect(ast.modifiers.size).toBe(0);
    });

    it("should parse UPFT manifest with name and description", () => {
      const manifest: UPFTResolverManifest = {
        name: "My Design System",
        description: "A comprehensive design system",
        $schema: "https://example.com/schema.json",
        sets: [{ files: ["base.json"] }],
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");

      expect(ast.name).toBe("My Design System");
      expect(ast.metadata?.description).toBe("A comprehensive design system");
      expect(ast.metadata?.schema).toBe("https://example.com/schema.json");
    });

    it("should parse sets with files", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          {
            name: "base",
            description: "Base tokens",
            files: ["colors.json", "typography.json"],
          },
          {
            name: "components",
            files: ["button.json", "input.json"],
          },
        ],
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");

      expect(ast.sets.size).toBe(2);

      const baseSet = ast.sets.get("base");
      expect(baseSet?.name).toBe("base");
      expect(baseSet?.files).toEqual(["colors.json", "typography.json"]);
      expect(baseSet?.metadata?.description).toBe("Base tokens");

      const componentSet = ast.sets.get("components");
      expect(componentSet?.name).toBe("components");
      expect(componentSet?.files).toEqual(["button.json", "input.json"]);
    });

    it("should parse sets with values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          {
            name: "inline",
            values: ["inline-tokens.json"], // TokenSet.values should be string[]
          },
        ],
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");

      const inlineSet = ast.sets.get("inline");
      expect(inlineSet?.files).toEqual([]); // files comes from set.files, not set.values
      expect(inlineSet?.metadata?.upftValues).toEqual(["inline-tokens.json"]); // values are stored in metadata
    });

    it("should handle sets without names (generate IDs)", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["first.json"] }, { files: ["second.json"] }],
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");

      expect(ast.sets.has("set-0")).toBe(true);
      expect(ast.sets.has("set-1")).toBe(true);

      const firstSet = ast.sets.get("set-0");
      expect(firstSet?.name).toBe("set-0");
      expect(firstSet?.files).toEqual(["first.json"]);
    });

    it("should parse oneOf modifiers", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            default: "light",
            description: "Theme selection",
            values: {
              light: ["light.json"],
              dark: ["dark.json", "dark-overrides.json"],
            },
          },
        },
      };

      const ast = upftResolver.parse(manifest, "test.json");

      expect(ast.modifiers.size).toBe(1);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.constraintType).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark"]);
      expect(themeModifier?.defaultValue).toBe("light");
      expect(themeModifier?.description).toBe("Theme selection");
      expect(themeModifier?.values.get("light")).toEqual(["light.json"]);
      expect(themeModifier?.values.get("dark")).toEqual([
        "dark.json",
        "dark-overrides.json",
      ]);
    });

    it("should parse anyOf modifiers", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          features: {
            anyOf: ["responsive", "dark-mode", "a11y"],
            description: "Feature flags",
            values: {
              responsive: ["responsive.json"],
              "dark-mode": ["dark-mode.json"],
              a11y: ["accessibility.json"],
            },
          },
        },
      };

      const ast = upftResolver.parse(manifest, "test.json");

      const featuresModifier = ast.modifiers.get("features");
      expect(featuresModifier?.constraintType).toBe("anyOf");
      expect(featuresModifier?.options).toEqual([
        "responsive",
        "dark-mode",
        "a11y",
      ]);
      expect(featuresModifier?.defaultValue).toBe("");
      expect(featuresModifier?.values.get("responsive")).toEqual([
        "responsive.json",
      ]);
    });

    it("should parse manifest with options", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {},
        options: {
          resolveReferences: true,
          validation: {
            mode: "strict",
          },
        },
      };

      const ast = upftResolver.parse(manifest, "test.json");

      expect(ast.metadata?.options).toEqual({
        resolveReferences: true,
        validation: {
          mode: "strict",
        },
      });
    });

    it("should handle empty sets array", () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");
      expect(ast.sets.size).toBe(0);
    });

    it("should handle null/undefined set items", () => {
      const manifest: UPFTResolverManifest = {
        sets: [null, { files: ["valid.json"] }, undefined] as any,
        modifiers: {},
      };

      const ast = upftResolver.parse(manifest, "test.json");
      expect(ast.sets.size).toBe(1);
      expect(ast.sets.get("set-1")?.files).toEqual(["valid.json"]);
    });
  });

  describe("validate", () => {
    it("should validate correct UPFT manifest", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { files: ["base.json"] },
          { values: ["red-tokens.json"] }, // TokenSet.values should be string[]
        ],
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

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.errors).toHaveLength(0);
    });

    it("should reject invalid manifest", () => {
      const manifest = {
        invalid: "structure",
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(result?.errors).toHaveLength(1);
      expect(result?.errors[0]?.message).toBe("Invalid UPFT manifest format");
    });

    it("should reject manifest without sets", () => {
      const manifest = {
        modifiers: {},
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("at least one token set"),
        ),
      ).toBe(true);
    });

    it("should reject manifest with empty sets", () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {},
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("at least one token set"),
        ),
      ).toBe(true);
    });

    it("should reject set without files or values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ description: "Invalid set" }],
        modifiers: {},
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("must have either 'files' or 'values'"),
        ),
      ).toBe(true);
    });

    it("should warn about empty files array", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: [] }],
        modifiers: {},
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(
        result?.warnings.some((w) => w.message.includes("empty files array")),
      ).toBe(true);
    });

    it("should reject oneOf modifier without values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: [],
            values: {},
          },
        },
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("OneOf modifier must have values"),
        ),
      ).toBe(true);
    });

    it("should reject anyOf modifier without values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          features: {
            anyOf: [],
            values: {},
          },
        },
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("AnyOf modifier must have values"),
        ),
      ).toBe(true);
    });

    it("should reject modifier without values mapping", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {},
          },
        },
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(
        result?.errors.some((e) =>
          e.message.includes("Modifier must have values mapping"),
        ),
      ).toBe(true);
    });

    it("should handle complex validation scenarios", () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { files: [] }, // Warning: empty files
          { description: "Invalid" }, // Error: no files or values
          { files: ["valid.json"] }, // Valid
        ],
        modifiers: {
          validTheme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
          invalidTheme: {
            oneOf: [],
            values: {},
          },
        },
      };

      const result = upftResolver.validate?.(manifest);
      expect(result).toBeDefined();
      expect(result?.valid).toBe(false);
      expect(result?.errors.length).toBeGreaterThan(0);
      expect(result?.warnings.length).toBeGreaterThan(0);
    });
  });
});
