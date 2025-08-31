/**
 * Tests for token merging functionality
 */

import colorsBase from "@upft/fixtures/bundler-fixtures/input/colors-base.json" with {
  type: "json",
};
import spacingBase from "@upft/fixtures/bundler-fixtures/input/spacing-base.json" with {
  type: "json",
};
import { describe, expect, it } from "vitest";
import type { TokenDocument } from "../types.js";
import { DTCGMergeError, merge } from "./merge/index.js";

describe("Token Merging", () => {
  describe("basic merging", () => {
    it("should merge simple token documents", () => {
      const base: TokenDocument = colorsBase;

      const overrides: TokenDocument = {
        color: {
          tertiary: {
            $value: {
              colorSpace: "srgb",
              components: [0.2, 0.8, 0.6],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      const result = merge(base, overrides);

      expect(result.color).toHaveProperty("primary");
      expect(result.color).toHaveProperty("secondary");
      expect(result.color).toHaveProperty("tertiary");
      expect((result.color as any).tertiary.$value.components).toEqual([
        0.2, 0.8, 0.6,
      ]);
    });

    it("should override token values", () => {
      const base: TokenDocument = colorsBase;

      const overrides: TokenDocument = {
        color: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 1, 1],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      const result = merge(base, overrides);

      expect((result.color as any).primary.$value.components).toEqual([
        1, 1, 1,
      ]);
    });

    it("should merge nested groups", () => {
      const base: TokenDocument = colorsBase;

      const overrides: TokenDocument = {
        color: {
          semantic: {
            text: {
              $value: {
                colorSpace: "srgb",
                components: [0.2, 0.2, 0.2],
                alpha: 1,
              },
              $type: "color",
            },
          },
        },
      };

      const result = merge(base, overrides);

      expect(result.color).toHaveProperty("primary");
      expect(result.color).toHaveProperty("secondary");
      expect((result.color as any).semantic?.text?.$value?.components).toEqual([
        0.2, 0.2, 0.2,
      ]);
    });
  });

  describe("composite token merging", () => {
    it("should merge shadow tokens", () => {
      const base: TokenDocument = {
        shadow: {
          elevation: {
            $value: {
              color: "#000",
              offsetX: "0px",
              offsetY: "2px",
              blur: "4px",
              spread: "0px",
            },
            $type: "shadow",
          },
        },
      };

      const overrides: TokenDocument = {
        shadow: {
          elevation: {
            $value: {
              color: "#333",
              offsetY: "4px",
            },
            $type: "shadow",
          },
        },
      };

      const result = merge(base, overrides);

      expect((result.shadow as any)?.elevation).toEqual({
        $value: {
          color: "#333",
          offsetX: "0px",
          offsetY: "4px",
          blur: "4px",
          spread: "0px",
        },
        $type: "shadow",
      });
    });

    it("should merge typography tokens", () => {
      const base: TokenDocument = {
        typography: {
          heading: {
            $value: {
              fontFamily: "Arial",
              fontSize: "24px",
              lineHeight: 1.2,
            },
            $type: "typography",
          },
        },
      };

      const overrides: TokenDocument = {
        typography: {
          heading: {
            $value: {
              fontSize: "32px",
              fontWeight: "bold",
            },
            $type: "typography",
          },
        },
      };

      const result = merge(base, overrides);

      expect((result.typography as any)?.heading).toEqual({
        $value: {
          fontFamily: "Arial",
          fontSize: "32px",
          lineHeight: 1.2,
          fontWeight: "bold",
        },
        $type: "typography",
      });
    });
  });

  describe("metadata merging", () => {
    it("should merge token descriptions", () => {
      const base: TokenDocument = {
        color: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0, 0],
              alpha: 1,
            },
            $type: "color",
            $description: "Base primary color",
          },
        },
      };

      const overrides: TokenDocument = {
        color: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 1, 1],
              alpha: 1,
            },
            $description: "Overridden primary color",
          },
        },
      };

      const result = merge(base, overrides);

      expect((result.color as any)?.primary).toEqual({
        $value: {
          colorSpace: "srgb",
          components: [1, 1, 1],
          alpha: 1,
        },
        $type: "color",
        $description: "Overridden primary color",
      });
    });

    it("should preserve extensions", () => {
      const base: TokenDocument = {
        color: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0, 0],
              alpha: 1,
            },
            $type: "color",
            $extensions: { "custom.metadata": "original" },
          },
        },
      };

      const overrides: TokenDocument = {
        color: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 1, 1],
              alpha: 1,
            },
            $extensions: { "custom.metadata": "updated", "new.field": "added" },
          },
        },
      };

      const result = merge(base, overrides);

      expect((result.color as any)?.primary).toEqual({
        $value: {
          colorSpace: "srgb",
          components: [1, 1, 1],
          alpha: 1,
        },
        $type: "color",
        $extensions: {
          "custom.metadata": "updated",
          "new.field": "added",
        },
      });
    });
  });

  describe("conflict detection and errors", () => {
    it("should throw on type mismatches", () => {
      const base: TokenDocument = spacingBase;

      const overrides: TokenDocument = {
        spacing: {
          md: {
            $value: {
              colorSpace: "srgb",
              components: [1, 1, 1],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      expect(() => merge(base, overrides)).toThrow(DTCGMergeError);
      expect(() => merge(base, overrides)).toThrow(
        /Token merge conflict at 'spacing\.md'/,
      );
    });

    it("should throw when merging token with group", () => {
      const base: TokenDocument = {
        spacing: {
          $value: {
            value: 16,
            unit: "px",
          },
          $type: "dimension",
        },
      };

      const overrides: TokenDocument = {
        spacing: {
          small: {
            $value: {
              value: 8,
              unit: "px",
            },
            $type: "dimension",
          },
        },
      };

      expect(() => merge(base, overrides)).toThrow(DTCGMergeError);
    });

    it("should throw when merging group with token", () => {
      const base: TokenDocument = spacingBase;

      const overrides: TokenDocument = {
        spacing: {
          $value: {
            value: 16,
            unit: "px",
          },
          $type: "dimension",
        },
      };

      expect(() => merge(base, overrides)).toThrow(DTCGMergeError);
    });

    it("should provide detailed error messages for multiple conflicts", () => {
      const base: TokenDocument = {
        ...colorsBase,
        ...spacingBase,
      };

      const overrides: TokenDocument = {
        color: {
          primary: {
            $value: {
              value: 16,
              unit: "px",
            },
            $type: "dimension",
          },
        },
        spacing: {
          md: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      let error: DTCGMergeError | undefined;
      try {
        merge(base, overrides);
      } catch (e) {
        error = e as DTCGMergeError;
      }

      expect(error).toBeInstanceOf(DTCGMergeError);
      expect(error?.message).toContain("color.primary");
    });
  });

  describe("edge cases", () => {
    it("should handle empty documents", () => {
      const result = merge({}, colorsBase);
      expect(result).toEqual(colorsBase);
    });

    it("should handle merging with empty override", () => {
      const result = merge(colorsBase, {});
      expect(result).toEqual(colorsBase);
    });

    it("should preserve group types", () => {
      const base: TokenDocument = {
        color: {
          $type: "color",
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0, 0],
              alpha: 1,
            },
          },
        },
      };

      const overrides: TokenDocument = {
        color: {
          secondary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 1, 1],
              alpha: 1,
            },
          },
        },
      };

      const result = merge(base, overrides);

      expect((result.color as any)?.$type).toBe("color");
      expect((result.color as any)?.primary?.$value?.components).toEqual([
        0, 0, 0,
      ]);
      expect((result.color as any)?.secondary?.$value?.components).toEqual([
        1, 1, 1,
      ]);
    });

    it("should handle null and undefined values", () => {
      const base: TokenDocument = {
        optional: {
          $value: {
            colorSpace: "srgb",
            components: [0.5, 0.5, 0.5],
            alpha: 1,
          },
          $type: "color",
        },
        existing: {
          $value: {
            value: 16,
            unit: "px",
          },
          $type: "dimension",
        },
      };

      const overrides: TokenDocument = {
        optional: null as any,
        newField: undefined as any,
        added: {
          $value: {
            colorSpace: "srgb",
            components: [0.8, 0.2, 0.3],
            alpha: 1,
          },
          $type: "color",
        },
      };

      const result = merge(base, overrides);

      expect((result.optional as any)?.$value?.components).toEqual([
        0.5, 0.5, 0.5,
      ]);
      expect((result.existing as any)?.$value?.value).toBe(16);
      expect((result.added as any)?.$value?.components).toEqual([
        0.8, 0.2, 0.3,
      ]);
    });
  });
});
