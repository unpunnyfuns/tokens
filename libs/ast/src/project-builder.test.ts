/**
 * Tests for project-level AST utilities (pure functions only)
 */

import { describe, expect, it } from "vitest";
import {
  buildCrossFileReferences,
  buildDependencyGraph,
  detectCircularDependencies,
  getResolutionOrder,
} from "./project-builder.js";
import type { CrossFileReference, ProjectAST, TokenAST } from "./types.js";

describe("project-builder", () => {
  // Helper to create minimal ProjectAST for testing
  function createTestProjectAST(): ProjectAST {
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

    return {
      type: "project",
      name: "test-project",
      basePath: "/test",
      files: new Map([
        ["fileA.json", fileA],
        ["fileB.json", fileB],
      ]),
      crossFileReferences: new Map(),
      dependencyGraph: new Map(),
      metadata: {
        totalFiles: 2,
        totalTokens: 0,
        hasCircularDependencies: false,
      },
    };
  }

  describe("buildCrossFileReferences", () => {
    it("should initialize empty cross-file references", () => {
      const project = createTestProjectAST();

      buildCrossFileReferences(project);

      // Should have initialized entries for all files
      expect(project.crossFileReferences.size).toBe(0); // No actual references
    });
  });

  describe("buildDependencyGraph", () => {
    it("should initialize dependency graph", () => {
      const project = createTestProjectAST();

      buildDependencyGraph(project);

      // Should create dependency nodes for all files
      expect(project.dependencyGraph.size).toBe(2);
      expect(project.dependencyGraph.has("fileA.json")).toBe(true);
      expect(project.dependencyGraph.has("fileB.json")).toBe(true);
    });

    it("should build dependencies from cross-file references", () => {
      const project = createTestProjectAST();

      // Add a cross-file reference from fileA to fileB
      const crossRef: CrossFileReference = {
        fromToken: "colors.primary",
        toFile: "fileB.json",
        toToken: "base.red",
        reference: "./fileB.json#base.red",
        resolved: false,
      };

      project.crossFileReferences.set("fileA.json", [crossRef]);

      buildDependencyGraph(project);

      const fileADeps = project.dependencyGraph.get("fileA.json");
      expect(fileADeps).toBeDefined();
      expect(fileADeps?.has("fileB.json")).toBe(true);
    });
  });

  describe("getResolutionOrder", () => {
    it("should return files in dependency order", () => {
      const project = createTestProjectAST();

      // Set up dependency: fileA depends on fileB
      project.dependencyGraph.set("fileA.json", new Set(["fileB.json"]));
      project.dependencyGraph.set("fileB.json", new Set());

      const order = getResolutionOrder(project);

      expect(order).toHaveLength(2);
      expect(order.indexOf("fileB.json")).toBeLessThan(
        order.indexOf("fileA.json"),
      );
    });

    it("should handle files with no dependencies", () => {
      const project = createTestProjectAST();

      project.dependencyGraph.set("fileA.json", new Set());
      project.dependencyGraph.set("fileB.json", new Set());

      const order = getResolutionOrder(project);

      expect(order).toHaveLength(2);
      expect(order).toContain("fileA.json");
      expect(order).toContain("fileB.json");
    });
  });

  describe("detectCircularDependencies", () => {
    it("should detect no cycles in acyclic graph", () => {
      const project = createTestProjectAST();

      // fileA -> fileB (no cycle)
      project.dependencyGraph.set("fileA.json", new Set(["fileB.json"]));
      project.dependencyGraph.set("fileB.json", new Set());

      const cycles = detectCircularDependencies(project);

      expect(cycles).toHaveLength(0);
    });

    it("should detect simple cycle", () => {
      const project = createTestProjectAST();

      // Create cycle: fileA -> fileB -> fileA
      project.dependencyGraph.set("fileA.json", new Set(["fileB.json"]));
      project.dependencyGraph.set("fileB.json", new Set(["fileA.json"]));

      const cycles = detectCircularDependencies(project);

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toBeDefined();
      expect(cycles[0]?.length).toBeGreaterThan(2); // Cycle + repeated node
    });

    it("should handle complex dependency graph", () => {
      const project = createTestProjectAST();

      // Add third file
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

      project.files.set("fileC.json", fileC);

      // Complex graph with no cycles: A -> B, A -> C, B -> C
      project.dependencyGraph.set(
        "fileA.json",
        new Set(["fileB.json", "fileC.json"]),
      );
      project.dependencyGraph.set("fileB.json", new Set(["fileC.json"]));
      project.dependencyGraph.set("fileC.json", new Set());

      const cycles = detectCircularDependencies(project);

      expect(cycles).toHaveLength(0);
    });
  });
});
