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

  describe("edge cases and error handling", () => {
    it("should handle null and undefined bundle gracefully", () => {
      // These should handle gracefully by treating as empty bundles
      const nullResult = validateBundle(null as unknown as TokenDocument);
      expect(nullResult.valid).toBe(true);
      expect(nullResult.stats.totalTokens).toBe(0);

      const undefinedResult = validateBundle(
        undefined as unknown as TokenDocument,
      );
      expect(undefinedResult.valid).toBe(true);
      expect(undefinedResult.stats.totalTokens).toBe(0);
    });

    it("should handle empty bundle", () => {
      const result = validateBundle({});

      expect(result.valid).toBe(true);
      expect(result.stats.totalTokens).toBe(0);
      expect(result.stats.tokenTypes).toEqual({});
    });

    it("should handle bundle with only metadata", () => {
      const metadataOnlyBundle = {
        $schema: "https://design-tokens.org/schema",
        $description: "A bundle with only metadata",
        $extensions: {
          "custom-metadata": true,
        },
      };

      const result = validateBundle(metadataOnlyBundle);

      expect(result.valid).toBe(true);
      expect(result.stats.totalTokens).toBe(0);
    });

    it("should detect tokens with only $type but invalid structure", () => {
      const bundleWithInvalidStructure = {
        invalidToken: {
          $type: "color",
          // Has $type but structure is invalid
          someRandomProperty: "value",
        },
      };

      const result = validateBundle(bundleWithInvalidStructure);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("missing required $value"),
        ),
      ).toBe(true);
    });

    it("should handle deeply nested token groups", () => {
      const deepBundle = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  deepToken: {
                    $type: "color",
                    $value: "#ff0000",
                  },
                },
              },
            },
          },
        },
      };

      const result = validateBundle(deepBundle);

      expect(result.valid).toBe(true);
      expect(result.stats.totalTokens).toBe(1);
    });

    it("should validate tokens with $value but no $type", () => {
      const bundleWithValueNoType = {
        colors: {
          orphan: {
            $value: "#ff0000",
            // Missing $type but has $value
          },
        },
      };

      const result = validateBundle(bundleWithValueNoType);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("missing required $type")),
      ).toBe(true);
      // Should still count as a token due to presence of $value
      expect(result.stats.totalTokens).toBe(1);
    });

    it("should handle circular references in token values", () => {
      const circularValue: Record<string, unknown> = {};
      circularValue.self = circularValue; // Create circular reference

      const bundleWithCircular = {
        circular: {
          $type: "dimension",
          $value: circularValue,
        },
      };

      // Circular references will cause JSON.stringify to throw, so it should be handled
      const result = validateBundle(bundleWithCircular);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Bundle size"))).toBe(
        true,
      );
    });
  });

  describe("advanced color validation", () => {
    it("should handle color values with hex format", () => {
      const hexColorBundle = {
        colors: {
          hex3: { $type: "color", $value: "#f00" },
          hex4: { $type: "color", $value: "#f00a" },
          hex6: { $type: "color", $value: "#ff0000" },
          hex8: { $type: "color", $value: "#ff0000aa" },
        },
      };

      const result = validateBundle(hexColorBundle);
      expect(result.valid).toBe(true);
      expect(result.stats.totalTokens).toBe(4);
    });

    it("should handle color values with CSS function formats", () => {
      const cssFunctionBundle = {
        colors: {
          rgb: { $type: "color", $value: "rgb(255, 0, 0)" },
          rgba: { $type: "color", $value: "rgba(255, 0, 0, 0.5)" },
          hsl: { $type: "color", $value: "hsl(0, 100%, 50%)" },
          hsla: { $type: "color", $value: "hsla(0, 100%, 50%, 0.5)" },
          colorFunction: { $type: "color", $value: "color(srgb 1 0 0)" },
        },
      };

      const result = validateBundle(cssFunctionBundle);
      expect(result.valid).toBe(true);
    });

    it("should handle object colors with invalid structure", () => {
      const invalidObjectColors = {
        colors: {
          noComponents: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              // Missing components
            },
          },
          invalidComponentsType: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: "not an array",
            },
          },
          emptyComponents: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [],
            },
          },
        },
      };

      const result = validateBundle(invalidObjectColors);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle color components with edge values", () => {
      const edgeColorBundle = {
        colors: {
          minValues: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 0, 0],
              alpha: 0,
            },
          },
          maxValues: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [1, 1, 1],
              alpha: 1,
            },
          },
        },
      };

      const result = validateBundle(edgeColorBundle);
      expect(result.valid).toBe(true);
    });
  });

  describe("advanced dimension validation", () => {
    it("should handle all valid CSS units", () => {
      const validUnits = [
        "px",
        "rem",
        "em",
        "%",
        "vh",
        "vw",
        "pt",
        "pc",
        "in",
        "cm",
        "mm",
        "ex",
        "ch",
        "lh",
        "cap",
        "ic",
        "rlh",
      ];

      const dimensionBundle: TokenDocument = {
        spacing: Object.fromEntries(
          validUnits.map((unit, i) => [
            `unit${unit}`,
            {
              $type: "dimension",
              $value: `${i + 1}${unit}`,
            },
          ]),
        ),
      };

      const result = validateBundle(dimensionBundle);
      expect(result.valid).toBe(true);
      expect(result.stats.totalTokens).toBe(validUnits.length);
    });

    it("should handle negative dimensions", () => {
      const negativeDimensions = {
        spacing: {
          negative: {
            $type: "dimension",
            $value: "-16px",
          },
          negativeDecimal: {
            $type: "dimension",
            $value: "-1.5rem",
          },
          negativeObject: {
            $type: "dimension",
            $value: {
              value: -10,
              unit: "px",
            },
          },
        },
      };

      const result = validateBundle(negativeDimensions);
      expect(result.valid).toBe(true);
    });

    it("should detect dimension values with invalid numeric parts", () => {
      const invalidNumericDimensions = {
        spacing: {
          notANumber: {
            $type: "dimension",
            $value: "notanumberpx",
          },
          multipleNumbers: {
            $type: "dimension",
            $value: "1.2.3px",
          },
        },
      };

      const result = validateBundle(invalidNumericDimensions);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Invalid dimension value format"),
        ),
      ).toBe(true);
    });

    it("should handle dimension objects with non-numeric values", () => {
      const invalidObjectDimensions = {
        spacing: {
          stringValue: {
            $type: "dimension",
            $value: {
              value: "not a number",
              unit: "px",
            },
          },
          nullValue: {
            $type: "dimension",
            $value: {
              value: null,
              unit: "rem",
            },
          },
        },
      };

      const result = validateBundle(invalidObjectDimensions);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Dimension value must be a number"),
        ),
      ).toBe(true);
    });
  });

  describe("reference validation edge cases", () => {
    it("should handle nested object references", () => {
      const nestedReferenceBundle = {
        typography: {
          complex: {
            $type: "typography",
            $value: {
              fontFamily: "{typography.base.family}",
              fontSize: {
                value: "{spacing.medium}",
                unit: "px",
              },
              nested: {
                deep: "{colors.primary.value}",
              },
            },
          },
        },
      };

      const result = validateBundle(nestedReferenceBundle, {
        checkReferences: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some((e) => e.message.includes("unresolved reference")),
      ).toBe(true);
    });

    it("should handle references in array values", () => {
      const arrayReferenceBundle = {
        typography: {
          fontStack: {
            $type: "fontFamily",
            $value: ["{fonts.primary}", "system-ui", "sans-serif"],
          },
          measurements: {
            $type: "dimension",
            $value: ["{spacing.sm}", "{spacing.md}", "{spacing.lg}"],
          },
        },
      };

      const result = validateBundle(arrayReferenceBundle, {
        checkReferences: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle malformed reference patterns", () => {
      const malformedReferences = {
        tokens: {
          incomplete1: { $type: "color", $value: "{unclosed.reference" },
          incomplete2: { $type: "color", $value: "unopened.reference}" },
          empty: { $type: "color", $value: "{}" },
          spaces: { $type: "color", $value: "{ spaced reference }" },
        },
      };

      const result = validateBundle(malformedReferences, {
        checkReferences: true,
      });

      // Some patterns might be detected as references, others might not
      // The important thing is that it doesn't crash
      expect(result).toBeDefined();
    });
  });

  describe("number validation", () => {
    it("should handle various number formats", () => {
      const numberBundle = {
        numbers: {
          integer: { $type: "number", $value: 42 },
          float: { $type: "number", $value: Math.PI },
          negative: { $type: "number", $value: -100 },
          zero: { $type: "number", $value: 0 },
          scientific: { $type: "number", $value: 1e-5 },
          infinity: { $type: "number", $value: Number.POSITIVE_INFINITY },
        },
      };

      const result = validateBundle(numberBundle);

      expect(result.valid).toBe(true);
      expect(result.stats.totalTokens).toBe(6);
      expect(result.stats.tokenTypes.number).toBe(6);
    });

    it("should detect invalid number values", () => {
      const invalidNumbers = {
        numbers: {
          string: { $type: "number", $value: "not a number" },
          object: { $type: "number", $value: { value: 42 } },
          array: { $type: "number", $value: [1, 2, 3] },
          // Note: NaN is technically a number in JavaScript, so it passes typeof === 'number'
          // We'll test a boolean instead
          boolean: { $type: "number", $value: true },
        },
      };

      const result = validateBundle(invalidNumbers);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(4); // All should be invalid
      expect(
        result.errors.every((e) =>
          e.message.includes("Number token value must be a number"),
        ),
      ).toBe(true);
    });
  });

  describe("fontFamily validation edge cases", () => {
    it("should handle empty font family arrays", () => {
      const emptyFontFamily = {
        typography: {
          empty: {
            $type: "fontFamily",
            $value: [],
          },
        },
      };

      const result = validateBundle(emptyFontFamily);
      expect(result.valid).toBe(true); // Empty arrays are valid
    });

    it("should detect non-string font names", () => {
      const invalidFontNames = {
        typography: {
          mixed: {
            $type: "fontFamily",
            $value: ["Inter", 42, true, null, { fontName: "Arial" }],
          },
        },
      };

      const result = validateBundle(invalidFontNames);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("All font family names must be strings"),
        ),
      ).toBe(true);
    });

    it("should handle font families with special characters", () => {
      const specialFontNames = {
        typography: {
          special: {
            $type: "fontFamily",
            $value: [
              "Helvetica Neue",
              "Arial Black",
              "Times New Roman",
              "MS Gothic",
            ],
          },
        },
      };

      const result = validateBundle(specialFontNames);
      expect(result.valid).toBe(true);
    });
  });

  describe("fontWeight validation edge cases", () => {
    it("should handle all valid numeric font weights", () => {
      const fontWeights = {
        typography: Object.fromEntries(
          [1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(
            (weight) => [
              `weight${weight}`,
              { $type: "fontWeight", $value: weight },
            ],
          ),
        ),
      };

      const result = validateBundle(fontWeights);
      expect(result.valid).toBe(true);
    });

    it("should warn about non-standard font weights", () => {
      const nonStandardWeights = {
        typography: {
          unusual1: { $type: "fontWeight", $value: 50 },
          unusual2: { $type: "fontWeight", $value: 75 },
          unusual3: { $type: "fontWeight", $value: 99 },
        },
      };

      const result = validateBundle(nonStandardWeights);

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) =>
          w.message.includes("Non-standard font weight"),
        ),
      ).toBe(true);
    });

    it("should handle edge case font weight values", () => {
      const edgeWeights = {
        typography: {
          minimum: { $type: "fontWeight", $value: 1 },
          maximum: { $type: "fontWeight", $value: 1000 },
          tooLow: { $type: "fontWeight", $value: 0 },
          tooHigh: { $type: "fontWeight", $value: 1001 },
          decimal: { $type: "fontWeight", $value: 400.5 },
        },
      };

      const result = validateBundle(edgeWeights);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("between 1 and 1000")),
      ).toBe(true);
    });
  });

  describe("bundle size validation", () => {
    it("should handle extremely small size limits", () => {
      const smallBundle = {
        token: { $type: "color", $value: "#f00" },
      };

      const result = validateBundle(smallBundle, { maxBundleSize: 0.00001 }); // 0.00001MB = 0.01KB

      // The bundle is larger than 0.01KB, so it should fail
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Bundle size"))).toBe(
        true,
      );
    });

    it("should calculate size correctly for different token types", () => {
      const complexBundle = {
        largeObject: {
          $type: "typography",
          $value: {
            fontFamily: ["Inter", "system-ui", "sans-serif"],
            fontSize: { value: 16, unit: "px" },
            fontWeight: 400,
            lineHeight: 1.5,
            letterSpacing: 0,
            textAlign: "left",
            textDecoration: "none",
            textTransform: "none",
          },
          $description:
            "A very detailed typography token with lots of properties",
          $extensions: {
            figma: { styleId: "some-very-long-figma-style-identifier" },
            sketch: { symbolId: "another-long-identifier-for-sketch" },
          },
        },
      };

      const result = validateBundle(complexBundle);

      expect(result.stats.bundleSizeKB).toBeGreaterThan(0);
      expect(typeof result.stats.bundleSizeKB).toBe("number");
    });
  });

  describe("custom validation options", () => {
    it("should respect all validation options being disabled", () => {
      const problematicBundle = {
        "BAD-name_with_MIXED_case": {
          $type: "color",
          $value: "{unresolved.reference}",
          // Missing $description
        },
        invalidColor: {
          $type: "color",
          $value: "not-a-valid-color",
        },
      };

      const result = validateBundle(problematicBundle, {
        checkReferences: false,
        validateTypes: false,
        requireDescriptions: false,
        validateNaming: false,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle validation options with mixed settings", () => {
      const bundle = {
        "mixed-name_CASE": {
          $type: "fontWeight",
          $value: 1500, // Invalid
        },
      };

      const result = validateBundle(bundle, {
        checkReferences: false,
        validateTypes: true, // Will catch the invalid font weight
        requireDescriptions: false,
        validateNaming: true, // Will catch the mixed naming
      });

      expect(result.valid).toBe(false); // Error makes it invalid
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
