import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readManifest } from "./manifest-reader.js";

vi.mock("../io/file-reader.js", () => ({
  TokenFileReader: vi.fn().mockImplementation(() => ({
    readFile: vi.fn(),
  })),
}));

describe("readManifest", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `manifest-reader-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should read and parse a valid manifest file", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [
          { id: "base", name: "Base", files: ["base.json"] },
          { id: "theme", name: "Theme", files: ["theme.json"] },
        ],
        modifiers: {
          mode: ["light", "dark"],
          density: ["comfortable", "compact"],
        },
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    const manifest = await readManifest("manifest.json", tempDir);

    expect(manifest).toEqual({
      sets: [
        { id: "base", name: "Base", files: ["base.json"] },
        { id: "theme", name: "Theme", files: ["theme.json"] },
      ],
      modifiers: {
        mode: ["light", "dark"],
        density: ["comfortable", "compact"],
      },
    });

    expect(mockReadFile).toHaveBeenCalledWith("manifest.json");
    expect(TokenFileReader).toHaveBeenCalledWith({
      basePath: tempDir,
      enableCache: false,
    });
  });

  it("should use process.cwd() as default basePath", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [{ id: "test", name: "Test", files: ["test.json"] }],
        modifiers: { theme: ["light"] },
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    await readManifest("manifest.json");

    expect(TokenFileReader).toHaveBeenCalledWith({
      basePath: process.cwd(),
      enableCache: false,
    });
  });

  it("should throw error when sets is missing", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        modifiers: { mode: ["light", "dark"] },
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    await expect(readManifest("manifest.json", tempDir)).rejects.toThrow(
      "Invalid manifest: missing or invalid 'sets' array in manifest.json",
    );
  });

  it("should throw error when sets is not an array", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: "not-an-array",
        modifiers: { mode: ["light", "dark"] },
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    await expect(readManifest("manifest.json", tempDir)).rejects.toThrow(
      "Invalid manifest: missing or invalid 'sets' array in manifest.json",
    );
  });

  it("should throw error when modifiers is missing", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [{ id: "base", name: "Base", files: ["base.json"] }],
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    await expect(readManifest("manifest.json", tempDir)).rejects.toThrow(
      "Invalid manifest: missing or invalid 'modifiers' object in manifest.json",
    );
  });

  it("should throw error when modifiers is not an object", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [{ id: "base", name: "Base", files: ["base.json"] }],
        modifiers: "not-an-object",
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    await expect(readManifest("manifest.json", tempDir)).rejects.toThrow(
      "Invalid manifest: missing or invalid 'modifiers' object in manifest.json",
    );
  });

  it("should handle complex manifest structures", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [
          {
            id: "primitives",
            name: "Primitives",
            files: ["colors.json", "typography.json", "spacing.json"],
          },
          {
            id: "semantic",
            name: "Semantic",
            files: ["semantic/colors.json", "semantic/typography.json"],
          },
          {
            id: "components",
            name: "Components",
            files: ["components/*.json"],
          },
        ],
        modifiers: {
          theme: ["light", "dark", "high-contrast"],
          platform: ["web", "ios", "android"],
          locale: ["en", "fr", "de"],
        },
        metadata: {
          version: "1.0.0",
          description: "Design system tokens",
        },
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    const manifest = await readManifest("complex-manifest.json", tempDir);

    expect(manifest.sets).toHaveLength(3);
    expect(manifest.modifiers).toHaveProperty("theme");
    expect(manifest.modifiers).toHaveProperty("platform");
    expect(manifest.modifiers).toHaveProperty("locale");
    expect((manifest as any).metadata).toBeDefined();
  });

  it("should handle empty sets array", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [],
        modifiers: {},
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    const manifest = await readManifest("empty-manifest.json", tempDir);

    expect(manifest.sets).toEqual([]);
    expect(manifest.modifiers).toEqual({});
  });

  it("should handle file read errors", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockRejectedValue(new Error("File not found"));

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    await expect(readManifest("nonexistent.json", tempDir)).rejects.toThrow(
      "File not found",
    );
  });

  it("should handle manifest with additional properties", async () => {
    const { TokenFileReader } = await import("../io/file-reader.js");
    const mockReadFile = vi.fn().mockResolvedValue({
      tokens: {
        sets: [{ id: "base", name: "Base", files: ["base.json"] }],
        modifiers: { mode: ["light", "dark"] },
        output: {
          format: "css",
          buildPath: "./dist/",
        },
        transforms: ["color/hex", "size/px"],
      },
    });

    (TokenFileReader as any).mockImplementation(() => ({
      readFile: mockReadFile,
    }));

    const manifest = await readManifest("extended-manifest.json", tempDir);

    expect(manifest.sets).toBeDefined();
    expect(manifest.modifiers).toBeDefined();
    expect((manifest as any).output).toBeDefined();
    expect((manifest as any).transforms).toBeDefined();
  });
});
