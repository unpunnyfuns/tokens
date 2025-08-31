/**
 * Tests for AST-based bundler
 */

import type { ManifestAST, PermutationAST, ProjectAST } from "@upft/ast";
import { beforeEach, describe, expect, it } from "vitest";
import { bundleFromAST, bundlePermutation } from "./ast-bundler.js";

describe("AST Bundler", () => {
  let mockProjectAST: ProjectAST;
  let mockPermutation: PermutationAST;

  beforeEach(() => {
    // Create mock permutation
    mockPermutation = {
      type: "group",
      name: "theme-light",
      path: "/test/manifest.json.permutations.theme-light",
      input: { theme: "light" },
      resolvedFiles: ["colors.json", "spacing.json"],
      tokens: {
        colors: {
          primary: {
            $value: "#007bff",
            $type: "color",
          },
        },
      },
      resolvedTokens: {
        colors: {
          primary: {
            $value: "#007bff",
            $type: "color",
          },
        },
      },
      outputPath: "theme-light.json",
    } as PermutationAST;

    // Create mock manifest
    const mockManifest: ManifestAST = {
      type: "manifest",
      name: "test-manifest",
      path: "/test/manifest.json",
      manifestType: "upft",
      sets: new Map(),
      modifiers: new Map(),
      permutations: new Map([["theme-light", mockPermutation]]),
    } as ManifestAST;

    // Create mock project AST
    mockProjectAST = {
      type: "project",
      name: "test-project",
      path: "/test",
      files: new Map(),
      manifest: mockManifest,
      crossFileReferences: new Map(),
      dependencyGraph: new Map(),
      basePath: "/test",
    } as ProjectAST;
  });

  describe("bundleFromAST", () => {
    it("should generate bundles from ProjectAST", () => {
      const bundles = bundleFromAST(mockProjectAST);

      expect(bundles).toHaveLength(1);

      const bundle = bundles[0];
      expect(bundle.id).toBe("theme-light");
      expect(bundle.tokens).toEqual(mockPermutation.tokens);
      expect(bundle.resolvedTokens).toEqual(mockPermutation.resolvedTokens);
      expect(bundle.files).toEqual(["colors.json", "spacing.json"]);
      expect(bundle.output).toBe("theme-light.json");
      expect(bundle.format).toBe("json");
    });

    it("should apply transforms to tokens", () => {
      const addMetaTransform = (tokens: any) => ({
        ...tokens,
        $meta: { bundled: true },
      });

      const bundles = bundleFromAST(mockProjectAST, {
        transforms: [addMetaTransform],
      });

      expect(bundles[0].tokens).toHaveProperty("$meta");
      expect(bundles[0].tokens.$meta).toEqual({ bundled: true });
    });

    it("should handle different output formats", () => {
      const bundles = bundleFromAST(mockProjectAST, {
        outputFormat: "yaml",
      });

      expect(bundles[0].format).toBe("yaml");
    });

    it("should throw error if ProjectAST has no manifest", () => {
      const projectWithoutManifest = {
        ...mockProjectAST,
        manifest: undefined,
      };

      expect(() => bundleFromAST(projectWithoutManifest)).toThrow(
        "ProjectAST must contain a manifest to generate bundles",
      );
    });

    it("should handle transform errors gracefully", () => {
      const failingTransform = function failingTransform() {
        throw new Error("Transform failed");
      };

      expect(() =>
        bundleFromAST(mockProjectAST, {
          transforms: [failingTransform],
        }),
      ).toThrow(
        /Transform 'failingTransform.*' failed for permutation 'theme-light': Transform failed/,
      );
    });
  });

  describe("bundlePermutation", () => {
    it("should generate bundle from single permutation", () => {
      const bundle = bundlePermutation(mockPermutation);

      expect(bundle.id).toBe("theme-light");
      expect(bundle.tokens).toEqual(mockPermutation.tokens);
      expect(bundle.resolvedTokens).toEqual(mockPermutation.resolvedTokens);
      expect(bundle.files).toEqual(["colors.json", "spacing.json"]);
      expect(bundle.output).toBe("theme-light.json");
      expect(bundle.format).toBe("json");
    });

    it("should use tokens if resolvedTokens not available", () => {
      const permutationWithoutResolved = {
        ...mockPermutation,
        resolvedTokens: undefined,
      };

      const bundle = bundlePermutation(permutationWithoutResolved);

      expect(bundle.tokens).toEqual(mockPermutation.tokens);
      expect(bundle.resolvedTokens).toBeUndefined();
    });

    it("should handle permutations without outputPath", () => {
      const permutationWithoutOutput = {
        ...mockPermutation,
        outputPath: undefined,
      };

      const bundle = bundlePermutation(permutationWithoutOutput);

      expect(bundle.output).toBeUndefined();
    });
  });
});
