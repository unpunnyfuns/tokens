import { beforeEach, describe, expect, it, vi } from "vitest";
import * as analyzer from "../analysis/token-analyzer.js";
import * as astBuilder from "../ast/ast-builder.js";
import * as astQuery from "../ast/query.js";
import * as astResolver from "../ast/resolver.js";
import * as astTraverser from "../ast/ast-traverser.js";
import * as merge from "../core/merge.js";
import { TokenFileReader } from "../io/file-reader.js";
import * as manifestCore from "../manifest/manifest-core.js";
import * as manifestReader from "../manifest/manifest-reader.js";
import * as validation from "../validation/index.js";
import {
  buildModifiers,
  createBundleMetadata,
  createValidationFunction,
  extractASTInfo,
  loadFromFiles,
  loadFromManifest,
} from "./bundle-helpers.js";

// Mock dependencies
vi.mock("../analysis/token-analyzer.js", () => ({
  countGroups: vi.fn(),
}));

vi.mock("../ast/ast-builder.js", () => ({
  createAST: vi.fn(),
}));

vi.mock("../ast/query.js", () => ({
  findAllTokens: vi.fn(),
  getStatistics: vi.fn(),
}));

vi.mock("../ast/resolver.js", () => ({
  resolveASTReferences: vi.fn(),
}));

vi.mock("../ast/ast-traverser.js", () => ({
  visitGroups: vi.fn(),
}));

vi.mock("../core/merge.js", () => ({
  merge: vi.fn(),
}));

vi.mock("../io/file-reader.js");

vi.mock("../manifest/manifest-core.js", () => ({
  resolvePermutation: vi.fn(),
}));

vi.mock("../manifest/manifest-reader.js", () => ({
  readManifest: vi.fn(),
}));

vi.mock("../validation/index.js", () => ({
  validateTokens: vi.fn(),
}));

describe("Bundle Helpers", () => {
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
    type: "group" as const,
    path: "",
    name: "root",
    children: new Map(),
  };

  const mockTokenNodes = [
    {
      type: "token",
      path: "color.primary",
      value: { $value: "#007acc", $type: "color" },
    },
    {
      type: "token",
      path: "color.secondary",
      value: { $value: "#6c757d", $type: "color" },
    },
  ];

  describe("buildModifiers", () => {
    it("should build modifiers from theme option", () => {
      const result = buildModifiers({ theme: "dark" });
      expect(result).toEqual({ theme: "dark" });
    });

    it("should build modifiers from mode option", () => {
      const result = buildModifiers({ mode: "compact" });
      expect(result).toEqual({ mode: "compact" });
    });

    it("should merge custom modifiers", () => {
      const result = buildModifiers({
        theme: "dark",
        mode: "compact",
        modifiers: {
          density: "high",
          lang: "en",
        },
      });

      expect(result).toEqual({
        theme: "dark",
        mode: "compact",
        density: "high",
        lang: "en",
      });
    });

    it("should override theme and mode with custom modifiers", () => {
      const result = buildModifiers({
        theme: "dark",
        modifiers: {
          theme: "light",
        },
      });

      expect(result).toEqual({ theme: "light" });
    });

    it("should return empty object for no options", () => {
      const result = buildModifiers({});
      expect(result).toEqual({});
    });
  });

  describe("loadFromManifest", () => {
    it("should load tokens from manifest with modifiers", async () => {
      const mockManifest = {
        version: "1.0",
        sets: [
          {
            id: "base",
            values: ["base.json", "colors.json"],
          },
          {
            id: "theme",
            values: ["theme.json"],
          },
        ],
      };

      (manifestReader.readManifest as any).mockResolvedValue(mockManifest);
      (manifestCore.resolvePermutation as any).mockResolvedValue({
        tokens: mockTokens,
      });

      const result = await loadFromManifest("manifest.json", {
        theme: "dark",
      });

      expect(manifestReader.readManifest).toHaveBeenCalledWith("manifest.json");
      expect(manifestCore.resolvePermutation).toHaveBeenCalledWith(
        mockManifest,
        { theme: "dark" },
      );
      expect(result.tokens).toEqual(mockTokens);
      expect(result.filePaths).toEqual([
        "base.json",
        "colors.json",
        "theme.json",
      ]);
    });

    it("should handle manifest without sets", async () => {
      const mockManifest = {
        version: "1.0",
      };

      (manifestReader.readManifest as any).mockResolvedValue(mockManifest);
      (manifestCore.resolvePermutation as any).mockResolvedValue({
        tokens: mockTokens,
      });

      const result = await loadFromManifest("manifest.json", {});

      expect(result.tokens).toEqual(mockTokens);
      expect(result.filePaths).toEqual([]);
    });

    it("should pass empty modifiers when none provided", async () => {
      const mockManifest = { version: "1.0" };

      (manifestReader.readManifest as any).mockResolvedValue(mockManifest);
      (manifestCore.resolvePermutation as any).mockResolvedValue({
        tokens: {},
      });

      await loadFromManifest("manifest.json", {});

      expect(manifestCore.resolvePermutation).toHaveBeenCalledWith(
        mockManifest,
        {},
      );
    });
  });

  describe("loadFromFiles", () => {
    it("should load and merge tokens from multiple files", async () => {
      const mockReader = {
        readFile: vi.fn(),
      };

      (TokenFileReader as any).mockImplementation(() => mockReader);

      const file1Tokens = {
        color: { primary: { $value: "#007acc" } },
      };
      const file2Tokens = {
        spacing: { small: { $value: "4px" } },
      };

      mockReader.readFile
        .mockResolvedValueOnce({ tokens: file1Tokens })
        .mockResolvedValueOnce({ tokens: file2Tokens });

      (merge.merge as any)
        .mockReturnValueOnce(file1Tokens)
        .mockReturnValueOnce(mockTokens);

      const result = await loadFromFiles(["file1.json", "file2.json"]);

      expect(mockReader.readFile).toHaveBeenCalledWith("file1.json");
      expect(mockReader.readFile).toHaveBeenCalledWith("file2.json");
      expect(merge.merge).toHaveBeenCalledWith({}, file1Tokens);
      expect(merge.merge).toHaveBeenCalledWith(file1Tokens, file2Tokens);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.filePaths).toEqual(["file1.json", "file2.json"]);
    });

    it("should handle single file", async () => {
      const mockReader = {
        readFile: vi.fn().mockResolvedValue({ tokens: mockTokens }),
      };

      (TokenFileReader as any).mockImplementation(() => mockReader);
      (merge.merge as any).mockReturnValue(mockTokens);

      const result = await loadFromFiles(["single.json"]);

      expect(mockReader.readFile).toHaveBeenCalledWith("single.json");
      expect(result.tokens).toEqual(mockTokens);
      expect(result.filePaths).toEqual(["single.json"]);
    });

    it("should handle empty file list", async () => {
      const result = await loadFromFiles([]);

      expect(result.tokens).toEqual({});
      expect(result.filePaths).toEqual([]);
    });
  });

  describe("createBundleMetadata", () => {
    it("should create metadata from tokens and file paths", () => {
      const startTime = Date.now() - 100;

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findAllTokens as any).mockReturnValue(mockTokenNodes);
      (astQuery.getStatistics as any).mockReturnValue({
        totalTokens: 3,
        totalGroups: 2,
        tokensWithReferences: 1,
      });
      (analyzer.countGroups as any).mockReturnValue(2);

      const result = createBundleMetadata(
        mockTokens,
        ["file1.json", "file2.json"],
        startTime,
      );

      expect(astBuilder.createAST).toHaveBeenCalledWith(mockTokens);
      expect(astQuery.findAllTokens).toHaveBeenCalledWith(mockAST);
      expect(astQuery.getStatistics).toHaveBeenCalledWith(mockAST);
      expect(analyzer.countGroups).toHaveBeenCalledWith(mockTokens);

      expect(result.files.count).toBe(2);
      expect(result.files.paths).toEqual(["file1.json", "file2.json"]);
      expect(result.stats.totalTokens).toBe(2);
      expect(result.stats.totalGroups).toBe(2);
      expect(result.stats.hasReferences).toBe(true);
      expect(result.bundleTime).toBeGreaterThan(0);
    });

    it("should handle tokens without references", () => {
      const startTime = Date.now();

      (astBuilder.createAST as any).mockReturnValue(mockAST);
      (astQuery.findAllTokens as any).mockReturnValue([]);
      (astQuery.getStatistics as any).mockReturnValue({
        totalTokens: 0,
        totalGroups: 0,
        tokensWithReferences: 0,
      });
      (analyzer.countGroups as any).mockReturnValue(0);

      const result = createBundleMetadata({}, [], startTime);

      expect(result.stats.hasReferences).toBe(false);
      expect(result.stats.totalTokens).toBe(0);
      expect(result.stats.totalGroups).toBe(0);
    });
  });

  describe("createValidationFunction", () => {
    it("should create validation function that validates tokens and references", async () => {
      (validation.validateTokens as any).mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      (astResolver.resolveASTReferences as any).mockReturnValue([]);

      (astQuery.getStatistics as any).mockReturnValue({
        totalTokens: 5,
        tokensWithReferences: 2,
      });

      const validateFn = createValidationFunction(mockTokens, mockAST);
      const result = await validateFn();

      expect(validation.validateTokens).toHaveBeenCalledWith(mockTokens, {
        strict: true,
      });
      expect(astResolver.resolveASTReferences).toHaveBeenCalledWith(mockAST);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.stats?.totalTokens).toBe(5);
      expect(result.stats?.tokensWithReferences).toBe(2);
      expect(result.stats?.validReferences).toBe(2);
      expect(result.stats?.invalidReferences).toBe(0);
    });

    it("should handle validation errors", async () => {
      (validation.validateTokens as any).mockReturnValue({
        valid: false,
        errors: [
          {
            path: "color.primary",
            message: "Invalid color format",
            severity: "error",
            rule: "format",
          },
        ],
        warnings: [],
      });

      (astResolver.resolveASTReferences as any).mockReturnValue([]);
      (astQuery.getStatistics as any).mockReturnValue({
        totalTokens: 2,
        tokensWithReferences: 0,
      });

      const validateFn = createValidationFunction(mockTokens, mockAST);
      const result = await validateFn();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe("Invalid color format");
    });

    it("should handle reference resolution errors", async () => {
      (validation.validateTokens as any).mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      (astResolver.resolveASTReferences as any).mockReturnValue([
        {
          path: "color.brand",
          message: "Unresolved reference",
          type: "missing",
        },
      ]);

      (astQuery.getStatistics as any).mockReturnValue({
        totalTokens: 3,
        tokensWithReferences: 1,
      });

      const validateFn = createValidationFunction(mockTokens, mockAST);
      const result = await validateFn();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe("Unresolved reference");
      expect(result.errors[0]?.rule).toBe("reference");
      expect(result.stats?.invalidReferences).toBe(1);
      expect(result.stats?.validReferences).toBe(0);
    });

    it("should combine validation and reference errors", async () => {
      (validation.validateTokens as any).mockReturnValue({
        valid: false,
        errors: [
          {
            path: "spacing.small",
            message: "Invalid dimension",
            severity: "error",
            rule: "format",
          },
        ],
        warnings: [
          {
            path: "color.deprecated",
            message: "Token is deprecated",
            severity: "warning",
            rule: "deprecation",
          },
        ],
      });

      (astResolver.resolveASTReferences as any).mockReturnValue([
        {
          path: "color.brand",
          message: "Circular reference",
          type: "circular",
        },
      ]);

      (astQuery.getStatistics as any).mockReturnValue({
        totalTokens: 5,
        tokensWithReferences: 3,
      });

      const validateFn = createValidationFunction(mockTokens, mockAST);
      const result = await validateFn();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.stats?.invalidReferences).toBe(1);
      expect(result.stats?.validReferences).toBe(2);
    });
  });

  describe("extractASTInfo", () => {
    it("should extract tokens and groups from AST", () => {
      (astQuery.findAllTokens as any).mockReturnValue(mockTokenNodes);

      // Mock visitGroups to simulate finding 3 groups
      (astTraverser.visitGroups as any).mockImplementation(
        (_ast: any, visitor: any) => {
          visitor({ type: "group", path: "", name: "root" });
          visitor({ type: "group", path: "color", name: "color" });
          visitor({ type: "group", path: "spacing", name: "spacing" });
        },
      );

      const tokens = {
        color: {
          primary: { $value: "#007acc" },
          secondary: { $value: "#6c757d" },
        },
        spacing: {
          small: { $value: "4px" },
        },
      };

      const result = extractASTInfo(tokens, mockAST);

      expect(astQuery.findAllTokens).toHaveBeenCalledWith(mockAST);
      expect(result.tokens).toEqual(mockTokenNodes);
      expect(result.groups).toHaveLength(3); // root, color and spacing groups
      expect(result.references).toEqual([]);
    });

    it("should identify groups correctly", () => {
      (astQuery.findAllTokens as any).mockReturnValue([]);

      // Mock visitGroups to simulate finding 4 groups
      (astTraverser.visitGroups as any).mockImplementation(
        (_ast: any, visitor: any) => {
          visitor({ type: "group", path: "", name: "root" });
          visitor({
            type: "group",
            path: "groupWithTokens",
            name: "groupWithTokens",
          });
          visitor({
            type: "group",
            path: "nestedGroups",
            name: "nestedGroups",
          });
          visitor({
            type: "group",
            path: "nestedGroups.subGroup",
            name: "subGroup",
          });
        },
      );

      const tokens = {
        tokenValue: { $value: "test" },
        groupWithTokens: {
          token1: { $value: "val1" },
          token2: { $value: "val2" },
        },
        nestedGroups: {
          subGroup: {
            deepToken: { $value: "deep" },
          },
        },
        $metadata: "should be ignored",
      };

      const result = extractASTInfo(tokens, mockAST);

      // Should find root, groupWithTokens, nestedGroups, and nestedGroups.subGroup
      expect(result.groups).toHaveLength(4);
      expect(result.groups[0]).toHaveProperty("path");
    });

    it("should handle empty tokens", () => {
      (astQuery.findAllTokens as any).mockReturnValue([]);

      // Mock visitGroups to simulate empty AST (no groups)
      (astTraverser.visitGroups as any).mockImplementation(() => {
        // Intentionally empty - no groups to visit
      });

      const result = extractASTInfo({}, mockAST);

      expect(result.tokens).toEqual([]);
      expect(result.groups).toEqual([]);
      expect(result.references).toEqual([]);
    });

    it("should skip $ properties when collecting groups", () => {
      (astQuery.findAllTokens as any).mockReturnValue([]);

      // Mock visitGroups to simulate finding 2 groups
      (astTraverser.visitGroups as any).mockImplementation(
        (_ast: any, visitor: any) => {
          visitor({ type: "group", path: "", name: "root" });
          visitor({ type: "group", path: "validGroup", name: "validGroup" });
        },
      );

      const tokens = {
        $description: "Root description",
        validGroup: {
          token: { $value: "test" },
          $description: "Group description",
        },
      };

      const result = extractASTInfo(tokens, mockAST);

      expect(result.groups).toHaveLength(2); // root and validGroup
      const paths = result.groups.map((g: any) => g.path);
      expect(paths).toContain("validGroup");
    });

    it("should collect deeply nested groups", () => {
      (astQuery.findAllTokens as any).mockReturnValue([]);

      // Mock visitGroups to simulate finding 5 groups
      (astTraverser.visitGroups as any).mockImplementation(
        (_ast: any, visitor: any) => {
          visitor({ type: "group", path: "", name: "root" });
          visitor({ type: "group", path: "level1", name: "level1" });
          visitor({ type: "group", path: "level1.level2", name: "level2" });
          visitor({
            type: "group",
            path: "level1.level2.level3",
            name: "level3",
          });
          visitor({
            type: "group",
            path: "level1.level2.level3.level4",
            name: "level4",
          });
        },
      );

      const tokens = {
        level1: {
          level2: {
            level3: {
              level4: {
                token: { $value: "deep" },
              },
            },
          },
        },
      };

      const result = extractASTInfo(tokens, mockAST);

      // Should find root plus all 4 levels of groups
      expect(result.groups).toHaveLength(5);
      const paths = result.groups.map((g: any) => g.path);
      expect(paths).toContain("level1");
      expect(paths).toContain("level1.level2");
      expect(paths).toContain("level1.level2.level3");
      expect(paths).toContain("level1.level2.level3.level4");
    });

    it("should handle mixed tokens and groups", () => {
      (astQuery.findAllTokens as any).mockReturnValue([
        { path: "direct", value: { $value: "test" } },
      ]);

      // Mock visitGroups to simulate finding 3 groups
      (astTraverser.visitGroups as any).mockImplementation(
        (_ast: any, visitor: any) => {
          visitor({ type: "group", path: "", name: "root" });
          visitor({ type: "group", path: "group1", name: "group1" });
          visitor({ type: "group", path: "group1.subGroup", name: "subGroup" });
        },
      );

      const tokens = {
        direct: { $value: "test" },
        group1: {
          token1: { $value: "val1" },
          subGroup: {
            token2: { $value: "val2" },
          },
        },
      };

      const result = extractASTInfo(tokens, mockAST);

      expect(result.tokens).toHaveLength(1);
      expect(result.groups).toHaveLength(3); // root, group1 and group1.subGroup
    });
  });
});
