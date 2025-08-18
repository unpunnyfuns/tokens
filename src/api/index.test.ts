import { beforeEach, describe, expect, it, vi } from "vitest";
import * as astBuilder from "../ast/ast-builder.js";
import { TokenFileWriter } from "../io/file-writer.js";
import { resolvePermutation } from "../manifest/manifest-core.js";
import { readManifest } from "../manifest/manifest-reader.js";
import * as validation from "../validation/index.js";
import * as bundleHelpers from "./bundle-helpers.js";
import {
  bundleWithMetadata,
  formatError,
  validateManifestWithPermutations,
} from "./index.js";

// Mock dependencies
vi.mock("../io/file-writer.js");
vi.mock("../manifest/manifest-reader.js");
vi.mock("../manifest/manifest-core.js");
vi.mock("../validation/index.js", () => ({
  validateTokens: vi.fn(),
  validateManifest: vi.fn(),
}));
vi.mock("./bundle-helpers.js", () => ({
  buildModifiers: vi.fn(),
  loadFromManifest: vi.fn(),
  loadFromFiles: vi.fn(),
  createBundleMetadata: vi.fn(),
  createValidationFunction: vi.fn(),
  extractASTInfo: vi.fn(),
}));
vi.mock("../ast/ast-builder.js", () => ({
  createAST: vi.fn(),
}));

describe("API Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bundleWithMetadata", () => {
    const mockTokens = {
      color: {
        primary: { $value: "#007acc", $type: "color" },
      },
    };

    const mockAST = {
      type: "document",
      children: [],
    };

    it("should bundle tokens from files", async () => {
      const mockWriteFile = vi.fn().mockResolvedValue(undefined);
      (TokenFileWriter as any).mockImplementation(() => ({
        writeFile: mockWriteFile,
      }));

      (bundleHelpers.loadFromFiles as any).mockResolvedValue({
        tokens: mockTokens,
        filePaths: ["file1.json", "file2.json"],
      });

      (astBuilder.createAST as any).mockReturnValue(mockAST);

      const mockValidate = vi.fn().mockReturnValue({ valid: true, errors: [] });
      (bundleHelpers.createValidationFunction as any).mockReturnValue(
        mockValidate,
      );

      const mockASTInfo = { nodeCount: 5 };
      (bundleHelpers.extractASTInfo as any).mockReturnValue(mockASTInfo);

      const result = await bundleWithMetadata({
        files: ["file1.json", "file2.json"],
      });

      expect(bundleHelpers.loadFromFiles).toHaveBeenCalledWith([
        "file1.json",
        "file2.json",
      ]);
      expect(astBuilder.createAST).toHaveBeenCalledWith(mockTokens);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.validate).toBe(mockValidate);

      // Test write function
      await result.write("output.json");
      expect(mockWriteFile).toHaveBeenCalledWith("output.json", mockTokens, {
        format: {
          type: "json",
          sortKeys: false,
        },
      });

      // Test getAST function
      const astInfo = result.getAST();
      expect(astInfo).toBe(mockASTInfo);
    });

    it("should bundle tokens from manifest", async () => {
      const mockModifiers = { theme: "dark" };

      (bundleHelpers.buildModifiers as any).mockReturnValue(mockModifiers);
      (bundleHelpers.loadFromManifest as any).mockResolvedValue({
        tokens: mockTokens,
        filePaths: ["manifest-file.json"],
      });

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (bundleHelpers.createValidationFunction as any).mockReturnValue(() => ({
        valid: true,
      }));
      (bundleHelpers.extractASTInfo as any).mockReturnValue({});

      const result = await bundleWithMetadata({
        manifest: "manifest.json",
        modifiers: { theme: "dark" },
      });

      expect(bundleHelpers.buildModifiers).toHaveBeenCalledWith({
        manifest: "manifest.json",
        modifiers: { theme: "dark" },
      });
      expect(bundleHelpers.loadFromManifest).toHaveBeenCalledWith(
        "manifest.json",
        mockModifiers,
      );
      expect(result.tokens).toEqual(mockTokens);
    });

    it("should include metadata when requested", async () => {
      const mockMetadata = {
        bundleTime: Date.now(),
        fileCount: 2,
      };

      (bundleHelpers.loadFromFiles as any).mockResolvedValue({
        tokens: mockTokens,
        filePaths: ["file1.json"],
      });

      (bundleHelpers.createBundleMetadata as any).mockReturnValue(mockMetadata);
      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (bundleHelpers.createValidationFunction as any).mockReturnValue(() => ({
        valid: true,
      }));
      (bundleHelpers.extractASTInfo as any).mockReturnValue({});

      const result = await bundleWithMetadata({
        files: ["file1.json"],
        includeMetadata: true,
      });

      expect(bundleHelpers.createBundleMetadata).toHaveBeenCalled();
      expect(result.metadata).toEqual(mockMetadata);
    });

    it("should handle custom format option", async () => {
      const mockWriteFile = vi.fn().mockResolvedValue(undefined);
      (TokenFileWriter as any).mockImplementation(() => ({
        writeFile: mockWriteFile,
      }));

      (bundleHelpers.loadFromFiles as any).mockResolvedValue({
        tokens: mockTokens,
        filePaths: ["file1.json"],
      });

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (bundleHelpers.createValidationFunction as any).mockReturnValue(() => ({
        valid: true,
      }));
      (bundleHelpers.extractASTInfo as any).mockReturnValue({});

      const result = await bundleWithMetadata({
        files: ["file1.json"],
        format: "yaml",
      });

      await result.write("output.yaml");
      expect(mockWriteFile).toHaveBeenCalledWith("output.yaml", mockTokens, {
        format: {
          type: "yaml",
          sortKeys: false,
        },
      });
    });

    it("should handle empty options", async () => {
      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (bundleHelpers.createValidationFunction as any).mockReturnValue(() => ({
        valid: true,
      }));
      (bundleHelpers.extractASTInfo as any).mockReturnValue({});

      const result = await bundleWithMetadata({});

      expect(result.tokens).toEqual({});
    });
  });

  describe("formatError", () => {
    it("should format Error objects with message only", () => {
      const error = new Error("Test error");
      const result = formatError(error);
      expect(result).toBe("Test error");
    });

    it("should format Error objects with stack in verbose mode", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:10";
      const result = formatError(error, true);
      expect(result).toContain("Test error");
      expect(result).toContain("at test.js:10");
    });

    it("should handle non-Error objects", () => {
      expect(formatError("string error")).toBe("string error");
      expect(formatError(123)).toBe("123");
      expect(formatError(null)).toBe("null");
      expect(formatError(undefined)).toBe("undefined");
      expect(formatError({ message: "object" })).toContain("object");
    });
  });

  describe("validateManifestWithPermutations", () => {
    const mockManifest = {
      version: "1.0",
      modifiers: {
        theme: { oneOf: ["light", "dark"] },
        density: { oneOf: ["compact", "comfortable"] },
      },
    };

    it("should validate manifest structure", async () => {
      (readManifest as any).mockResolvedValue(mockManifest);
      (validation.validateManifest as any).mockReturnValue({
        valid: true,
        errors: [],
      });

      const result = await validateManifestWithPermutations("manifest.json");

      expect(readManifest).toHaveBeenCalledWith("manifest.json");
      expect(validation.validateManifest).toHaveBeenCalledWith(mockManifest);
      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it("should return errors for invalid manifest structure", async () => {
      (readManifest as any).mockResolvedValue(mockManifest);
      (validation.validateManifest as any).mockReturnValue({
        valid: false,
        errors: [{ message: "Invalid manifest" }],
      });

      const result = await validateManifestWithPermutations("manifest.json");

      expect(result).toEqual({
        valid: false,
        errors: ["Invalid manifest"],
      });
    });

    it("should validate all permutations when requested", async () => {
      const mockTokens = { color: { primary: { $value: "#007acc" } } };

      (readManifest as any).mockResolvedValue(mockManifest);
      (validation.validateManifest as any).mockReturnValue({
        valid: true,
        errors: [],
      });
      (resolvePermutation as any).mockResolvedValue({
        tokens: mockTokens,
      });
      (validation.validateTokens as any).mockReturnValue({
        valid: true,
        errors: [],
      });

      const result = await validateManifestWithPermutations("manifest.json", {
        allPermutations: true,
      });

      // Should generate 4 permutations (2 themes × 2 densities)
      expect(resolvePermutation).toHaveBeenCalledTimes(4);
      expect(validation.validateTokens).toHaveBeenCalledTimes(4);
      expect(result.permutationResults).toHaveLength(4);
      expect(result.valid).toBe(true);
    });

    it("should handle permutation validation errors", async () => {
      (readManifest as any).mockResolvedValue(mockManifest);
      (validation.validateManifest as any).mockReturnValue({
        valid: true,
        errors: [],
      });
      (resolvePermutation as any).mockResolvedValue({
        tokens: {},
      });
      (validation.validateTokens as any)
        .mockReturnValueOnce({
          valid: true,
          errors: [],
        })
        .mockReturnValueOnce({
          valid: false,
          errors: [{ path: "color.primary", message: "Invalid reference" }],
        });

      const result = await validateManifestWithPermutations("manifest.json", {
        allPermutations: true,
      });

      expect(result.valid).toBe(false);
      expect(result.permutationResults).toContainEqual(
        expect.objectContaining({
          valid: false,
          errors: ["color.primary: Invalid reference"],
        }),
      );
    });

    it("should handle permutation resolution errors", async () => {
      (readManifest as any).mockResolvedValue(mockManifest);
      (validation.validateManifest as any).mockReturnValue({
        valid: true,
        errors: [],
      });
      (resolvePermutation as any).mockRejectedValue(
        new Error("Resolution failed"),
      );

      const result = await validateManifestWithPermutations("manifest.json", {
        allPermutations: true,
      });

      expect(result.valid).toBe(false);
      expect(result.permutationResults?.[0]).toEqual({
        permutation: expect.any(String),
        valid: false,
        errors: ["Resolution failed"],
      });
    });

    it("should handle manifest with no modifiers", async () => {
      const manifestNoModifiers = { version: "1.0" };

      (readManifest as any).mockResolvedValue(manifestNoModifiers);
      (validation.validateManifest as any).mockReturnValue({
        valid: true,
        errors: [],
      });
      (resolvePermutation as any).mockResolvedValue({
        tokens: {},
      });
      (validation.validateTokens as any).mockReturnValue({
        valid: true,
        errors: [],
      });

      const result = await validateManifestWithPermutations("manifest.json", {
        allPermutations: true,
      });

      expect(resolvePermutation).toHaveBeenCalledTimes(1);
      expect(resolvePermutation).toHaveBeenCalledWith(manifestNoModifiers, {});
      expect(result.valid).toBe(true);
    });

    it("should handle anyOf modifiers", async () => {
      const manifestAnyOf = {
        version: "1.0",
        modifiers: {
          features: { anyOf: ["feature1", "feature2"] },
        },
      };

      (readManifest as any).mockResolvedValue(manifestAnyOf);
      (validation.validateManifest as any).mockReturnValue({
        valid: true,
        errors: [],
      });
      (resolvePermutation as any).mockResolvedValue({
        tokens: {},
      });
      (validation.validateTokens as any).mockReturnValue({
        valid: true,
        errors: [],
      });

      const result = await validateManifestWithPermutations("manifest.json", {
        allPermutations: true,
      });

      // Should generate 2 permutations for anyOf
      expect(resolvePermutation).toHaveBeenCalledTimes(2);
      expect(result.valid).toBe(true);
    });
  });
});
