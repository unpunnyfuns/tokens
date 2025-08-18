import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import type { TokenDocument } from "../types.js";
import { TokenFileSystem } from "./token-file-system.js";

// Mock dependencies
vi.mock("../io/file-reader.js", () => ({
  TokenFileReader: vi.fn().mockImplementation(() => ({
    readFile: vi.fn(),
  })),
}));

vi.mock("../manifest/manifest-reader.js", () => ({
  readManifest: vi.fn(),
}));

vi.mock("../manifest/manifest-core.js", () => ({
  resolvePermutation: vi.fn(),
}));

describe("TokenFileSystem", () => {
  let fileSystem: TokenFileSystem;

  const mockTokenDoc: TokenDocument = {
    color: {
      primary: { $value: "#007acc", $type: "color" },
      secondary: { $value: "#6c757d", $type: "color" },
    },
    spacing: {
      small: { $value: "4px", $type: "dimension" },
    },
  };

  const mockManifest: UPFTResolverManifest = {
    sets: [{ values: ["base.json"] }, { values: ["theme.json"] }],
    modifiers: {
      theme: {
        oneOf: ["light", "dark"],
        values: {
          light: ["light.json"],
          dark: ["dark.json"],
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem = new TokenFileSystem();
  });

  describe("addDocument", () => {
    it("should add a single document", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const mockReadFile = vi.fn().mockResolvedValue({
        tokens: mockTokenDoc,
      });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocument("tokens.json");

      expect(mockReadFile).toHaveBeenCalledWith("tokens.json");
      expect(newFileSystem.getDocument("tokens.json")).toEqual(mockTokenDoc);
    });

    it("should handle multiple documents with same path", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const firstDoc = { first: { $value: "first" } };
      const secondDoc = { second: { $value: "second" } };

      const mockReadFile = vi
        .fn()
        .mockResolvedValueOnce({ tokens: firstDoc })
        .mockResolvedValueOnce({ tokens: secondDoc });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocument("tokens.json");
      await newFileSystem.addDocument("tokens.json");

      // Second should overwrite first
      expect(newFileSystem.getDocument("tokens.json")).toEqual(secondDoc);
    });
  });

  describe("addDocuments", () => {
    it("should add multiple documents", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const doc1 = { color: { $value: "#000" } };
      const doc2 = { spacing: { $value: "8px" } };
      const doc3 = { typography: { $value: "Arial" } };

      const mockReadFile = vi
        .fn()
        .mockResolvedValueOnce({ tokens: doc1 })
        .mockResolvedValueOnce({ tokens: doc2 })
        .mockResolvedValueOnce({ tokens: doc3 });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocuments(["doc1.json", "doc2.json", "doc3.json"]);

      expect(mockReadFile).toHaveBeenCalledTimes(3);
      expect(newFileSystem.getDocument("doc1.json")).toEqual(doc1);
      expect(newFileSystem.getDocument("doc2.json")).toEqual(doc2);
      expect(newFileSystem.getDocument("doc3.json")).toEqual(doc3);
    });

    it("should handle empty array", async () => {
      await fileSystem.addDocuments([]);

      expect(fileSystem.getDocuments()).toEqual([]);
    });

    it("should handle errors in individual documents", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const mockReadFile = vi
        .fn()
        .mockResolvedValueOnce({ tokens: mockTokenDoc })
        .mockRejectedValueOnce(new Error("File not found"))
        .mockResolvedValueOnce({ tokens: { third: { $value: "third" } } });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));

      const newFileSystem = new TokenFileSystem();

      await expect(
        newFileSystem.addDocuments(["doc1.json", "doc2.json", "doc3.json"]),
      ).rejects.toThrow("File not found");

      // First document should be added before error
      expect(newFileSystem.getDocument("doc1.json")).toEqual(mockTokenDoc);
    });
  });

  describe("addManifest", () => {
    it("should add manifest without resolving", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      (readManifest as any).mockResolvedValue(mockManifest);

      await fileSystem.addManifest("manifest.json");

      expect(readManifest).toHaveBeenCalledWith("manifest.json");
      expect(fileSystem.getManifest("manifest.json")).toEqual(mockManifest);
    });

    it("should add manifest and resolve with modifiers", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      const { resolvePermutation } = await import(
        "../manifest/manifest-core.js"
      );

      const resolvedTokens = {
        color: { primary: { $value: "#resolved" } },
      };

      (readManifest as any).mockResolvedValue(mockManifest);
      (resolvePermutation as any).mockResolvedValue({
        tokens: resolvedTokens,
      });

      await fileSystem.addManifest("manifest.json", { theme: "light" });

      expect(readManifest).toHaveBeenCalledWith("manifest.json");
      expect(resolvePermutation).toHaveBeenCalledWith(mockManifest, {
        theme: "light",
      });
      expect(fileSystem.getManifest("manifest.json")).toEqual(mockManifest);
      expect(fileSystem.getDocument("manifest.json:resolved")).toEqual(
        resolvedTokens,
      );
    });

    it("should handle manifest read errors", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      (readManifest as any).mockRejectedValue(new Error("Invalid manifest"));

      await expect(fileSystem.addManifest("invalid.json")).rejects.toThrow(
        "Invalid manifest",
      );
    });

    it("should handle resolution errors", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      const { resolvePermutation } = await import(
        "../manifest/manifest-core.js"
      );

      (readManifest as any).mockResolvedValue(mockManifest);
      (resolvePermutation as any).mockRejectedValue(
        new Error("Resolution failed"),
      );

      await expect(
        fileSystem.addManifest("manifest.json", { invalid: "modifier" }),
      ).rejects.toThrow("Resolution failed");

      // Manifest should still be added even if resolution fails
      expect(fileSystem.getManifest("manifest.json")).toEqual(mockManifest);
    });
  });

  describe("getDocuments", () => {
    it("should return all documents", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const doc1 = { color: { $value: "#000" } };
      const doc2 = { spacing: { $value: "8px" } };

      const mockReadFile = vi
        .fn()
        .mockResolvedValueOnce({ tokens: doc1 })
        .mockResolvedValueOnce({ tokens: doc2 });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocument("doc1.json");
      await newFileSystem.addDocument("doc2.json");

      const documents = newFileSystem.getDocuments();
      expect(documents).toHaveLength(2);
      expect(documents).toContainEqual(doc1);
      expect(documents).toContainEqual(doc2);
    });

    it("should return empty array when no documents", () => {
      expect(fileSystem.getDocuments()).toEqual([]);
    });
  });

  describe("getDocument", () => {
    it("should return document by path", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const mockReadFile = vi.fn().mockResolvedValue({
        tokens: mockTokenDoc,
      });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocument("tokens.json");

      expect(newFileSystem.getDocument("tokens.json")).toEqual(mockTokenDoc);
    });

    it("should return undefined for non-existent path", () => {
      expect(fileSystem.getDocument("non-existent.json")).toBeUndefined();
    });
  });

  describe("getManifests", () => {
    it("should return all manifests", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      const manifest1 = { ...mockManifest, id: "manifest1" };
      const manifest2 = { ...mockManifest, id: "manifest2" };

      (readManifest as any)
        .mockResolvedValueOnce(manifest1)
        .mockResolvedValueOnce(manifest2);

      await fileSystem.addManifest("manifest1.json");
      await fileSystem.addManifest("manifest2.json");

      const manifests = fileSystem.getManifests();
      expect(manifests).toHaveLength(2);
      expect(manifests).toContainEqual(manifest1);
      expect(manifests).toContainEqual(manifest2);
    });

    it("should return empty array when no manifests", () => {
      expect(fileSystem.getManifests()).toEqual([]);
    });
  });

  describe("getManifest", () => {
    it("should return manifest by path", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      (readManifest as any).mockResolvedValue(mockManifest);

      await fileSystem.addManifest("manifest.json");

      expect(fileSystem.getManifest("manifest.json")).toEqual(mockManifest);
    });

    it("should return undefined for non-existent path", () => {
      expect(fileSystem.getManifest("non-existent.json")).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should clear all documents and manifests", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const { readManifest } = await import("../manifest/manifest-reader.js");

      const mockReadFile = vi.fn().mockResolvedValue({
        tokens: mockTokenDoc,
      });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));
      (readManifest as any).mockResolvedValue(mockManifest);

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocument("tokens.json");
      await newFileSystem.addManifest("manifest.json");

      expect(newFileSystem.getDocuments()).toHaveLength(1);
      expect(newFileSystem.getManifests()).toHaveLength(1);

      newFileSystem.clear();

      expect(newFileSystem.getDocuments()).toEqual([]);
      expect(newFileSystem.getManifests()).toEqual([]);
      expect(newFileSystem.getDocument("tokens.json")).toBeUndefined();
      expect(newFileSystem.getManifest("manifest.json")).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return statistics about loaded files", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const { readManifest } = await import("../manifest/manifest-reader.js");

      const doc1 = { small: { $value: "1" } };
      const doc2 = { medium: { $value: "medium value" } };

      const mockReadFile = vi
        .fn()
        .mockResolvedValueOnce({ tokens: doc1 })
        .mockResolvedValueOnce({ tokens: doc2 });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));
      (readManifest as any).mockResolvedValue(mockManifest);

      const newFileSystem = new TokenFileSystem();
      await newFileSystem.addDocument("doc1.json");
      await newFileSystem.addDocument("doc2.json");
      await newFileSystem.addManifest("manifest.json");

      const stats = newFileSystem.getStats();

      expect(stats.documentCount).toBe(2);
      expect(stats.manifestCount).toBe(1);
      expect(stats.totalSize).toBe(
        JSON.stringify(doc1).length + JSON.stringify(doc2).length,
      );
    });

    it("should return zero stats for empty system", () => {
      const stats = fileSystem.getStats();

      expect(stats.documentCount).toBe(0);
      expect(stats.manifestCount).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it("should include resolved documents in stats", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      const { resolvePermutation } = await import(
        "../manifest/manifest-core.js"
      );

      const resolvedTokens = {
        color: { primary: { $value: "#resolved" } },
      };

      (readManifest as any).mockResolvedValue(mockManifest);
      (resolvePermutation as any).mockResolvedValue({
        tokens: resolvedTokens,
      });

      await fileSystem.addManifest("manifest.json", { theme: "light" });

      const stats = fileSystem.getStats();

      expect(stats.documentCount).toBe(1); // The resolved document
      expect(stats.manifestCount).toBe(1);
      expect(stats.totalSize).toBe(JSON.stringify(resolvedTokens).length);
    });
  });

  describe("integration scenarios", () => {
    it("should handle mixed documents and manifests", async () => {
      const { TokenFileReader } = await import("../io/file-reader.js");
      const { readManifest } = await import("../manifest/manifest-reader.js");
      const { resolvePermutation } = await import(
        "../manifest/manifest-core.js"
      );

      const doc1 = { color: { $value: "#000" } };
      const doc2 = { spacing: { $value: "8px" } };
      const resolvedTokens = { resolved: { $value: "resolved" } };

      const mockReadFile = vi
        .fn()
        .mockResolvedValueOnce({ tokens: doc1 })
        .mockResolvedValueOnce({ tokens: doc2 });

      (TokenFileReader as any).mockImplementation(() => ({
        readFile: mockReadFile,
      }));
      (readManifest as any).mockResolvedValue(mockManifest);
      (resolvePermutation as any).mockResolvedValue({
        tokens: resolvedTokens,
      });

      const newFileSystem = new TokenFileSystem();

      // Add documents
      await newFileSystem.addDocument("doc1.json");
      await newFileSystem.addDocument("doc2.json");

      // Add manifest with resolution
      await newFileSystem.addManifest("manifest.json", { theme: "dark" });

      // Check everything is loaded
      expect(newFileSystem.getDocuments()).toHaveLength(3); // 2 docs + 1 resolved
      expect(newFileSystem.getManifests()).toHaveLength(1);

      const stats = newFileSystem.getStats();
      expect(stats.documentCount).toBe(3);
      expect(stats.manifestCount).toBe(1);
    });

    it("should handle multiple manifests with different resolutions", async () => {
      const { readManifest } = await import("../manifest/manifest-reader.js");
      const { resolvePermutation } = await import(
        "../manifest/manifest-core.js"
      );

      const manifest1 = { ...mockManifest, id: "m1" };
      const manifest2 = { ...mockManifest, id: "m2" };
      const resolved1 = { resolved1: { $value: "1" } };
      const resolved2 = { resolved2: { $value: "2" } };

      (readManifest as any)
        .mockResolvedValueOnce(manifest1)
        .mockResolvedValueOnce(manifest2);
      (resolvePermutation as any)
        .mockResolvedValueOnce({ tokens: resolved1 })
        .mockResolvedValueOnce({ tokens: resolved2 });

      await fileSystem.addManifest("m1.json", { theme: "light" });
      await fileSystem.addManifest("m2.json", { theme: "dark" });

      expect(fileSystem.getDocument("m1.json:resolved")).toEqual(resolved1);
      expect(fileSystem.getDocument("m2.json:resolved")).toEqual(resolved2);
      expect(fileSystem.getManifests()).toHaveLength(2);
    });
  });
});
