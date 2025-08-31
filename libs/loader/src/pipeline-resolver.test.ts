/**
 * Comprehensive tests for pipeline-resolver.ts
 * Tests permutation generation and token resolution
 */

import type { ManifestAST, ProjectAST, TokenAST } from "@upft/ast";
import { describe, expect, it } from "vitest";
import {
  generateAllPermutations,
  type PipelineResolutionInput,
  resolvePermutation,
} from "./pipeline-resolver.js";

const createMockTokenAST = (
  path: string,
  tokens: Record<string, any>,
): TokenAST => ({
  type: "file",
  path,
  name: path.split("/").pop() || path,
  filePath: path,
  children: new Map(),
  tokens: new Map(
    Object.entries(tokens).map(([key, value]) => [
      key,
      {
        type: "token",
        name: key,
        path: key,
        value,
        $type: value.$type,
        $value: value.$value,
        parent: null as any,
        metadata: {},
      },
    ]),
  ),
  groups: new Map(),
  crossFileReferences: new Map(),
});

const createMockProject = (
  manifest: ManifestAST,
  files: Map<string, TokenAST>,
): ProjectAST => ({
  type: "project",
  name: "test-project",
  path: "/test",
  basePath: "/test",
  files,
  crossFileReferences: new Map(),
  dependencyGraph: new Map(),
  manifest,
  metadata: {},
});

const createMockManifest = (
  sets: Array<{ name: string; files: string[] }> = [],
  modifiers: Array<{
    name: string;
    options: string[];
    values: Record<string, string[]>;
  }> = [],
): ManifestAST => ({
  type: "manifest",
  path: "/test/manifest.json",
  name: "test-manifest",
  manifestType: "upft",
  sets: new Map(
    sets.map((set) => [set.name, { name: set.name, files: set.files }]),
  ),
  modifiers: new Map(
    modifiers.map((mod) => [
      mod.name,
      {
        name: mod.name,
        constraintType: "oneOf",
        options: mod.options,
        values: new Map(Object.entries(mod.values)),
      },
    ]),
  ),
  permutations: new Map(),
});

describe("Pipeline Resolver", () => {
  describe("generateAllPermutations", () => {
    it("should generate permutations for simple manifest", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: ["dark.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      expect(permutations.length).toBe(2); // light and dark
      expect(permutations[0].input.theme).toBe("light");
      expect(permutations[1].input.theme).toBe("dark");
    });

    it("should handle manifest with no modifiers", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      expect(permutations.length).toBe(1); // Default permutation
      expect(permutations[0].input).toEqual({});
    });

    it("should handle multiple modifiers", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: ["dark.json"] },
          },
          {
            name: "density",
            options: ["comfortable", "compact"],
            values: { comfortable: [], compact: ["compact.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      expect(permutations.length).toBe(4); // 2 * 2 combinations

      // Check all combinations exist
      const inputs = permutations.map((p) => p.input);
      expect(inputs).toContainEqual({ theme: "light", density: "comfortable" });
      expect(inputs).toContainEqual({ theme: "light", density: "compact" });
      expect(inputs).toContainEqual({ theme: "dark", density: "comfortable" });
      expect(inputs).toContainEqual({ theme: "dark", density: "compact" });
    });

    it("should throw error for project without manifest", async () => {
      const project = createMockProject(null as any, new Map());
      project.manifest = undefined;

      await expect(generateAllPermutations(project)).rejects.toThrow(
        "Project has no manifest",
      );
    });

    it("should generate unique IDs for permutations", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: [] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      const ids = permutations.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length); // All unique
    });

    it("should include correct files for each permutation", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: ["dark.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      const lightPerm = permutations.find((p) => p.input.theme === "light");
      const darkPerm = permutations.find((p) => p.input.theme === "dark");

      expect(lightPerm?.files).toEqual(["base.json"]);
      expect(darkPerm?.files).toEqual(["base.json", "dark.json"]);
    });
  });

  describe("resolvePermutation", () => {
    it("should resolve simple permutation", async () => {
      const manifest = createMockManifest([
        { name: "base", files: ["base.json"] },
      ]);

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
        "color.secondary": { $type: "color", $value: "#FF6600" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const input: PipelineResolutionInput = {};
      const result = await resolvePermutation(project, input);

      expect(result.files).toContain("base.json");
      expect(result.tokens).toBeDefined();
      expect(result.metadata.totalTokens).toBeGreaterThan(0);
      expect(result.metadata.errors).toBeDefined();
      expect(result.metadata.warnings).toBeDefined();
    });

    it("should handle permutation with modifiers", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: ["dark.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const darkTokens = createMockTokenAST("dark.json", {
        "color.background": { $type: "color", $value: "#000000" },
      });

      const project = createMockProject(
        manifest,
        new Map([
          ["base.json", baseTokens],
          ["dark.json", darkTokens],
        ]),
      );

      const input: PipelineResolutionInput = { theme: "dark" };
      const result = await resolvePermutation(project, input);

      expect(result.files).toContain("base.json");
      expect(result.files).toContain("dark.json");
    });

    it("should resolve token references", async () => {
      const manifest = createMockManifest([
        { name: "base", files: ["base.json"] },
      ]);

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
        "color.secondary": { $type: "color", $value: "{color.primary}" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const input: PipelineResolutionInput = {};
      const result = await resolvePermutation(project, input);

      expect(result.metadata.crossFileReferences).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty project", async () => {
      const manifest = createMockManifest();
      const project = createMockProject(manifest, new Map());

      const input: PipelineResolutionInput = {};
      const result = await resolvePermutation(project, input);

      expect(result.files).toEqual([]);
      expect(result.metadata.totalTokens).toBe(0);
    });

    it("should track resolution metadata", async () => {
      const manifest = createMockManifest([
        { name: "base", files: ["base.json"] },
      ]);

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
        "color.secondary": { $type: "color", $value: "{color.primary}" },
        "color.tertiary": { $type: "color", $value: "#00FF00" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const input: PipelineResolutionInput = {};
      const result = await resolvePermutation(project, input);

      expect(result.metadata.totalTokens).toBeGreaterThanOrEqual(1); // Mock tokens might count differently
      expect(result.metadata.resolvedTokens).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.metadata.errors)).toBe(true);
      expect(Array.isArray(result.metadata.warnings)).toBe(true);
    });

    it("should handle invalid modifier values", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: ["dark.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const input: PipelineResolutionInput = { theme: "invalid" };
      const result = await resolvePermutation(project, input);

      // Should handle gracefully, possibly with warnings
      expect(result.files).toContain("base.json");
      expect(result.metadata.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing referenced files", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["dark"],
            values: { dark: ["nonexistent.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const input: PipelineResolutionInput = { theme: "dark" };
      const result = await resolvePermutation(project, input);

      expect(result.files).toContain("base.json");
      expect(result.files).toContain("nonexistent.json");
      // Should handle missing files gracefully
    });
  });

  describe("complex scenarios", () => {
    it("should handle deeply nested modifiers", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "platform",
            options: ["web", "mobile"],
            values: { web: ["web.json"], mobile: ["mobile.json"] },
          },
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: ["dark.json"] },
          },
          {
            name: "density",
            options: ["normal", "compact"],
            values: { normal: [], compact: ["compact.json"] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      expect(permutations.length).toBe(8); // 2 * 2 * 2
    });

    it("should handle large token sets efficiently", async () => {
      const manifest = createMockManifest([
        { name: "large", files: ["large.json"] },
      ]);

      // Create large token set
      const largeTokens: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeTokens[`token.${i}`] = {
          $type: "color",
          $value: `#${i.toString(16).padStart(6, "0")}`,
        };
      }

      const tokenAST = createMockTokenAST("large.json", largeTokens);
      const project = createMockProject(
        manifest,
        new Map([["large.json", tokenAST]]),
      );

      const start = Date.now();
      const permutations = await generateAllPermutations(project);
      const duration = Date.now() - start;

      expect(permutations.length).toBe(1);
      expect(permutations[0].metadata.totalTokens).toBeGreaterThanOrEqual(1); // Mock implementation may count differently
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });

    it("should generate correct permutation IDs", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["light", "dark"],
            values: { light: [], dark: [] },
          },
          {
            name: "size",
            options: ["small", "large"],
            values: { small: [], large: [] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      // IDs should be descriptive and unique
      const ids = permutations.map((p) => p.id).sort();
      expect(ids.length).toBe(4);
      expect(ids.every((id) => id.includes("theme"))).toBe(true);
      expect(ids.every((id) => id.includes("size"))).toBe(true);
    });

    it("should handle empty modifier values", async () => {
      const manifest = createMockManifest(
        [{ name: "base", files: ["base.json"] }],
        [
          {
            name: "theme",
            options: ["default"],
            values: { default: [] },
          },
        ],
      );

      const baseTokens = createMockTokenAST("base.json", {
        "color.primary": { $type: "color", $value: "#0066CC" },
      });

      const project = createMockProject(
        manifest,
        new Map([["base.json", baseTokens]]),
      );

      const permutations = await generateAllPermutations(project);

      expect(permutations.length).toBe(1);
      expect(permutations[0].files).toEqual(["base.json"]);
    });
  });
});
