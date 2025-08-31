/**
 * Unit tests for bundle command implementation
 */

import { dirname } from "node:path";
import type { BundleWriteResult } from "@upft/bundler";
import type { ProjectAST, TokenDocument } from "@upft/foundation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BundleCommandOptions,
  buildTokens,
  bundleTokens,
} from "./bundle.js";

// Mock dependencies
vi.mock("@upft/loader");
vi.mock("@upft/bundler");

import { bundle, validateBundle, writeBundlesToFiles } from "@upft/bundler";
import { runPipeline } from "@upft/loader";

const mockRunPipeline = vi.mocked(runPipeline);
const mockBundle = vi.mocked(bundle);
const mockValidateBundle = vi.mocked(validateBundle);
const mockWriteBundlesToFiles = vi.mocked(writeBundlesToFiles);

describe("bundle command", () => {
  const mockProjectAST: ProjectAST = {
    files: {},
    globalNamespace: {},
    metadata: { version: "1.0.0" },
  };

  const mockBundles = {
    default: {
      color: {
        primary: { $type: "color", $value: "#007bff" },
      },
    },
    dark: {
      color: {
        primary: { $type: "color", $value: "#0056b3" },
      },
    },
  };

  const mockWriteResults: BundleWriteResult[] = [
    { success: true, filePath: "/output/default.json" },
    { success: true, filePath: "/output/dark.json" },
  ];

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default successful pipeline
    mockRunPipeline.mockResolvedValue({
      project: mockProjectAST,
      errors: [],
      warnings: [],
    });

    // Setup successful bundling
    mockBundle.mockReturnValue(mockBundles);

    // Setup successful validation
    mockValidateBundle.mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    // Setup successful file writing
    mockWriteBundlesToFiles.mockResolvedValue(mockWriteResults);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("buildTokens", () => {
    it("should build tokens from manifest path", async () => {
      const manifestPath = "/path/to/manifest.json";
      const result = await buildTokens(manifestPath);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: dirname(manifestPath),
        validate: true,
        parseToAST: true,
      });
      expect(mockBundle).toHaveBeenCalledWith(mockProjectAST, {});
      expect(mockValidateBundle).toHaveBeenCalledTimes(2); // Once for each bundle
      expect(mockWriteBundlesToFiles).toHaveBeenCalledWith(
        mockBundles,
        dirname(manifestPath),
        {},
      );
      expect(result).toEqual(mockWriteResults);
    });

    it("should use custom base path when provided", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        basePath: "/custom/base/path",
      };

      await buildTokens(manifestPath, options);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: "/custom/base/path",
        validate: true,
        parseToAST: true,
      });
      expect(mockWriteBundlesToFiles).toHaveBeenCalledWith(
        mockBundles,
        "/custom/base/path",
        {},
      );
    });

    it("should use output directory when provided", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        outputDir: "/custom/output",
      };

      await buildTokens(manifestPath, options);

      expect(mockWriteBundlesToFiles).toHaveBeenCalledWith(
        mockBundles,
        "/custom/output",
        {},
      );
    });

    it("should handle pipeline errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockRunPipeline.mockResolvedValue({
        project: null,
        errors: ["Invalid manifest", "Missing required field"],
        warnings: [],
      });

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Pipeline failed: Invalid manifest, Missing required field",
      );

      expect(mockBundle).not.toHaveBeenCalled();
      expect(mockWriteBundlesToFiles).not.toHaveBeenCalled();
    });

    it("should skip validation when skipValidation is true", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        skipValidation: true,
      };

      await buildTokens(manifestPath, options);

      expect(mockValidateBundle).not.toHaveBeenCalled();
      expect(mockWriteBundlesToFiles).toHaveBeenCalled();
    });

    it("should validate bundles by default", async () => {
      const manifestPath = "/path/to/manifest.json";

      await buildTokens(manifestPath);

      expect(mockValidateBundle).toHaveBeenCalledTimes(2);
      expect(mockValidateBundle).toHaveBeenCalledWith(
        mockBundles.default as unknown as TokenDocument,
        {
          checkReferences: true,
          validateTypes: true,
          validateNaming: true,
          requireDescriptions: false,
        },
      );
      expect(mockValidateBundle).toHaveBeenCalledWith(
        mockBundles.dark as unknown as TokenDocument,
        {
          checkReferences: true,
          validateTypes: true,
          validateNaming: true,
          requireDescriptions: false,
        },
      );
    });

    it("should handle bundle validation errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockValidateBundle
        .mockReturnValueOnce({
          valid: true,
          errors: [],
          warnings: [],
        })
        .mockReturnValueOnce({
          valid: false,
          errors: [
            { path: "color.primary", message: "Invalid color value" },
            { path: "color.secondary", message: "Missing required property" },
          ],
          warnings: [],
        });

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Bundle validation failed for dark:\ncolor.primary: Invalid color value\ncolor.secondary: Missing required property",
      );

      expect(mockWriteBundlesToFiles).not.toHaveBeenCalled();
    });

    it("should handle validation warnings in strict mode", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        strict: true,
      };

      mockValidateBundle.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [{ path: "color.tertiary", message: "Missing description" }],
      });

      await expect(buildTokens(manifestPath, options)).rejects.toThrow(
        "Bundle validation warnings in strict mode for default:\ncolor.tertiary: Missing description",
      );
    });

    it("should allow warnings in non-strict mode", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        strict: false,
      };

      mockValidateBundle.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [{ path: "color.tertiary", message: "Missing description" }],
      });

      const result = await buildTokens(manifestPath, options);

      expect(result).toEqual(mockWriteResults);
      expect(mockWriteBundlesToFiles).toHaveBeenCalled();
    });

    it("should handle empty bundles object", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockBundle.mockReturnValue({});

      const result = await buildTokens(manifestPath);

      expect(mockValidateBundle).not.toHaveBeenCalled();
      expect(result).toEqual(mockWriteResults);
    });

    it("should pass file reader and writer options correctly", async () => {
      const manifestPath = "/path/to/manifest.json";
      const mockFileReader = { readFile: vi.fn() };
      const mockFileWriter = { writeFile: vi.fn() };

      const options: BundleCommandOptions = {
        fileReader: mockFileReader as any,
        fileWriter: mockFileWriter as any,
      };

      await buildTokens(manifestPath, options);

      // The options should be available but not directly tested here
      // as they're passed to lower-level functions
      expect(mockRunPipeline).toHaveBeenCalled();
      expect(mockWriteBundlesToFiles).toHaveBeenCalled();
    });

    it("should handle multiple validation errors across bundles", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockValidateBundle.mockReturnValueOnce({
        valid: false,
        errors: [{ path: "default.error", message: "Default bundle error" }],
        warnings: [],
      });

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Bundle validation failed for default:\ndefault.error: Default bundle error",
      );

      // Should fail on first validation error, not continue to second bundle
      expect(mockValidateBundle).toHaveBeenCalledTimes(1);
    });
  });

  describe("bundleTokens", () => {
    it("should be an alias for buildTokens", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        basePath: "/custom/path",
      };

      const result = await bundleTokens(manifestPath, options);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: "/custom/path",
        validate: true,
        parseToAST: true,
      });
      expect(result).toEqual(mockWriteResults);
    });

    it("should work without options", async () => {
      const manifestPath = "/path/to/manifest.json";

      const result = await bundleTokens(manifestPath);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: dirname(manifestPath),
        validate: true,
        parseToAST: true,
      });
      expect(result).toEqual(mockWriteResults);
    });
  });

  describe("error handling", () => {
    it("should handle pipeline rejection", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockRunPipeline.mockRejectedValue(new Error("Pipeline crashed"));

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Pipeline crashed",
      );
    });

    it("should handle bundle function errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockBundle.mockImplementation(() => {
        throw new Error("Bundle generation failed");
      });

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Bundle generation failed",
      );
    });

    it("should handle file writing errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockWriteBundlesToFiles.mockRejectedValue(
        new Error("Failed to write files"),
      );

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Failed to write files",
      );
    });

    it("should handle validation function errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockValidateBundle.mockImplementation(() => {
        throw new Error("Validation crashed");
      });

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Validation crashed",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle manifest with complex path", async () => {
      const manifestPath = "/very/deep/nested/path/with spaces/manifest.json";

      await buildTokens(manifestPath);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: "/very/deep/nested/path/with spaces",
        validate: true,
        parseToAST: true,
      });
    });

    it("should handle empty options object", async () => {
      const manifestPath = "/path/to/manifest.json";

      await buildTokens(manifestPath, {});

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: dirname(manifestPath),
        validate: true,
        parseToAST: true,
      });
    });

    it("should prioritize outputDir over basePath for writing", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: BundleCommandOptions = {
        basePath: "/base/path",
        outputDir: "/output/path",
      };

      await buildTokens(manifestPath, options);

      expect(mockWriteBundlesToFiles).toHaveBeenCalledWith(
        mockBundles,
        "/output/path", // Should use outputDir
        {},
      );
    });

    it("should handle validation with mixed error types", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockValidateBundle.mockReturnValue({
        valid: false,
        errors: [
          { path: "token.one", message: "Error one" },
          { message: "Error without path" },
          { path: "", message: "Error with empty path" },
        ],
        warnings: [],
      });

      await expect(buildTokens(manifestPath)).rejects.toThrow(
        "Bundle validation failed for default:\ntoken.one: Error one\nundefined: Error without path\n: Error with empty path",
      );
    });
  });
});
