/**
 * Additional tests for query functions to improve coverage
 */

import colorsBase from "@upft/fixtures/bundler-fixtures/input/colors-base.json" with {
  type: "json",
};
import { describe, expect, it } from "vitest";
import { findAllTokens, findTokensByType, getNode } from "./query.js";
import type { ProjectAST, TokenAST } from "./types.js";

describe("query - additional coverage", () => {
  function createTestProject(): ProjectAST {
    const file1: TokenAST = {
      type: "file",
      name: "colors",
      path: "/colors.json",
      filePath: "/colors.json",
      crossFileReferences: new Map(),
      children: new Map([
        [
          "primary",
          {
            type: "token",
            name: "primary",
            path: "primary",
            tokenType: "color",
            typedValue: colorsBase.color.primary,
            resolvedValue: colorsBase.color.primary,
            resolved: true,
            references: [],
          },
        ],
      ]),
      tokens: new Map([
        [
          "primary",
          {
            type: "token",
            name: "primary",
            path: "primary",
            tokenType: "color",
            typedValue: colorsBase.color.primary,
            resolvedValue: colorsBase.color.primary,
            resolved: true,
            references: [],
          },
        ],
      ]),
      groups: new Map(),
    };

    const file2: TokenAST = {
      type: "file",
      name: "typography",
      path: "/typography.json",
      filePath: "/typography.json",
      crossFileReferences: new Map(),
      children: new Map([
        [
          "heading",
          {
            type: "token",
            name: "heading",
            path: "heading",
            typedValue: { $type: "typography", $value: { fontSize: "24px" } },
            resolvedValue: {
              $type: "typography",
              $value: { fontSize: "24px" },
            },
            resolved: true,
            references: [],
          },
        ],
      ]),
      tokens: new Map([
        [
          "heading",
          {
            type: "token",
            name: "heading",
            path: "heading",
            typedValue: { $type: "typography", $value: { fontSize: "24px" } },
            resolvedValue: {
              $type: "typography",
              $value: { fontSize: "24px" },
            },
            resolved: true,
            references: [],
          },
        ],
      ]),
      groups: new Map(),
    };

    return {
      type: "project",
      name: "test",
      basePath: "/",
      files: new Map([
        ["colors.json", file1],
        ["typography.json", file2],
      ]),
      crossFileReferences: new Map(),
      dependencyGraph: new Map(),
      metadata: {
        totalFiles: 2,
        totalTokens: 2,
        hasCircularDependencies: false,
      },
    };
  }

  describe("getNode", () => {
    it("should find tokens by exact path", () => {
      const project = createTestProject();
      const file = project.files.get("colors.json");
      if (!file) throw new Error("colors.json not found");

      const node = getNode(file, "primary");
      expect(node).toBeDefined();
      expect(node?.type).toBe("token");
      expect(node?.name).toBe("primary");
    });

    it("should return undefined for non-existent path", () => {
      const project = createTestProject();
      const file = project.files.get("colors.json");
      if (!file) throw new Error("colors.json not found");

      const node = getNode(file, "nonexistent");
      expect(node).toBeUndefined();
    });
  });

  describe("findTokensByType", () => {
    it("should find tokens by type", () => {
      const project = createTestProject();
      const file = project.files.get("colors.json");
      if (!file) throw new Error("colors.json not found");

      const colorTokens = findTokensByType(file, "color");
      expect(colorTokens).toHaveLength(1);
      expect(colorTokens[0]?.typedValue?.$type).toBe("color");
    });

    it("should return empty array for non-existent type", () => {
      const project = createTestProject();
      const file = project.files.get("colors.json");
      if (!file) throw new Error("colors.json not found");

      const borderTokens = findTokensByType(file, "border");
      expect(borderTokens).toHaveLength(0);
    });
  });

  describe("findAllTokens", () => {
    it("should return all tokens from a file", () => {
      const project = createTestProject();
      const file = project.files.get("colors.json");
      if (!file) throw new Error("colors.json not found");

      const allTokens = findAllTokens(file);
      expect(allTokens).toHaveLength(1);
      expect(allTokens[0]?.name).toBe("primary");
    });

    it("should handle file with no tokens", () => {
      const emptyFile: TokenAST = {
        type: "file",
        name: "empty",
        path: "/empty.json",
        filePath: "/empty.json",
        crossFileReferences: new Map(),
        children: new Map(),
        tokens: new Map(),
        groups: new Map(),
      };

      const tokens = findAllTokens(emptyFile);
      expect(tokens).toHaveLength(0);
    });
  });
});
