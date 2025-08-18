import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ast from "../../ast/index.js";
import { resolveASTReferences } from "../../ast/resolver.js";
import { listTokens } from "./list.js";

// Mock the fs module
vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

// Mock the ast module
vi.mock("../../ast/index.js", () => ({
  createAST: vi.fn(),
  findAllTokens: vi.fn(),
  findTokensByType: vi.fn(),
}));

vi.mock("../../ast/resolver.js", () => ({
  resolveASTReferences: vi.fn(),
}));

describe("List Command", () => {
  const mockReadFile = fs.readFile as unknown as ReturnType<typeof vi.fn>;
  const mockCreateAST = ast.createAST as ReturnType<typeof vi.fn>;
  const mockFindAllTokens = ast.findAllTokens as ReturnType<typeof vi.fn>;
  const mockFindTokensByType = ast.findTokensByType as ReturnType<typeof vi.fn>;
  const mockResolveReferences = resolveASTReferences as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listTokens", () => {
    const mockTokenDoc = {
      color: {
        primary: { $value: "#007acc", $type: "color" },
        secondary: { $value: "#6c757d", $type: "color" },
      },
      spacing: {
        small: { $value: "4px", $type: "dimension" },
        large: { $value: "16px", $type: "dimension" },
      },
    };

    const mockAST = { type: "document", children: [] };

    const mockTokenNodes = [
      {
        type: "token",
        path: "color.primary",
        tokenType: "color",
        value: { $value: "#007acc", $type: "color" },
      },
      {
        type: "token",
        path: "color.secondary",
        tokenType: "color",
        value: { $value: "#6c757d", $type: "color" },
      },
      {
        type: "token",
        path: "spacing.small",
        tokenType: "dimension",
        value: { $value: "4px", $type: "dimension" },
      },
      {
        type: "token",
        path: "spacing.large",
        tokenType: "dimension",
        value: { $value: "16px", $type: "dimension" },
      },
    ];

    it("should list all tokens from a file", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockTokenDoc));
      mockCreateAST.mockReturnValue(mockAST);
      mockFindAllTokens.mockReturnValue(mockTokenNodes);
      mockResolveReferences.mockReturnValue(undefined);

      const result = await listTokens("tokens.json");

      expect(mockReadFile).toHaveBeenCalledWith("tokens.json", "utf-8");
      expect(mockCreateAST).toHaveBeenCalledWith(mockTokenDoc);
      expect(mockFindAllTokens).toHaveBeenCalledWith(mockAST);
      expect(mockResolveReferences).toHaveBeenCalledWith(mockAST);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        path: "color.primary",
        type: "color",
        value: "#007acc",
        resolvedValue: { $value: "#007acc", $type: "color" },
        hasReference: false,
      });
    });

    it("should filter tokens by type", async () => {
      const colorTokens = mockTokenNodes.filter((t) => t.tokenType === "color");

      mockReadFile.mockResolvedValue(JSON.stringify(mockTokenDoc));
      mockCreateAST.mockReturnValue(mockAST);
      mockFindTokensByType.mockReturnValue(colorTokens);
      mockResolveReferences.mockReturnValue(undefined);

      const result = await listTokens("tokens.json", { type: "color" });

      expect(mockFindTokensByType).toHaveBeenCalledWith(mockAST, "color");
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.type === "color")).toBe(true);
    });

    it("should filter tokens by group", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockTokenDoc));
      mockCreateAST.mockReturnValue(mockAST);
      mockFindAllTokens.mockReturnValue(mockTokenNodes);
      mockResolveReferences.mockReturnValue(undefined);

      const result = await listTokens("tokens.json", { group: "spacing" });

      expect(mockFindAllTokens).toHaveBeenCalledWith(mockAST);
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.path.startsWith("spacing."))).toBe(true);
    });

    it("should handle tokens with references", async () => {
      const tokensWithRefs = [
        {
          type: "token",
          path: "color.brand",
          tokenType: "color",
          value: { $ref: "color.primary", $value: "#007acc" },
        },
      ];

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          color: {
            brand: { $ref: "color.primary" },
          },
        }),
      );
      mockCreateAST.mockReturnValue(mockAST);
      mockFindAllTokens.mockReturnValue(tokensWithRefs);
      mockResolveReferences.mockReturnValue(undefined);

      const result = await listTokens("tokens.json");

      expect(result[0]).toEqual({
        path: "color.brand",
        type: "color",
        value: "#007acc",
        resolvedValue: { $ref: "color.primary", $value: "#007acc" },
        hasReference: true,
      });
    });

    it("should handle tokens without explicit type", async () => {
      const tokenWithoutType = [
        {
          type: "token",
          path: "mytoken",
          value: { $value: "test" },
        },
      ];

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          mytoken: { $value: "test" },
        }),
      );
      mockCreateAST.mockReturnValue(mockAST);
      mockFindAllTokens.mockReturnValue(tokenWithoutType);
      mockResolveReferences.mockReturnValue(undefined);

      const result = await listTokens("tokens.json");

      expect(result[0]).toEqual({
        path: "mytoken",
        value: "test",
        resolvedValue: { $value: "test" },
        hasReference: false,
      });
      expect(result[0]?.type).toBeUndefined();
    });

    it("should handle file read errors", async () => {
      mockReadFile.mockRejectedValue(new Error("File not found"));

      await expect(listTokens("missing.json")).rejects.toThrow(
        "Failed to list tokens: File not found",
      );
    });

    it("should handle invalid JSON", async () => {
      mockReadFile.mockResolvedValue("{ invalid json }");

      await expect(listTokens("invalid.json")).rejects.toThrow(
        "Failed to list tokens:",
      );
    });

    it("should handle AST creation errors", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockTokenDoc));
      mockCreateAST.mockImplementation(() => {
        throw new Error("Invalid document structure");
      });

      await expect(listTokens("tokens.json")).rejects.toThrow(
        "Failed to list tokens: Invalid document structure",
      );
    });

    it("should handle empty token documents", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({}));
      mockCreateAST.mockReturnValue(mockAST);
      mockFindAllTokens.mockReturnValue([]);
      mockResolveReferences.mockReturnValue(undefined);

      const result = await listTokens("tokens.json");

      expect(result).toEqual([]);
    });

    it("should handle non-Error exceptions", async () => {
      mockReadFile.mockRejectedValue("String error");

      await expect(listTokens("tokens.json")).rejects.toThrow(
        "Failed to list tokens: String error",
      );
    });
  });
});
