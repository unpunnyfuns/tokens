/**
 * Additional tests for project-builder functions to improve coverage
 */

import { describe, expect, it } from "vitest";
import {
  buildCrossFileReferences,
  buildDependencyGraph,
  detectCircularDependencies,
  getResolutionOrder,
} from "./project-builder.js";
import type { ProjectAST, TokenAST } from "./types.js";

describe("project-builder - additional coverage", () => {
  function createComplexProject(): ProjectAST {
    const fileA: TokenAST = {
      type: "file",
      name: "fileA",
      path: "/test/fileA.json",
      filePath: "/test/fileA.json",
      crossFileReferences: new Map(),
      children: new Map(),
      tokens: new Map(),
      groups: new Map(),
    };

    const fileB: TokenAST = {
      type: "file",
      name: "fileB",
      path: "/test/fileB.json",
      filePath: "/test/fileB.json",
      crossFileReferences: new Map(),
      children: new Map(),
      tokens: new Map(),
      groups: new Map(),
    };

    const fileC: TokenAST = {
      type: "file",
      name: "fileC",
      path: "/test/fileC.json",
      filePath: "/test/fileC.json",
      crossFileReferences: new Map(),
      children: new Map(),
      tokens: new Map(),
      groups: new Map(),
    };

    return {
      type: "project",
      name: "test-project",
      basePath: "/test",
      files: new Map([
        ["fileA.json", fileA],
        ["fileB.json", fileB],
        ["fileC.json", fileC],
      ]),
      crossFileReferences: new Map(),
      dependencyGraph: new Map(),
      metadata: {
        totalFiles: 3,
        totalTokens: 0,
        hasCircularDependencies: false,
      },
    };
  }

  describe("buildCrossFileReferences", () => {
    it("should handle project with existing cross-file references", () => {
      const project = createComplexProject();

      // Add some cross-file references manually
      project.crossFileReferences.set("fileA.json", [
        {
          fromToken: "colors.primary",
          toFile: "fileB.json",
          toToken: "base.red",
          reference: "./fileB.json#base.red",
          resolved: true,
        },
      ]);

      buildCrossFileReferences(project);

      // Should preserve existing references
      expect(project.crossFileReferences.size).toBe(1);
    });
  });

  describe("buildDependencyGraph - edge cases", () => {
    it("should handle multiple dependencies from one file", () => {
      const project = createComplexProject();

      // File A depends on both B and C
      project.crossFileReferences.set("fileA.json", [
        {
          fromToken: "colors.primary",
          toFile: "fileB.json",
          toToken: "base.red",
          reference: "./fileB.json#base.red",
          resolved: false,
        },
        {
          fromToken: "colors.secondary",
          toFile: "fileC.json",
          toToken: "base.blue",
          reference: "./fileC.json#base.blue",
          resolved: false,
        },
      ]);

      buildDependencyGraph(project);

      const fileADeps = project.dependencyGraph.get("fileA.json");
      expect(fileADeps?.size).toBe(2);
      expect(fileADeps?.has("fileB.json")).toBe(true);
      expect(fileADeps?.has("fileC.json")).toBe(true);
    });

    it("should handle files with no dependencies", () => {
      const project = createComplexProject();

      buildDependencyGraph(project);

      // All files should have empty dependency sets
      for (const [_fileName, deps] of project.dependencyGraph) {
        expect(deps.size).toBe(0);
      }
      expect(project.dependencyGraph.size).toBe(3);
    });
  });

  describe("getResolutionOrder - complex scenarios", () => {
    it("should handle chain dependencies", () => {
      const project = createComplexProject();

      // Chain: A -> B -> C
      project.dependencyGraph.set("fileA.json", new Set(["fileB.json"]));
      project.dependencyGraph.set("fileB.json", new Set(["fileC.json"]));
      project.dependencyGraph.set("fileC.json", new Set());

      const order = getResolutionOrder(project);

      expect(order).toHaveLength(3);
      expect(order.indexOf("fileC.json")).toBeLessThan(
        order.indexOf("fileB.json"),
      );
      expect(order.indexOf("fileB.json")).toBeLessThan(
        order.indexOf("fileA.json"),
      );
    });

    it("should handle diamond dependencies", () => {
      const project = createComplexProject();

      // Diamond: A -> B, A -> C, B -> C, C has no deps
      project.dependencyGraph.set(
        "fileA.json",
        new Set(["fileB.json", "fileC.json"]),
      );
      project.dependencyGraph.set("fileB.json", new Set(["fileC.json"]));
      project.dependencyGraph.set("fileC.json", new Set());

      const order = getResolutionOrder(project);

      expect(order).toHaveLength(3);
      expect(order.indexOf("fileC.json")).toBe(0); // C should be first
      expect(order.indexOf("fileB.json")).toBeLessThan(
        order.indexOf("fileA.json"),
      );
    });
  });

  describe("detectCircularDependencies - edge cases", () => {
    it("should detect self-dependency", () => {
      const project = createComplexProject();

      // File A depends on itself
      project.dependencyGraph.set("fileA.json", new Set(["fileA.json"]));
      project.dependencyGraph.set("fileB.json", new Set());
      project.dependencyGraph.set("fileC.json", new Set());

      const cycles = detectCircularDependencies(project);

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain("fileA.json");
    });

    it("should detect longer cycle", () => {
      const project = createComplexProject();

      // A -> B -> C -> A (3-node cycle)
      project.dependencyGraph.set("fileA.json", new Set(["fileB.json"]));
      project.dependencyGraph.set("fileB.json", new Set(["fileC.json"]));
      project.dependencyGraph.set("fileC.json", new Set(["fileA.json"]));

      const cycles = detectCircularDependencies(project);

      expect(cycles).toHaveLength(1);
      expect(cycles[0]?.length).toBeGreaterThan(3); // Cycle + one repeated node
      expect(cycles[0]).toContain("fileA.json");
      expect(cycles[0]).toContain("fileB.json");
      expect(cycles[0]).toContain("fileC.json");
    });

    it("should handle disconnected components", () => {
      const project = createComplexProject();

      // A -> B (no cycle), C isolated
      project.dependencyGraph.set("fileA.json", new Set(["fileB.json"]));
      project.dependencyGraph.set("fileB.json", new Set());
      project.dependencyGraph.set("fileC.json", new Set());

      const cycles = detectCircularDependencies(project);

      expect(cycles).toHaveLength(0);
    });
  });
});
