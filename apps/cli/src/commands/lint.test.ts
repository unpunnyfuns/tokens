/**
 * Unit tests for lint command implementation
 */

import type { LintResult } from "@upft/linter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatLintResults,
  type LintCommandOptions,
  lintFile,
} from "./lint.js";

// Mock dependencies
vi.mock("@upft/linter");
vi.mock("node:fs");
vi.mock("@upft/foundation");

import { readFileSync } from "node:fs";
import { isUPFTManifest } from "@upft/foundation";
import { lintManifest, TokenLinter } from "@upft/linter";

const mockLintTokens = vi.fn();
const mockLintManifestFile = vi.mocked(lintManifest);
const mockReadFileSync = vi.mocked(readFileSync);
const mockIsUPFTManifest = vi.mocked(isUPFTManifest);

// Create a mock TokenLinter instance
const mockTokenLinterInstance = {
  lint: mockLintTokens,
};

// Mock TokenLinter class
vi.mocked(TokenLinter).mockImplementation(() => mockTokenLinterInstance as any);

describe("lint command", () => {
  const mockLintResult: LintResult = {
    violations: [
      {
        path: "color.primary",
        rule: "missing-description",
        severity: "warn",
        message: "Token is missing a description",
      },
    ],
    summary: {
      errors: 0,
      warnings: 1,
      info: 0,
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default successful linting
    mockLintTokens.mockReturnValue(mockLintResult);
    mockLintManifestFile.mockResolvedValue(mockLintResult);
    mockReadFileSync.mockReturnValue(
      '{"color": {"primary": {"$type": "color", "$value": "#007bff"}}}',
    );
    mockIsUPFTManifest.mockReturnValue(false);

    // Re-setup mocks after reset
    vi.mocked(TokenLinter).mockImplementation(
      () => mockTokenLinterInstance as any,
    );
  });

  describe("lintFile", () => {
    it("should lint token file with default options", async () => {
      const result = await lintFile("/path/to/tokens.json");

      expect(mockReadFileSync).toHaveBeenCalledWith(
        "/path/to/tokens.json",
        "utf-8",
      );
      expect(mockLintTokens).toHaveBeenCalledWith({
        color: { primary: { $type: "color", $value: "#007bff" } },
      });
      expect(result).toEqual(mockLintResult);
    });

    it("should lint token file with custom config", async () => {
      const options: LintCommandOptions = {
        configPath: "/path/to/lint-config.json",
        quiet: true,
      };

      const result = await lintFile("/path/to/tokens.json", options);

      expect(mockReadFileSync).toHaveBeenCalledWith(
        "/path/to/tokens.json",
        "utf-8",
      );
      // TokenLinter constructor should be called with options
      expect(vi.mocked(TokenLinter)).toHaveBeenCalledWith(options);
      expect(mockLintTokens).toHaveBeenCalledWith({
        color: { primary: { $type: "color", $value: "#007bff" } },
      });
      expect(result).toEqual(mockLintResult);
    });

    it("should lint manifest file when manifest option is true", async () => {
      const options: LintCommandOptions = {
        manifest: true,
      };

      const result = await lintFile("/path/to/manifest.json", options);

      expect(mockReadFileSync).toHaveBeenCalledWith(
        "/path/to/manifest.json",
        "utf-8",
      );
      expect(mockLintManifestFile).toHaveBeenCalledWith(
        { color: { primary: { $type: "color", $value: "#007bff" } } },
        options,
      );
      expect(mockLintTokens).not.toHaveBeenCalled();
      expect(result).toEqual(mockLintResult);
    });

    it("should auto-detect manifest files using isUPFTManifest", async () => {
      mockReadFileSync.mockReturnValue('{"sets": [], "modifiers": {}}');
      mockIsUPFTManifest.mockReturnValue(true);

      const _result = await lintFile("/path/to/tokens.manifest.json");

      expect(mockReadFileSync).toHaveBeenCalledWith(
        "/path/to/tokens.manifest.json",
        "utf-8",
      );
      expect(mockLintManifestFile).toHaveBeenCalledWith(
        { sets: [], modifiers: {} },
        {},
      );
      expect(mockLintTokens).not.toHaveBeenCalled();
    });

    it("should auto-detect manifest files by content structure", async () => {
      mockReadFileSync.mockReturnValue('{"generate": [], "sets": []}');
      mockIsUPFTManifest.mockReturnValue(false); // Not UPFT, but has manifest structure

      const _result = await lintFile("/path/to/design-tokens.json");

      expect(mockLintManifestFile).toHaveBeenCalledWith(
        { generate: [], sets: [] },
        {},
      );
      expect(mockLintTokens).not.toHaveBeenCalled();
    });

    it("should force token file linting when manifest is false", async () => {
      const options: LintCommandOptions = {
        manifest: false,
      };

      // Even if the file looks like a manifest, should treat as token file
      const _result = await lintFile("/path/to/tokens.manifest.json", options);

      expect(mockReadFileSync).toHaveBeenCalledWith(
        "/path/to/tokens.manifest.json",
        "utf-8",
      );
      expect(mockLintTokens).toHaveBeenCalledWith({
        color: { primary: { $type: "color", $value: "#007bff" } },
      });
      expect(mockLintManifestFile).not.toHaveBeenCalled();
    });

    it("should handle JSON parsing errors", async () => {
      mockReadFileSync.mockReturnValue('{"invalid": json}');

      await expect(lintFile("/path/to/tokens.json")).rejects.toThrow(
        "Unexpected token",
      );
    });

    it("should handle file reading errors", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      await expect(lintFile("/path/to/tokens.json")).rejects.toThrow(
        "File not found",
      );
    });

    it("should pass through lint options correctly", async () => {
      const options: LintCommandOptions = {
        quiet: true,
        maxWarnings: 5,
      };

      await lintFile("/path/to/tokens.json", options);

      expect(vi.mocked(TokenLinter)).toHaveBeenCalledWith(options);
      expect(mockLintTokens).toHaveBeenCalledWith({
        color: { primary: { $type: "color", $value: "#007bff" } },
      });
    });

    it("should handle file with errors", async () => {
      const errorResult: LintResult = {
        violations: [
          {
            path: "color.invalid",
            rule: "invalid-type",
            severity: "error",
            message: "Invalid token type",
          },
        ],
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
      };

      mockLintTokens.mockReturnValue(errorResult);

      const result = await lintFile("/path/to/tokens.json");

      expect(result).toEqual(errorResult);
      expect(result.summary.errors).toBe(1);
    });

    it("should handle empty lint result", async () => {
      const emptyResult: LintResult = {
        violations: [],
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
      };

      mockLintTokens.mockReturnValue(emptyResult);

      const result = await lintFile("/path/to/empty.json");

      expect(result).toEqual(emptyResult);
    });

    it("should handle lint result with multiple violations", async () => {
      const multiViolationResult: LintResult = {
        violations: [
          {
            path: "color.primary",
            rule: "missing-description",
            severity: "warn",
            message: "Missing description",
          },
          {
            path: "spacing.small",
            rule: "invalid-value",
            severity: "error",
            message: "Invalid dimension value",
          },
        ],
        summary: {
          errors: 1,
          warnings: 1,
          info: 0,
        },
      };

      mockLintTokens.mockReturnValue(multiViolationResult);

      const result = await lintFile("/path/to/tokens.json");

      expect(result).toEqual(multiViolationResult);
      expect(result.violations).toHaveLength(2);
    });
  });

  describe("formatLintResults", () => {
    it("should format results in stylish format", () => {
      const result = formatLintResults(mockLintResult, "stylish");

      expect(result).toContain("color.primary");
      expect(result).toContain("warn");
      expect(result).toContain("Token is missing a description");
    });

    it("should format results in JSON format", () => {
      const result = formatLintResults(mockLintResult, "json");

      const parsed = JSON.parse(result);
      expect(parsed).toEqual(mockLintResult);
    });

    it("should format results in compact format", () => {
      const result = formatLintResults(mockLintResult, "compact");

      expect(result).toContain(
        "color.primary: warn missing-description - Token is missing a description",
      );
    });

    it("should handle empty results", () => {
      const emptyResult: LintResult = {
        violations: [],
        summary: { errors: 0, warnings: 0, info: 0 },
      };

      const result = formatLintResults(emptyResult, "stylish");
      expect(result).toContain("✓ No linting issues found");
    });
  });

  describe("edge cases", () => {
    it("should handle options with all fields", async () => {
      const fullOptions: LintCommandOptions = {
        configPath: "/config.json",
        quiet: true,
        maxWarnings: 10,
        manifest: false,
      };

      await lintFile("/path/to/tokens.json", fullOptions);

      expect(vi.mocked(TokenLinter)).toHaveBeenCalledWith(fullOptions);
      expect(mockLintTokens).toHaveBeenCalledWith({
        color: { primary: { $type: "color", $value: "#007bff" } },
      });
    });

    it("should handle undefined options gracefully", async () => {
      const result = await lintFile("/path/to/tokens.json", undefined);

      expect(mockLintTokens).toHaveBeenCalledWith({
        color: { primary: { $type: "color", $value: "#007bff" } },
      });
      expect(result).toEqual(mockLintResult);
    });

    it("should handle files with special characters", async () => {
      const specialPath = "/path/with spaces/tokens (v2).json";

      const result = await lintFile(specialPath);

      expect(mockReadFileSync).toHaveBeenCalledWith(specialPath, "utf-8");
      expect(result).toEqual(mockLintResult);
    });

    it("should handle very long file paths", async () => {
      const longPath =
        "/very/long/path/that/goes/on/and/on/with/many/nested/directories/tokens.json";

      const result = await lintFile(longPath);

      expect(mockReadFileSync).toHaveBeenCalledWith(longPath, "utf-8");
      expect(result).toEqual(mockLintResult);
    });
  });
});
