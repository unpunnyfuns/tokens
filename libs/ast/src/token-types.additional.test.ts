/**
 * Additional tests for token-types functions to improve coverage
 */

import { describe, expect, it } from "vitest";
import {
  isColorToken,
  isTokenReference,
  isTypographyToken,
  type TypedToken,
} from "./token-types.js";

describe("token-types - additional coverage", () => {
  describe("type guard functions", () => {
    it("should identify color tokens", () => {
      const colorToken: TypedToken = {
        $type: "color",
        $value: { colorSpace: "srgb", components: [1, 0, 0], alpha: 1 },
      };

      expect(isColorToken(colorToken)).toBe(true);
      expect(isTypographyToken(colorToken)).toBe(false);
    });

    it("should identify typography tokens", () => {
      const typographyToken: TypedToken = {
        $type: "typography",
        $value: {
          fontFamily: ["Inter", "sans-serif"],
          fontSize: "16px",
          fontWeight: 400,
        },
      };

      expect(isTypographyToken(typographyToken)).toBe(true);
      expect(isColorToken(typographyToken)).toBe(false);
    });

    it("should identify token references", () => {
      expect(isTokenReference("{colors.primary}")).toBe(true);
      expect(isTokenReference("{typography.heading.fontSize}")).toBe(true);
      expect(isTokenReference("colors.primary")).toBe(false);
      expect(isTokenReference("#ff0000")).toBe(false);
      expect(isTokenReference("")).toBe(false);
    });

    it("should handle edge cases for token references", () => {
      expect(isTokenReference("{}")).toBe(false); // Empty braces not valid
      expect(isTokenReference("{")).toBe(false);
      expect(isTokenReference("}")).toBe(false);
      expect(isTokenReference("{ }")).toBe(true); // Space counts as content
      expect(isTokenReference("{a}")).toBe(true);
      expect(isTokenReference(123)).toBe(false);
      expect(isTokenReference(null)).toBe(false);
      expect(isTokenReference(undefined)).toBe(false);
    });
  });
});
