/**
 * Tests for token type guards and utilities
 */

import { describe, expect, it } from "vitest";
import {
  type ColorToken,
  type DimensionToken,
  isBorderToken,
  isColorToken,
  isCubicBezierToken,
  isDimensionToken,
  isDurationToken,
  isFontFamilyToken,
  isFontWeightToken,
  isGradientToken,
  isNumberToken,
  isShadowToken,
  isStrokeStyleToken,
  isTransitionToken,
  isTypographyToken,
  type ShadowToken,
  type TypedToken,
  type TypographyToken,
} from "./token-types.js";

describe("Token Type Guards", () => {
  describe("primitive type guards", () => {
    it("should identify color tokens", () => {
      const colorToken: ColorToken = {
        $value: "#ff0000",
        $type: "color",
      };
      const dimensionToken: DimensionToken = {
        $value: "16px",
        $type: "dimension",
      };

      expect(isColorToken(colorToken)).toBe(true);
      expect(isColorToken(dimensionToken)).toBe(false);
    });

    it("should identify dimension tokens", () => {
      const dimensionToken: DimensionToken = {
        $value: "16px",
        $type: "dimension",
      };
      const colorToken: ColorToken = {
        $value: "#ff0000",
        $type: "color",
      };

      expect(isDimensionToken(dimensionToken)).toBe(true);
      expect(isDimensionToken(colorToken)).toBe(false);
    });

    it("should identify duration tokens", () => {
      const token: TypedToken = {
        $value: "300ms",
        $type: "duration",
      };

      expect(isDurationToken(token)).toBe(true);
      expect(isColorToken(token)).toBe(false);
    });

    it("should identify number tokens", () => {
      const token: TypedToken = {
        $value: 1.5,
        $type: "number",
      };

      expect(isNumberToken(token)).toBe(true);
      expect(isDimensionToken(token)).toBe(false);
    });

    it("should identify font family tokens", () => {
      const token: TypedToken = {
        $value: ["Arial", "sans-serif"],
        $type: "fontFamily",
      };

      expect(isFontFamilyToken(token)).toBe(true);
      expect(isColorToken(token)).toBe(false);
    });

    it("should identify font weight tokens", () => {
      const token: TypedToken = {
        $value: 700,
        $type: "fontWeight",
      };

      expect(isFontWeightToken(token)).toBe(true);
      expect(isNumberToken(token)).toBe(false);
    });

    it("should identify cubic bezier tokens", () => {
      const token: TypedToken = {
        $value: [0.25, 0.1, 0.25, 1],
        $type: "cubicBezier",
      };

      expect(isCubicBezierToken(token)).toBe(true);
      expect(isNumberToken(token)).toBe(false);
    });
  });

  describe("composite type guards", () => {
    it("should identify shadow tokens", () => {
      const shadowToken: ShadowToken = {
        $value: {
          color: "#000000",
          offsetX: "0px",
          offsetY: "2px",
          blur: "4px",
          spread: "0px",
        },
        $type: "shadow",
      };

      expect(isShadowToken(shadowToken)).toBe(true);
      expect(isColorToken(shadowToken)).toBe(false);
    });

    it("should identify typography tokens", () => {
      const typographyToken: TypographyToken = {
        $value: {
          fontFamily: "Arial",
          fontSize: "16px",
          lineHeight: 1.4,
        },
        $type: "typography",
      };

      expect(isTypographyToken(typographyToken)).toBe(true);
      expect(isShadowToken(typographyToken)).toBe(false);
    });

    it("should identify border tokens", () => {
      const token: TypedToken = {
        $value: {
          color: "#000000",
          width: "1px",
          style: "solid",
        },
        $type: "border",
      };

      expect(isBorderToken(token)).toBe(true);
      expect(isTypographyToken(token)).toBe(false);
    });

    it("should identify transition tokens", () => {
      const token: TypedToken = {
        $value: {
          duration: "200ms",
          delay: "0ms",
          timingFunction: [0.25, 0.1, 0.25, 1],
        },
        $type: "transition",
      };

      expect(isTransitionToken(token)).toBe(true);
      expect(isBorderToken(token)).toBe(false);
    });

    it("should identify gradient tokens", () => {
      const token: TypedToken = {
        $value: [
          { color: "#ff0000", position: 0 },
          { color: "#00ff00", position: 1 },
        ],
        $type: "gradient",
      };

      expect(isGradientToken(token)).toBe(true);
      expect(isTransitionToken(token)).toBe(false);
    });

    it("should identify stroke style tokens", () => {
      const token: TypedToken = {
        $value: "dashed",
        $type: "strokeStyle",
      };

      expect(isStrokeStyleToken(token)).toBe(true);
      expect(isGradientToken(token)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle tokens without $type", () => {
      const token = {
        $value: "#ff0000",
        // no $type
      } as any;

      expect(isColorToken(token)).toBe(false);
      expect(isDimensionToken(token)).toBe(false);
    });

    it("should handle tokens with incorrect $type", () => {
      const token: TypedToken = {
        $value: "#ff0000",
        $type: "invalidType" as any,
      };

      expect(isColorToken(token)).toBe(false);
      expect(isDimensionToken(token)).toBe(false);
    });

    it("should be type-safe with discriminated unions", () => {
      const token: TypedToken = {
        $value: "#ff0000",
        $type: "color",
      };

      if (isColorToken(token)) {
        // TypeScript should know this is a ColorToken
        expect(token.$type).toBe("color");
        expect(typeof token.$value).toBe("string");
      }

      if (isShadowToken(token)) {
        // This branch shouldn't execute
        expect(false).toBe(true);
      } else {
        // TypeScript should know this is not a ShadowToken
        expect(token.$type).not.toBe("shadow");
      }
    });

    it("should handle all supported DTCG token types", () => {
      const types = [
        "color",
        "dimension",
        "duration",
        "number",
        "fontFamily",
        "fontWeight",
        "cubicBezier",
        "shadow",
        "typography",
        "border",
        "transition",
        "gradient",
        "strokeStyle",
      ] as const;

      const guards = [
        isColorToken,
        isDimensionToken,
        isDurationToken,
        isNumberToken,
        isFontFamilyToken,
        isFontWeightToken,
        isCubicBezierToken,
        isShadowToken,
        isTypographyToken,
        isBorderToken,
        isTransitionToken,
        isGradientToken,
        isStrokeStyleToken,
      ];

      expect(types.length).toBe(guards.length);

      // Each guard should only match its corresponding type
      for (let i = 0; i < types.length; i++) {
        const token: TypedToken = {
          $value: "test-value",
          $type: types[i],
        };

        for (let j = 0; j < guards.length; j++) {
          if (i === j) {
            expect(guards[j](token)).toBe(true);
          } else {
            expect(guards[j](token)).toBe(false);
          }
        }
      }
    });
  });
});
