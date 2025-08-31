/**
 * Tests for token value merging
 */

import { describe, expect, it } from "vitest";
import {
  deepMergeObjects,
  mergeIndividualTokens,
  mergeValues,
} from "./merge-values.js";
import type { TokenValue } from "./types.js";

describe("Value Merging", () => {
  describe("deepMergeObjects", () => {
    it("should merge nested objects", () => {
      const a: TokenValue = {
        color: "#000",
        position: { x: 0, y: 0 },
      };

      const b: TokenValue = {
        opacity: 0.5,
        position: { y: 10, z: 20 },
      };

      const result = deepMergeObjects(a, b);

      expect(result).toEqual({
        color: "#000",
        opacity: 0.5,
        position: { x: 0, y: 10, z: 20 },
      });
    });

    it("should handle array values by replacement", () => {
      const a: TokenValue = {
        items: [1, 2, 3],
        meta: "data",
      };

      const b: TokenValue = {
        items: [4, 5],
        other: "value",
      };

      const result = deepMergeObjects(a, b);

      expect(result).toEqual({
        items: [4, 5], // Arrays are replaced, not merged
        meta: "data",
        other: "value",
      });
    });

    it("should handle null values", () => {
      const a: TokenValue = {
        keep: "this",
        override: "original",
      };

      const b: TokenValue = {
        override: null as any,
        add: "new",
      };

      const result = deepMergeObjects(a, b);

      expect(result).toEqual({
        keep: "this",
        override: null,
        add: "new",
      });
    });
  });

  describe("mergeValues", () => {
    it("should replace simple values", () => {
      const result = mergeValues("#000", "#fff", "color");
      expect(result).toBe("#fff");
    });

    it("should deep merge composite shadow values", () => {
      const a = {
        color: "#000",
        offsetX: "0px",
        offsetY: "2px",
        blur: "4px",
      };

      const b = {
        color: "#333",
        offsetY: "4px",
        spread: "2px",
      };

      const result = mergeValues(a, b, "shadow");

      expect(result).toEqual({
        color: "#333",
        offsetX: "0px",
        offsetY: "4px",
        blur: "4px",
        spread: "2px",
      });
    });

    it("should deep merge composite typography values", () => {
      const a = {
        fontFamily: "Arial",
        fontSize: "16px",
        lineHeight: 1.4,
      };

      const b = {
        fontSize: "18px",
        fontWeight: "bold",
      };

      const result = mergeValues(a, b, "typography");

      expect(result).toEqual({
        fontFamily: "Arial",
        fontSize: "18px",
        lineHeight: 1.4,
        fontWeight: "bold",
      });
    });

    it("should replace non-composite values", () => {
      const result = mergeValues("16px", "24px", "dimension");
      expect(result).toBe("24px");
    });

    it("should fallback to replacement for non-object values", () => {
      const result = mergeValues("old", "new", "shadow");
      expect(result).toBe("new");
    });
  });

  describe("mergeIndividualTokens", () => {
    it("should merge token properties correctly", () => {
      const a: TokenValue = {
        $value: "#000",
        $type: "color",
        $description: "Original description",
      };

      const b: TokenValue = {
        $value: "#fff",
        $description: "New description",
      };

      const result = mergeIndividualTokens(a, b, "color.primary");

      expect(result).toEqual({
        $value: "#fff",
        $type: "color",
        $description: "New description",
      });
    });

    it("should merge extensions deeply", () => {
      const a: TokenValue = {
        $value: "#000",
        $extensions: {
          "custom.metadata": "original",
          "nested.data": { keep: true, override: "old" },
        },
      };

      const b: TokenValue = {
        $value: "#fff",
        $extensions: {
          "custom.metadata": "updated",
          "nested.data": { override: "new", add: "extra" },
          "new.field": "added",
        },
      };

      const result = mergeIndividualTokens(a, b, "color.primary");

      expect(result).toEqual({
        $value: "#fff",
        $extensions: {
          "custom.metadata": "updated",
          "nested.data": { keep: true, override: "new", add: "extra" },
          "new.field": "added",
        },
      });
    });

    it("should merge composite token values", () => {
      const a: TokenValue = {
        $value: {
          color: "#000",
          offsetX: "0px",
          blur: "4px",
        },
        $type: "shadow",
      };

      const b: TokenValue = {
        $value: {
          color: "#333",
          offsetY: "2px",
        },
        $type: "shadow",
      };

      const result = mergeIndividualTokens(a, b, "shadow.elevation", "shadow");

      expect(result).toEqual({
        $value: {
          color: "#333",
          offsetX: "0px",
          blur: "4px",
          offsetY: "2px",
        },
        $type: "shadow",
      });
    });

    it("should inherit type from group when not specified", () => {
      const a: TokenValue = {
        $value: "#000",
      };

      const b: TokenValue = {
        $value: "#fff",
        $description: "Updated color",
      };

      const result = mergeIndividualTokens(a, b, "color.primary", "color");

      expect(result).toEqual({
        $value: "#fff",
        $description: "Updated color",
      });
    });

    it("should handle non-object extensions gracefully", () => {
      const a: TokenValue = {
        $value: "#000",
        $extensions: "string-extension",
      };

      const b: TokenValue = {
        $value: "#fff",
        $extensions: { "new.field": "added" },
      };

      const result = mergeIndividualTokens(a, b, "color.primary");

      expect(result).toEqual({
        $value: "#fff",
        $extensions: { "new.field": "added" },
      });
    });
  });
});
