import type { TokenDocument } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import { createAST } from "./ast-builder.js";
import {
  findAllNodes,
  findNode,
  getAncestors,
  getSiblings,
  traverseAST,
  visitGroups,
  visitTokens,
  walkAST,
} from "./ast-traverser.js";
import type { TokenNode } from "./types.js";

describe("AST Traverser", () => {
  describe("traverseAST", () => {
    it("should traverse all nodes in pre-order", async () => {
      const doc = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const ast = createAST(doc);

      const visited: string[] = [];
      traverseAST(ast, (node) => {
        visited.push(node.path || "root");
        return undefined;
      });

      expect(visited[0]).toBe("root");
      expect(visited).toContain("colors");
      expect(visited).toContain("colors.primary");
      expect(visited).toContain("spacing");
      expect(visited).toContain("spacing.small");
    });

    it("should support early exit", () => {
      const doc: TokenDocument = {
        a: { $value: "1", $type: "dimension" },
        b: { $value: "2", $type: "dimension" },
        c: { $value: "3", $type: "dimension" },
      };

      const ast = createAST(doc);
      const visited: string[] = [];

      traverseAST(ast, (node) => {
        visited.push(node.name);
        if (node.name === "b") return false;
        return true;
      });

      expect(visited).toContain("a");
      expect(visited).toContain("b");
      expect(visited).not.toContain("c");
    });

    it("should traverse in post-order when specified", () => {
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

      const ast = createAST(doc);
      const visited: string[] = [];

      traverseAST(
        ast,
        (node) => {
          visited.push(node.name);
          return undefined;
        },
        "post",
      );

      // In post-order, children are visited before parents
      const primaryIndex = visited.indexOf("primary");
      const colorsIndex = visited.indexOf("colors");
      const rootIndex = visited.indexOf("root");

      expect(primaryIndex).toBeLessThan(colorsIndex);
      expect(colorsIndex).toBeLessThan(rootIndex);
    });
  });

  describe("visitTokens", () => {
    it("should visit only token nodes", async () => {
      const doc = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const ast = createAST(doc);

      const tokens: string[] = [];
      visitTokens(ast, (token) => {
        tokens.push(token.path);
        return undefined;
      });

      expect(tokens).toContain("colors.primary");
      expect(tokens).toContain("colors.secondary");
      expect(tokens).toContain("spacing.small");
      expect(tokens).not.toContain("colors"); // Should not include groups
    });

    it("should provide token-specific properties", () => {
      const doc: TokenDocument = {
        primary: {
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            alpha: 1,
          },
          $type: "color",
        },
      };

      const ast = createAST(doc);

      visitTokens(ast, (token) => {
        expect(token.type).toBe("token");
        expect(token.typedValue?.$value).toEqual({
          colorSpace: "srgb",
          components: [0, 0.4, 0.8],
          alpha: 1,
        });
        expect(token.tokenType).toBe("color");
        return undefined;
      });
    });
  });

  describe("visitGroups", () => {
    it("should visit only group nodes", async () => {
      const doc = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const ast = createAST(doc);

      const groups: string[] = [];
      visitGroups(ast, (group) => {
        groups.push(group.path || "root");
        return undefined;
      });

      expect(groups).toContain("root");
      expect(groups).toContain("colors");
      expect(groups).toContain("spacing");
      expect(groups).not.toContain("colors.primary"); // Should not include tokens
    });

    it("should provide access to children", () => {
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
      };

      const ast = createAST(doc);

      visitGroups(ast, (group) => {
        if (group.name === "colors") {
          expect(group.tokens.size).toBe(2);
          expect(group.tokens.has("primary")).toBe(true);
          expect(group.tokens.has("secondary")).toBe(true);
        }
        return undefined;
      });
    });
  });

  describe("walkAST", () => {
    it("should walk the tree with enter and leave callbacks", () => {
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

      const ast = createAST(doc);
      const events: string[] = [];

      walkAST(ast, {
        enter(node) {
          events.push(`enter:${node.name}`);
          return undefined;
        },
        leave(node) {
          events.push(`leave:${node.name}`);
          return undefined;
        },
      });

      expect(events).toEqual([
        "enter:root",
        "enter:colors",
        "enter:primary",
        "leave:primary",
        "leave:colors",
        "leave:root",
      ]);
    });

    it("should skip subtree when enter returns false", () => {
      const doc: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc", $type: "color" },
          secondary: { $value: "#ff6600", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const ast = createAST(doc);
      const visited: string[] = [];

      walkAST(ast, {
        enter(node) {
          visited.push(node.name);
          if (node.name === "colors") return false; // Skip colors subtree
          return true;
        },
      });

      expect(visited).toContain("root");
      expect(visited).toContain("colors");
      expect(visited).not.toContain("primary");
      expect(visited).not.toContain("secondary");
      expect(visited).toContain("spacing");
      expect(visited).toContain("small");
    });
  });

  describe("findNode", () => {
    it("should find node by path", async () => {
      const doc = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const ast = createAST(doc);

      const node = findNode(ast, "colors.primary");
      expect(node).toBeDefined();
      expect(node?.type).toBe("token");
      expect(node?.name).toBe("primary");
    });

    it("should find node by predicate", () => {
      const doc: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc", $type: "color" },
          secondary: { $value: "#ff6600", $type: "color" },
        },
      };

      const ast = createAST(doc);

      const node = findNode(
        ast,
        (n) =>
          n.type === "token" &&
          (n as TokenNode).typedValue?.$value === "#ff6600",
      );

      expect(node).toBeDefined();
      expect(node?.name).toBe("secondary");
    });

    it("should return undefined for non-existent path", () => {
      const ast = createAST({});
      const node = findNode(ast, "does.not.exist");
      expect(node).toBeUndefined();
    });
  });

  describe("findAllNodes", () => {
    it("should find all nodes matching predicate", () => {
      const doc: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc", $type: "color" },
          secondary: { $value: "#ff6600", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const ast = createAST(doc);

      const colorTokens = findAllNodes(
        ast,
        (n) => n.type === "token" && (n as TokenNode).tokenType === "color",
      );

      expect(colorTokens).toHaveLength(2);
      expect(colorTokens.map((n) => n.name)).toContain("primary");
      expect(colorTokens.map((n) => n.name)).toContain("secondary");
    });

    it("should return empty array when no matches", () => {
      const ast = createAST({});
      const nodes = findAllNodes(ast, () => false);
      expect(nodes).toEqual([]);
    });
  });

  describe("getAncestors", () => {
    it("should return all ancestors of a node", () => {
      const doc: TokenDocument = {
        colors: {
          brand: {
            primary: { $value: "#0066cc", $type: "color" },
          },
        },
      };

      const ast = createAST(doc);
      const primary = findNode(ast, "colors.brand.primary");

      if (primary) {
        const ancestors = getAncestors(primary);
        expect(ancestors).toHaveLength(3);
        expect(ancestors[0]?.name).toBe("brand");
        expect(ancestors[1]?.name).toBe("colors");
        expect(ancestors[2]?.name).toBe("root");
      }
    });

    it("should return empty array for root node", () => {
      const ast = createAST({});
      const ancestors = getAncestors(ast);
      expect(ancestors).toEqual([]);
    });
  });

  describe("getSiblings", () => {
    it("should return sibling nodes", () => {
      const doc: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc", $type: "color" },
          secondary: { $value: "#ff6600", $type: "color" },
          tertiary: { $value: "#00ff00", $type: "color" },
        },
      };

      const ast = createAST(doc);
      const primary = findNode(ast, "colors.primary");

      if (primary) {
        const siblings = getSiblings(primary);
        expect(siblings).toHaveLength(2);
        expect(siblings.map((n) => n.name)).toContain("secondary");
        expect(siblings.map((n) => n.name)).toContain("tertiary");
        expect(siblings.map((n) => n.name)).not.toContain("primary");
      }
    });

    it("should return empty array for root node", () => {
      const ast = createAST({});
      const siblings = getSiblings(ast);
      expect(siblings).toEqual([]);
    });

    it("should include both groups and tokens as siblings", () => {
      const doc: TokenDocument = {
        baseColor: { $value: "#000000", $type: "color" },
        colors: {
          primary: { $value: "#0066cc", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const ast = createAST(doc);
      const colors = findNode(ast, "colors");

      if (colors) {
        const siblings = getSiblings(colors);
        expect(siblings).toHaveLength(2);
        expect(siblings.map((n) => n.name)).toContain("baseColor");
        expect(siblings.map((n) => n.name)).toContain("spacing");
      }
    });
  });
});
