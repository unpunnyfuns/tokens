import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveASTReferences } from "./ast-resolver.js";
import * as traverser from "./ast-traverser.js";
import { astToDocument, createASTReferenceGraph } from "./resolver.js";
import type { GroupNode, TokenNode } from "./types.js";

// Mock the dependencies

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
    typedValue: { $value: "#007acc", $type: "color" },
    tokenType: "color",
  };

  const mockTokenWithRef: TokenNode = {
    type: "token",
    path: "color.brand",
    name: "brand",
    typedValue: { $value: "{color.primary}", $type: "color" },
    tokenType: "color",
    references: ["{color.primary}"],
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
            $value: "#007acc",
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
            $value: "#007acc",
            $type: "color",
          },
          brand: {
            $value: "{color.primary}",
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
        typedValue: { $value: "test", $type: "dimension" },
        tokenType: "dimension",
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
          $value: "test",
          $type: "dimension",
        },
      });
    });

    it("should handle deeply nested paths", () => {
      const deepToken: TokenNode = {
        type: "token",
        path: "theme.colors.background.primary",
        name: "primary",
        typedValue: { $value: "#ffffff", $type: "color" },
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
                $value: "#ffffff",
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
    it("should mark tokens without references as resolved", () => {
      const tokenWithoutRef = { ...mockTokenNode };
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          callback(tokenWithoutRef);
          return true;
        },
      );

      const errors = resolveASTReferences(mockRootNode);

      expect(errors).toEqual([]);
      expect(tokenWithoutRef.resolved).toBe(true);
      expect(tokenWithoutRef.resolvedValue).toEqual({
        $value: "#007acc",
        $type: "color",
      });
    });

    it("should mark tokens with references as unresolved", () => {
      const tokenWithRef = { ...mockTokenWithRef };
      (traverser.visitTokens as any).mockImplementation(
        (_root: any, callback: any) => {
          callback(tokenWithRef);
          return true;
        },
      );

      const errors = resolveASTReferences(mockRootNode);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        type: "missing",
        path: "color.brand",
        message: "Token has unresolved references: {color.primary}",
      });
      expect(tokenWithRef.resolved).toBe(false);
    });

    it("should call visitTokens with callback", () => {
      (traverser.visitTokens as any).mockImplementation(() => {
        return true;
      });

      resolveASTReferences(mockRootNode);

      expect(traverser.visitTokens).toHaveBeenCalledWith(
        mockRootNode,
        expect.any(Function),
      );
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
