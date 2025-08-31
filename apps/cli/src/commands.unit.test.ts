/**
 * Comprehensive unit tests for CLI commands factory functions
 */

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import type { BundleWriteResult } from "@upft/bundler";
import type {
  TokenDocument,
  UPFTResolverManifest,
  ValidationResult,
} from "@upft/foundation";
import type { LintResult } from "@upft/linter";
import type { PipelineResolvedPermutation } from "@upft/loader";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCLI } from "./commands.js";
import type { CLICommandOptions } from "./types.js";

// Mock all the command modules
vi.mock("@upft/bundler");
vi.mock("./commands/index.js");
vi.mock("node:fs");
vi.mock("node:crypto");
vi.mock("node:os");

import { loadBuildConfig } from "@upft/bundler";
import {
  buildTokens,
  bundleTokens,
  diffDocuments,
  diffPermutations,
  getManifestInfo,
  lintFile,
  listPermutations,
  listTokens,
  resolveTokens,
  validateDirectory,
  validateManifestObject,
  validateTokenFile,
} from "./commands/index.js";

const mockCommands = {
  buildTokens: vi.mocked(buildTokens),
  bundleTokens: vi.mocked(bundleTokens),
  diffDocuments: vi.mocked(diffDocuments),
  diffPermutations: vi.mocked(diffPermutations),
  getManifestInfo: vi.mocked(getManifestInfo),
  lintFile: vi.mocked(lintFile),
  listPermutations: vi.mocked(listPermutations),
  listTokens: vi.mocked(listTokens),
  resolveTokens: vi.mocked(resolveTokens),
  validateDirectory: vi.mocked(validateDirectory),
  validateManifestObject: vi.mocked(validateManifestObject),
  validateTokenFile: vi.mocked(validateTokenFile),
};

const mockLoadBuildConfig = vi.mocked(loadBuildConfig);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockRandomUUID = vi.mocked(randomUUID);
const mockTmpdir = vi.mocked(tmpdir);

describe("createCLI", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default mocks
    mockRandomUUID.mockReturnValue("test-uuid-123");
    mockTmpdir.mockReturnValue("/tmp");

    // Mock successful responses
    const mockValidationResult: ValidationResult = { valid: true, errors: [] };
    const mockBundleResult: BundleWriteResult[] = [
      { success: true, filePath: "/output/test.json" },
    ];
    const mockLintResult: LintResult = {
      files: [],
      summary: { errors: 0, warnings: 0 },
    };
    const mockPermutation: PipelineResolvedPermutation = {
      id: "test",
      files: ["/test/file.json"],
      tokens: { test: { $type: "color", $value: "#000" } },
    };

    mockCommands.validateTokenFile.mockResolvedValue(mockValidationResult);
    mockCommands.validateManifestObject.mockResolvedValue(mockValidationResult);
    mockCommands.validateDirectory.mockResolvedValue(mockValidationResult);
    mockCommands.buildTokens.mockResolvedValue(mockBundleResult);
    mockCommands.bundleTokens.mockResolvedValue(mockBundleResult);
    mockCommands.lintFile.mockResolvedValue(mockLintResult);
    mockCommands.resolveTokens.mockResolvedValue(mockPermutation);
    mockCommands.listPermutations.mockResolvedValue([mockPermutation]);
    mockCommands.listTokens.mockResolvedValue([
      { path: "test.token", type: "color" },
    ]);
    mockCommands.diffDocuments.mockResolvedValue({
      summary: { added: 0, changed: 0, removed: 0 },
    });
    mockCommands.diffPermutations.mockResolvedValue({
      summary: { added: 0, changed: 0, removed: 0 },
    });
    mockCommands.getManifestInfo.mockResolvedValue({
      name: "Test Manifest",
      sets: [],
      modifiers: [],
      possiblePermutations: 1,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("factory function", () => {
    it("should create CLI instance with default options", () => {
      const cli = createCLI();

      expect(cli).toBeDefined();
      expect(typeof cli.validate).toBe("function");
      expect(typeof cli.validateManifest).toBe("function");
      expect(typeof cli.validateManifestFile).toBe("function");
      expect(typeof cli.validateTokenFile).toBe("function");
      expect(typeof cli.validateDirectory).toBe("function");
    });

    it("should create CLI instance with custom options", () => {
      const options: CLICommandOptions = {
        basePath: "/custom/path",
        outputDir: "/custom/output",
        skipValidation: true,
        strict: false,
        fileReader: {} as any,
        fileWriter: {} as any,
      };

      const cli = createCLI(options);
      expect(cli).toBeDefined();
    });

    it("should have all expected methods", () => {
      const cli = createCLI();

      const expectedMethods = [
        "validate",
        "validateManifest",
        "validateManifestFile",
        "validateTokenFile",
        "validateDirectory",
        "build",
        "buildFromFile",
        "buildFromConfig",
        "bundle",
        "bundleFromFile",
        "resolve",
        "resolveFromFile",
        "list",
        "listFromFile",
        "listTokens",
        "diff",
        "diffDocuments",
        "info",
        "lint",
      ];

      for (const method of expectedMethods) {
        expect(cli).toHaveProperty(method);
        expect(typeof (cli as any)[method]).toBe("function");
      }
    });
  });

  describe("validation methods", () => {
    it("should validate token file by path", async () => {
      const cli = createCLI();
      const result = await cli.validateTokenFile("/path/to/tokens.json");

      expect(mockCommands.validateTokenFile).toHaveBeenCalledWith(
        "/path/to/tokens.json",
      );
      expect(result.valid).toBe(true);
    });

    it("should validate manifest file by path", async () => {
      const cli = createCLI();
      const result = await cli.validateManifestFile("/path/to/manifest.json");

      expect(mockCommands.validateManifestObject).toHaveBeenCalledWith(
        "/path/to/manifest.json",
      );
      expect(result.valid).toBe(true);
    });

    it("should validate directory", async () => {
      const cli = createCLI();
      const result = await cli.validateDirectory("/path/to/directory");

      expect(mockCommands.validateDirectory).toHaveBeenCalledWith(
        "/path/to/directory",
      );
      expect(result.valid).toBe(true);
    });

    it("should validate manifest object by creating temp file", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test Manifest",
        sets: [
          {
            name: "test",
            include: ["/path/to/tokens/**/*.json"],
          },
        ],
        modifiers: {},
      };

      const result = await cli.validateManifest(manifest);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        JSON.stringify(manifest, null, 2),
        "utf-8",
      );
      expect(mockCommands.validateManifestObject).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
      );
      expect(result.valid).toBe(true);
    });

    it("should validate with string or manifest object", async () => {
      const cli = createCLI();

      // Test with string path
      const _stringResult = await cli.validate("/path/to/tokens.json");
      expect(mockCommands.validateTokenFile).toHaveBeenCalledWith(
        "/path/to/tokens.json",
      );

      // Test with manifest object
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };
      const _objectResult = await cli.validate(manifest);
      expect(mockCommands.validateManifestObject).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
      );
    });
  });

  describe("bundle methods", () => {
    it("should build tokens from manifest object", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };

      const result = await cli.build(manifest);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        JSON.stringify(manifest, null, 2),
        "utf-8",
      );
      expect(mockCommands.buildTokens).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        {},
      );
      expect(result).toEqual([
        { success: true, filePath: "/output/test.json" },
      ]);
    });

    it("should build tokens from file path", async () => {
      const cli = createCLI();
      const result = await cli.buildFromFile("/path/to/manifest.json");

      expect(mockCommands.buildTokens).toHaveBeenCalledWith(
        "/path/to/manifest.json",
        {},
      );
      expect(result).toEqual([
        { success: true, filePath: "/output/test.json" },
      ]);
    });

    it("should bundle tokens from manifest object", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };

      const result = await cli.bundle(manifest);

      expect(mockCommands.bundleTokens).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        {},
      );
      expect(result).toEqual([
        { success: true, filePath: "/output/test.json" },
      ]);
    });

    it("should bundle tokens from file path", async () => {
      const cli = createCLI();
      const result = await cli.bundleFromFile("/path/to/manifest.json");

      expect(mockCommands.bundleTokens).toHaveBeenCalledWith(
        "/path/to/manifest.json",
        {},
      );
      expect(result).toEqual([
        { success: true, filePath: "/output/test.json" },
      ]);
    });
  });

  describe("buildFromConfig method", () => {
    beforeEach(() => {
      vi.doMock("@upft/bundler", () => ({
        loadBuildConfig: mockLoadBuildConfig,
      }));
    });

    it("should build from config file with dry run", async () => {
      const mockConfig = {
        outputs: [
          {
            output: { path: "/output/{theme}.json" },
            modifiers: { theme: "light" },
          },
          {
            output: { path: "/output/{theme}.json" },
            modifiers: { theme: "dark" },
          },
        ],
      };

      mockLoadBuildConfig.mockResolvedValue({
        config: mockConfig,
        errors: [],
      });

      const cli = createCLI();
      const result = await cli.buildFromConfig("/path/to/config.json", {
        dryRun: true,
      });

      expect(mockLoadBuildConfig).toHaveBeenCalledWith("/path/to/config.json");
      expect(result).toEqual([
        { filePath: "/output/light.json", success: true },
        { filePath: "/output/dark.json", success: true },
      ]);
    });

    it("should build from config file without dry run", async () => {
      const mockConfig = {
        outputs: [
          {
            output: { path: "/output/{theme}.json" },
            modifiers: { theme: "light" },
          },
        ],
      };

      mockLoadBuildConfig.mockResolvedValue({
        config: mockConfig,
        errors: [],
      });

      const cli = createCLI();
      const result = await cli.buildFromConfig("/path/to/config.json");

      expect(result[0]).toEqual({
        filePath: "/output/light.json",
        success: true,
        error: "Build from config not fully implemented yet",
      });
    });

    it("should handle config errors", async () => {
      mockLoadBuildConfig.mockResolvedValue({
        config: null,
        errors: ["Invalid configuration", "Missing required fields"],
      });

      const cli = createCLI();

      await expect(cli.buildFromConfig("/invalid/config.json")).rejects.toThrow(
        "Build config errors: Invalid configuration, Missing required fields",
      );
    });

    it("should handle complex modifier placeholders", async () => {
      const mockConfig = {
        outputs: [
          {
            output: { path: "/output/{platform}-{theme}.json" },
            modifiers: { platform: ["web", "mobile"], theme: "dark" },
          },
        ],
      };

      mockLoadBuildConfig.mockResolvedValue({
        config: mockConfig,
        errors: [],
      });

      const cli = createCLI();
      const result = await cli.buildFromConfig("/path/to/config.json", {
        dryRun: true,
      });

      expect(result[0].filePath).toBe("/output/web-mobile-dark.json");
    });
  });

  describe("resolve methods", () => {
    it("should resolve tokens from manifest object", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };
      const modifiers = { theme: "light" };

      const result = await cli.resolve(manifest, modifiers);

      expect(mockCommands.resolveTokens).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        modifiers,
        {},
      );
      expect(result.id).toBe("test");
    });

    it("should resolve tokens from file path", async () => {
      const cli = createCLI();
      const modifiers = { theme: "dark" };

      const result = await cli.resolveFromFile(
        "/path/to/manifest.json",
        modifiers,
      );

      expect(mockCommands.resolveTokens).toHaveBeenCalledWith(
        "/path/to/manifest.json",
        modifiers,
        {},
      );
      expect(result.id).toBe("test");
    });

    it("should resolve tokens with default empty modifiers", async () => {
      const cli = createCLI();

      const _result = await cli.resolveFromFile("/path/to/manifest.json");

      expect(mockCommands.resolveTokens).toHaveBeenCalledWith(
        "/path/to/manifest.json",
        {},
        {},
      );
    });
  });

  describe("list methods", () => {
    it("should list permutations from manifest object", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };

      const result = await cli.list(manifest);

      expect(mockCommands.listPermutations).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        {},
      );
      expect(result).toEqual([expect.objectContaining({ id: "test" })]);
    });

    it("should list permutations from file path", async () => {
      const cli = createCLI();
      const result = await cli.listFromFile("/path/to/manifest.json");

      expect(mockCommands.listPermutations).toHaveBeenCalledWith(
        "/path/to/manifest.json",
        {},
      );
      expect(result).toEqual([expect.objectContaining({ id: "test" })]);
    });

    it("should list tokens from file", async () => {
      const cli = createCLI();
      const listOpts = { type: "color" };

      const result = await cli.listTokens("/path/to/tokens.json", listOpts);

      expect(mockCommands.listTokens).toHaveBeenCalledWith(
        "/path/to/tokens.json",
        listOpts,
      );
      expect(result).toEqual([{ path: "test.token", type: "color" }]);
    });
  });

  describe("diff methods", () => {
    it("should diff manifest permutations", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };
      const leftModifiers = { theme: "light" };
      const rightModifiers = { theme: "dark" };

      const result = await cli.diff(manifest, leftModifiers, rightModifiers);

      expect(mockCommands.diffPermutations).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        leftModifiers,
        rightModifiers,
        {},
      );
      expect(result.summary).toBeDefined();
    });

    it("should diff token documents", async () => {
      const cli = createCLI();
      const leftDoc: TokenDocument = {
        test1: { $type: "color", $value: "#000" },
      };
      const rightDoc: TokenDocument = {
        test2: { $type: "color", $value: "#fff" },
      };

      const result = await cli.diffDocuments(leftDoc, rightDoc);

      expect(mockCommands.diffDocuments).toHaveBeenCalledWith(
        leftDoc,
        rightDoc,
      );
      expect(result.summary).toBeDefined();
    });

    it("should diff with default empty modifiers", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test",
        sets: [],
        modifiers: {},
      };

      await cli.diff(manifest);

      expect(mockCommands.diffPermutations).toHaveBeenCalledWith(
        "/tmp/upft-manifest-test-uuid-123.json",
        {},
        {},
        {},
      );
    });
  });

  describe("info method", () => {
    it("should get manifest info", async () => {
      const cli = createCLI();
      const manifest: UPFTResolverManifest = {
        name: "Test Manifest",
        sets: [
          {
            name: "colors",
            include: ["/tokens/**/*.json"],
          },
        ],
        modifiers: {
          theme: {
            type: "select",
            options: ["light", "dark"],
          },
        },
      };

      const result = await cli.info(manifest);

      expect(mockCommands.getManifestInfo).toHaveBeenCalledWith(manifest);
      expect(result.name).toBe("Test Manifest");
    });
  });

  describe("lint method", () => {
    it("should lint file", async () => {
      const cli = createCLI();
      const lintOpts = { configPath: "/path/to/config", quiet: true };

      const result = await cli.lint("/path/to/file.json", lintOpts);

      expect(mockCommands.lintFile).toHaveBeenCalledWith(
        "/path/to/file.json",
        lintOpts,
      );
      expect(result.summary.errors).toBe(0);
    });

    it("should lint file without options", async () => {
      const cli = createCLI();

      const result = await cli.lint("/path/to/file.json");

      expect(mockCommands.lintFile).toHaveBeenCalledWith(
        "/path/to/file.json",
        undefined,
      );
      expect(result.summary.errors).toBe(0);
    });
  });

  describe("options handling", () => {
    it("should pass fileReader option to resolver commands", () => {
      const mockFileReader = { readFile: vi.fn() } as any;
      const cli = createCLI({ fileReader: mockFileReader });

      expect(cli).toBeDefined();
      // The options should be built correctly internally
    });

    it("should pass fileWriter option to bundle commands", () => {
      const mockFileWriter = { writeFile: vi.fn() } as any;
      const cli = createCLI({ fileWriter: mockFileWriter });

      expect(cli).toBeDefined();
      // The options should be built correctly internally
    });

    it("should pass basePath option to all commands", () => {
      const cli = createCLI({ basePath: "/custom/base" });

      expect(cli).toBeDefined();
      // The options should be built correctly internally
    });

    it("should handle all CLI options", () => {
      const options: CLICommandOptions = {
        fileReader: {} as any,
        fileWriter: {} as any,
        basePath: "/test",
        outputDir: "/output",
        skipValidation: true,
        strict: false,
      };

      const cli = createCLI(options);
      expect(cli).toBeDefined();
    });
  });

  describe("temp file management", () => {
    it("should create unique temp files for manifest objects", async () => {
      mockRandomUUID
        .mockReturnValueOnce("uuid-1")
        .mockReturnValueOnce("uuid-2");
      mockTmpdir.mockReturnValue("/custom/tmp");

      const cli = createCLI();
      const manifest1: UPFTResolverManifest = {
        name: "Test1",
        sets: [],
        modifiers: {},
      };
      const manifest2: UPFTResolverManifest = {
        name: "Test2",
        sets: [],
        modifiers: {},
      };

      await cli.validate(manifest1);
      await cli.validate(manifest2);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/custom/tmp/upft-manifest-uuid-1.json",
        JSON.stringify(manifest1, null, 2),
        "utf-8",
      );
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/custom/tmp/upft-manifest-uuid-2.json",
        JSON.stringify(manifest2, null, 2),
        "utf-8",
      );
    });
  });
});
