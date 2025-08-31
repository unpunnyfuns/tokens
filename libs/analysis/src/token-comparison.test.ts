import * as astBuilder from "@upft/ast";
import * as ast from "@upft/ast";
import colorsBase from "@upft/fixtures/bundler-fixtures/input/colors-base.json" with {
  type: "json",
};
import spacingBase from "@upft/fixtures/bundler-fixtures/input/spacing-base.json" with {
  type: "json",
};
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compareTokenDocuments,
  compareTokenDocumentsDetailed,
} from "./token-comparison.js";

// Mock AST modules
vi.mock("@upft/ast", () => ({
  createAST: vi.fn(),
  findAllTokens: vi.fn(),
}));

describe("Token Comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("compareTokenDocuments", () => {
    const mockAST1 = { type: "document", children: [] };
    const mockAST2 = { type: "document", children: [] };

    it("should identify added tokens", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.added).toEqual(["color.secondary"]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it("should identify removed tokens", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual(["color.secondary"]);
      expect(result.changed).toEqual([]);
    });

    it("should identify changed tokens", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [1, 0.498, 0] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual(["color.primary"]);
    });

    it("should handle tokens with resolvedValue", () => {
      const tokens1 = [
        {
          path: "semantic.primary",
          typedValue: null,
          resolvedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
        },
      ];

      const tokens2 = [
        {
          path: "semantic.primary",
          typedValue: null,
          resolvedValue: {
            $value: { colorSpace: "srgb", components: [1, 0.498, 0] },
          },
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["semantic.primary"]);
    });

    it("should handle multiple changes simultaneously", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "spacing.xs",
          typedValue: { $value: { value: 8, unit: "px" } },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [1, 0.498, 0] },
          }, // Changed
          resolvedValue: null,
        },
        // color.secondary removed
        {
          path: "spacing.md", // Added
          typedValue: { $value: { value: 16, unit: "px" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.added).toEqual(["spacing.md"]);
      expect(result.removed).toEqual(["color.secondary", "spacing.xs"]);
      expect(result.changed).toEqual(["color.primary"]);
    });

    it("should handle empty documents", () => {
      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const result = compareTokenDocuments({}, {});

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it("should handle comparison with empty first document", () => {
      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce([])
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments({}, colorsBase);

      expect(result.added).toEqual(["color.primary"]);
      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it("should handle comparison with empty second document", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce([]);

      const result = compareTokenDocuments(colorsBase, {});

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual(["color.primary"]);
      expect(result.changed).toEqual([]);
    });
  });

  describe("compareTokenDocumentsDetailed", () => {
    const mockAST1 = { type: "document", children: [] };
    const mockAST2 = { type: "document", children: [] };

    it("should provide detailed differences for added tokens", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      expect(result.differences).toEqual([
        {
          path: "color.secondary",
          leftValue: undefined,
          rightValue: { colorSpace: "srgb", components: [0.498, 0, 1] },
          type: "added",
        },
      ]);

      expect(result.summary).toEqual({
        added: 1,
        removed: 0,
        changed: 0,
      });
    });

    it("should provide detailed differences for removed tokens", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      expect(result.differences).toEqual([
        {
          path: "color.secondary",
          leftValue: { colorSpace: "srgb", components: [0.498, 0, 1] },
          rightValue: undefined,
          type: "removed",
        },
      ]);

      expect(result.summary).toEqual({
        added: 0,
        removed: 1,
        changed: 0,
      });
    });

    it("should provide detailed differences for changed tokens", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [1, 0.498, 0] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      expect(result.differences).toEqual([
        {
          path: "color.primary",
          leftValue: { colorSpace: "srgb", components: [0, 0.498, 1] },
          rightValue: { colorSpace: "srgb", components: [1, 0.498, 0] },
          type: "changed",
        },
      ]);

      expect(result.summary).toEqual({
        added: 0,
        removed: 0,
        changed: 1,
      });
    });

    it("should handle tokens with resolvedValue", () => {
      const tokens1 = [
        {
          path: "semantic.primary",
          typedValue: null,
          resolvedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
        },
      ];

      const tokens2 = [
        {
          path: "semantic.primary",
          typedValue: null,
          resolvedValue: {
            $value: { colorSpace: "srgb", components: [1, 0.498, 0] },
          },
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      expect(result.differences[0]).toMatchObject({
        path: "semantic.primary",
        leftValue: { colorSpace: "srgb", components: [0, 0.498, 1] },
        rightValue: { colorSpace: "srgb", components: [1, 0.498, 0] },
        type: "changed",
      });
    });

    it("should handle complex multi-token differences", () => {
      const tokens1 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "spacing.xs",
          typedValue: { $value: { value: 8, unit: "px" } },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [1, 0.498, 0] },
          }, // Changed
          resolvedValue: null,
        },
        // color.secondary removed
        {
          path: "spacing.md", // Added
          typedValue: { $value: { value: 16, unit: "px" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      // Check that we have the right number of differences
      expect(result.differences).toHaveLength(4); // 1 changed + 2 removed + 1 added

      // Find differences by type
      const changedDiffs = result.differences.filter(
        (d) => d.type === "changed",
      );
      const removedDiffs = result.differences.filter(
        (d) => d.type === "removed",
      );
      const addedDiffs = result.differences.filter((d) => d.type === "added");

      expect(changedDiffs).toHaveLength(1);
      expect(changedDiffs[0].path).toBe("color.primary");

      expect(removedDiffs).toHaveLength(2);
      expect(removedDiffs.map((d) => d.path).sort()).toEqual([
        "color.secondary",
        "spacing.xs",
      ]);

      expect(addedDiffs).toHaveLength(1);
      expect(addedDiffs[0].path).toBe("spacing.md");

      expect(result.summary).toEqual({
        added: 1,
        removed: 2,
        changed: 1,
      });
    });

    it("should handle identical documents", () => {
      const tokens = [
        {
          path: "color.primary",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens)
        .mockReturnValueOnce(tokens);

      const result = compareTokenDocumentsDetailed(colorsBase, colorsBase);

      expect(result.differences).toEqual([]);
      expect(result.summary).toEqual({
        added: 0,
        removed: 0,
        changed: 0,
      });
    });

    it("should handle empty documents", () => {
      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const result = compareTokenDocumentsDetailed({}, {});

      expect(result.differences).toEqual([]);
      expect(result.summary).toEqual({
        added: 0,
        removed: 0,
        changed: 0,
      });
    });

    it("should prioritize typedValue over resolvedValue for comparison", () => {
      const tokens1 = [
        {
          path: "token.mixed",
          typedValue: { $value: "typed-value" },
          resolvedValue: { $value: "resolved-value" },
        },
      ];

      const tokens2 = [
        {
          path: "token.mixed",
          typedValue: { $value: "different-typed-value" },
          resolvedValue: { $value: "resolved-value" }, // Same resolved value
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      expect(result.differences[0]).toMatchObject({
        path: "token.mixed",
        leftValue: "typed-value",
        rightValue: "different-typed-value",
        type: "changed",
      });
    });

    it("should fall back to resolvedValue when typedValue is null", () => {
      const tokens1 = [
        {
          path: "token.resolved",
          typedValue: null,
          resolvedValue: { $value: "resolved-value-1" },
        },
      ];

      const tokens2 = [
        {
          path: "token.resolved",
          typedValue: null,
          resolvedValue: { $value: "resolved-value-2" },
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocumentsDetailed(colorsBase, spacingBase);

      expect(result.differences[0]).toMatchObject({
        path: "token.resolved",
        leftValue: "resolved-value-1",
        rightValue: "resolved-value-2",
        type: "changed",
      });
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    const mockAST1 = { type: "document", children: [] };
    const mockAST2 = { type: "document", children: [] };

    it("should handle tokens with complex nested values", () => {
      const tokens1 = [
        {
          path: "shadow.complex",
          typedValue: {
            $value: {
              offsetX: "4px",
              offsetY: "4px",
              blur: "8px",
              spread: "0px",
              color: {
                colorSpace: "srgb",
                components: [0, 0, 0],
                alpha: 0.25,
              },
            },
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "shadow.complex",
          typedValue: {
            $value: {
              offsetX: "4px",
              offsetY: "4px",
              blur: "12px", // Changed
              spread: "0px",
              color: {
                colorSpace: "srgb",
                components: [0, 0, 0],
                alpha: 0.25,
              },
            },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["shadow.complex"]);
    });

    it("should handle tokens with arrays in values", () => {
      const tokens1 = [
        {
          path: "gradient.stops",
          typedValue: {
            $value: [
              { color: "#ff0000", position: 0 },
              { color: "#00ff00", position: 0.5 },
              { color: "#0000ff", position: 1 },
            ],
          },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "gradient.stops",
          typedValue: {
            $value: [
              { color: "#ff0000", position: 0 },
              { color: "#00ff00", position: 0.6 }, // Changed position
              { color: "#0000ff", position: 1 },
            ],
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["gradient.stops"]);
    });

    it("should handle tokens with null values in comparison", () => {
      const tokens1 = [
        {
          path: "token.null",
          typedValue: null,
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "token.null",
          typedValue: { $value: "now-has-value" },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["token.null"]);
    });

    it("should handle tokens with circular references", () => {
      const tokens1 = [
        {
          path: "semantic.primary",
          typedValue: { $value: { $ref: "#/semantic/secondary/$value" } },
          resolvedValue: null,
        },
        {
          path: "semantic.secondary",
          typedValue: { $value: { $ref: "#/semantic/primary/$value" } },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "semantic.primary",
          typedValue: { $value: { $ref: "#/primitive/blue/$value" } }, // Fixed reference
          resolvedValue: null,
        },
        {
          path: "semantic.secondary",
          typedValue: { $value: { $ref: "#/semantic/primary/$value" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["semantic.primary"]);
    });

    it("should handle findAllTokens errors gracefully", () => {
      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any).mockImplementation(() => {
        throw new Error("Token finding failed");
      });

      expect(() => compareTokenDocuments(colorsBase, spacingBase)).toThrow(
        "Token finding failed",
      );
      expect(() =>
        compareTokenDocumentsDetailed(colorsBase, spacingBase),
      ).toThrow("Token finding failed");
    });

    it("should handle AST creation errors gracefully", () => {
      (astBuilder.createAST as any).mockImplementation(() => {
        throw new Error("AST creation failed");
      });

      expect(() => compareTokenDocuments(colorsBase, spacingBase)).toThrow(
        "AST creation failed",
      );
      expect(() =>
        compareTokenDocumentsDetailed(colorsBase, spacingBase),
      ).toThrow("AST creation failed");
    });

    it("should handle malformed token nodes", () => {
      const tokens1 = [
        {
          path: "malformed.token1",
          // Missing typedValue and resolvedValue
        },
      ];

      const tokens2 = [
        {
          path: "malformed.token1",
          typedValue: { $value: "valid-value" },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["malformed.token1"]);
    });

    it("should handle tokens with very long paths", () => {
      const longPath = "a".repeat(1000);
      const tokens1 = [
        {
          path: longPath,
          typedValue: { $value: "value1" },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: longPath,
          typedValue: { $value: "value2" },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual([longPath]);
    });

    it("should handle tokens with special characters in values", () => {
      const tokens1 = [
        {
          path: "text.special",
          typedValue: { $value: "Hello\nWorld\t!" },
          resolvedValue: null,
        },
      ];

      const tokens2 = [
        {
          path: "text.special",
          typedValue: { $value: "Hello\nWorld\t?" }, // Changed punctuation
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.changed).toEqual(["text.special"]);
    });

    it("should handle very large token counts in comparison", () => {
      // Generate large token arrays
      const tokens1 = Array.from({ length: 1000 }, (_, i) => ({
        path: `token.${i}`,
        typedValue: { $value: `value-${i}` },
        resolvedValue: null,
      }));

      const tokens2 = Array.from({ length: 1000 }, (_, i) => ({
        path: `token.${i}`,
        typedValue: { $value: i === 500 ? "changed-value" : `value-${i}` }, // Change one token
        resolvedValue: null,
      }));

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.changed).toEqual(["token.500"]);
    });

    it("should handle comparison when one document has significantly more tokens", () => {
      const tokens1 = [
        {
          path: "token.single",
          typedValue: { $value: "value" },
          resolvedValue: null,
        },
      ];

      const tokens2 = Array.from({ length: 100 }, (_, i) => ({
        path: `token.${i}`,
        typedValue: { $value: `value-${i}` },
        resolvedValue: null,
      }));

      (astBuilder.createAST as any)
        .mockReturnValueOnce(mockAST1)
        .mockReturnValueOnce(mockAST2);
      (ast.findAllTokens as any)
        .mockReturnValueOnce(tokens1)
        .mockReturnValueOnce(tokens2);

      const result = compareTokenDocuments(colorsBase, spacingBase);

      expect(result.removed).toEqual(["token.single"]);
      expect(result.added).toHaveLength(100);
      expect(result.changed).toHaveLength(0);
    });
  });
});
