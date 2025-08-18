import { beforeEach, describe, expect, it, vi } from "vitest";
import * as comparison from "../analysis/token-comparison.js";
import * as astBuilder from "../ast/ast-builder.js";
import * as astQuery from "../ast/query.js";
import * as merge from "../core/merge.js";
import * as manifestCore from "../manifest/manifest-core.js";
import * as manifestReader from "../manifest/manifest-reader.js";
import { TokenFileSystem } from "./token-file-system.js";
import { compare, loadASTs, workflows } from "./workflows.js";

// Mock dependencies
vi.mock("../analysis/token-comparison.js", () => ({
  compareTokenDocumentsDetailed: vi.fn(),
}));

vi.mock("../ast/ast-builder.js", () => ({
  createAST: vi.fn(),
}));

vi.mock("../ast/query.js", () => ({
  findAllTokens: vi.fn(),
  findTokensByType: vi.fn(),
}));

vi.mock("../core/merge.js", () => ({
  mergeTokens: vi.fn(),
}));

vi.mock("../manifest/manifest-core.js", () => ({
  resolvePermutation: vi.fn(),
}));

vi.mock("../manifest/manifest-reader.js", () => ({
  readManifest: vi.fn(),
}));

vi.mock("./token-file-system.js");

describe("Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTokens = {
    color: {
      primary: { $value: "#007acc", $type: "color" },
      secondary: { $value: "#6c757d", $type: "color" },
    },
    spacing: {
      small: { $value: "4px", $type: "dimension" },
    },
  };

  const mockAST = {
    type: "group",
    path: "",
    name: "root",
  };

  describe("loadASTs", () => {
    it("should load and merge documents from file system", async () => {
      const mockFS = {
        getDocuments: vi
          .fn()
          .mockReturnValue([
            { color: { primary: { $value: "#007acc" } } },
            { spacing: { small: { $value: "4px" } } },
          ]),
        getManifests: vi.fn().mockReturnValue([]),
      };

      (TokenFileSystem as any).mockImplementation(() => mockFS);
      (merge.mergeTokens as any)
        .mockReturnValueOnce({ color: { primary: { $value: "#007acc" } } })
        .mockReturnValueOnce(mockTokens);
      (astBuilder.createAST as any).mockReturnValue(mockAST);

      const fs = new TokenFileSystem();
      const result = await loadASTs(fs);

      expect(mockFS.getDocuments).toHaveBeenCalled();
      expect(merge.mergeTokens).toHaveBeenCalledTimes(2);
      expect(astBuilder.createAST).toHaveBeenCalledWith(mockTokens);
      expect(result.ast).toBe(mockAST);
      expect(result.resolver).toBeUndefined();
    });

    it("should handle empty documents", async () => {
      const mockFS = {
        getDocuments: vi.fn().mockReturnValue([]),
        getManifests: vi.fn().mockReturnValue([]),
      };

      (TokenFileSystem as any).mockImplementation(() => mockFS);
      (astBuilder.createAST as any).mockReturnValue(mockAST);

      const fs = new TokenFileSystem();
      const result = await loadASTs(fs);

      expect(astBuilder.createAST).toHaveBeenCalledWith({});
      expect(result.ast).toBe(mockAST);
    });

    it("should include resolver metadata when manifest has modifiers", async () => {
      const mockManifest = {
        modifiers: {
          theme: { oneOf: ["light", "dark"] },
          density: { anyOf: ["compact", "comfortable"] },
        },
      };

      const mockFS = {
        getDocuments: vi.fn().mockReturnValue([mockTokens]),
        getManifests: vi.fn().mockReturnValue([mockManifest]),
      };

      (TokenFileSystem as any).mockImplementation(() => mockFS);
      (merge.mergeTokens as any).mockReturnValue(mockTokens);
      (astBuilder.createAST as any).mockReturnValue(mockAST);

      const fs = new TokenFileSystem();
      const result = await loadASTs(fs);

      expect(result.resolver).toBeDefined();
      expect(result.resolver?.currentPermutation).toEqual({ id: "default" });
      expect(result.resolver?.groups).toEqual(["theme", "density"]);
      expect(result.resolver?.availablePermutations).toHaveLength(4); // 2 themes × 2 densities
      expect(result.resolver?.modifierOptions).toEqual([
        { name: "theme", values: ["light", "dark"] },
        { name: "density", values: ["compact", "comfortable"] },
      ]);
    });

    it("should handle manifest without modifiers", async () => {
      const mockManifest = {
        version: "1.0",
      };

      const mockFS = {
        getDocuments: vi.fn().mockReturnValue([]),
        getManifests: vi.fn().mockReturnValue([mockManifest]),
      };

      (TokenFileSystem as any).mockImplementation(() => mockFS);
      (astBuilder.createAST as any).mockReturnValue(mockAST);

      const fs = new TokenFileSystem();
      const result = await loadASTs(fs);

      expect(result.resolver).toBeUndefined();
    });

    it("should use first manifest when multiple exist", async () => {
      const mockManifest1 = {
        modifiers: { theme: { oneOf: ["light"] } },
      };
      const mockManifest2 = {
        modifiers: { mode: { oneOf: ["compact"] } },
      };

      const mockFS = {
        getDocuments: vi.fn().mockReturnValue([]),
        getManifests: vi.fn().mockReturnValue([mockManifest1, mockManifest2]),
      };

      (TokenFileSystem as any).mockImplementation(() => mockFS);
      (astBuilder.createAST as any).mockReturnValue(mockAST);

      const fs = new TokenFileSystem();
      const result = await loadASTs(fs);

      expect(result.resolver?.groups).toEqual(["theme"]);
    });
  });

  describe("compare", () => {
    it("should compare two permutations", async () => {
      const mockManifest = {
        modifiers: {
          theme: { oneOf: ["light", "dark"] },
        },
      };

      const tokens1 = {
        color: { primary: { $value: "#ffffff" } },
      };
      const tokens2 = {
        color: { primary: { $value: "#000000" } },
      };

      (manifestReader.readManifest as any).mockResolvedValue(mockManifest);
      (manifestCore.resolvePermutation as any)
        .mockResolvedValueOnce({ tokens: tokens1 })
        .mockResolvedValueOnce({ tokens: tokens2 });

      (comparison.compareTokenDocumentsDetailed as any).mockReturnValue({
        differences: [
          {
            path: "color.primary",
            leftValue: "#ffffff",
            rightValue: "#000000",
          },
        ],
        summary: {
          changed: 1,
          added: 0,
          removed: 0,
        },
      });

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findAllTokens as any)
        .mockReturnValueOnce([{ path: "color.primary" }])
        .mockReturnValueOnce([{ path: "color.primary" }]);

      const result = await compare(
        "manifest.json",
        { theme: "light" },
        { theme: "dark" },
      );

      expect(manifestReader.readManifest).toHaveBeenCalledWith("manifest.json");
      expect(manifestCore.resolvePermutation).toHaveBeenCalledTimes(2);
      expect(comparison.compareTokenDocumentsDetailed).toHaveBeenCalledWith(
        tokens1,
        tokens2,
      );

      expect(result.differences).toHaveLength(1);
      expect(result.differences[0]).toEqual({
        path: "color.primary",
        value1: "#ffffff",
        value2: "#000000",
      });

      expect(result.stats).toEqual({
        totalTokens: 1,
        differentTokens: 1,
        addedTokens: 0,
        removedTokens: 0,
      });
    });

    it("should handle added and removed tokens", async () => {
      const mockManifest = { version: "1.0" };

      (manifestReader.readManifest as any).mockResolvedValue(mockManifest);
      (manifestCore.resolvePermutation as any)
        .mockResolvedValueOnce({
          tokens: { color: { red: { $value: "#ff0000" } } },
        })
        .mockResolvedValueOnce({
          tokens: { color: { blue: { $value: "#0000ff" } } },
        });

      (comparison.compareTokenDocumentsDetailed as any).mockReturnValue({
        differences: [],
        summary: {
          changed: 0,
          added: 1,
          removed: 1,
        },
      });

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findAllTokens as any)
        .mockReturnValueOnce([{ path: "color.red" }])
        .mockReturnValueOnce([{ path: "color.blue" }]);

      const result = await compare("manifest.json", {}, {});

      expect(result.stats.totalTokens).toBe(1);
      expect(result.stats.addedTokens).toBe(1);
      expect(result.stats.removedTokens).toBe(1);
    });
  });

  describe("workflows.extractByType", () => {
    it("should extract tokens of specific type", () => {
      const colorTokens = [
        {
          path: "color.primary",
          tokenType: "color",
          value: { $value: "#007acc" },
        },
        {
          path: "color.secondary",
          tokenType: "color",
          value: { $value: "#6c757d" },
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findTokensByType as any).mockReturnValue(colorTokens);

      const result = workflows.extractByType(mockTokens, "color");

      expect(astQuery.findTokensByType).toHaveBeenCalledWith(mockAST, "color");
      expect(result).toEqual({
        color: {
          primary: { $type: "color", $value: { $value: "#007acc" } },
          secondary: { $type: "color", $value: { $value: "#6c757d" } },
        },
      });
    });

    it("should handle nested paths", () => {
      const tokens = [
        {
          path: "theme.colors.background.primary",
          tokenType: "color",
          value: { $value: "#ffffff" },
        },
      ];

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findTokensByType as any).mockReturnValue(tokens);

      const result = workflows.extractByType({}, "color");

      expect(result).toEqual({
        theme: {
          colors: {
            background: {
              primary: { $type: "color", $value: { $value: "#ffffff" } },
            },
          },
        },
      });
    });

    it("should return empty object when no tokens match", () => {
      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findTokensByType as any).mockReturnValue([]);

      const result = workflows.extractByType(mockTokens, "nonexistent");

      expect(result).toEqual({});
    });
  });

  describe("workflows.findByValue", () => {
    it("should find tokens with matching value", () => {
      const document = {
        color: {
          primary: { $value: "#007acc" },
          secondary: { $value: "#007acc" },
          tertiary: { $value: "#6c757d" },
        },
      };

      const result = workflows.findByValue(document, "#007acc");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: "color.primary",
        token: { $value: "#007acc" },
      });
      expect(result[1]).toEqual({
        path: "color.secondary",
        token: { $value: "#007acc" },
      });
    });

    it("should find tokens with complex values", () => {
      const document = {
        shadow: {
          default: {
            $value: {
              offsetX: "0px",
              offsetY: "2px",
              blur: "4px",
              color: "#000000",
            },
          },
        },
      };

      const searchValue = {
        offsetX: "0px",
        offsetY: "2px",
        blur: "4px",
        color: "#000000",
      };

      const result = workflows.findByValue(document, searchValue);

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe("shadow.default");
    });

    it("should handle nested structures", () => {
      const document = {
        theme: {
          light: {
            colors: {
              primary: { $value: "blue" },
            },
          },
          dark: {
            colors: {
              primary: { $value: "blue" },
            },
          },
        },
      };

      const result = workflows.findByValue(document, "blue");

      expect(result).toHaveLength(2);
      expect(result[0]?.path).toBe("theme.light.colors.primary");
      expect(result[1]?.path).toBe("theme.dark.colors.primary");
    });

    it("should return empty array when no matches", () => {
      const document = {
        color: {
          primary: { $value: "#007acc" },
        },
      };

      const result = workflows.findByValue(document, "#ffffff");

      expect(result).toEqual([]);
    });

    it("should skip $ properties", () => {
      const document = {
        $description: "Test",
        color: {
          primary: { $value: "Test" },
          $metadata: { $value: "Test" },
        },
      };

      const result = workflows.findByValue(document, "Test");

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe("color.primary");
    });

    it("should handle null and undefined values", () => {
      const document = {
        token1: { $value: null },
        token2: { $value: undefined },
        token3: { $value: "test" },
      };

      const resultNull = workflows.findByValue(document, null);
      const resultUndefined = workflows.findByValue(document, undefined);

      expect(resultNull).toHaveLength(1);
      expect(resultNull[0]?.path).toBe("token1");
      expect(resultUndefined).toHaveLength(1);
      expect(resultUndefined[0]?.path).toBe("token2");
    });
  });
});
