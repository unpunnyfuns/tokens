/**
 * Tests for bundle validation
 */

import type { TokenDocument } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import { validateBundle } from "./bundle-validator.js";

describe("validateBundle", () => {
  describe("basic validation", () => {
    it("should validate a simple valid bundle", () => {
      const bundle: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 0.5, 1],
              alpha: 1,
            },
          },
        },
        spacing: {
          small: {
            $type: "dimension",
            $value: {
              value: 8,
              unit: "px",
            },
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalTokens).toBe(2);
      expect(result.stats.tokenTypes).toEqual({
        color: 1,
        dimension: 1,
      });
    });

    it("should detect tokens with missing required properties", () => {
      const bundle: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            // Missing $value
          },
          secondary: {
            $value: "#ff0000",
            // Missing $type
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain(
        "missing required $value property",
      );
      expect(result.errors[1].message).toContain(
        "missing required $type property",
      );
    });
  });

  describe("reference validation", () => {
    it("should detect unresolved references", () => {
      const bundle: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: "{colors.base}", // Unresolved reference
          },
        },
      };

      const result = validateBundle(bundle, { checkReferences: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("unresolved reference");
    });

    it("should pass when checkReferences is disabled", () => {
      const bundle: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: "{colors.base}",
          },
        },
      };

      const result = validateBundle(bundle, { checkReferences: false });

      expect(result.valid).toBe(true);
    });
  });

  describe("color validation", () => {
    it("should validate color values with colorSpace format", () => {
      const bundle: TokenDocument = {
        colors: {
          valid: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0.2, 0.4, 0.8],
              alpha: 1,
            },
          },
        },
      };

      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
    });

    it("should detect invalid color component values", () => {
      const bundle: TokenDocument = {
        colors: {
          invalid: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [1.5, -0.1, 0.5], // Invalid: >1 and <0
              alpha: 2, // Invalid: >1
            },
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("component 0 must be")),
      ).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("component 1 must be")),
      ).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("alpha must be")),
      ).toBe(true);
    });

    it("should require colorSpace for object color values", () => {
      const bundle: TokenDocument = {
        colors: {
          invalid: {
            $type: "color",
            $value: {
              components: [0.2, 0.4, 0.8], // Missing colorSpace
            },
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("missing colorSpace")),
      ).toBe(true);
    });
  });

  describe("dimension validation", () => {
    it("should validate dimension values with value/unit format", () => {
      const bundle: TokenDocument = {
        spacing: {
          small: {
            $type: "dimension",
            $value: {
              value: 16,
              unit: "px",
            },
          },
        },
      };

      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
    });

    it("should validate string dimension values", () => {
      const bundle: TokenDocument = {
        spacing: {
          small: {
            $type: "dimension",
            $value: "1.5rem",
          },
        },
      };

      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
    });

    it("should detect invalid dimension units", () => {
      const bundle: TokenDocument = {
        spacing: {
          invalid: {
            $type: "dimension",
            $value: {
              value: 16,
              unit: "invalid", // Invalid unit
            },
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("valid CSS unit")),
      ).toBe(true);
    });

    it("should detect invalid string dimension format", () => {
      const bundle: TokenDocument = {
        spacing: {
          invalid: {
            $type: "dimension",
            $value: "not-a-dimension",
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Invalid dimension value format"),
        ),
      ).toBe(true);
    });
  });

  describe("fontFamily validation", () => {
    it("should validate fontFamily arrays", () => {
      const bundle: TokenDocument = {
        typography: {
          sans: {
            $type: "fontFamily",
            $value: ["Inter", "system-ui", "sans-serif"],
          },
        },
      };

      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
    });

    it("should detect invalid fontFamily values", () => {
      const bundle: TokenDocument = {
        typography: {
          invalid: {
            $type: "fontFamily",
            $value: "not-an-array",
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("must be an array")),
      ).toBe(true);
    });
  });

  describe("fontWeight validation", () => {
    it("should validate numeric font weights", () => {
      const bundle: TokenDocument = {
        typography: {
          normal: {
            $type: "fontWeight",
            $value: 400,
          },
          bold: {
            $type: "fontWeight",
            $value: 700,
          },
        },
      };

      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
    });

    it("should validate font weight keywords", () => {
      const bundle: TokenDocument = {
        typography: {
          normal: {
            $type: "fontWeight",
            $value: "normal",
          },
          bold: {
            $type: "fontWeight",
            $value: "bold",
          },
        },
      };

      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
    });

    it("should detect invalid font weight values", () => {
      const bundle: TokenDocument = {
        typography: {
          invalid: {
            $type: "fontWeight",
            $value: 1500, // Too high
          },
          alsoInvalid: {
            $type: "fontWeight",
            $value: "invalid-keyword",
          },
        },
      };

      const result = validateBundle(bundle);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("between 1 and 1000")),
      ).toBe(true);
      expect(
        result.errors.some((e) =>
          e.message.includes("Invalid font weight keyword"),
        ),
      ).toBe(true);
    });
  });

  describe("bundle size validation", () => {
    it("should detect oversized bundles", () => {
      // Create a large bundle
      const largeBundle: TokenDocument = {};
      for (let i = 0; i < 1000; i++) {
        largeBundle[`token${i}`] = {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [Math.random(), Math.random(), Math.random()],
            alpha: 1,
          },
        };
      }

      const result = validateBundle(largeBundle, { maxBundleSize: 0.01 }); // 0.01MB = 10KB

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Bundle size"))).toBe(
        true,
      );
    });
  });

  describe("naming validation", () => {
    it("should warn about mixed naming conventions", () => {
      const bundle: TokenDocument = {
        colors: {
          "primary-color_value": {
            // Mixed dash and underscore
            $type: "color",
            $value: "#ff0000",
          },
          UPPERCASE: {
            // Uppercase
            $type: "color",
            $value: "#00ff00",
          },
        },
      };

      const result = validateBundle(bundle, { validateNaming: true });

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(2);
      expect(
        result.warnings.some((w) =>
          w.message.includes("Mixed naming conventions"),
        ),
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes("uppercase characters")),
      ).toBe(true);
    });
  });

  describe("description validation", () => {
    it("should warn about missing descriptions when required", () => {
      const bundle: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: "#ff0000",
            // Missing $description
          },
        },
      };

      const result = validateBundle(bundle, { requireDescriptions: true });

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("missing $description");
    });
  });

  describe("statistics", () => {
    it("should calculate correct statistics", () => {
      const bundle: TokenDocument = {
        colors: {
          primary: { $type: "color", $value: "#ff0000" },
          secondary: { $type: "color", $value: "#00ff00" },
        },
        spacing: {
          small: { $type: "dimension", $value: "8px" },
          medium: { $type: "dimension", $value: "16px" },
          large: { $type: "dimension", $value: "24px" },
        },
        typography: {
          weight: { $type: "number", $value: 400 },
        },
      };

      const result = validateBundle(bundle);

      expect(result.stats.totalTokens).toBe(6);
      expect(result.stats.tokenTypes).toEqual({
        color: 2,
        dimension: 3,
        number: 1,
      });
      expect(result.stats.bundleSizeKB).toBeGreaterThan(0);
    });
  });
});
