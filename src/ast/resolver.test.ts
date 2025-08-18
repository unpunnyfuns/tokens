import { beforeEach, describe, expect, it, vi } from "vitest";
import * as references from "../references/index.js";
import * as traverser from "./ast-traverser.js";
import {
  astToDocument,
  createASTReferenceGraph,
  detectASTCycles,
  getResolutionOrder,
  resolveASTReferences,
} from "./resolver.js";
import type { GroupNode, TokenNode } from "./types.js";

// Mock the dependencies
vi.mock("../references/index.js", () => ({
  resolveReferences: vi.fn(),
  detectCycles: vi.fn(),
}));

vi.mock("./ast-traverser.js", () => ({
  visitTokens: vi.fn(),
}));

describe("AST Resolver", () => {
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

  const mockTokenWithRef: TokenNode = {
    type: "token",
    path: "color.brand",
    name: "brand",
    value: { $value: "{color.primary}" },
    tokenType: "color",
    references: ["color.primary"],
  };

  const mockGroupNode: GroupNode = {
    type: "group",
    path: "color",
    name: "color",
    children: new Map([
      ["primary", mockTokenNode],
      ["brand", mockTokenWithRef],
    ]),
    tokens: new Map([
      ["primary", mockTokenNode],
      ["brand", mockTokenWithRef],
    ]),
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

  describe("astToDocument", () => {
    it("should convert a simple token node to document", () => {
      const simpleRoot: GroupNode = {
        type: "group",
        path: "",
        name: "root",
        children: new Map([["primary", mockTokenNode]]),
        tokens: new Map([["primary", mockTokenNode]]),
        groups: new Map(),
      };

      const result = astToDocument(simpleRoot);

      expect(result).toEqual({
        color: {
          primary: {
            $value: { $value: "#007acc", $type: "color" },
            $type: "color",
          },
        },
      });
    });

    it("should convert nested groups to document", () => {
      const result = astToDocument(mockRootNode);

      expect(result).toEqual({
        color: {
          primary: {
            $value: { $value: "#007acc", $type: "color" },
            $type: "color",
          },
          brand: {
            $value: { $value: "{color.primary}" },
            $type: "color",
          },
        },
      });
    });

    it("should handle tokens without type", () => {
      const tokenNoType: TokenNode = {
        type: "token",
        path: "mytoken",
        name: "mytoken",
        value: { $value: "test" },
      };

      const rootWithNoType: GroupNode = {
        type: "group",
        path: "",
        name: "root",
        children: new Map([["mytoken", tokenNoType]]),
        tokens: new Map([["mytoken", tokenNoType]]),
        groups: new Map(),
      };

      const result = astToDocument(rootWithNoType);

      expect(result).toEqual({
        mytoken: {
          $value: { $value: "test" },
        },
      });
    });

    it("should handle deeply nested paths", () => {
      const deepToken: TokenNode = {
        type: "token",
        path: "theme.colors.background.primary",
        name: "primary",
        value: { $value: "#ffffff" },
        tokenType: "color",
      };

      const deepRoot: GroupNode = {
        type: "group",
        path: "",
        name: "root",
        children: new Map([["primary", deepToken]]),
        tokens: new Map([["primary", deepToken]]),
        groups: new Map(),
      };

      const result = astToDocument(deepRoot);

      expect(result).toEqual({
        theme: {
          colors: {
            background: {
              primary: {
                $value: { $value: "#ffffff" },
                $type: "color",
              },
            },
          },
        },
      });
    });

    it("should handle empty AST", () => {
      const emptyRoot: GroupNode = {
        type: "group",
        path: "",
        name: "root",
        children: new Map(),
        tokens: new Map(),
        groups: new Map(),
      };

      const result = astToDocument(emptyRoot);

      expect(result).toEqual({});
    });
  });

  describe("resolveASTReferences", () => {
    it("should resolve references in AST", () => {
      const mockResolveResult = {
        resolved: new Map([
          ["color.primary", { $value: "#007acc", $type: "color" }],
          ["color.brand", { $value: "#007acc", $type: "color" }],
        ]),
        errors: [],
      };

      (references.resolveReferences as any).mockReturnValue(mockResolveResult);

      const tokens: TokenNode[] = [];
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          // First call for primary token
          const primaryToken = { ...mockTokenNode };
          callback(primaryToken);
          tokens.push(primaryToken);

          // Second call for brand token
          const brandToken = { ...mockTokenWithRef };
          callback(brandToken);
          tokens.push(brandToken);
        },
      );

      const errors = resolveASTReferences(mockRootNode);

      expect(references.resolveReferences).toHaveBeenCalled();
      expect(traverser.visitTokens).toHaveBeenCalled();
      expect(errors).toEqual([]);

      // Check that tokens were updated with resolved values
      expect(tokens[0]?.resolved).toBe(true);
      expect(tokens[0]?.resolvedValue).toEqual({
        $value: "#007acc",
        $type: "color",
      });
      expect(tokens[1]?.resolved).toBe(true);
      expect(tokens[1]?.resolvedValue).toEqual({
        $value: "#007acc",
        $type: "color",
      });
    });

    it("should handle resolution errors", () => {
      const mockResolveResult = {
        resolved: new Map(),
        errors: [
          {
            type: "missing",
            path: "color.brand",
            message: "Reference not found",
            reference: "color.missing",
          },
        ],
      };

      (references.resolveReferences as any).mockReturnValue(mockResolveResult);
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          callback(mockTokenWithRef);
        },
      );

      const errors = resolveASTReferences(mockRootNode);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        type: "missing",
        path: "color.brand",
        message: "Reference not found",
        reference: "color.missing",
      });
    });

    it("should mark unresolved tokens", () => {
      const mockResolveResult = {
        resolved: new Map([
          ["color.primary", { $value: "#007acc", $type: "color" }],
        ]),
        errors: [],
      };

      (references.resolveReferences as any).mockReturnValue(mockResolveResult);

      const brandToken = { ...mockTokenWithRef };
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          callback(mockTokenNode);
          callback(brandToken);
        },
      );

      resolveASTReferences(mockRootNode);

      expect(brandToken.resolved).toBe(false);
    });

    it("should handle errors without reference field", () => {
      const mockResolveResult = {
        resolved: new Map(),
        errors: [
          {
            type: "circular",
            path: "color.a",
            message: "Circular reference detected",
          },
        ],
      };

      (references.resolveReferences as any).mockReturnValue(mockResolveResult);
      (traverser.visitTokens as any).mockImplementation(() => {
        // Empty mock implementation
      });

      const errors = resolveASTReferences(mockRootNode);

      expect(errors[0]).toEqual({
        type: "circular",
        path: "color.a",
        message: "Circular reference detected",
      });
      expect(errors[0]?.reference).toBeUndefined();
    });
  });

  describe("detectASTCycles", () => {
    it("should detect cycles in AST", () => {
      const mockCycleResult = {
        cycles: [
          ["color.a", "color.b", "color.a"],
          ["spacing.x", "spacing.y", "spacing.x"],
        ],
      };

      (references.detectCycles as any).mockReturnValue(mockCycleResult);

      const cycles = detectASTCycles(mockRootNode);

      expect(references.detectCycles).toHaveBeenCalled();
      expect(cycles).toEqual([
        ["color.a", "color.b", "color.a"],
        ["spacing.x", "spacing.y", "spacing.x"],
      ]);
    });

    it("should return empty array when no cycles", () => {
      const mockCycleResult = {
        cycles: [],
      };

      (references.detectCycles as any).mockReturnValue(mockCycleResult);

      const cycles = detectASTCycles(mockRootNode);

      expect(cycles).toEqual([]);
    });
  });

  describe("getResolutionOrder", () => {
    it("should return topologically sorted order", () => {
      const tokens = [
        {
          type: "token",
          path: "color.primary",
          name: "primary",
          value: { $value: "#007acc" },
        },
        {
          type: "token",
          path: "color.brand",
          name: "brand",
          value: { $value: "{color.primary}" },
          references: ["color.primary"],
        },
        {
          type: "token",
          path: "color.accent",
          name: "accent",
          value: { $value: "{color.brand}" },
          references: ["color.brand"],
        },
      ];

      // Simplified mock that processes tokens directly
      const processTokens = (callback: any) => {
        for (const token of tokens) {
          callback(token);
        }
      };

      const findToken = (callback: any) => {
        for (const token of tokens) {
          if (callback(token)) break;
        }
      };

      let isFirstCall = true;
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          if (isFirstCall) {
            isFirstCall = false;
            processTokens(callback);
          } else {
            findToken(callback);
          }
        },
      );

      const order = getResolutionOrder(mockRootNode);

      // Primary should come before brand, brand before accent
      const primaryIndex = order.indexOf("color.primary");
      const brandIndex = order.indexOf("color.brand");
      const accentIndex = order.indexOf("color.accent");

      expect(primaryIndex).toBeLessThan(brandIndex);
      expect(brandIndex).toBeLessThan(accentIndex);
      expect(order).toHaveLength(3);
    });

    it("should handle tokens without references", () => {
      const tokens = [
        {
          type: "token",
          path: "color.red",
          name: "red",
          value: { $value: "#ff0000" },
        },
        {
          type: "token",
          path: "color.blue",
          name: "blue",
          value: { $value: "#0000ff" },
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          for (const token of tokens) {
            callback(token);
          }
        },
      );

      const order = getResolutionOrder(mockRootNode);

      expect(order).toContain("color.red");
      expect(order).toContain("color.blue");
      expect(order).toHaveLength(2);
    });

    it("should handle circular references", () => {
      const tokens = [
        {
          type: "token",
          path: "color.a",
          name: "a",
          value: { $value: "{color.b}" },
          references: ["color.b"],
        },
        {
          type: "token",
          path: "color.b",
          name: "b",
          value: { $value: "{color.a}" },
          references: ["color.a"],
        },
      ];

      let visitCount = 0;
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          visitCount++;
          // Prevent infinite recursion in test
          if (visitCount > 10) return;
          for (const token of tokens) {
            callback(token);
          }
        },
      );

      const order = getResolutionOrder(mockRootNode);

      // Should still include both tokens despite cycle
      expect(order).toContain("color.a");
      expect(order).toContain("color.b");
    });
  });

  describe("createASTReferenceGraph", () => {
    it("should create dependency and dependent maps", () => {
      const tokens = [
        {
          type: "token",
          path: "color.primary",
          name: "primary",
          value: { $value: "#007acc" },
        },
        {
          type: "token",
          path: "color.brand",
          name: "brand",
          value: { $value: "{color.primary}" },
          references: ["color.primary"],
        },
        {
          type: "token",
          path: "color.accent",
          name: "accent",
          value: { $value: "{color.primary}" },
          references: ["color.primary"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          for (const token of tokens) {
            callback(token);
          }
        },
      );

      const graph = createASTReferenceGraph(mockRootNode);

      // Check dependencies
      expect(graph.dependencies.has("color.brand")).toBe(true);
      expect(graph.dependencies.get("color.brand")).toEqual(
        new Set(["color.primary"]),
      );
      expect(graph.dependencies.get("color.accent")).toEqual(
        new Set(["color.primary"]),
      );

      // Check dependents
      expect(graph.dependents.has("color.primary")).toBe(true);
      expect(graph.dependents.get("color.primary")).toEqual(
        new Set(["color.brand", "color.accent"]),
      );
    });

    it("should handle tokens without references", () => {
      const tokens = [
        {
          type: "token",
          path: "color.primary",
          name: "primary",
          value: { $value: "#007acc" },
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          for (const token of tokens) {
            callback(token);
          }
        },
      );

      const graph = createASTReferenceGraph(mockRootNode);

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it("should handle complex reference chains", () => {
      const tokens = [
        {
          type: "token",
          path: "a",
          name: "a",
          value: { $value: "1" },
        },
        {
          type: "token",
          path: "b",
          name: "b",
          value: { $value: "{a}" },
          references: ["a"],
        },
        {
          type: "token",
          path: "c",
          name: "c",
          value: { $value: "{b}" },
          references: ["b"],
        },
        {
          type: "token",
          path: "d",
          name: "d",
          value: { $value: "{b} {c}" },
          references: ["b", "c"],
        },
      ];

      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          for (const token of tokens) {
            callback(token);
          }
        },
      );

      const graph = createASTReferenceGraph(mockRootNode);

      // Check complex dependencies
      expect(graph.dependencies.get("d")).toEqual(new Set(["b", "c"]));

      // Check multiple dependents
      expect(graph.dependents.get("b")).toEqual(new Set(["c", "d"]));
    });
  });
});
