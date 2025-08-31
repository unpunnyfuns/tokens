/**
 * Additional tests for merge-documents functions
 */

import type { TokenDocument } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import { mergeDocuments } from "./merge-documents.js";

describe("merge-documents - additional coverage", () => {
  describe("mergeDocuments", () => {
    it("should handle empty base document", () => {
      const base: TokenDocument = {};
      const overlay: TokenDocument = {
        colors: { primary: { $value: "red" } },
      };

      const result = mergeDocuments(base, overlay);
      expect(result).toEqual(overlay);
    });

    it("should handle empty overlay document", () => {
      const base: TokenDocument = {
        colors: { primary: { $value: "blue" } },
      };
      const overlay: TokenDocument = {};

      const result = mergeDocuments(base, overlay);
      expect(result).toEqual(base);
    });

    it("should merge nested token groups", () => {
      const base: TokenDocument = {
        colors: {
          primary: { $value: "blue" },
          secondary: { $value: "green" },
        },
      };

      const overlay: TokenDocument = {
        colors: {
          primary: { $value: "red" },
          tertiary: { $value: "yellow" },
        },
      };

      const result = mergeDocuments(base, overlay);
      expect(result).toEqual({
        colors: {
          primary: { $value: "red" },
          secondary: { $value: "green" },
          tertiary: { $value: "yellow" },
        },
      });
    });

    it("should handle type inheritance", () => {
      const base: TokenDocument = {
        colors: {
          $type: "color",
          primary: { $value: "blue" },
        },
      };

      const overlay: TokenDocument = {
        colors: {
          secondary: { $value: "red" },
        },
      };

      const result = mergeDocuments(base, overlay);
      expect((result.colors as any).primary.$value).toBe("blue");
      expect((result.colors as any).secondary.$value).toBe("red");
      expect((result.colors as any).$type).toBe("color");
    });

    it("should handle metadata merging", () => {
      const base: TokenDocument = {
        $description: "Base tokens",
        colors: { primary: { $value: "blue" } },
      };

      const overlay: TokenDocument = {
        $description: "Override tokens",
        colors: { secondary: { $value: "red" } },
      };

      const result = mergeDocuments(base, overlay);
      expect(result.$description).toBe("Override tokens");
      expect((result.colors as any).primary.$value).toBe("blue");
      expect((result.colors as any).secondary.$value).toBe("red");
    });

    it("should handle deeply nested structures", () => {
      const base: TokenDocument = {
        semantic: {
          colors: {
            action: {
              primary: { $value: "{colors.blue.500}" },
            },
          },
        },
      };

      const overlay: TokenDocument = {
        semantic: {
          colors: {
            action: {
              secondary: { $value: "{colors.gray.500}" },
            },
            status: {
              error: { $value: "{colors.red.500}" },
            },
          },
        },
      };

      const result = mergeDocuments(base, overlay);

      const semanticColors = (result.semantic as any).colors;
      expect(semanticColors.action.primary.$value).toBe("{colors.blue.500}");
      expect(semanticColors.action.secondary.$value).toBe("{colors.gray.500}");
      expect(semanticColors.status.error.$value).toBe("{colors.red.500}");
    });
  });
});
