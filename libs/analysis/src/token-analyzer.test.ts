import * as astBuilder from "@upft/ast";
import * as cycleDetector from "@upft/ast";
import * as ast from "@upft/ast";
import colorsBase from "@upft/examples/bundler-fixtures/input/colors-base.json" with {
  type: "json",
};
import spacingBase from "@upft/examples/bundler-fixtures/input/spacing-base.json" with {
  type: "json",
};
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzeTokens,
  countGroups,
  countTokens,
  getTokenTypes,
  listTokens,
} from "./token-analyzer.js";

// Mock AST modules
vi.mock("@upft/ast", () => ({
  createAST: vi.fn(),
  getStatistics: vi.fn(),
  detectCycles: vi.fn(),
  resolveASTReferences: vi.fn(),
  findAllTokens: vi.fn(),
  findTokensByType: vi.fn(),
}));

describe("Token Analyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeTokens", () => {
    const mockAST = { type: "document", children: [] };

    it("should analyze a token document", () => {
      const mockStats = {
        totalTokens: 3,
        totalGroups: 2,
        tokensByType: { color: 2, dimension: 1 },
        maxDepth: 2,
        tokensWithReferences: 1,
      };

      const mockResolveResult = [
        {
          type: "missing",
          path: "color.missing",
          message: "Missing reference",
        },
        {
          type: "invalid",
          path: "color.invalid",
          message: "Invalid reference",
        },
      ];

      const mockCycleResult = {
        hasCycles: true,
        cyclicTokens: new Set(["color.circular1", "color.circular2"]),
        cycles: [["color.circular1", "color.circular2"]],
        topologicalOrder: null,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue(mockResolveResult);
      (cycleDetector.detectCycles as any).mockReturnValue(mockCycleResult);

      const result = analyzeTokens(colorsBase);

      expect(astBuilder.createAST).toHaveBeenCalledWith(colorsBase);
      expect(ast.getStatistics).toHaveBeenCalledWith(mockAST);
      expect(ast.resolveASTReferences).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "file",
          filePath: "analysis.json",
        }),
      );
      expect(cycleDetector.detectCycles).toHaveBeenCalledWith(mockAST);

      expect(result).toEqual({
        tokenCount: 3,
        groupCount: 2,
        tokensByType: { color: 2, dimension: 1 },
        depth: 2,
        hasReferences: true,
        referenceCount: 1,
        unresolvedReferences: ["color.missing"],
        circularReferences: ["color.circular1", "color.circular2"],
      });
    });

    it("should handle documents without references", () => {
      const mockStats = {
        totalTokens: 2,
        totalGroups: 1,
        tokensByType: { color: 2 },
        maxDepth: 1,
        tokensWithReferences: 0,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue([]);
      (cycleDetector.detectCycles as any).mockReturnValue({
        hasCycles: false,
        cyclicTokens: new Set(),
        cycles: [],
        topologicalOrder: [],
      });

      const result = analyzeTokens(colorsBase);

      expect(result.hasReferences).toBe(false);
      expect(result.referenceCount).toBe(0);
      expect(result.unresolvedReferences).toEqual([]);
      expect(result.circularReferences).toEqual([]);
    });

    it("should filter only missing references from resolution errors", () => {
      const mockStats = {
        totalTokens: 1,
        totalGroups: 1,
        tokensByType: {},
        maxDepth: 1,
        tokensWithReferences: 1,
      };

      const mockResolveResult = [
        { type: "missing", path: "ref1", message: "Missing reference" },
        { type: "circular", path: "ref2", message: "Circular reference" },
        { type: "missing", path: "ref3", message: "Missing reference" },
        { type: "invalid", path: "ref4", message: "Invalid reference" },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue(mockResolveResult);
      (cycleDetector.detectCycles as any).mockReturnValue({
        hasCycles: false,
        cyclicTokens: new Set(),
        cycles: [],
        topologicalOrder: [],
      });

      const result = analyzeTokens(spacingBase);

      expect(result.unresolvedReferences).toEqual(["ref1", "ref3"]);
    });
  });

  describe("countGroups", () => {
    it("should count groups in a document", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 2, // root + color = 1 user group + 1 root
      });

      const count = countGroups(colorsBase);
      expect(count).toBe(1); // color group (excluding root)
    });

    it("should count nested groups", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 3, // root + color + neutral = 2 user groups + 1 root
      });

      const count = countGroups(colorsBase);
      expect(count).toBe(2); // color and nested neutral groups (root excluded)
    });

    it("should not count tokens as groups", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 1, // Only root group
      });

      const count = countGroups(spacingBase);
      expect(count).toBe(0); // No user groups, only root which is excluded
    });

    it("should handle empty documents", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 1, // Only root group for empty doc
      });

      const count = countGroups({});
      expect(count).toBe(0);
    });

    it("should ignore $ properties", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 2, // root + color = 1 user group + 1 root
      });

      const count = countGroups(colorsBase);
      expect(count).toBe(1); // Only color group (root excluded)
    });

    it("should handle mixed groups and tokens", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 3, // root + color + neutral = 2 user groups + 1 root
      });

      const count = countGroups(colorsBase);
      expect(count).toBe(2); // color and neutral groups (root excluded)
    });

    it("should handle null and undefined values", () => {
      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 2, // root + color = 1 user group + 1 root
      });

      const count = countGroups(colorsBase as any);
      expect(count).toBe(1); // Only color group (root excluded)
    });
  });

  describe("getTokenTypes", () => {
    const mockAST = { type: "document", children: [] };

    it("should get all unique token types", () => {
      const mockStats = {
        totalTokens: 5,
        totalGroups: 2,
        tokensByType: {
          color: 2,
          dimension: 2,
          typography: 1,
        },
        maxDepth: 2,
        tokensWithReferences: 0,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);

      const result = getTokenTypes(colorsBase);

      expect(astBuilder.createAST).toHaveBeenCalledWith(colorsBase);
      expect(ast.getStatistics).toHaveBeenCalledWith(mockAST);
      expect(result).toEqual(["color", "dimension", "typography"]);
    });

    it("should return empty array for documents with no typed tokens", () => {
      const mockStats = {
        totalTokens: 0,
        totalGroups: 0,
        tokensByType: {},
        maxDepth: 0,
        tokensWithReferences: 0,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);

      const result = getTokenTypes(colorsBase);

      expect(result).toEqual([]);
    });

    it("should handle a single token type", () => {
      const mockStats = {
        totalTokens: 3,
        totalGroups: 1,
        tokensByType: {
          color: 3,
        },
        maxDepth: 1,
        tokensWithReferences: 0,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);

      const result = getTokenTypes(colorsBase);

      expect(result).toEqual(["color"]);
    });
  });

  describe("countTokens", () => {
    const mockAST = { type: "document", children: [] };

    it("should count total tokens in a document", () => {
      const mockStats = {
        totalTokens: 5,
        totalGroups: 2,
        tokensByType: { color: 3, dimension: 2 },
        maxDepth: 2,
        tokensWithReferences: 1,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);

      const result = countTokens(colorsBase);

      expect(astBuilder.createAST).toHaveBeenCalledWith(colorsBase);
      expect(ast.getStatistics).toHaveBeenCalledWith(mockAST);
      expect(result).toBe(5);
    });

    it("should return 0 for empty documents", () => {
      const mockStats = {
        totalTokens: 0,
        totalGroups: 1,
        tokensByType: {},
        maxDepth: 0,
        tokensWithReferences: 0,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);

      const result = countTokens({});

      expect(result).toBe(0);
    });
  });

  describe("listTokens", () => {
    const mockAST = { type: "document", children: [] };

    it("should list all tokens without filters", () => {
      const mockTokens = [
        {
          path: "color.primary",
          tokenType: "color",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "spacing.xs",
          tokenType: "dimension",
          typedValue: { $value: { value: 8, unit: "px" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(astBuilder.createAST).toHaveBeenCalledWith(colorsBase);
      expect(ast.findAllTokens).toHaveBeenCalledWith(mockAST);
      expect(result).toEqual([
        {
          path: "color.primary",
          type: "color",
          value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          resolvedValue: undefined,
          hasReference: false,
        },
        {
          path: "spacing.xs",
          type: "dimension",
          value: { value: 8, unit: "px" },
          resolvedValue: undefined,
          hasReference: false,
        },
      ]);
    });

    it("should filter tokens by type", () => {
      const mockColorTokens = [
        {
          path: "color.primary",
          tokenType: "color",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findTokensByType as any).mockReturnValue(mockColorTokens);

      const result = listTokens(colorsBase, { type: "color" });

      expect(ast.findTokensByType).toHaveBeenCalledWith(mockAST, "color");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("color");
      expect(result[0].path).toBe("color.primary");
    });

    it("should filter tokens by group", () => {
      const allTokens = [
        {
          path: "color.primary",
          tokenType: "color",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "color.secondary",
          tokenType: "color",
          typedValue: {
            $value: { colorSpace: "srgb", components: [0.498, 0, 1] },
          },
          resolvedValue: null,
        },
        {
          path: "spacing.xs",
          tokenType: "dimension",
          typedValue: { $value: { value: 8, unit: "px" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(allTokens);

      const result = listTokens(colorsBase, { group: "color" });

      expect(ast.findAllTokens).toHaveBeenCalledWith(mockAST);
      expect(result).toHaveLength(2);
      expect(result.every((token) => token.path.startsWith("color."))).toBe(
        true,
      );
    });

    it("should handle tokens with references", () => {
      const mockTokens = [
        {
          path: "semantic.primary",
          tokenType: "color",
          typedValue: { $value: { $ref: "#/primitive/blue/$value" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result).toEqual([
        {
          path: "semantic.primary",
          type: "color",
          value: { $ref: "#/primitive/blue/$value" },
          resolvedValue: undefined,
          hasReference: true,
        },
      ]);
    });

    it("should resolve references when requested", () => {
      const mockTokens = [
        {
          path: "semantic.primary",
          tokenType: "color",
          typedValue: { $value: { $ref: "#/primitive/blue/$value" } },
          resolvedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);
      (ast.resolveASTReferences as any).mockReturnValue([]);

      const result = listTokens(colorsBase, { resolveReferences: true });

      expect(ast.resolveASTReferences).toHaveBeenCalledWith(mockAST);
      expect(result).toEqual([
        {
          path: "semantic.primary",
          type: "color",
          value: { $ref: "#/primitive/blue/$value" },
          resolvedValue: { colorSpace: "srgb", components: [0, 0.498, 1] },
          hasReference: true,
        },
      ]);
    });

    it("should handle tokens with nested $value objects", () => {
      const mockTokens = [
        {
          path: "color.primary",
          tokenType: "color",
          typedValue: {
            $value: {
              $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
            },
          },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result[0].value).toEqual({
        colorSpace: "srgb",
        components: [0, 0.498, 1],
      });
    });

    it("should handle tokens without type", () => {
      const mockTokens = [
        {
          path: "some.token",
          tokenType: undefined,
          typedValue: { $value: "some-value" },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result).toEqual([
        {
          path: "some.token",
          value: "some-value",
          resolvedValue: undefined,
          hasReference: false,
        },
      ]);
    });

    it("should handle empty token lists", () => {
      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue([]);

      const result = listTokens({});

      expect(result).toEqual([]);
    });

    it("should prioritize resolvedValue over typedValue when resolving references", () => {
      const mockTokens = [
        {
          path: "semantic.primary",
          tokenType: "color",
          typedValue: { $value: { $ref: "#/primitive/blue/$value" } },
          resolvedValue: {
            $value: { colorSpace: "srgb", components: [0, 0.498, 1] },
          },
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);
      (ast.resolveASTReferences as any).mockReturnValue([]);

      const result = listTokens(colorsBase, { resolveReferences: true });

      expect(result[0].resolvedValue).toEqual({
        colorSpace: "srgb",
        components: [0, 0.498, 1],
      });
    });

    it("should handle tokens with null/undefined values gracefully", () => {
      const mockTokens = [
        {
          path: "token.null",
          tokenType: "color",
          typedValue: null,
          resolvedValue: null,
        },
        {
          path: "token.undefined",
          tokenType: "dimension",
          typedValue: undefined,
          resolvedValue: undefined,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result).toEqual([
        {
          path: "token.null",
          type: "color",
          value: undefined,
          resolvedValue: undefined,
          hasReference: false,
        },
        {
          path: "token.undefined",
          type: "dimension",
          value: undefined,
          resolvedValue: undefined,
          hasReference: false,
        },
      ]);
    });

    it("should handle malformed token structures", () => {
      const mockTokens = [
        {
          path: "token.malformed",
          tokenType: "color",
          typedValue: { invalid: "structure" }, // Missing $value
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result[0].value).toBeUndefined();
      expect(result[0].hasReference).toBe(false);
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    const mockAST = { type: "document", children: [] };

    it("should handle documents with circular references in analyzeTokens", () => {
      const mockStats = {
        totalTokens: 2,
        totalGroups: 1,
        tokensByType: { color: 2 },
        maxDepth: 1,
        tokensWithReferences: 2,
      };

      const mockCycleResult = {
        hasCycles: true,
        cyclicTokens: new Set(["color.a", "color.b"]),
        cycles: [["color.a", "color.b", "color.a"]],
        topologicalOrder: null,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue([]);
      (cycleDetector.detectCycles as any).mockReturnValue(mockCycleResult);

      const result = analyzeTokens(colorsBase);

      expect(result.circularReferences).toEqual(["color.a", "color.b"]);
      expect(result.hasReferences).toBe(true);
    });

    it("should handle documents with special characters in token paths", () => {
      const mockTokens = [
        {
          path: "color.primary-100",
          tokenType: "color",
          typedValue: { $value: "#ff0000" },
          resolvedValue: null,
        },
        {
          path: "spacing.xs_small",
          tokenType: "dimension",
          typedValue: { $value: { value: 4, unit: "px" } },
          resolvedValue: null,
        },
        {
          path: "typography.heading/large",
          tokenType: "typography",
          typedValue: { $value: { fontSize: 24, fontFamily: "Inter" } },
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.path)).toEqual([
        "color.primary-100",
        "spacing.xs_small",
        "typography.heading/large",
      ]);
    });

    it("should handle extremely nested token structures", () => {
      const mockStats = {
        totalTokens: 1,
        totalGroups: 10,
        tokensByType: { color: 1 },
        maxDepth: 15,
        tokensWithReferences: 0,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue([]);
      (cycleDetector.detectCycles as any).mockReturnValue({
        hasCycles: false,
        cyclicTokens: new Set(),
        cycles: [],
        topologicalOrder: [],
      });

      const result = analyzeTokens(colorsBase);

      expect(result.depth).toBe(15);
      expect(result.groupCount).toBe(10);
    });

    it("should handle documents with mixed reference types", () => {
      const mockTokens = [
        {
          path: "semantic.primary-dtcg",
          tokenType: "color",
          typedValue: { $value: "{primitives.colors.blue}" }, // DTCG alias
          resolvedValue: null,
        },
        {
          path: "semantic.primary-ref",
          tokenType: "color",
          typedValue: { $value: { $ref: "#/primitives/colors/blue/$value" } }, // JSON $ref
          resolvedValue: null,
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findAllTokens as any).mockReturnValue(mockTokens);

      const result = listTokens(colorsBase);

      expect(result[0].hasReference).toBe(false); // DTCG alias is not detected as $ref
      expect(result[1].hasReference).toBe(true); // JSON $ref is detected
    });

    it("should handle very large token counts gracefully", () => {
      const mockStats = {
        totalTokens: 10000,
        totalGroups: 500,
        tokensByType: {
          color: 3000,
          dimension: 2000,
          typography: 1500,
          shadow: 1000,
          border: 2500,
        },
        maxDepth: 8,
        tokensWithReferences: 2500,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);

      const tokenCount = countTokens(colorsBase);
      const types = getTokenTypes(colorsBase);

      expect(tokenCount).toBe(10000);
      expect(types).toHaveLength(5);
      expect(types).toEqual([
        "color",
        "dimension",
        "typography",
        "shadow",
        "border",
      ]);
    });

    it("should handle AST creation errors gracefully", () => {
      (astBuilder.createAST as any).mockImplementation(() => {
        throw new Error("AST creation failed");
      });

      // These functions should propagate the error since they depend on AST
      expect(() => analyzeTokens(colorsBase)).toThrow("AST creation failed");
      expect(() => countTokens(colorsBase)).toThrow("AST creation failed");
      expect(() => getTokenTypes(colorsBase)).toThrow("AST creation failed");
      expect(() => listTokens(colorsBase)).toThrow("AST creation failed");
    });
  });
});
