import { writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  executeAST,
  executeBundle,
  executeValidate,
  formatError,
  getExitCode,
} from "../cli-commands.ts";

// Mock dependencies
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("../../bundler/api.ts", () => ({
  bundleWithMetadata: vi.fn(),
}));

vi.mock("../../validation/index.ts", () => ({
  validateFiles: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("executeValidate", () => {
  test("returns success when validation passes", async () => {
    const { validateFiles } = await import("../../validation/index.ts");
    vi.mocked(validateFiles).mockResolvedValue(true);

    const result = await executeValidate({ path: "/test/path" });

    expect(result.valid).toBe(true);
    expect(result.message).toContain("passed");
    expect(validateFiles).toHaveBeenCalledWith("/test/path");
  });

  test("returns failure when validation fails", async () => {
    const { validateFiles } = await import("../../validation/index.ts");
    vi.mocked(validateFiles).mockResolvedValue(false);

    const result = await executeValidate({ path: "/test/path" });

    expect(result.valid).toBe(false);
    expect(result.message).toContain("failed");
  });

  test("handles validation errors", async () => {
    const { validateFiles } = await import("../../validation/index.ts");
    const error = new Error("Validation error");
    vi.mocked(validateFiles).mockRejectedValue(error);

    const result = await executeValidate({ path: "/test/path" });

    expect(result.valid).toBe(false);
    expect(result.message).toContain("Validation error");
  });

  test("includes stack trace in verbose mode", async () => {
    const { validateFiles } = await import("../../validation/index.ts");
    const error = new Error("Test error");
    error.stack = "Error: Test error\n  at test.js:1:1";
    vi.mocked(validateFiles).mockRejectedValue(error);

    const result = await executeValidate({
      path: "/test/path",
      verbose: true,
    });

    expect(result.details).toContain("at test.js:1:1");
  });
});

describe("executeBundle", () => {
  test("bundles tokens successfully", async () => {
    const mockTokens = { color: { $value: "#000" } };
    const mockResult = {
      tokens: mockTokens,
      toJSON: () => JSON.stringify(mockTokens, null, 2),
      getAST: () => ({ type: "root" }),
      validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
      metadata: {
        bundleTime: 100,
        manifest: "/test/manifest.json",
        theme: null,
        mode: null,
        format: "json",
        files: { loaded: [], count: 3 },
        stats: {
          totalTokens: 10,
          hasReferences: true,
          totalGroups: 0,
          tokensByType: {},
          tokensWithReferences: 0,
          depth: 1,
        },
        resolvedValues: false,
      },
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    const result = await executeBundle({
      manifest: "/test/manifest.json",
      pretty: true,
    });

    expect(result.tokens).toEqual(mockTokens);
    expect(result.output).toContain('"color"');
    expect(result.metadata).toEqual({
      filesLoaded: 3,
      totalTokens: 10,
      hasReferences: true,
    });
  });

  test("writes output to file when specified", async () => {
    const mockTokens = { test: true };
    const mockResult = {
      tokens: mockTokens,
      toJSON: () => JSON.stringify(mockTokens),
      getAST: () => ({ type: "root" }),
      validate: vi.fn().mockResolvedValue({ valid: true }),
      metadata: null,
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    await executeBundle({
      manifest: "/test/manifest.json",
      output: "/output/tokens.json",
    });

    expect(writeFile).toHaveBeenCalledWith(
      "/output/tokens.json",
      expect.any(String),
    );
  });

  test("includes validation errors when not resolving", async () => {
    const mockResult = {
      tokens: {},
      toJSON: () => "{}",
      getAST: () => ({ type: "root" }),
      validate: vi.fn().mockResolvedValue({
        valid: false,
        errors: ["Error 1", "Error 2"],
      }),
      metadata: {
        bundleTime: 50,
        manifest: "/test/manifest.json",
        theme: null,
        mode: null,
        format: "json",
        files: { loaded: [], count: 1 },
        stats: {
          totalTokens: 5,
          hasReferences: true,
          totalGroups: 0,
          tokensByType: {},
          tokensWithReferences: 0,
          depth: 1,
        },
        resolvedValues: false,
      },
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    const result = await executeBundle({
      manifest: "/test/manifest.json",
      resolveRefs: false,
    });

    expect(result.metadata?.validationErrors).toEqual(["Error 1", "Error 2"]);
  });

  test("handles different format options", async () => {
    const mockResult = {
      tokens: { test: 1 },
      toJSON: () => "{}",
      getAST: () => ({ type: "root" }),
      validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
      metadata: null,
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    await executeBundle({
      manifest: "/test/manifest.json",
      format: "dtcg",
      theme: "dark",
      mode: "compact",
    });

    expect(bundleWithMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "dtcg",
        theme: "dark",
        mode: "compact",
      }),
    );
  });

  test("handles resolve options correctly", async () => {
    const mockResult = {
      tokens: {},
      toJSON: () => "{}",
      getAST: () => ({ type: "root" }),
      validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
      metadata: null,
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    // Test resolve all refs
    await executeBundle({
      manifest: "/test/manifest.json",
      resolveRefs: true,
      resolveExternal: false,
    });

    expect(bundleWithMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        resolveValues: true,
      }),
    );

    // Test external only (falls back to false)
    await executeBundle({
      manifest: "/test/manifest.json",
      resolveRefs: true,
      resolveExternal: true,
    });

    expect(bundleWithMetadata).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resolveValues: false,
      }),
    );
  });
});

describe("executeAST", () => {
  test("generates AST successfully", async () => {
    const mockAST = { type: "root", tokens: [] };
    const mockResult = {
      tokens: {},
      toJSON: () => "{}",
      getAST: () => mockAST,
      validate: vi.fn().mockResolvedValue({ valid: true }),
      metadata: {
        bundleTime: 75,
        manifest: "/test/manifest.json",
        theme: null,
        mode: null,
        format: "json",
        files: { loaded: [], count: 1 },
        stats: {
          totalTokens: 5,
          hasReferences: false,
          totalGroups: 0,
          tokensByType: {},
          tokensWithReferences: 0,
          depth: 1,
        },
        resolvedValues: false,
      },
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    const result = await executeAST({
      manifest: "/test/manifest.json",
      theme: "light",
    });

    expect(result.ast).toEqual(mockAST);
    expect(result.metadata.theme).toBe("light");
    expect(result.metadata.generated).toBeDefined();
    expect(result.output).toContain('"type"');
  });

  test("writes AST to file when specified", async () => {
    const mockAST = { test: true };
    const mockResult = {
      tokens: {},
      toJSON: () => "{}",
      getAST: () => mockAST,
      validate: vi.fn().mockResolvedValue({ valid: true }),
      metadata: null,
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    await executeAST({
      manifest: "/test/manifest.json",
      output: "/output/ast.json",
      pretty: false,
    });

    expect(writeFile).toHaveBeenCalledWith(
      "/output/ast.json",
      expect.any(String),
    );
  });

  test("formats output based on pretty option", async () => {
    const mockAST = { nested: { value: 1 } };
    const mockResult = {
      tokens: {},
      toJSON: () => "{}",
      getAST: () => mockAST,
      validate: vi.fn().mockResolvedValue({ valid: true }),
      metadata: null,
    };

    const { bundleWithMetadata } = await import("../../bundler/api.ts");
    vi.mocked(bundleWithMetadata).mockResolvedValue(mockResult);

    // Pretty format
    const result1 = await executeAST({
      manifest: "/test/manifest.json",
      pretty: true,
    });
    expect(result1.output).toContain("\n");

    // Compact format
    const result2 = await executeAST({
      manifest: "/test/manifest.json",
      pretty: false,
    });
    expect(result2.output).not.toContain("\n");
  });
});

describe("formatError", () => {
  test("formats error message", () => {
    const error = new Error("Test error");
    const result = formatError(error);
    expect(result).toBe("Test error");
  });

  test("includes stack trace in verbose mode", () => {
    const error = new Error("Test error");
    error.stack = "Error: Test error\n  at test:1:1";
    const result = formatError(error, true);
    expect(result).toContain("Test error");
    expect(result).toContain("at test:1:1");
  });

  test("handles non-Error objects", () => {
    const result = formatError("String error");
    expect(result).toBe("String error");
  });

  test("handles objects without message", () => {
    const result = formatError({ toString: () => "Custom error" });
    expect(result).toBe("Custom error");
  });
});

describe("getExitCode", () => {
  test("returns 0 for true", () => {
    expect(getExitCode(true)).toBe(0);
  });

  test("returns 1 for false", () => {
    expect(getExitCode(false)).toBe(1);
  });

  test("returns 0 for valid result", () => {
    expect(getExitCode({ valid: true })).toBe(0);
  });

  test("returns 1 for invalid result", () => {
    expect(getExitCode({ valid: false })).toBe(1);
  });

  test("returns 1 for result without valid property", () => {
    expect(getExitCode({})).toBe(1);
  });
});
