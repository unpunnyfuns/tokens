import { describe, expect, it } from "vitest";
import {
  validateAnyOfInput,
  validateInput,
  validateOneOfInput,
  validateUnknownModifiers,
} from "./manifest-validation.js";
import type {
  AnyOfModifier,
  OneOfModifier,
  ResolutionInput,
  UPFTResolverManifest,
} from "./upft-types.js";

describe("manifest-validation", () => {
  describe("validateInput", () => {
    const manifest: UPFTResolverManifest = {
      sets: [],
      modifiers: {
        theme: {
          oneOf: ["light", "dark"],
          values: { light: ["light.json"], dark: ["dark.json"] },
          default: "light",
        },
        platform: {
          anyOf: ["web", "ios", "android"],
          values: {
            web: ["web.json"],
            ios: ["ios.json"],
            android: ["android.json"],
          },
        },
      },
    };

    it("should validate valid oneOf input", () => {
      const input: ResolutionInput = {
        theme: "light",
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate valid anyOf input", () => {
      const input: ResolutionInput = {
        platform: ["web", "ios"],
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate combined valid inputs", () => {
      const input: ResolutionInput = {
        theme: "dark",
        platform: ["android"],
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid oneOf value", () => {
      const input: ResolutionInput = {
        theme: "blue",
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        modifier: "theme",
        message: "Invalid value for oneOf modifier",
        received: "blue",
        expected: "one of: light, dark",
      });
    });

    it("should reject invalid anyOf value", () => {
      const input: ResolutionInput = {
        platform: ["web", "linux"],
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        modifier: "platform",
        message: "Invalid value in anyOf modifier array",
        received: "linux",
      });
    });

    it("should reject unknown modifiers", () => {
      const input: ResolutionInput = {
        theme: "light",
        unknown: "value",
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        modifier: "unknown",
        message: "Unknown modifier",
      });
    });

    it("should allow output field without validation", () => {
      const input: ResolutionInput = {
        theme: "light",
        output: "dist/tokens.json",
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should handle empty input", () => {
      const input: ResolutionInput = {};

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should collect multiple errors", () => {
      const input: ResolutionInput = {
        theme: "blue",
        platform: ["linux", "windows"],
        unknown: "value",
      };

      const result = validateInput(manifest, input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4); // 1 for theme, 2 for platform values, 1 for unknown
    });
  });

  describe("validateOneOfInput", () => {
    const modifierDef: OneOfModifier = {
      oneOf: ["small", "medium", "large"],
      values: {
        small: ["small.json"],
        medium: ["medium.json"],
        large: ["large.json"],
      },
      default: "medium",
    };

    it("should accept valid string value", () => {
      const errors = validateOneOfInput("size", modifierDef, "small");
      expect(errors).toEqual([]);
    });

    it("should accept null/undefined", () => {
      expect(validateOneOfInput("size", modifierDef, null)).toEqual([]);
      expect(validateOneOfInput("size", modifierDef, undefined)).toEqual([]);
    });

    it("should reject invalid string value", () => {
      const errors = validateOneOfInput("size", modifierDef, "extra-large");

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        modifier: "size",
        message: "Invalid value for oneOf modifier",
        received: "extra-large",
        expected: "one of: small, medium, large",
      });
    });

    it("should reject non-string values", () => {
      const errors = validateOneOfInput("size", modifierDef, ["small"]);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        modifier: "size",
        message: "oneOf modifier expects a single string value, got object",
        received: ["small"],
      });
    });

    it("should reject numeric values", () => {
      const errors = validateOneOfInput("size", modifierDef, 42);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        modifier: "size",
        message: "oneOf modifier expects a single string value, got number",
        received: 42,
      });
    });

    it("should handle oneOf with single option", () => {
      const singleDef: OneOfModifier = {
        oneOf: ["only"],
        values: {
          only: ["only.json"],
        },
        default: "only",
      };

      expect(validateOneOfInput("single", singleDef, "only")).toEqual([]);
      expect(validateOneOfInput("single", singleDef, "other")).toHaveLength(1);
    });
  });

  describe("validateAnyOfInput", () => {
    const modifierDef: AnyOfModifier = {
      anyOf: ["red", "green", "blue"],
      values: {
        red: ["red.json"],
        green: ["green.json"],
        blue: ["blue.json"],
      },
    };

    it("should accept valid array of strings", () => {
      const errors = validateAnyOfInput("colors", modifierDef, ["red", "blue"]);
      expect(errors).toEqual([]);
    });

    it("should accept empty array", () => {
      const errors = validateAnyOfInput("colors", modifierDef, []);
      expect(errors).toEqual([]);
    });

    it("should accept null/undefined", () => {
      expect(validateAnyOfInput("colors", modifierDef, null)).toEqual([]);
      expect(validateAnyOfInput("colors", modifierDef, undefined)).toEqual([]);
    });

    it("should reject non-array values", () => {
      const errors = validateAnyOfInput("colors", modifierDef, "red");

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        modifier: "colors",
        message: "anyOf modifier expects an array of strings, got string",
        received: "red",
      });
    });

    it("should reject invalid values in array", () => {
      const errors = validateAnyOfInput("colors", modifierDef, [
        "red",
        "yellow",
        "purple",
      ]);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatchObject({
        modifier: "colors",
        message: "Invalid value in anyOf modifier array",
        received: "yellow",
      });
      expect(errors[1]).toMatchObject({
        modifier: "colors",
        message: "Invalid value in anyOf modifier array",
        received: "purple",
      });
    });

    it("should reject non-string values in array", () => {
      const errors = validateAnyOfInput("colors", modifierDef, [
        "red",
        42,
        true,
      ]);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatchObject({
        modifier: "colors",
        message: "anyOf modifier array must contain only strings",
        received: 42,
        expected: "string",
      });
      expect(errors[1]).toMatchObject({
        modifier: "colors",
        message: "anyOf modifier array must contain only strings",
        received: true,
        expected: "string",
      });
    });

    it("should handle single value in array", () => {
      const errors = validateAnyOfInput("colors", modifierDef, ["green"]);
      expect(errors).toEqual([]);
    });

    it("should handle all values selected", () => {
      const errors = validateAnyOfInput("colors", modifierDef, [
        "red",
        "green",
        "blue",
      ]);
      expect(errors).toEqual([]);
    });

    it("should handle mixed valid and invalid", () => {
      const errors = validateAnyOfInput("colors", modifierDef, [
        "red",
        "invalid",
        "blue",
      ]);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        received: "invalid",
      });
    });
  });

  describe("validateUnknownModifiers", () => {
    const manifest: UPFTResolverManifest = {
      sets: [],
      modifiers: {
        theme: {
          oneOf: ["light", "dark"],
          values: { light: ["light.json"], dark: ["dark.json"] },
          default: "light",
        },
        density: {
          oneOf: ["comfortable", "compact"],
          values: {
            comfortable: ["comfortable.json"],
            compact: ["compact.json"],
          },
          default: "comfortable",
        },
      },
    };

    it("should accept known modifiers", () => {
      const input: ResolutionInput = {
        theme: "light",
        density: "compact",
      };

      const errors = validateUnknownModifiers(manifest, input);
      expect(errors).toEqual([]);
    });

    it("should accept output field", () => {
      const input: ResolutionInput = {
        theme: "light",
        output: "dist/tokens.json",
      };

      const errors = validateUnknownModifiers(manifest, input);
      expect(errors).toEqual([]);
    });

    it("should reject unknown modifiers", () => {
      const input: ResolutionInput = {
        theme: "light",
        unknown1: "value1",
        unknown2: "value2",
      };

      const errors = validateUnknownModifiers(manifest, input);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatchObject({
        modifier: "unknown1",
        message: "Unknown modifier",
        expected: "one of: theme, density",
      });
      expect(errors[1]).toMatchObject({
        modifier: "unknown2",
        message: "Unknown modifier",
      });
    });

    it("should handle empty input", () => {
      const input: ResolutionInput = {};

      const errors = validateUnknownModifiers(manifest, input);
      expect(errors).toEqual([]);
    });

    it("should handle manifest with no modifiers", () => {
      const emptyManifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {},
      };

      const input: ResolutionInput = {
        anything: "value",
      };

      const errors = validateUnknownModifiers(emptyManifest, input);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        modifier: "anything",
        message: "Unknown modifier",
        expected: "one of: ",
      });
    });

    it("should handle mixed known and unknown", () => {
      const input: ResolutionInput = {
        theme: "light",
        unknown: "value",
        density: "comfortable",
        another: "unknown",
      };

      const errors = validateUnknownModifiers(manifest, input);

      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.modifier)).toEqual(["unknown", "another"]);
    });
  });

  describe("edge cases", () => {
    it("should handle manifest with complex modifiers", () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          theme: {
            oneOf: ["light", "dark", "high-contrast"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
              "high-contrast": ["high-contrast.json"],
            },
            default: "light",
          },
          platform: {
            anyOf: ["web", "ios", "android", "desktop"],
            values: {
              web: ["web.json"],
              ios: ["ios.json"],
              android: ["android.json"],
              desktop: ["desktop.json"],
            },
          },
          locale: {
            oneOf: ["en", "fr", "de", "es"],
            values: {
              en: ["en.json"],
              fr: ["fr.json"],
              de: ["de.json"],
              es: ["es.json"],
            },
            default: "en",
          },
          features: {
            anyOf: ["basic", "premium", "enterprise"],
            values: {
              basic: ["basic.json"],
              premium: ["premium.json"],
              enterprise: ["enterprise.json"],
            },
          },
        },
      };

      const validInput: ResolutionInput = {
        theme: "high-contrast",
        platform: ["web", "desktop"],
        locale: "fr",
        features: ["premium", "enterprise"],
      };

      const result = validateInput(manifest, validInput);
      expect(result.valid).toBe(true);
    });

    it("should handle special characters in modifier values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          version: {
            oneOf: ["v1.0.0", "v2.0.0-beta", "v3.0.0+build"],
            values: {
              "v1.0.0": ["v1.json"],
              "v2.0.0-beta": ["v2.json"],
              "v3.0.0+build": ["v3.json"],
            },
            default: "v1.0.0",
          },
        },
      };

      const input: ResolutionInput = {
        version: "v2.0.0-beta",
      };

      const result = validateInput(manifest, input);
      expect(result.valid).toBe(true);
    });

    it("should handle boolean-like string values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          enabled: {
            oneOf: ["true", "false"],
            values: { true: ["enabled.json"], false: ["disabled.json"] },
            default: "false",
          },
        },
      };

      const input: ResolutionInput = {
        enabled: "true",
      };

      const result = validateInput(manifest, input);
      expect(result.valid).toBe(true);
    });

    it("should handle numeric-like string values", () => {
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          priority: {
            oneOf: ["1", "2", "3"],
            values: { "1": ["p1.json"], "2": ["p2.json"], "3": ["p3.json"] },
            default: "1",
          },
        },
      };

      const input: ResolutionInput = {
        priority: "2",
      };

      const result = validateInput(manifest, input);
      expect(result.valid).toBe(true);
    });
  });
});
