import { describe, expect, it } from "vitest";
import { loadTokenFile } from "../../test/helpers/load-examples.js";
import type { TokenDocument } from "../types.js";
import { buildASTFromDocument } from "./ast-builder.js";
import { ASTQuery } from "./ast-query.js";

describe("AST Query", () => {
  describe("basic queries", () => {
    it("should query tokens by path", async () => {
      const doc = await loadTokenFile<TokenDocument>("full-example.json");
      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const token = query.getToken("colors.primary");
      expect(token).toBeDefined();
      expect(token?.type).toBe("token");
      expect(token?.tokenType).toBe("color");
    });

    it("should query groups by path", async () => {
      const doc = await loadTokenFile<TokenDocument>("full-example.json");
      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const group = query.getGroup("colors");
      expect(group).toBeDefined();
      expect(group?.type).toBe("group");
      expect(group?.tokens.size).toBeGreaterThan(0);
    });

    it("should get node by path (token or group)", () => {
      const doc: TokenDocument = {
        colors: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const colors = query.getNode("colors");
      expect(colors?.type).toBe("group");

      const primary = query.getNode("colors.primary");
      expect(primary?.type).toBe("token");
    });

    it("should return undefined for non-existent paths", () => {
      const ast = buildASTFromDocument({});
      const query = new ASTQuery(ast);

      expect(query.getToken("does.not.exist")).toBeUndefined();
      expect(query.getGroup("does.not.exist")).toBeUndefined();
      expect(query.getNode("does.not.exist")).toBeUndefined();
    });
  });

  describe("filtering queries", () => {
    it("should get all tokens", async () => {
      const doc = await loadTokenFile<TokenDocument>("full-example.json");
      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const tokens = query.getAllTokens();
      expect(tokens.length).toBeGreaterThan(0);
      for (const token of tokens) {
        expect(token.type).toBe("token");
      }
    });

    it("should get tokens by type", () => {
      const doc: TokenDocument = {
        primary: {
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            alpha: 1,
          },
          $type: "color",
        },
        secondary: {
          $value: {
            colorSpace: "srgb",
            components: [1, 0.4, 0],
            alpha: 1,
          },
          $type: "color",
        },
        small: { $value: "4px", $type: "dimension" },
        large: { $value: "16px", $type: "dimension" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const colorTokens = query.getTokensByType("color");
      expect(colorTokens).toHaveLength(2);
      for (const token of colorTokens) {
        expect(token.tokenType).toBe("color");
      }

      const dimensionTokens = query.getTokensByType("dimension");
      expect(dimensionTokens).toHaveLength(2);
    });

    it("should get tokens with references", () => {
      const doc: TokenDocument = {
        base: {
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            alpha: 1,
          },
          $type: "color",
        },
        primary: { $value: "{base}", $type: "color" },
        secondary: {
          $value: {
            colorSpace: "srgb",
            components: [1, 0.4, 0],
            alpha: 1,
          },
          $type: "color",
        },
        button: { $value: "{primary}", $type: "color" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const tokensWithRefs = query.getTokensWithReferences();
      expect(tokensWithRefs).toHaveLength(2);
      expect(tokensWithRefs.map((t) => t.name)).toContain("primary");
      expect(tokensWithRefs.map((t) => t.name)).toContain("button");
    });

    it("should get unresolved tokens", () => {
      const doc: TokenDocument = {
        primary: { $value: "{nonexistent}", $type: "color" },
        secondary: {
          $value: {
            colorSpace: "srgb",
            components: [1, 0.4, 0],
            alpha: 1,
          },
          $type: "color",
        },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const unresolved = query.getUnresolvedTokens();
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0]?.name).toBe("primary");
    });

    it("should filter tokens by predicate", () => {
      const doc: TokenDocument = {
        small: { $value: "4px", $type: "dimension" },
        medium: { $value: "8px", $type: "dimension" },
        large: { $value: "16px", $type: "dimension" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const largeTokens = query.filterTokens((token) => {
        return token.value === "16px";
      });

      expect(largeTokens).toHaveLength(1);
      expect(largeTokens[0]?.name).toBe("large");
    });
  });

  describe("relationship queries", () => {
    it("should get token dependencies", () => {
      const doc: TokenDocument = {
        base: {
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            alpha: 1,
          },
          $type: "color",
        },
        primary: { $value: "{base}", $type: "color" },
        button: { $value: "{primary}", $type: "color" },
        hover: { $value: "{button}", $type: "color" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const deps = query.getDependencies("hover");
      expect(deps).toHaveLength(3);
      expect(deps.map((t) => t.name)).toContain("button");
      expect(deps.map((t) => t.name)).toContain("primary");
      expect(deps.map((t) => t.name)).toContain("base");
    });

    it("should get token dependents", () => {
      const doc: TokenDocument = {
        base: {
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            alpha: 1,
          },
          $type: "color",
        },
        primary: { $value: "{base}", $type: "color" },
        secondary: { $value: "{base}", $type: "color" },
        button: { $value: "{primary}", $type: "color" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const dependents = query.getDependents("base");
      expect(dependents).toHaveLength(3);
      expect(dependents.map((t) => t.name)).toContain("primary");
      expect(dependents.map((t) => t.name)).toContain("secondary");
      expect(dependents.map((t) => t.name)).toContain("button");
    });

    it("should build reference graph", () => {
      const doc: TokenDocument = {
        a: { $value: "#000" },
        b: { $value: "{a}" },
        c: { $value: "{b}" },
        d: { $value: "{a}" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const graph = query.getReferenceGraph();

      // Check forward references
      expect(graph.references.get("b")).toContain("a");
      expect(graph.references.get("c")).toContain("b");
      expect(graph.references.get("d")).toContain("a");

      // Check reverse references
      expect(graph.referencedBy.get("a")).toContain("b");
      expect(graph.referencedBy.get("a")).toContain("d");
      expect(graph.referencedBy.get("b")).toContain("c");
    });

    it("should detect circular references", () => {
      const doc: TokenDocument = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{a}" },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const hasCircular = query.hasCircularReferences();
      expect(hasCircular).toBe(true);

      const circularTokens = query.getCircularReferences();
      expect(circularTokens).toHaveLength(3);
      expect(circularTokens.map((t) => t.name)).toContain("a");
      expect(circularTokens.map((t) => t.name)).toContain("b");
      expect(circularTokens.map((t) => t.name)).toContain("c");
    });
  });

  describe("statistical queries", () => {
    it("should count tokens and groups", async () => {
      const doc = await loadTokenFile<TokenDocument>("full-example.json");
      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const stats = query.getStatistics();

      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalGroups).toBeGreaterThan(0);
      expect(stats.tokensByType).toBeDefined();
      expect(stats.maxDepth).toBeGreaterThan(0);
    });

    it("should calculate tree depth", () => {
      const doc: TokenDocument = {
        a: {
          b: {
            c: {
              d: { $value: "deep" },
            },
          },
        },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const depth = query.getTreeDepth();
      expect(depth).toBe(4); // root -> a -> b -> c -> d
    });

    it("should get paths at specific depth", () => {
      const doc: TokenDocument = {
        colors: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
            },
            $type: "color",
          },
          secondary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0.4, 0],
              alpha: 1,
            },
            $type: "color",
          },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const depth1 = query.getNodesAtDepth(1);
      expect(depth1.map((n) => n.name)).toContain("colors");
      expect(depth1.map((n) => n.name)).toContain("spacing");

      const depth2 = query.getNodesAtDepth(2);
      expect(depth2.map((n) => n.name)).toContain("primary");
      expect(depth2.map((n) => n.name)).toContain("secondary");
      expect(depth2.map((n) => n.name)).toContain("small");
    });
  });

  describe("path queries", () => {
    it("should get all paths", async () => {
      const doc = await loadTokenFile<TokenDocument>("full-example.json");
      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const paths = query.getAllPaths();
      expect(paths).toContain("colors");
      expect(paths).toContain("colors.primary");
      expect(paths).toContain("spacing");
      expect(paths).toContain("spacing.small");
    });

    it("should get token paths only", () => {
      const doc: TokenDocument = {
        colors: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const tokenPaths = query.getTokenPaths();
      expect(tokenPaths).toContain("colors.primary");
      expect(tokenPaths).not.toContain("colors");
    });

    it("should match paths by pattern", () => {
      const doc: TokenDocument = {
        colors: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0.4, 0.8],
              alpha: 1,
            },
            $type: "color",
          },
          secondary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0.4, 0],
              alpha: 1,
            },
            $type: "color",
          },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const ast = buildASTFromDocument(doc);
      const query = new ASTQuery(ast);

      const colorPaths = query.getPathsMatching(/^colors\./);
      expect(colorPaths).toContain("colors.primary");
      expect(colorPaths).toContain("colors.secondary");
      expect(colorPaths).not.toContain("spacing.small");
    });
  });
});
