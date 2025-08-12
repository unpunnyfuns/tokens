import { promises as fs } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { validateFile, validateFiles } from "../cli-validator";
import * as tokenValidator from "../token-validator";
import * as utils from "../utils";

// Mock dependencies
vi.mock("../token-validator");
vi.mock("../utils");
vi.mock("node:fs", () => ({
  promises: {
    stat: vi.fn(),
  },
}));

// Mock console methods to verify output
const consoleMocks = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

beforeEach(() => {
  vi.clearAllMocks();
  consoleMocks.log.mockClear();
  consoleMocks.error.mockClear();

  // Default mock implementations
  vi.mocked(utils.getProjectRoot).mockReturnValue("/project");
  vi.mocked(utils.findJsonFiles).mockResolvedValue([]);
});

describe("validateFiles", () => {
  test("outputs success for valid files", async () => {
    // Mock as directory
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    } as any);

    vi.mocked(utils.findJsonFiles)
      .mockResolvedValueOnce(["/project/tokens/valid.json"])
      .mockResolvedValueOnce(["/project/schemas/base.schema.json"]);

    vi.mocked(tokenValidator.validateTokenFiles).mockResolvedValue({
      valid: true,
      results: [
        {
          filePath: "/project/tokens/valid.json",
          valid: true,
        },
      ],
      summary: {
        total: 1,
        valid: 1,
        invalid: 0,
        skipped: 0,
      },
    });

    const result = await validateFiles("/project/tokens");

    expect(result).toBe(true);
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("✅ Validation successful"),
    );
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("Valid files: 1"),
    );
  });

  test("outputs errors for invalid files", async () => {
    // Mock as directory
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    } as any);

    vi.mocked(utils.findJsonFiles)
      .mockResolvedValueOnce(["/project/tokens/invalid.json"])
      .mockResolvedValueOnce([]);

    vi.mocked(tokenValidator.validateTokenFiles).mockResolvedValue({
      valid: false,
      results: [
        {
          filePath: "/project/tokens/invalid.json",
          valid: false,
          errors: ["Missing required property"],
        },
      ],
      summary: {
        total: 1,
        valid: 0,
        invalid: 1,
        skipped: 0,
      },
    });

    const result = await validateFiles("/project/tokens");

    expect(result).toBe(false);
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("❌ Validation failed"),
    );
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("Missing required property"),
    );
  });

  test("outputs skip messages for skipped files", async () => {
    // Mock as directory
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    } as any);

    vi.mocked(utils.findJsonFiles)
      .mockResolvedValueOnce(["/project/tokens/no-schema.json"])
      .mockResolvedValueOnce([]);

    vi.mocked(tokenValidator.validateTokenFiles).mockResolvedValue({
      valid: true,
      results: [
        {
          filePath: "/project/tokens/no-schema.json",
          valid: false,
          skipped: true,
          skipReason: "No $schema property found",
        },
      ],
      summary: {
        total: 1,
        valid: 0,
        invalid: 0,
        skipped: 1,
      },
    });

    const result = await validateFiles("/project/tokens");

    expect(result).toBe(true);
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Skipping"),
    );
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("No $schema property found"),
    );
  });

  test("handles errors gracefully", async () => {
    // Mock as directory
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    } as any);

    vi.mocked(utils.findJsonFiles).mockRejectedValue(
      new Error("Permission denied"),
    );

    const result = await validateFiles("/project/tokens");

    expect(result).toBe(false);
    expect(consoleMocks.error).toHaveBeenCalledWith(
      expect.stringContaining("Permission denied"),
    );
  });
});

describe("validateFile", () => {
  test("outputs success for valid file", async () => {
    vi.mocked(tokenValidator.validateTokenFile).mockResolvedValue({
      filePath: "/project/tokens/valid.json",
      valid: true,
    });

    const result = await validateFile("/project/tokens/valid.json");

    expect(result).toBe(true);
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("✅ Validation successful"),
    );
  });

  test("outputs errors for invalid file", async () => {
    vi.mocked(tokenValidator.validateTokenFile).mockResolvedValue({
      filePath: "/project/tokens/invalid.json",
      valid: false,
      errors: ["Invalid token structure"],
    });

    const result = await validateFile("/project/tokens/invalid.json");

    expect(result).toBe(false);
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("❌ Validation failed"),
    );
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("Invalid token structure"),
    );
  });

  test("outputs skip message for skipped file", async () => {
    vi.mocked(tokenValidator.validateTokenFile).mockResolvedValue({
      filePath: "/project/tokens/no-schema.json",
      valid: false,
      skipped: true,
      skipReason: "No $schema property found",
    });

    const result = await validateFile("/project/tokens/no-schema.json");

    expect(result).toBe(false);
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Skipping"),
    );
  });

  test("handles errors gracefully", async () => {
    vi.mocked(tokenValidator.validateTokenFile).mockRejectedValue(
      new Error("File not found"),
    );

    const result = await validateFile("/project/tokens/missing.json");

    expect(result).toBe(false);
    expect(consoleMocks.error).toHaveBeenCalledWith(
      expect.stringContaining("File not found"),
    );
  });
});
