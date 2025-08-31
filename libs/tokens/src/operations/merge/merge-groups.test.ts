/**
 * Tests for merge-groups functions
 */

import { describe, expect, it } from "vitest";
import { mergeGroupProperty, mergeGroups } from "./merge-groups.js";
import { DTCGMergeError } from "./types.js";

describe("merge-groups", () => {
  describe("mergeGroupProperty", () => {
    it("should merge two tokens", () => {
      const tokenA = { $value: "red" };
      const tokenB = { $value: "blue" };

      const result = mergeGroupProperty(
        tokenA,
        tokenB,
        "color",
        "colors.primary",
      );
      expect(result).toEqual({ $value: "blue" });
    });

    it("should merge two groups", () => {
      const groupA = { light: { $value: "red" } };
      const groupB = { dark: { $value: "blue" } };

      const result = mergeGroupProperty(
        groupA,
        groupB,
        "primary",
        "colors.primary",
      );
      expect(result).toEqual({
        light: { $value: "red" },
        dark: { $value: "blue" },
      });
    });

    it("should throw error when merging token with group", () => {
      const token = { $value: "red" };
      const group = { light: { $value: "blue" } };

      expect(() =>
        mergeGroupProperty(token, group, "color", "colors.primary"),
      ).toThrow(DTCGMergeError);
    });

    it("should throw error when merging group with token", () => {
      const group = { light: { $value: "red" } };
      const token = { $value: "blue" };

      expect(() =>
        mergeGroupProperty(group, token, "color", "colors.primary"),
      ).toThrow(DTCGMergeError);
    });

    it("should prefer second value for metadata properties", () => {
      const result = mergeGroupProperty(
        "old",
        "new",
        "$description",
        "colors.$description",
      );
      expect(result).toBe("new");
    });

    it("should handle nested group merging", () => {
      const groupA = {
        semantic: {
          primary: { $value: "blue" },
        },
      };
      const groupB = {
        semantic: {
          secondary: { $value: "red" },
        },
      };

      const result = mergeGroupProperty(groupA, groupB, "colors", "colors");
      expect(result).toEqual({
        semantic: {
          primary: { $value: "blue" },
          secondary: { $value: "red" },
        },
      });
    });
  });

  describe("mergeGroups", () => {
    it("should merge groups with different properties", () => {
      const a = { primary: { $value: "red" } };
      const b = { secondary: { $value: "blue" } };

      const result = mergeGroups(a, b);
      expect(result).toEqual({
        primary: { $value: "red" },
        secondary: { $value: "blue" },
      });
    });

    it("should override existing properties", () => {
      const a = { primary: { $value: "red" } };
      const b = { primary: { $value: "blue" } };

      const result = mergeGroups(a, b);
      expect(result).toEqual({
        primary: { $value: "blue" },
      });
    });

    it("should handle nested paths", () => {
      const a = { colors: { primary: { $value: "red" } } };
      const b = { colors: { secondary: { $value: "blue" } } };

      const result = mergeGroups(a, b, "theme");
      expect(result).toEqual({
        colors: {
          primary: { $value: "red" },
          secondary: { $value: "blue" },
        },
      });
    });

    it("should handle type inheritance", () => {
      const a = { $type: "color", primary: { $value: "red" } };
      const b = { secondary: { $value: "blue" } };

      const result = mergeGroups(a, b);
      expect(result).toEqual({
        $type: "color",
        primary: { $value: "red" },
        secondary: { $value: "blue" },
      });
    });

    it("should prefer b type over a type", () => {
      const a = { $type: "color", primary: { $value: "red" } };
      const b = { $type: "dimension", secondary: { $value: "16px" } };

      const result = mergeGroups(a, b);
      expect(result).toEqual({
        $type: "dimension",
        primary: { $value: "red" },
        secondary: { $value: "16px" },
      });
    });

    it("should use parentType when no group types", () => {
      const a = { primary: { $value: "red" } };
      const b = { secondary: { $value: "blue" } };

      const result = mergeGroups(a, b, "", "color");
      expect(result).toEqual({
        primary: { $value: "red" },
        secondary: { $value: "blue" },
      });
    });

    it("should handle empty path", () => {
      const a = { primary: { $value: "red" } };
      const b = { secondary: { $value: "blue" } };

      const result = mergeGroups(a, b, "");
      expect(result).toEqual({
        primary: { $value: "red" },
        secondary: { $value: "blue" },
      });
    });

    it("should handle complex nested merges", () => {
      const a = {
        colors: {
          $type: "color",
          primary: { $value: "red" },
          shades: {
            light: { $value: "pink" },
          },
        },
      };
      const b = {
        colors: {
          secondary: { $value: "blue" },
          shades: {
            dark: { $value: "maroon" },
          },
        },
      };

      const result = mergeGroups(a, b);
      expect(result).toEqual({
        colors: {
          $type: "color",
          primary: { $value: "red" },
          secondary: { $value: "blue" },
          shades: {
            light: { $value: "pink" },
            dark: { $value: "maroon" },
          },
        },
      });
    });
  });
});
