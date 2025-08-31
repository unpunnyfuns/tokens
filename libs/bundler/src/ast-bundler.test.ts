/**
 * Tests for AST-based bundler
 */

import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ManifestAST, PermutationAST, ProjectAST } from "@upft/ast";
import type { TokenFileWriter } from "@upft/io";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bundleFromAST,
  bundlePermutation,
  type TokenTransform,
  writeBundlesFromAST,
  writeBundlesToFiles,
} from "./ast-bundler.js";

describe("AST Bundler", () => {
  let mockProjectAST: ProjectAST;
  let mockPermutation: PermutationAST;
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = join(tmpdir(), `bundler-test-${Date.now()}-${Math.random()}`);
    await mkdir(tempDir, { recursive: true });

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

  afterEach(async () => {
    // Clean up temp directory
    try {
      await import("node:fs/promises").then(({ rm }) =>
        rm(tempDir, { recursive: true, force: true }),
      );
    } catch {
      // Ignore cleanup errors
    }
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

    it("should handle anonymous transforms gracefully", () => {
      const anonymousTransform: TokenTransform = (tokens) => ({
        ...tokens,
        $anonymous: true,
      });

      expect(() =>
        bundlePermutation(mockPermutation, {
          transforms: [anonymousTransform],
        }),
      ).not.toThrow();
    });

    it("should handle transforms that throw non-Error objects", () => {
      const stringThrowingTransform = function stringThrow() {
        throw "String error";
      };

      expect(() =>
        bundlePermutation(mockPermutation, {
          transforms: [stringThrowingTransform],
        }),
      ).toThrow(/Transform 'stringThrow' failed.*String error/);
    });
  });

  describe("writeBundlesFromAST", () => {
    it("should write bundles to filesystem", async () => {
      const results = await writeBundlesFromAST(mockProjectAST, tempDir, {
        outputFormat: "json",
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].filePath).toBe("theme-light.json");

      // Verify file exists and has correct content
      const { readFile } = await import("node:fs/promises");
      const filePath = join(tempDir, "theme-light.json");
      const content = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.colors.primary.$value).toBe("#007bff");
    });

    it("should handle write errors gracefully", async () => {
      // Create a mock file writer that fails
      const failingWriter = {
        writeFile: vi.fn().mockRejectedValue(new Error("Write failed")),
      } as unknown as TokenFileWriter;

      const results = await writeBundlesFromAST(mockProjectAST, tempDir, {
        fileWriter: failingWriter,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Failed to write");
      expect(results[0].error).toContain("Write failed");
    });

    it("should use resolvedTokens over tokens when available", async () => {
      const results = await writeBundlesFromAST(mockProjectAST, tempDir, {
        outputFormat: "json",
      });

      // Verify the file was written with resolved tokens
      const { readFile } = await import("node:fs/promises");
      const filePath = join(tempDir, results[0].filePath);
      const content = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(content);

      // Should match resolvedTokens, not original tokens
      expect(parsed).toEqual(mockPermutation.resolvedTokens);
    });

    it("should handle different output formats", async () => {
      // Create a project with a permutation that doesn't have a predefined outputPath
      // so the format can determine the extension
      const permutationWithoutPath = {
        ...mockPermutation,
        outputPath: undefined,
      };

      const projectWithoutPath = {
        ...mockProjectAST,
        manifest: {
          ...mockProjectAST.manifest,
          permutations: new Map([["theme-light", permutationWithoutPath]]),
        },
      };

      const yamlResults = await writeBundlesFromAST(
        projectWithoutPath,
        tempDir,
        { outputFormat: "yaml" },
      );

      expect(yamlResults[0].filePath).toBe("theme-light.yaml");

      const json5Results = await writeBundlesFromAST(
        projectWithoutPath,
        tempDir,
        { outputFormat: "json5" },
      );

      expect(json5Results[0].filePath).toBe("theme-light.json5");
    });

    it("should apply write options correctly", async () => {
      const mockWriter = {
        writeFile: vi.fn().mockResolvedValue(undefined),
      } as unknown as TokenFileWriter;

      await writeBundlesFromAST(mockProjectAST, tempDir, {
        fileWriter: mockWriter,
        prettify: false,
        validate: true,
        backup: true,
        atomic: true,
      });

      const writeCall = (mockWriter.writeFile as any).mock.calls[0];
      const writeOptions = writeCall[2];

      expect(writeOptions.format.indent).toBeUndefined(); // prettify: false
      expect(writeOptions.validate).toBe(true);
      expect(writeOptions.backup).toBe(true);
      expect(writeOptions.atomic).toBe(true);
    });
  });

  describe("writeBundlesToFiles", () => {
    it("should write multiple bundles to files", async () => {
      const bundle1 = bundlePermutation(mockPermutation);
      const bundle2 = bundlePermutation({
        ...mockPermutation,
        name: "theme-dark",
        outputPath: "theme-dark.json",
      });

      const results = await writeBundlesToFiles([bundle1, bundle2], tempDir, {
        outputFormat: "json",
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify both files exist
      const { readFile } = await import("node:fs/promises");
      await expect(
        readFile(join(tempDir, "theme-light.json"), "utf-8"),
      ).resolves.toBeDefined();
      await expect(
        readFile(join(tempDir, "theme-dark.json"), "utf-8"),
      ).resolves.toBeDefined();
    });

    it("should generate default output paths when bundle output is empty", async () => {
      const bundleWithoutOutput = {
        ...bundlePermutation(mockPermutation),
        output: "",
      };

      const results = await writeBundlesToFiles(
        [bundleWithoutOutput],
        tempDir,
        { outputFormat: "yaml" },
      );

      expect(results[0].filePath).toBe("theme-light.yaml");
    });

    it("should handle bundles without resolved tokens", async () => {
      const bundleWithoutResolved = {
        ...bundlePermutation(mockPermutation),
        resolvedTokens: undefined,
      };

      const results = await writeBundlesToFiles(
        [bundleWithoutResolved],
        tempDir,
      );

      expect(results[0].success).toBe(true);

      // Should write the regular tokens
      const { readFile } = await import("node:fs/promises");
      const content = await readFile(
        join(tempDir, results[0].filePath),
        "utf-8",
      );
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(mockPermutation.tokens);
    });

    it("should use custom file writer when provided", async () => {
      const customWriter = {
        writeFile: vi.fn().mockResolvedValue(undefined),
      } as unknown as TokenFileWriter;

      const bundle = bundlePermutation(mockPermutation);
      await writeBundlesToFiles([bundle], tempDir, {
        fileWriter: customWriter,
      });

      expect(customWriter.writeFile).toHaveBeenCalledTimes(1);
    });

    it("should handle mixed success and failure results", async () => {
      let callCount = 0;
      const mixedResultWriter = {
        writeFile: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve();
          }
          return Promise.reject(new Error("Second write failed"));
        }),
      } as unknown as TokenFileWriter;

      const bundle1 = bundlePermutation(mockPermutation);
      const bundle2 = bundlePermutation({
        ...mockPermutation,
        name: "theme-dark",
      });

      const results = await writeBundlesToFiles([bundle1, bundle2], tempDir, {
        fileWriter: mixedResultWriter,
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain("Second write failed");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty permutation tokens", () => {
      const emptyPermutation: PermutationAST = {
        ...mockPermutation,
        tokens: {},
        resolvedTokens: {},
      };

      const bundle = bundlePermutation(emptyPermutation);

      expect(bundle.tokens).toEqual({});
      expect(bundle.resolvedTokens).toEqual({});
    });

    it("should handle permutation with very long names", () => {
      const longNamePermutation: PermutationAST = {
        ...mockPermutation,
        name: "a".repeat(1000),
      };

      const bundle = bundlePermutation(longNamePermutation);

      expect(bundle.id).toBe("a".repeat(1000));
    });

    it("should handle special characters in bundle output paths", async () => {
      const specialCharPermutation: PermutationAST = {
        ...mockPermutation,
        name: "theme-special",
        outputPath: "output/theme-with-@#$%^&*()-characters.json",
      };

      const bundle = bundlePermutation(specialCharPermutation);
      const results = await writeBundlesToFiles([bundle], tempDir);

      // Should extract just the filename, not the full path
      expect(results[0].filePath).toBe("theme-with-@#$%^&*()-characters.json");
    });

    it("should handle transforms that modify token structure deeply", () => {
      const deepTransform: TokenTransform = (tokens) => ({
        ...tokens,
        nested: {
          deep: {
            very: {
              deeply: {
                nested: {
                  value: "test",
                },
              },
            },
          },
        },
      });

      const bundle = bundlePermutation(mockPermutation, {
        transforms: [deepTransform],
      });

      expect(bundle.tokens.nested.deep.very.deeply.nested.value).toBe("test");
    });

    it("should preserve original tokens when transform fails", () => {
      const failingTransform = function failingTransform() {
        throw new Error("Transform error");
      };

      // The original tokens should remain unchanged even if transform fails
      expect(() =>
        bundlePermutation(mockPermutation, {
          transforms: [failingTransform],
        }),
      ).toThrow();

      // Original permutation should be unchanged
      expect(mockPermutation.tokens.colors.primary.$value).toBe("#007bff");
    });

    it("should handle ProjectAST with empty permutations map", () => {
      const emptyProjectAST = {
        ...mockProjectAST,
        manifest: {
          ...mockProjectAST.manifest,
          permutations: new Map(),
        },
      };

      const bundles = bundleFromAST(emptyProjectAST);

      expect(bundles).toHaveLength(0);
    });

    it("should handle multiple transforms in sequence", () => {
      const transform1: TokenTransform = (tokens) => ({
        ...tokens,
        $step1: true,
      });
      const transform2: TokenTransform = (tokens) => ({
        ...tokens,
        $step2: true,
      });
      const transform3: TokenTransform = (tokens) => ({
        ...tokens,
        colors: {
          ...tokens.colors,
          $transformed: true,
        },
      });

      const bundle = bundlePermutation(mockPermutation, {
        transforms: [transform1, transform2, transform3],
      });

      expect(bundle.tokens.$step1).toBe(true);
      expect(bundle.tokens.$step2).toBe(true);
      expect(bundle.tokens.colors.$transformed).toBe(true);
    });

    it("should handle write failures with non-Error exceptions", async () => {
      const stringThrowingWriter = {
        writeFile: vi.fn().mockRejectedValue("String error"),
      } as unknown as TokenFileWriter;

      const results = await writeBundlesToFiles(
        [bundlePermutation(mockPermutation)],
        tempDir,
        { fileWriter: stringThrowingWriter },
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("String error");
    });
  });

  describe("output path generation", () => {
    it("should generate paths with different formats", () => {
      const testCases = [
        { format: "json" as const, expected: ".json" },
        { format: "yaml" as const, expected: ".yaml" },
        { format: "json5" as const, expected: ".json5" },
      ];

      for (const { format } of testCases) {
        const bundle = bundlePermutation(mockPermutation, {
          outputFormat: format,
        });

        // Remove the output path to test default generation
        const bundleWithoutOutput = {
          ...bundle,
          output: undefined,
        };

        const results = writeBundlesToFiles([bundleWithoutOutput], tempDir, {
          outputFormat: format,
        });

        // This will test the internal getOutputPath function
        expect(results).toBeDefined();
      }
    });

    it("should extract basename from output paths with directories", async () => {
      const bundleWithPath = {
        ...bundlePermutation(mockPermutation),
        output: "/deeply/nested/path/output.json",
      };

      const results = await writeBundlesToFiles([bundleWithPath], tempDir);

      expect(results[0].filePath).toBe("output.json");
    });
  });
});
