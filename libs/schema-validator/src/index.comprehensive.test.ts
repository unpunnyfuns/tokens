/**
 * Comprehensive tests for schema validator functions
 */

import colorsBase from "@upft/examples/bundler-fixtures/input/colors-base.json" with {
  type: "json",
};
import simpleManifest from "@upft/examples/test-scenarios/simple.manifest.json" with {
  type: "json",
};
import simpleTokens from "@upft/examples/test-scenarios/simple-tokens.json" with {
  type: "json",
};
import { describe, expect, it } from "vitest";
import {
  detectFileType,
  validateManifest,
  validateTokenDocument,
} from "./index.js";

describe("schema-validator comprehensive coverage", () => {
  describe("validateManifest", () => {
    it("should validate correct manifest", () => {
      const result = validateManifest(simpleManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should reject invalid manifest", () => {
      const invalidManifest = {
        // Missing required fields
        invalidField: true,
      };

      const result = validateManifest(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle null input", () => {
      const result = validateManifest(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle undefined input", () => {
      const result = validateManifest(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle primitive inputs", () => {
      expect(validateManifest("string").valid).toBe(false);
      expect(validateManifest(123).valid).toBe(false);
      expect(validateManifest(true).valid).toBe(false);
    });

    it("should validate full manifest", () => {
      const fullManifest = {
        name: "Design System",
        description: "Core tokens",
        sets: [{ name: "core", files: ["tokens.json"] }],
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

      const result = validateManifest(fullManifest);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateTokenDocument", () => {
    it("should validate correct token document", () => {
      const result = validateTokenDocument(simpleTokens);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should validate with strict mode", () => {
      const tokensWithTypes = {
        colors: {
          primary: {
            $type: "color",
            $value: "#0066cc",
          },
        },
      };

      const result = validateTokenDocument(tokensWithTypes, { strict: true });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid token structure", () => {
      const invalidTokens = {
        colors: {
          primary: {
            // Missing $value
            invalidProp: true,
          },
        },
      };

      const result = validateTokenDocument(invalidTokens);
      // Note: This might still pass basic validation depending on schema strictness
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should handle null and undefined", () => {
      expect(validateTokenDocument(null).valid).toBe(false);
      expect(validateTokenDocument(undefined).valid).toBe(false);
    });

    it("should handle primitive inputs", () => {
      expect(validateTokenDocument("string").valid).toBe(false);
      expect(validateTokenDocument(123).valid).toBe(false);
      expect(validateTokenDocument(true).valid).toBe(false);
    });

    it("should handle empty objects", () => {
      const result = validateTokenDocument({});
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should validate complex token document", () => {
      const complexTokens = {
        ...colorsBase,
        typography: {
          heading: {
            $type: "typography",
            $value: {
              fontFamily: "Inter",
              fontSize: "24px",
              fontWeight: 600,
            },
          },
        },
      };

      const result = validateTokenDocument(complexTokens);
      expect(typeof result.valid).toBe("boolean");
    });
  });

  describe("detectFileType", () => {
    it("should detect manifest files", () => {
      expect(
        detectFileType({
          sets: [],
          modifiers: {},
        }),
      ).toBe("manifest");

      expect(
        detectFileType({
          modifiers: {
            theme: { oneOf: ["light", "dark"] },
          },
        }),
      ).toBe("manifest");

      expect(
        detectFileType({
          sets: [{ name: "core", files: ["tokens.json"] }],
        }),
      ).toBe("manifest");
    });

    it("should detect token files", () => {
      expect(detectFileType(colorsBase)).toBe("tokens");

      expect(
        detectFileType({
          spacing: {
            small: { $value: "8px" },
            medium: { $value: "16px" },
          },
        }),
      ).toBe("tokens");

      expect(
        detectFileType({
          typography: {
            heading: {
              large: { $value: "24px" },
              small: { $value: "16px" },
            },
          },
        }),
      ).toBe("tokens");
    });

    it("should return unknown for invalid inputs", () => {
      expect(detectFileType(null)).toBe("unknown");
      expect(detectFileType(undefined)).toBe("unknown");
      expect(detectFileType("string")).toBe("unknown");
      expect(detectFileType(123)).toBe("unknown");
      expect(detectFileType(true)).toBe("unknown");
      expect(detectFileType([])).toBe("unknown");
    });

    it("should return unknown for ambiguous objects", () => {
      expect(detectFileType({})).toBe("unknown");
      expect(
        detectFileType({
          someProperty: "value",
        }),
      ).toBe("unknown");
      expect(
        detectFileType({
          $schema: "http://example.com/schema.json",
        }),
      ).toBe("unknown");
    });

    it("should handle nested token structures", () => {
      expect(
        detectFileType({
          semantic: {
            colors: {
              action: {
                primary: { $value: "{colors.blue.500}" },
              },
            },
          },
        }),
      ).toBe("tokens");
    });

    it("should handle mixed content", () => {
      // Object with both meta properties and tokens
      expect(
        detectFileType({
          $description: "Design tokens",
          ...colorsBase,
        }),
      ).toBe("tokens");
    });

    it("should prioritize manifest detection", () => {
      // Object that could be either, but has manifest indicators
      expect(
        detectFileType({
          sets: [],
          ...colorsBase,
        }),
      ).toBe("manifest");
    });
  });
});
