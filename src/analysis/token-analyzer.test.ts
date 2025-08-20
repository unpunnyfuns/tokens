import { beforeEach, describe, expect, it, vi } from "vitest";
import * as astBuilder from "../ast/ast-builder.js";
import * as cycleDetector from "../ast/cycle-detector/index.js";
import * as ast from "../ast/index.js";
import {
  analyzeTokens,
  countGroups,
  findTokensByType,
  getTokenTypes,
} from "./token-analyzer.js";

// Mock AST modules
vi.mock("../ast/ast-builder.js", () => ({
  createAST: vi.fn(),
}));

vi.mock("../ast/index.js", () => ({
  getStatistics: vi.fn(),
  resolveASTReferences: vi.fn(),
  findTokensByType: vi.fn(),
}));

vi.mock("../ast/cycle-detector/index.js", () => ({
  detectCycles: vi.fn(),
}));

describe("Token Analyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeTokens", () => {
    const mockDocument = {
      color: {
        primary: { $value: "#007acc", $type: "color" },
        secondary: { $value: "{color.primary}", $type: "color" },
      },
      spacing: {
        small: { $value: "4px", $type: "dimension" },
      },
    };

    const mockAST = { type: "document", children: [] };

    it("should analyze a token document", () => {
      const mockStats = {
        totalTokens: 3,
        totalGroups: 2,
        tokensByType: { color: 2, dimension: 1 },
        maxDepth: 2,
        tokensWithReferences: 1,
      };

      const mockResolutionErrors = [
        { type: "missing", path: "color.missing" },
        { type: "invalid", path: "color.invalid" },
      ];

      const mockCycleResult = {
        hasCycles: true,
        cyclicTokens: new Set(["color.circular1", "color.circular2"]),
        cycles: [["color.circular1", "color.circular2"]],
        topologicalOrder: null,
      };

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue(mockResolutionErrors);
      (cycleDetector.detectCycles as any).mockReturnValue(mockCycleResult);

      const result = analyzeTokens(mockDocument);

      expect(astBuilder.createAST).toHaveBeenCalledWith(mockDocument);
      expect(ast.getStatistics).toHaveBeenCalledWith(mockAST);
      expect(ast.resolveASTReferences).toHaveBeenCalledWith(mockAST);
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

      const result = analyzeTokens(mockDocument);

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

      const mockResolutionErrors = [
        { type: "missing", path: "ref1" },
        { type: "circular", path: "ref2" },
        { type: "missing", path: "ref3" },
        { type: "invalid", path: "ref4" },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.getStatistics as any).mockReturnValue(mockStats);
      (ast.resolveASTReferences as any).mockReturnValue(mockResolutionErrors);
      (cycleDetector.detectCycles as any).mockReturnValue({
        hasCycles: false,
        cyclicTokens: new Set(),
        cycles: [],
        topologicalOrder: [],
      });

      const result = analyzeTokens(mockDocument);

      expect(result.unresolvedReferences).toEqual(["ref1", "ref3"]);
    });
  });

  describe("countGroups", () => {
    it("should count groups in a document", () => {
      const doc = {
        color: {
          primary: { $value: "#007acc" },
          secondary: { $value: "#6c757d" },
        },
        spacing: {
          small: { $value: "4px" },
          large: { $value: "16px" },
        },
      };

      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 4, // root + color + spacing = 3 user groups + 1 root
      });

      const count = countGroups(doc);
      expect(count).toBe(3); // root, color and spacing groups (excluding root)
    });

    it("should count nested groups", () => {
      const doc = {
        theme: {
          colors: {
            background: {
              primary: { $value: "#ffffff" },
            },
            foreground: {
              primary: { $value: "#000000" },
            },
          },
          spacing: {
            small: { $value: "4px" },
          },
        },
      };

      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 6, // root + theme + colors + background + foreground + spacing = 5 user + 1 root
      });

      const count = countGroups(doc);
      expect(count).toBe(5); // theme, colors, background, foreground, spacing (root excluded)
    });

    it("should not count tokens as groups", () => {
      const doc = {
        token1: { $value: "value1" },
        token2: { $value: "value2" },
      };

      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 1, // Only root group
      });

      const count = countGroups(doc);
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
      const doc = {
        $description: "Document description",
        $version: "1.0",
        colors: {
          primary: { $value: "#007acc" },
        },
      };

      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 2, // root + colors = 1 user group + 1 root
      });

      const count = countGroups(doc);
      expect(count).toBe(1); // Only colors group (root excluded)
    });

    it("should handle mixed groups and tokens", () => {
      const doc = {
        topLevelToken: { $value: "value" },
        group1: {
          token1: { $value: "value1" },
          nestedGroup: {
            token2: { $value: "value2" },
          },
        },
      };

      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 3, // root + group1 + nestedGroup = 2 user groups + 1 root
      });

      const count = countGroups(doc);
      expect(count).toBe(2); // group1 and nestedGroup (root excluded)
    });

    it("should handle null and undefined values", () => {
      const doc = {
        group1: {
          nullValue: null,
          undefinedValue: undefined,
          token: { $value: "value" },
        },
      };

      // Mock createAST and getStatistics
      (astBuilder.createAST as any).mockReturnValue({});
      (ast.getStatistics as any).mockReturnValue({
        totalGroups: 2, // root + group1 = 1 user group + 1 root
      });

      const count = countGroups(doc as any);
      expect(count).toBe(1); // Only group1 (root excluded)
    });
  });

  describe("findTokensByType", () => {
    const mockDocument = {
      color: {
        primary: { $value: "#007acc", $type: "color" },
        secondary: { $value: "#6c757d", $type: "color" },
      },
      spacing: {
        small: { $value: "4px", $type: "dimension" },
      },
    };

    const mockAST = { type: "document", children: [] };

    it("should find tokens by type", () => {
      const mockColorTokens = [
        { path: "color.primary", value: { $value: "#007acc", $type: "color" } },
        {
          path: "color.secondary",
          value: { $value: "#6c757d", $type: "color" },
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findTokensByType as any).mockReturnValue(mockColorTokens);

      const result = findTokensByType(mockDocument, "color");

      expect(astBuilder.createAST).toHaveBeenCalledWith(mockDocument);
      expect(ast.findTokensByType).toHaveBeenCalledWith(mockAST, "color");
      expect(result).toEqual([
        { path: "color.primary", value: { $value: "#007acc", $type: "color" } },
        {
          path: "color.secondary",
          value: { $value: "#6c757d", $type: "color" },
        },
      ]);
    });

    it("should return empty array when no tokens match", () => {
      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findTokensByType as any).mockReturnValue([]);

      const result = findTokensByType(mockDocument, "nonexistent");

      expect(result).toEqual([]);
    });

    it("should handle tokens with complex values", () => {
      const mockComplexTokens = [
        {
          path: "shadow.default",
          value: {
            $value: {
              offsetX: "0px",
              offsetY: "2px",
              blur: "4px",
              color: "#000000",
            },
            $type: "shadow",
          },
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (ast.findTokensByType as any).mockReturnValue(mockComplexTokens);

      const result = findTokensByType(mockDocument, "shadow");

      expect(result).toEqual([
        {
          path: "shadow.default",
          value: {
            $value: {
              offsetX: "0px",
              offsetY: "2px",
              blur: "4px",
              color: "#000000",
            },
            $type: "shadow",
          },
        },
      ]);
    });
  });

  describe("getTokenTypes", () => {
    const mockDocument = {
      tokens: {},
    };

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

      const result = getTokenTypes(mockDocument);

      expect(astBuilder.createAST).toHaveBeenCalledWith(mockDocument);
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

      const result = getTokenTypes(mockDocument);

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

      const result = getTokenTypes(mockDocument);

      expect(result).toEqual(["color"]);
    });
  });
});
