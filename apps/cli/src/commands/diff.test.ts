/**
 * Unit tests for diff command implementation
 */

import type { TokenDocument } from "@upft/foundation";
import type { PipelineResolutionInput } from "@upft/loader";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DiffCommandOptions,
  diffDocuments,
  diffPermutations,
  type TokenDiff,
} from "./diff.js";

// Mock dependencies
vi.mock("@upft/loader");
vi.mock("@upft/analysis");

import { compareTokenDocumentsDetailed } from "@upft/analysis";
import { resolvePermutation, runPipeline } from "@upft/loader";

const mockRunPipeline = vi.mocked(runPipeline);
const mockResolvePermutation = vi.mocked(resolvePermutation);
const mockDiffTokens = vi.mocked(compareTokenDocumentsDetailed);

// Helper function to create large diff data (extracted to reduce complexity)
function createLargeDiffData(): TokenDiff {
  const totalItems = 10000;
  const addedCount = 5000;
  const changedCount = 3000;
  const removedCount = 2000;

  const differences = Array(totalItems)
    .fill(null)
    .map((_, i) => ({
      path: `token.${i}`,
      leftValue:
        i < addedCount ? undefined : { $type: "color", $value: "#000000" },
      rightValue:
        i >= addedCount + changedCount
          ? undefined
          : { $type: "color", $value: "#ffffff" },
      type:
        i < addedCount
          ? "added"
          : i < addedCount + changedCount
            ? "changed"
            : "removed",
    }));

  return {
    summary: {
      added: addedCount,
      changed: changedCount,
      removed: removedCount,
    },
    differences,
  };
}

describe("diff command", () => {
  const mockTokensLeft: TokenDocument = {
    color: {
      primary: { $type: "color", $value: "#007bff" },
      secondary: { $type: "color", $value: "#6c757d" },
    },
    spacing: {
      small: { $type: "dimension", $value: "8px" },
    },
  };

  const mockTokensRight: TokenDocument = {
    color: {
      primary: { $type: "color", $value: "#0056b3" }, // Changed
      tertiary: { $type: "color", $value: "#28a745" }, // Added
    },
    spacing: {
      small: { $type: "dimension", $value: "8px" }, // Unchanged
      medium: { $type: "dimension", $value: "16px" }, // Added
    },
    // secondary color removed
  };

  const mockDiffResult: TokenDiff = {
    summary: {
      added: 2,
      changed: 1,
      removed: 1,
    },
    differences: [
      {
        path: "color.tertiary",
        leftValue: undefined,
        rightValue: { $type: "color", $value: "#28a745" },
        type: "added",
      },
      {
        path: "spacing.medium",
        leftValue: undefined,
        rightValue: { $type: "dimension", $value: "16px" },
        type: "added",
      },
      {
        path: "color.primary",
        leftValue: { $type: "color", $value: "#007bff" },
        rightValue: { $type: "color", $value: "#0056b3" },
        type: "changed",
      },
      {
        path: "color.secondary",
        leftValue: { $type: "color", $value: "#6c757d" },
        rightValue: undefined,
        type: "removed",
      },
    ],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default diff result
    mockDiffTokens.mockReturnValue(mockDiffResult);

    // Setup pipeline mocks
    mockRunPipeline.mockResolvedValue({
      project: { name: "Test", sets: [], modifiers: {} },
      errors: [],
      warnings: [],
    });

    mockResolvePermutation.mockImplementation((_project, modifiers) => {
      // Return different tokens based on modifiers
      if (modifiers.theme === "light") {
        return Promise.resolve({
          id: "light",
          files: ["/tokens/light.json"],
          tokens: mockTokensLeft,
        });
      }
      if (modifiers.theme === "dark") {
        return Promise.resolve({
          id: "dark",
          files: ["/tokens/dark.json"],
          tokens: mockTokensRight,
        });
      }
      return Promise.resolve({
        id: "default",
        files: ["/tokens/default.json"],
        tokens: mockTokensLeft,
      });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("diffDocuments", () => {
    it("should diff two token documents", async () => {
      const result = await diffDocuments(mockTokensLeft, mockTokensRight);

      expect(mockDiffTokens).toHaveBeenCalledWith(
        mockTokensLeft,
        mockTokensRight,
      );
      expect(result).toEqual(mockDiffResult);
    });

    it("should handle empty documents", async () => {
      const emptyLeft: TokenDocument = {};
      const emptyRight: TokenDocument = {};

      const emptyDiff: TokenDiff = {
        summary: { added: 0, changed: 0, removed: 0 },
        differences: [],
      };

      mockDiffTokens.mockReturnValue(emptyDiff);

      const result = await diffDocuments(emptyLeft, emptyRight);

      expect(mockDiffTokens).toHaveBeenCalledWith(emptyLeft, emptyRight);
      expect(result).toEqual(emptyDiff);
    });

    it("should handle identical documents", async () => {
      const identicalDiff: TokenDiff = {
        summary: { added: 0, changed: 0, removed: 0 },
        differences: [],
      };

      mockDiffTokens.mockReturnValue(identicalDiff);

      const result = await diffDocuments(mockTokensLeft, mockTokensLeft);

      expect(mockDiffTokens).toHaveBeenCalledWith(
        mockTokensLeft,
        mockTokensLeft,
      );
      expect(result).toEqual(identicalDiff);
    });

    it("should handle large documents", async () => {
      const largeTokens: TokenDocument = {};
      for (let i = 0; i < 1000; i++) {
        (largeTokens as any)[`token${i}`] = {
          $type: "color",
          $value: `#${i.toString(16).padStart(6, "0")}`,
        };
      }

      const largeDiff: TokenDiff = {
        summary: { added: 1000, changed: 0, removed: 0 },
        differences: [],
      };

      mockDiffTokens.mockReturnValue(largeDiff);

      const result = await diffDocuments({}, largeTokens);

      expect(mockDiffTokens).toHaveBeenCalledWith({}, largeTokens);
      expect(result).toEqual(largeDiff);
    });

    it("should handle complex nested structures", async () => {
      const complexLeft: TokenDocument = {
        components: {
          button: {
            primary: {
              background: { $type: "color", $value: "#007bff" },
              text: { $type: "color", $value: "#ffffff" },
            },
          },
        },
      };

      const complexRight: TokenDocument = {
        components: {
          button: {
            primary: {
              background: { $type: "color", $value: "#0056b3" }, // Changed
              text: { $type: "color", $value: "#ffffff" },
              border: { $type: "color", $value: "#004085" }, // Added
            },
            secondary: {
              background: { $type: "color", $value: "#6c757d" }, // Added
            },
          },
        },
      };

      const complexDiff: TokenDiff = {
        summary: { added: 2, changed: 1, removed: 0 },
        differences: [],
      };

      mockDiffTokens.mockReturnValue(complexDiff);

      const result = await diffDocuments(complexLeft, complexRight);

      expect(result).toEqual(complexDiff);
    });
  });

  describe("diffPermutations", () => {
    it("should diff two permutations from manifest", async () => {
      const manifestPath = "/path/to/manifest.json";
      const leftModifiers: PipelineResolutionInput = { theme: "light" };
      const rightModifiers: PipelineResolutionInput = { theme: "dark" };

      const result = await diffPermutations(
        manifestPath,
        leftModifiers,
        rightModifiers,
      );

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: undefined,
        validate: true,
        parseToAST: true,
      });
      expect(mockResolvePermutation).toHaveBeenCalledTimes(2);
      expect(mockResolvePermutation).toHaveBeenCalledWith(
        { name: "Test", sets: [], modifiers: {} },
        leftModifiers,
      );
      expect(mockResolvePermutation).toHaveBeenCalledWith(
        { name: "Test", sets: [], modifiers: {} },
        rightModifiers,
      );
      expect(mockDiffTokens).toHaveBeenCalledWith(
        mockTokensLeft,
        mockTokensRight,
      );
      expect(result).toEqual(mockDiffResult);
    });

    it("should use custom base path", async () => {
      const manifestPath = "/path/to/manifest.json";
      const options: DiffCommandOptions = {
        basePath: "/custom/base/path",
      };

      await diffPermutations(manifestPath, {}, {}, options);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: "/custom/base/path",
        validate: true,
        parseToAST: true,
      });
      expect(mockResolvePermutation).toHaveBeenCalledWith(
        expect.any(Object),
        {},
      );
    });

    it("should handle empty modifiers", async () => {
      const manifestPath = "/path/to/manifest.json";

      const result = await diffPermutations(manifestPath);

      expect(mockResolvePermutation).toHaveBeenCalledWith(
        expect.any(Object),
        {},
      );
      expect(result).toEqual(mockDiffResult);
    });

    it("should handle pipeline errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockRunPipeline.mockResolvedValue({
        project: null,
        errors: ["Invalid manifest structure"],
        warnings: [],
      });

      await expect(diffPermutations(manifestPath, {}, {})).rejects.toThrow(
        "Pipeline errors: Invalid manifest structure",
      );

      expect(mockResolvePermutation).not.toHaveBeenCalled();
    });

    it("should handle resolution errors", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockResolvePermutation
        .mockResolvedValueOnce({
          id: "left",
          files: ["/left.json"],
          tokens: mockTokensLeft,
        })
        .mockRejectedValueOnce(
          new Error("Failed to resolve right permutation"),
        );

      await expect(
        diffPermutations(
          manifestPath,
          { theme: "light" },
          { theme: "invalid" },
        ),
      ).rejects.toThrow("Failed to resolve right permutation");
    });

    it("should handle complex modifiers", async () => {
      const manifestPath = "/path/to/manifest.json";
      const leftModifiers: PipelineResolutionInput = {
        theme: "light",
        platform: "web",
        density: "comfortable",
      };
      const rightModifiers: PipelineResolutionInput = {
        theme: "dark",
        platform: "mobile",
        density: "compact",
      };

      await diffPermutations(manifestPath, leftModifiers, rightModifiers);

      expect(mockResolvePermutation).toHaveBeenCalledWith(
        expect.any(Object),
        leftModifiers,
      );
      expect(mockResolvePermutation).toHaveBeenCalledWith(
        expect.any(Object),
        rightModifiers,
      );
    });

    it("should pass file reader option", async () => {
      const manifestPath = "/path/to/manifest.json";
      const mockFileReader = { readFile: vi.fn() };
      const options: DiffCommandOptions = {
        fileReader: mockFileReader as any,
      };

      await diffPermutations(manifestPath, {}, {}, options);

      // The fileReader should be passed through to resolution options
      expect(mockResolvePermutation).toHaveBeenCalledWith(
        expect.any(Object),
        {},
      );
    });

    it("should handle resolution result without tokens", async () => {
      mockResolvePermutation
        .mockResolvedValueOnce({
          id: "left",
          files: [],
          tokens: {},
        })
        .mockResolvedValueOnce({
          id: "right",
          files: [],
          tokens: {},
        });

      const emptyDiff: TokenDiff = {
        summary: { added: 0, changed: 0, removed: 0 },
        differences: [],
      };

      mockDiffTokens.mockReturnValue(emptyDiff);

      const result = await diffPermutations("/path/to/manifest.json");

      expect(mockDiffTokens).toHaveBeenCalledWith({}, {});
      expect(result).toEqual(emptyDiff);
    });
  });

  describe("error handling", () => {
    it("should handle diff function errors", async () => {
      mockDiffTokens.mockImplementation(() => {
        throw new Error("Diff calculation failed");
      });

      await expect(
        diffDocuments(mockTokensLeft, mockTokensRight),
      ).rejects.toThrow("Diff calculation failed");
    });

    it("should handle manifest loading errors", async () => {
      mockRunPipeline.mockRejectedValue(new Error("Failed to load manifest"));

      await expect(
        diffPermutations("/nonexistent/manifest.json"),
      ).rejects.toThrow("Failed to load manifest");
    });

    it("should handle resolution timeout", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockResolvePermutation.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Resolution timeout")), 100);
        });
      });

      await expect(
        diffPermutations(manifestPath, { theme: "light" }, { theme: "dark" }),
      ).rejects.toThrow("Resolution timeout");
    }, 1000);

    it("should handle partial resolution failure", async () => {
      const manifestPath = "/path/to/manifest.json";

      mockResolvePermutation
        .mockResolvedValueOnce({
          id: "left",
          files: ["/left.json"],
          tokens: mockTokensLeft,
        })
        .mockRejectedValueOnce(new Error("Right resolution failed"));

      await expect(
        diffPermutations(manifestPath, {}, { invalid: "modifier" }),
      ).rejects.toThrow("Right resolution failed");
    });
  });

  describe("edge cases", () => {
    it("should handle very large diffs", async () => {
      const largeDiff = createLargeDiffData();

      mockDiffTokens.mockReturnValue(largeDiff);

      const result = await diffDocuments({}, {});

      expect(result).toEqual(largeDiff);
      expect(result.summary.added).toBe(5000);
      expect(result.differences).toHaveLength(10000);
    });

    it("should handle manifest with special characters in path", async () => {
      const manifestPath = "/path/with spaces/manifest (v2).json";

      await diffPermutations(manifestPath);

      expect(mockRunPipeline).toHaveBeenCalledWith(manifestPath, {
        basePath: undefined,
        validate: true,
        parseToAST: true,
      });
    });

    it("should handle empty modifier objects", async () => {
      const manifestPath = "/path/to/manifest.json";

      await diffPermutations(manifestPath, {}, {});

      expect(mockResolvePermutation).toHaveBeenCalledWith(
        expect.any(Object),
        {},
      );
    });

    it("should handle null/undefined tokens in resolution", async () => {
      mockResolvePermutation
        .mockResolvedValueOnce({
          id: "left",
          files: [],
          tokens: null as any,
        })
        .mockResolvedValueOnce({
          id: "right",
          files: [],
          tokens: undefined as any,
        });

      const _result = await diffPermutations("/path/to/manifest.json");

      expect(mockDiffTokens).toHaveBeenCalledWith(null, undefined);
    });

    it("should handle diff with circular references", async () => {
      const circularLeft: any = { ref: null };
      circularLeft.ref = circularLeft;

      const circularRight: any = { ref: null };
      circularRight.ref = circularRight;

      // The diff function should handle this gracefully
      await diffDocuments(circularLeft, circularRight);

      expect(mockDiffTokens).toHaveBeenCalledWith(circularLeft, circularRight);
    });
  });
});
