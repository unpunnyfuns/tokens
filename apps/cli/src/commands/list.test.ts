/**
 * Unit tests for list command implementation
 */

import type { TokenDocument } from "@upft/foundation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ListOptions, listTokens, type TokenListItem } from "./list.js";

// Mock dependencies
vi.mock("@upft/analysis");
vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

import { promises as fs } from "node:fs";
import { listTokens as analyzeListTokens } from "@upft/analysis";

const mockAnalyzeListTokens = vi.mocked(analyzeListTokens);
const mockReadFile = vi.mocked(fs.readFile);

// Helper function to extract tokens from document (extracted to reduce complexity)
function mockExtractTokensFromDocument(obj: any, path = ""): TokenListItem[] {
  const tokens: TokenListItem[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      const currentPath = path ? `${path}.${key}` : key;

      // Check if this is a token (has $type)
      if ("$type" in value && "$value" in value) {
        const token: TokenListItem = {
          path: currentPath,
          type: value.$type as string,
          value: value.$value,
        };
        tokens.push(token);
      } else {
        // Recursively process nested objects
        tokens.push(...mockExtractTokensFromDocument(value, currentPath));
      }
    }
  }

  return tokens;
}

describe("list command", () => {
  const mockTokenDocument: TokenDocument = {
    color: {
      primary: {
        $type: "color",
        $value: "#007bff",
        $description: "Primary brand color",
      },
      secondary: {
        $type: "color",
        $value: "#6c757d",
      },
      states: {
        hover: {
          $type: "color",
          $value: "#0056b3",
        },
        active: {
          $type: "color",
          $value: "#004085",
        },
      },
    },
    spacing: {
      small: {
        $type: "dimension",
        $value: "8px",
        $description: "Small spacing unit",
      },
      medium: {
        $type: "dimension",
        $value: "16px",
      },
      large: {
        $type: "dimension",
        $value: "24px",
      },
    },
    typography: {
      headings: {
        h1: {
          fontSize: {
            $type: "dimension",
            $value: "32px",
          },
          fontWeight: {
            $type: "number",
            $value: 700,
          },
        },
      },
    },
  };

  const allTokens: TokenListItem[] = [
    {
      path: "color.primary",
      type: "color",
      value: "#007bff",
    },
    {
      path: "color.secondary",
      type: "color",
      value: "#6c757d",
    },
    {
      path: "color.states.hover",
      type: "color",
      value: "#0056b3",
    },
    {
      path: "color.states.active",
      type: "color",
      value: "#004085",
    },
    {
      path: "spacing.small",
      type: "dimension",
      value: "8px",
    },
    {
      path: "spacing.medium",
      type: "dimension",
      value: "16px",
    },
    {
      path: "spacing.large",
      type: "dimension",
      value: "24px",
    },
    {
      path: "typography.headings.h1.fontSize",
      type: "dimension",
      value: "32px",
    },
    {
      path: "typography.headings.h1.fontWeight",
      type: "number",
      value: 700,
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default file reading
    mockReadFile.mockResolvedValue(JSON.stringify(mockTokenDocument));

    // Setup intelligent mock that creates tokens based on actual input document
    mockAnalyzeListTokens.mockImplementation((doc, options) => {
      let result = mockExtractTokensFromDocument(doc);

      if (options?.type) {
        result = result.filter((token) => token.type === options.type);
      }

      return result;
    });
  });

  describe("listTokens", () => {
    it("should list all tokens from file", async () => {
      const result = await listTokens("/path/to/tokens.json");

      expect(mockReadFile).toHaveBeenCalledWith(
        "/path/to/tokens.json",
        "utf-8",
      );
      expect(mockAnalyzeListTokens).toHaveBeenCalledWith(mockTokenDocument, {
        resolveReferences: true,
      });

      expect(result).toEqual(allTokens);
    });

    it("should filter tokens by type", async () => {
      const options: ListOptions = { type: "color" };
      const result = await listTokens("/path/to/tokens.json", options);

      const expectedTokens = allTokens.filter(
        (token) => token.type === "color",
      );
      expect(result).toEqual(expectedTokens);
    });

    it("should filter tokens by dimension type", async () => {
      const options: ListOptions = { type: "dimension" };
      const result = await listTokens("/path/to/tokens.json", options);

      const expectedTokens = allTokens.filter(
        (token) => token.type === "dimension",
      );
      expect(result).toEqual(expectedTokens);
    });

    it("should filter tokens by number type", async () => {
      const options: ListOptions = { type: "number" };
      const result = await listTokens("/path/to/tokens.json", options);

      const expectedTokens = allTokens.filter(
        (token) => token.type === "number",
      );
      expect(result).toEqual(expectedTokens);
    });

    it("should return empty array for non-existent type", async () => {
      const options: ListOptions = { type: "shadow" };
      const result = await listTokens("/path/to/tokens.json", options);

      const expectedTokens = allTokens.filter(
        (token) => token.type === "shadow",
      ); // Should be empty
      expect(result).toEqual(expectedTokens);
    });

    it("should handle empty token document", async () => {
      const emptyDocument: TokenDocument = {};
      mockReadFile.mockResolvedValue(JSON.stringify(emptyDocument));

      const result = await listTokens("/path/to/empty.json");

      expect(result).toEqual([]);
    });

    it("should handle token document with only groups", async () => {
      const groupOnlyDocument: TokenDocument = {
        color: {
          primary: {
            // No $type, just nested structure
            light: {
              $type: "color",
              $value: "#007bff",
            },
            dark: {
              $type: "color",
              $value: "#0056b3",
            },
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(groupOnlyDocument));

      const result = await listTokens("/path/to/groups.json");

      const expectedTokens: TokenListItem[] = [
        { path: "color.primary.light", type: "color", value: "#007bff" },
        { path: "color.primary.dark", type: "color", value: "#0056b3" },
      ];

      expect(result).toEqual(expectedTokens);
    });

    it("should handle deeply nested tokens", async () => {
      const deepDocument: TokenDocument = {
        components: {
          button: {
            primary: {
              states: {
                default: {
                  background: {
                    $type: "color",
                    $value: "#007bff",
                  },
                  text: {
                    $type: "color",
                    $value: "#ffffff",
                  },
                },
                hover: {
                  background: {
                    $type: "color",
                    $value: "#0056b3",
                  },
                },
              },
            },
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(deepDocument));

      const result = await listTokens("/path/to/deep.json");

      const expectedTokens: TokenListItem[] = [
        {
          path: "components.button.primary.states.default.background",
          type: "color",
          value: "#007bff",
        },
        {
          path: "components.button.primary.states.default.text",
          type: "color",
          value: "#ffffff",
        },
        {
          path: "components.button.primary.states.hover.background",
          type: "color",
          value: "#0056b3",
        },
      ];

      expect(result).toEqual(expectedTokens);
    });

    it("should handle tokens with various types", async () => {
      const diverseDocument: TokenDocument = {
        color: { $type: "color", $value: "#000" },
        dimension: { $type: "dimension", $value: "16px" },
        fontFamily: { $type: "fontFamily", $value: ["Arial", "sans-serif"] },
        fontWeight: { $type: "fontWeight", $value: 400 },
        duration: { $type: "duration", $value: "200ms" },
        cubicBezier: { $type: "cubicBezier", $value: [0.25, 0.1, 0.25, 1] },
        number: { $type: "number", $value: 1.5 },
        strokeStyle: { $type: "strokeStyle", $value: "solid" },
        border: {
          $type: "border",
          $value: {
            color: "#000000",
            width: "1px",
            style: "solid",
          },
        },
        shadow: {
          $type: "shadow",
          $value: {
            color: "#000000",
            offsetX: "0px",
            offsetY: "4px",
            blur: "8px",
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(diverseDocument));

      const result = await listTokens("/path/to/diverse.json");

      expect(result).toHaveLength(10);
      expect(result.map((t) => t.type)).toEqual([
        "color",
        "dimension",
        "fontFamily",
        "fontWeight",
        "duration",
        "cubicBezier",
        "number",
        "strokeStyle",
        "border",
        "shadow",
      ]);
    });

    it("should handle file reading errors", async () => {
      mockReadFile.mockRejectedValue(new Error("File not found"));

      await expect(listTokens("/nonexistent/file.json")).rejects.toThrow(
        "File not found",
      );
    });

    it("should handle JSON parsing errors", async () => {
      mockReadFile.mockResolvedValue("invalid json");

      await expect(listTokens("/path/to/invalid.json")).rejects.toThrow(
        "Failed to list tokens:",
      );
    });

    it("should handle tokens without $type property", async () => {
      const invalidDocument = {
        color: {
          primary: {
            // Missing $type
            $value: "#007bff",
          },
          secondary: {
            $type: "color",
            $value: "#6c757d",
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(invalidDocument));

      const result = await listTokens("/path/to/partial.json");

      // Should only return tokens with valid $type
      const expectedTokens: TokenListItem[] = [
        { path: "color.secondary", type: "color", value: "#6c757d" },
      ];

      expect(result).toEqual(expectedTokens);
    });

    it("should handle tokens with invalid structure", async () => {
      const invalidDocument = {
        color: {
          primary: "not an object", // Invalid token structure
          secondary: {
            $type: "color",
            $value: "#6c757d",
          },
        },
        spacing: null, // Invalid group
        dimension: {
          small: {
            $type: "dimension",
            $value: "8px",
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(invalidDocument));

      const result = await listTokens("/path/to/mixed-invalid.json");

      // Should only return valid tokens
      const expectedTokens: TokenListItem[] = [
        { path: "color.secondary", type: "color", value: "#6c757d" },
        { path: "dimension.small", type: "dimension", value: "8px" },
      ];

      expect(result).toEqual(expectedTokens);
    });

    it("should handle options parameter correctly", async () => {
      // Test with undefined options
      const result1 = await listTokens("/path/to/tokens.json");
      expect(result1.length).toBeGreaterThan(0);

      // Test with empty options object
      const result2 = await listTokens("/path/to/tokens.json", {});
      expect(result2).toEqual(result1);

      // Test with null options
      const result3 = await listTokens("/path/to/tokens.json", null as any);
      expect(result3).toEqual(result1);
    });

    it("should preserve token path order", async () => {
      const orderedDocument: TokenDocument = {
        z: { $type: "color", $value: "#000" },
        a: { $type: "color", $value: "#fff" },
        m: { $type: "color", $value: "#777" },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(orderedDocument));

      const result = await listTokens("/path/to/ordered.json");

      // Should maintain the order from the object keys
      expect(result.map((t) => t.path)).toEqual(["z", "a", "m"]);
    });

    it("should handle tokens with complex $value types", async () => {
      const complexDocument: TokenDocument = {
        gradient: {
          $type: "gradient",
          $value: [
            { color: "#ff0000", position: 0 },
            { color: "#00ff00", position: 0.5 },
            { color: "#0000ff", position: 1 },
          ],
        },
        typography: {
          $type: "typography",
          $value: {
            fontFamily: "Arial",
            fontSize: "16px",
            fontWeight: 400,
            lineHeight: 1.5,
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(complexDocument));

      const result = await listTokens("/path/to/complex.json");

      const expectedTokens: TokenListItem[] = [
        {
          path: "gradient",
          type: "gradient",
          value: [
            { color: "#ff0000", position: 0 },
            { color: "#00ff00", position: 0.5 },
            { color: "#0000ff", position: 1 },
          ],
        },
        {
          path: "typography",
          type: "typography",
          value: {
            fontFamily: "Arial",
            fontSize: "16px",
            fontWeight: 400,
            lineHeight: 1.5,
          },
        },
      ];

      expect(result).toEqual(expectedTokens);
    });

    it("should handle very large token files", async () => {
      const largeDocument: TokenDocument = {};
      for (let i = 0; i < 1000; i++) {
        (largeDocument as any)[`token${i}`] = {
          $type: "color",
          $value: `#${i.toString(16).padStart(6, "0")}`,
        };
      }

      mockReadFile.mockResolvedValue(JSON.stringify(largeDocument));

      const result = await listTokens("/path/to/large.json");

      expect(result).toHaveLength(1000);
      expect(result[0]).toEqual({
        path: "token0",
        type: "color",
        value: "#000000",
      });
      expect(result[999]).toEqual({
        path: "token999",
        type: "color",
        value: "#0003e7",
      });
    });

    it("should handle special characters in token paths", async () => {
      const specialDocument: TokenDocument = {
        "color-with-dashes": {
          $type: "color",
          $value: "#000",
        },
        spacing_with_underscores: {
          $type: "dimension",
          $value: "16px",
        },
        "group with spaces": {
          "token with spaces": {
            $type: "color",
            $value: "#fff",
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(specialDocument));

      const result = await listTokens("/path/to/special.json");

      const expectedTokens: TokenListItem[] = [
        { path: "color-with-dashes", type: "color", value: "#000" },
        { path: "spacing_with_underscores", type: "dimension", value: "16px" },
        {
          path: "group with spaces.token with spaces",
          type: "color",
          value: "#fff",
        },
      ];

      expect(result).toEqual(expectedTokens);
    });
  });

  describe("edge cases", () => {
    it("should handle circular references gracefully", async () => {
      // Simulate what would remain after JSON.stringify handles circular refs
      const processedDocument = {
        color: {
          $type: "color",
          $value: "#000",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(processedDocument));

      // Should not crash and should extract valid tokens
      const result = await listTokens("/path/to/circular.json");

      expect(result).toEqual([{ path: "color", type: "color", value: "#000" }]);
    });

    it("should handle tokens with numeric keys", async () => {
      const numericDocument: TokenDocument = {
        "0": { $type: "color", $value: "#000" },
        "1": { $type: "color", $value: "#fff" },
        "100": { $type: "dimension", $value: "100px" },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(numericDocument));

      const result = await listTokens("/path/to/numeric.json");

      const expectedTokens: TokenListItem[] = [
        { path: "0", type: "color", value: "#000" },
        { path: "1", type: "color", value: "#fff" },
        { path: "100", type: "dimension", value: "100px" },
      ];

      expect(result).toEqual(expectedTokens);
    });

    it("should handle mixed valid and invalid type filters", async () => {
      const options: ListOptions = { type: "nonexistent" as any };
      const result = await listTokens("/path/to/tokens.json", options);

      expect(result).toEqual([]);
    });

    it("should handle case sensitivity in type filtering", async () => {
      const options: ListOptions = { type: "COLOR" as any };
      const result = await listTokens("/path/to/tokens.json", options);

      // Should be case sensitive and return no results
      expect(result).toEqual([]);
    });
  });
});
