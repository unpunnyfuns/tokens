import { describe, expect, it } from "vitest";
import {
  isValidManifest,
  validateAndParseManifest,
  validateManifestDocument,
} from "./manifest-validation.js";

describe("manifest-validation", () => {
  describe("validateManifestDocument", () => {
    it("should validate a complete valid manifest", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }, { values: ["theme.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: "light.json",
              dark: "dark.json",
            },
          },
          platform: {
            anyOf: ["web", "ios", "android"],
            values: {
              web: "web.json",
              ios: "ios.json",
              android: "android.json",
            },
          },
        },
        output: {
          directory: "dist",
          filename: "tokens.json",
          merge: true,
          resolveReferences: true,
        },
        options: {
          resolveReferences: true,
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("should reject non-object manifest", () => {
      const result = validateManifestDocument("not an object");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "/",
        message: "Manifest must be an object",
        severity: "error",
      });
    });

    it("should reject null manifest", () => {
      const result = validateManifestDocument(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "/",
        message: "Manifest must be an object",
        severity: "error",
      });
    });

    it("should require sets array", () => {
      const manifest = {
        modifiers: {},
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets",
        message: "Manifest must have a sets array",
        severity: "error",
      });
    });

    it("should warn about empty sets array", () => {
      const manifest = {
        sets: [],
      };

      const result = validateManifestDocument(manifest);

      expect(result.warnings).toContainEqual({
        path: "sets",
        message: "Sets array is empty",
        severity: "warning",
      });
    });

    it("should validate set with files", () => {
      const manifest = {
        sets: [{ files: ["base.json", "theme.json"] }],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(true);
    });

    it("should validate set with values", () => {
      const manifest = {
        sets: [{ values: ["tokens/base.json", "tokens/theme.json"] }],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(true);
    });

    it("should reject set without files or values", () => {
      const manifest = {
        sets: [{ name: "invalid" }],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets[0]",
        message: "Set must have either files or values array",
        severity: "error",
      });
    });

    it("should reject non-string file paths", () => {
      const manifest = {
        sets: [{ files: ["valid.json", 123, null] }],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets[0].files[1]",
        message: "File path must be a string",
        severity: "error",
      });
      expect(result.errors).toContainEqual({
        path: "sets[0].files[2]",
        message: "File path must be a string",
        severity: "error",
      });
    });

    it("should reject non-string values", () => {
      const manifest = {
        sets: [{ values: ["valid.json", true, {}] }],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets[0].values[1]",
        message: "Value must be a string (file path)",
        severity: "error",
      });
      expect(result.errors).toContainEqual({
        path: "sets[0].values[2]",
        message: "Value must be a string (file path)",
        severity: "error",
      });
    });

    it("should reject non-object set", () => {
      const manifest = {
        sets: ["not an object"],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets[0]",
        message: "Set must be an object",
        severity: "error",
      });
    });

    it("should reject non-object set modifiers", () => {
      const manifest = {
        sets: [{ files: ["base.json"], modifiers: "invalid" }],
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets[0].modifiers",
        message: "Modifiers must be an object",
        severity: "error",
      });
    });

    it("should validate modifier with oneOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: "light.json",
              dark: "dark.json",
            },
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(true);
    });

    it("should validate modifier with anyOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          features: {
            anyOf: ["feature1", "feature2", "feature3"],
            values: {
              feature1: "f1.json",
              feature2: "f2.json",
              feature3: "f3.json",
            },
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(true);
    });

    it("should reject modifier without oneOf or anyOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          invalid: {
            values: {},
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.invalid",
        message: "Modifier must have either oneOf or anyOf",
        severity: "error",
      });
    });

    it("should reject modifier with both oneOf and anyOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          invalid: {
            oneOf: ["a"],
            anyOf: ["b"],
            values: {},
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.invalid",
        message: "Modifier cannot have both oneOf and anyOf",
        severity: "error",
      });
    });

    it("should reject non-array oneOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: "not an array",
            values: {},
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.theme.oneOf",
        message: "oneOf must be an array",
        severity: "error",
      });
    });

    it("should reject non-array anyOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          features: {
            anyOf: "not an array",
            values: {},
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.features.anyOf",
        message: "anyOf must be an array",
        severity: "error",
      });
    });

    it("should reject modifier without values object", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.theme.values",
        message: "Modifier must have a values object",
        severity: "error",
      });
    });

    it("should reject non-object values", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: "not an object",
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.theme.values",
        message: "Modifier must have a values object",
        severity: "error",
      });
    });

    it("should reject missing values for options", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark", "high-contrast"],
            values: {
              light: "light.json",
              // dark is missing
              // high-contrast is missing
            },
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.theme.values.dark",
        message: "Missing values for option 'dark'",
        severity: "error",
      });
      expect(result.errors).toContainEqual({
        path: "modifiers.theme.values.high-contrast",
        message: "Missing values for option 'high-contrast'",
        severity: "error",
      });
    });

    it("should reject non-string options", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", 123, null],
            values: {},
          },
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.theme.oneOf",
        message: "Options must be strings",
        severity: "error",
      });
    });

    it("should reject non-object modifier", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          invalid: "not an object",
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers.invalid",
        message: "Modifier must be an object",
        severity: "error",
      });
    });

    it("should reject non-object modifiers", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: "not an object",
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "modifiers",
        message: "Modifiers must be an object",
        severity: "error",
      });
    });

    it("should validate output configuration", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        output: {
          directory: "dist",
          filename: "tokens.json",
          merge: true,
          resolveReferences: false,
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(true);
    });

    it("should reject non-object output", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        output: "not an object",
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "output",
        message: "Output must be an object",
        severity: "error",
      });
    });

    it("should reject non-string output directory", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        output: {
          directory: 123,
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "output.directory",
        message: "Output directory must be a string",
        severity: "error",
      });
    });

    it("should reject non-string output filename", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        output: {
          filename: true,
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "output.filename",
        message: "Output filename must be a string",
        severity: "error",
      });
    });

    it("should reject non-boolean output merge", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        output: {
          merge: "yes",
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "output.merge",
        message: "Output merge must be a boolean",
        severity: "error",
      });
    });

    it("should reject non-boolean output resolveReferences", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        output: {
          resolveReferences: 1,
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "output.resolveReferences",
        message: "Output resolveReferences must be a boolean",
        severity: "error",
      });
    });

    it("should reject non-object options", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        options: "not an object",
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "options",
        message: "Options must be an object",
        severity: "error",
      });
    });

    it("should reject non-array sets", () => {
      const manifest = {
        sets: "not an array",
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "sets",
        message: "Manifest must have a sets array",
        severity: "error",
      });
    });

    it("should collect multiple errors", () => {
      const manifest = {
        sets: ["invalid", { files: [123] }, { values: [true] }],
        modifiers: {
          invalid1: "not object",
          invalid2: { values: {} },
          invalid3: {
            oneOf: ["a"],
            anyOf: ["b"],
            values: {},
          },
        },
        output: {
          directory: 123,
          filename: true,
        },
      };

      const result = validateManifestDocument(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });
  });

  describe("isValidManifest", () => {
    it("should return true for valid manifest", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: { light: "l.json", dark: "d.json" },
          },
        },
      };

      expect(isValidManifest(manifest)).toBe(true);
    });

    it("should return false for non-object", () => {
      expect(isValidManifest("not object")).toBe(false);
      expect(isValidManifest(null)).toBe(false);
      expect(isValidManifest(undefined)).toBe(false);
      expect(isValidManifest(123)).toBe(false);
    });

    it("should return false without sets", () => {
      const manifest = {
        modifiers: {},
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return false with non-array sets", () => {
      const manifest = {
        sets: "not array",
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return false with empty sets", () => {
      const manifest = {
        sets: [],
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return false with non-object modifiers", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: "not object",
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return false with invalid modifier structure", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          invalid: { values: {} }, // Missing oneOf/anyOf
        },
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return false with modifier having both oneOf and anyOf", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          invalid: {
            oneOf: ["a"],
            anyOf: ["b"],
            values: {},
          },
        },
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return false with modifier missing values", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          invalid: {
            oneOf: ["a", "b"],
          },
        },
      };

      expect(isValidManifest(manifest)).toBe(false);
    });

    it("should return true with valid anyOf modifier", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          features: {
            anyOf: ["f1", "f2"],
            values: { f1: "f1.json", f2: "f2.json" },
          },
        },
      };

      expect(isValidManifest(manifest)).toBe(true);
    });

    it("should return true without modifiers", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
      };

      expect(isValidManifest(manifest)).toBe(true);
    });
  });

  describe("validateAndParseManifest", () => {
    it("should return typed manifest for valid input", () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: { light: "l.json", dark: "d.json" },
          },
        },
      };

      const result = validateAndParseManifest(manifest);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.manifest).toBe(manifest);
        expect(result.manifest.sets).toHaveLength(1);
      }
    });

    it("should return errors for invalid input", () => {
      const manifest = {
        // Missing required sets property
        modifiers: {},
      };

      const result = validateAndParseManifest(manifest);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("should handle complex valid manifest", () => {
      const manifest = {
        sets: [
          { files: ["base.json", "semantic.json"] },
          { values: ["components/button.json"] },
        ],
        modifiers: {
          theme: {
            oneOf: ["light", "dark", "high-contrast"],
            values: {
              light: "themes/light.json",
              dark: "themes/dark.json",
              "high-contrast": "themes/high-contrast.json",
            },
          },
          platform: {
            anyOf: ["web", "ios", "android"],
            values: {
              web: "platforms/web.json",
              ios: "platforms/ios.json",
              android: "platforms/android.json",
            },
          },
        },
        output: {
          directory: "dist/tokens",
          filename: "{theme}-{platform}.json",
          merge: true,
          resolveReferences: true,
        },
        options: {
          resolveReferences: true,
          validate: true,
        },
      };

      const result = validateAndParseManifest(manifest);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.manifest.sets).toHaveLength(2);
        expect(result.manifest.modifiers).toHaveProperty("theme");
        expect(result.manifest.modifiers).toHaveProperty("platform");
      }
    });

    it("should handle manifest with multiple validation errors", () => {
      const manifest = {
        sets: "not array",
        modifiers: "not object",
        output: "not object",
        options: "not object",
      };

      const result = validateAndParseManifest(manifest);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
