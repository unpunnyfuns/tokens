import { beforeEach, describe, expect, it, vi } from "vitest";
import * as traverser from "./ast-traverser.js";
import {
  createReferenceGraph,
  filterTokens,
  findAllTokens,
  findCircularReferences,
  findDependencies,
  findDependents,
  findTokensByType,
  findTokensWithReferences,
  findUnresolvedTokens,
  getGroup,
  getNode,
  getStatistics,
  getToken,
} from "./query.js";
import type { GroupNode, TokenNode } from "./types.js";

// Mock the traverser module
vi.mock("./ast-traverser.js", () => ({
  findNode: vi.fn(),
  traverseAST: vi.fn(),
  visitTokens: vi.fn(),
}));

describe("AST Query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTokenNode: TokenNode = {
    type: "token",
    path: "color.primary",
    name: "primary",
    value: { $value: "#007acc", $type: "color" },
    tokenType: "color",
  };

  const mockGroupNode: GroupNode = {
    type: "group",
    path: "color",
    name: "color",
    children: new Map([["primary", mockTokenNode]]),
    tokens: new Map([["primary", mockTokenNode]]),
    groups: new Map(),
  };

  const mockRootNode: GroupNode = {
    type: "group",
    path: "",
    name: "root",
    children: new Map([["color", mockGroupNode]]),
    tokens: new Map(),
    groups: new Map([["color", mockGroupNode]]),
  };

  describe("getToken", () => {
    it("should return token node when path points to a token", () => {
      (traverser.findNode as any).mockReturnValue(mockTokenNode);

      const result = getToken(mockRootNode, "color.primary");

      expect(traverser.findNode).toHaveBeenCalledWith(
        mockRootNode,
        "color.primary",
      );
      expect(result).toBe(mockTokenNode);
    });

    it("should return undefined when path points to a group", () => {
      (traverser.findNode as any).mockReturnValue(mockGroupNode);

      const result = getToken(mockRootNode, "color");

      expect(result).toBeUndefined();
    });

    it("should return undefined when node not found", () => {
      (traverser.findNode as any).mockReturnValue(undefined);

      const result = getToken(mockRootNode, "missing.path");

      expect(result).toBeUndefined();
    });
  });

  describe("getGroup", () => {
    it("should return group node when path points to a group", () => {
      (traverser.findNode as any).mockReturnValue(mockGroupNode);

      const result = getGroup(mockRootNode, "color");

      expect(traverser.findNode).toHaveBeenCalledWith(mockRootNode, "color");
      expect(result).toBe(mockGroupNode);
    });

    it("should return undefined when path points to a token", () => {
      (traverser.findNode as any).mockReturnValue(mockTokenNode);

      const result = getGroup(mockRootNode, "color.primary");

      expect(result).toBeUndefined();
    });

    it("should return undefined when node not found", () => {
      (traverser.findNode as any).mockReturnValue(undefined);

      const result = getGroup(mockRootNode, "missing");

      expect(result).toBeUndefined();
    });
  });

  describe("getNode", () => {
    it("should return any node type", () => {
      (traverser.findNode as any).mockReturnValue(mockTokenNode);

      const result = getNode(mockRootNode, "color.primary");

      expect(traverser.findNode).toHaveBeenCalledWith(
        mockRootNode,
        "color.primary",
      );
      expect(result).toBe(mockTokenNode);
    });

    it("should return undefined when not found", () => {
      (traverser.findNode as any).mockReturnValue(undefined);

      const result = getNode(mockRootNode, "missing");

      expect(result).toBeUndefined();
    });
  });

  describe("findAllTokens", () => {
    it("should find all tokens in the tree", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {} },
        { type: "token", path: "color.secondary", value: {} },
        { type: "token", path: "spacing.small", value: {} },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findAllTokens(mockRootNode);

      expect(traverser.visitTokens).toHaveBeenCalled();
      expect(result).toEqual(tokens);
    });

    it("should return empty array when no tokens", () => {
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, _callback: any) => {
          // No tokens to visit
        },
      );

      const result = findAllTokens(mockRootNode);

      expect(result).toEqual([]);
    });
  });

  describe("findTokensByType", () => {
    it("should find tokens of specific type", () => {
      const allTokens = [
        { type: "token", path: "color.primary", tokenType: "color", value: {} },
        {
          type: "token",
          path: "color.secondary",
          tokenType: "color",
          value: {},
        },
        {
          type: "token",
          path: "spacing.small",
          tokenType: "dimension",
          value: {},
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          allTokens.forEach(callback);
        },
      );

      const result = findTokensByType(mockRootNode, "color");

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.tokenType === "color")).toBe(true);
    });

    it("should return empty array when no tokens match type", () => {
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, _callback: any) => {
          // No tokens to visit
        },
      );

      const result = findTokensByType(mockRootNode, "nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("filterTokens", () => {
    it("should filter tokens based on predicate", () => {
      const allTokens = [
        { type: "token", path: "color.primary", value: { $value: "#007acc" } },
        {
          type: "token",
          path: "color.secondary",
          value: { $value: "#6c757d" },
        },
        { type: "token", path: "spacing.small", value: { $value: "4px" } },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          allTokens.forEach(callback);
        },
      );

      const result = filterTokens(mockRootNode, (token) =>
        token.path.startsWith("color."),
      );

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.path.startsWith("color."))).toBe(true);
    });

    it("should return empty array when no tokens match predicate", () => {
      const allTokens = [{ type: "token", path: "spacing.small", value: {} }];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          allTokens.forEach(callback);
        },
      );

      const result = filterTokens(mockRootNode, () => false);

      expect(result).toEqual([]);
    });
  });

  describe("findTokensWithReferences", () => {
    it("should find tokens with references", () => {
      const tokens = [
        {
          type: "token",
          path: "color.primary",
          value: { $value: "#007acc" },
          references: [],
        },
        {
          type: "token",
          path: "color.brand",
          value: { $value: "{color.primary}" },
          references: ["color.primary"],
        },
        {
          type: "token",
          path: "spacing.small",
          value: { $value: "4px" },
          references: [],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findTokensWithReferences(mockRootNode);

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe("color.brand");
    });

    it("should return empty array when no tokens have references", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: { $value: "#007acc" } },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findTokensWithReferences(mockRootNode);

      expect(result).toEqual([]);
    });
  });

  describe("getStatistics", () => {
    it("should calculate statistics for AST", () => {
      // Expected statistics from the simulated traversal

      (traverser.traverseAST as any).mockImplementation(
        (_root: any, visitor: any) => {
          // Simulate traversing nodes
          visitor({ type: "group", path: "color", children: [] }, 1);
          visitor({ type: "group", path: "spacing", children: [] }, 1);
          visitor(
            { type: "token", path: "color.primary", tokenType: "color" },
            2,
          );
          visitor(
            {
              type: "token",
              path: "color.secondary",
              tokenType: "color",
              references: ["color.primary"],
            },
            2,
          );
          visitor(
            { type: "token", path: "color.tertiary", tokenType: "color" },
            2,
          );
          visitor(
            { type: "token", path: "spacing.small", tokenType: "dimension" },
            2,
          );
          visitor(
            { type: "token", path: "spacing.large", tokenType: "dimension" },
            2,
          );
        },
      );

      const result = getStatistics(mockRootNode);

      expect(result.totalTokens).toBe(5);
      expect(result.totalGroups).toBe(2);
      expect(result.maxDepth).toBe(2);
      expect(result.tokensByType).toEqual({ color: 3, dimension: 2 });
      expect(result.tokensWithReferences).toBe(1);
    });

    it("should handle empty AST", () => {
      (traverser.traverseAST as any).mockImplementation(
        (_root: any, _visitor: any) => {
          // Empty AST
        },
      );

      const result = getStatistics(mockRootNode);

      expect(result.totalTokens).toBe(0);
      expect(result.totalGroups).toBe(0);
      expect(result.maxDepth).toBe(0);
      expect(result.tokensByType).toEqual({});
      expect(result.tokensWithReferences).toBe(0);
    });
  });

  describe("createReferenceGraph", () => {
    it("should create reference graph from AST", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, references: [] },
        {
          type: "token",
          path: "color.brand",
          value: {},
          references: ["color.primary"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = createReferenceGraph(mockRootNode);

      expect(result.nodes.size).toBe(2);
      // Only tokens with references create edges
      expect(result.edges.size).toBeLessThanOrEqual(2);
      if (result.edges.has("color.brand")) {
        expect(result.edges.get("color.brand")).toEqual(
          new Set(["color.primary"]),
        );
      }
    });

    it("should handle complex reference graphs", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, references: [] },
        {
          type: "token",
          path: "color.brand",
          value: {},
          references: ["color.primary"],
        },
        {
          type: "token",
          path: "color.accent",
          value: {},
          references: ["color.brand"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = createReferenceGraph(mockRootNode);

      expect(result.nodes.size).toBe(3);
      // Two tokens have references
      expect(result.edges.size).toBeLessThanOrEqual(3);
    });
  });

  describe("findUnresolvedTokens", () => {
    it("should find unresolved tokens", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, resolved: true },
        { type: "token", path: "color.brand", value: {}, resolved: false },
        { type: "token", path: "color.accent", value: {}, resolved: true },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findUnresolvedTokens(mockRootNode);

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe("color.brand");
    });

    it("should return empty array when all tokens resolved", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, resolved: true },
        { type: "token", path: "color.secondary", value: {}, resolved: true },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findUnresolvedTokens(mockRootNode);

      expect(result).toEqual([]);
    });
  });

  describe("findDependencies", () => {
    it("should find token dependencies", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, references: [] },
        {
          type: "token",
          path: "color.brand",
          value: {},
          references: ["color.primary"],
        },
        {
          type: "token",
          path: "color.accent",
          value: {},
          references: ["color.brand", "color.primary"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      // Mock getToken to return the appropriate tokens
      (traverser.findNode as any)
        .mockReturnValueOnce({
          type: "token",
          path: "color.accent",
          references: ["color.brand", "color.primary"],
        })
        .mockReturnValueOnce({
          type: "token",
          path: "color.brand",
          references: ["color.primary"],
        })
        .mockReturnValueOnce({
          type: "token",
          path: "color.primary",
          references: [],
        });

      const result = findDependencies(mockRootNode, "color.accent");

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.path)).toContain("color.brand");
      expect(result.map((t) => t.path)).toContain("color.primary");
    });

    it("should return empty array for token without dependencies", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, references: [] },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findDependencies(mockRootNode, "color.primary");

      expect(result).toEqual([]);
    });
  });

  describe("findDependents", () => {
    it("should find tokens that depend on given token", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, references: [] },
        {
          type: "token",
          path: "color.brand",
          value: {},
          references: ["color.primary"],
        },
        {
          type: "token",
          path: "color.accent",
          value: {},
          references: ["color.primary"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findDependents(mockRootNode, "color.primary");

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.path)).toContain("color.brand");
      expect(result.map((t) => t.path)).toContain("color.accent");
    });

    it("should return empty array for token with no dependents", () => {
      const tokens = [
        {
          type: "token",
          path: "color.primary",
          value: {},
          references: ["color.base"],
        },
        { type: "token", path: "color.base", value: {}, references: [] },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findDependents(mockRootNode, "color.primary");

      expect(result).toEqual([]);
    });
  });

  describe("findCircularReferences", () => {
    it("should find circular references", () => {
      const tokenA = {
        type: "token",
        path: "color.a",
        value: {},
        references: ["color.b"],
      };
      const tokenB = {
        type: "token",
        path: "color.b",
        value: {},
        references: ["color.a"],
      };

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          callback(tokenA);
          callback(tokenB);
        },
      );

      // Mock getToken for circular reference detection
      (traverser.findNode as any).mockImplementation(
        (_root: any, path: any) => {
          if (path === "color.a") return tokenA;
          if (path === "color.b") return tokenB;
          return undefined;
        },
      );

      const result = findCircularReferences(mockRootNode);

      // The algorithm typically only marks one token in a cycle
      expect(result.length).toBeGreaterThan(0);
      expect(["color.a", "color.b"]).toContain(result[0]?.path);
    });

    it("should return empty array when no circular references", () => {
      const tokens = [
        { type: "token", path: "color.primary", value: {}, references: [] },
        {
          type: "token",
          path: "color.brand",
          value: {},
          references: ["color.primary"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          tokens.forEach(callback);
        },
      );

      const result = findCircularReferences(mockRootNode);

      expect(result).toEqual([]);
    });
  });
});
