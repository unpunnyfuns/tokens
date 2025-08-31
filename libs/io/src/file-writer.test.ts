import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TokenDocument } from "@upft/foundation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenFileWriter } from "./file-writer.js";

describe("TokenFileWriter", () => {
  let writer: TokenFileWriter;
  let testDir: string;

  beforeEach(async () => {
    writer = new TokenFileWriter();
    // Create unique test directory
    testDir = join(tmpdir(), `token-writer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe("write", () => {
    it("should write raw string content to file", async () => {
      const filePath = join(testDir, "output.json");
      const content = '{"test": "value"}';

      await writer.write(filePath, content);

      const written = await readFile(filePath, "utf-8");
      expect(written).toBe(content);
    });

    it("should create directory if it doesn't exist", async () => {
      const filePath = join(testDir, "nested", "dir", "output.json");
      const content = '{"test": "value"}';

      await writer.write(filePath, content);

      expect(existsSync(filePath)).toBe(true);
      const written = await readFile(filePath, "utf-8");
      expect(written).toBe(content);
    });
  });

  describe("writeFile", () => {
    it("should write JSON file with default formatting", async () => {
      const filePath = join(testDir, "tokens.json");
      const content: TokenDocument = {
        colors: {
          $type: "color",
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
          },
        },
      };

      await writer.writeFile(filePath, content);

      const written = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(written);
      expect(parsed).toEqual(content);
      // Check default indent is 2
      expect(written).toContain("  ");
    });

    it("should write JSON5 file", async () => {
      const filePath = join(testDir, "tokens.json5");
      const content: TokenDocument = {
        colors: {
          $type: "color",
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
          },
        },
      };

      await writer.writeFile(filePath, content, {
        format: { type: "json5" },
      });

      const written = await readFile(filePath, "utf-8");
      expect(written).toContain("colors:");
      expect(written).toContain("$type:");
    });

    it("should write YAML file", async () => {
      const filePath = join(testDir, "tokens.yaml");
      const content: TokenDocument = {
        colors: {
          $type: "color",
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
          },
        },
      };

      await writer.writeFile(filePath, content, {
        format: { type: "yaml" },
      });

      const written = await readFile(filePath, "utf-8");
      expect(written).toContain("colors:");
      expect(written).toContain("$type: color");
      expect(written).toContain("colorSpace: srgb");
    });

    it("should infer format from file extension", async () => {
      const yamlPath = join(testDir, "tokens.yml");
      const content: TokenDocument = {
        test: { $value: "value" },
      };

      await writer.writeFile(yamlPath, content);

      const written = await readFile(yamlPath, "utf-8");
      expect(written).toContain("test:");
      expect(written).toContain("$value: value");
    });

    it("should sort keys when requested", async () => {
      const filePath = join(testDir, "sorted.json");
      const content: TokenDocument = {
        zebra: { $value: "z" },
        apple: { $value: "a" },
        banana: { $value: "b" },
      };

      await writer.writeFile(filePath, content, {
        format: { sortKeys: true },
      });

      const written = await readFile(filePath, "utf-8");
      const indexApple = written.indexOf("apple");
      const indexBanana = written.indexOf("banana");
      const indexZebra = written.indexOf("zebra");

      expect(indexApple).toBeLessThan(indexBanana);
      expect(indexBanana).toBeLessThan(indexZebra);
    });

    it("should use custom indent", async () => {
      const filePath = join(testDir, "indented.json");
      const content: TokenDocument = {
        test: { nested: { $value: "value" } },
      };

      await writer.writeFile(filePath, content, {
        format: { indent: 4 },
      });

      const written = await readFile(filePath, "utf-8");
      expect(written).toContain("    "); // 4 spaces
    });

    it("should create backup when requested", async () => {
      const filePath = join(testDir, "tokens.json");
      const originalContent = { original: { $value: "content" } };
      const newContent = { new: { $value: "content" } };

      // Write original file
      await writer.writeFile(filePath, originalContent);

      // Write with backup
      await writer.writeFile(filePath, newContent, {
        backup: true,
        backupSuffix: ".bak",
      });

      // Check backup exists
      const backupPath = `${filePath}.bak`;
      expect(existsSync(backupPath)).toBe(true);

      const backup = JSON.parse(await readFile(backupPath, "utf-8"));
      expect(backup).toEqual(originalContent);

      const current = JSON.parse(await readFile(filePath, "utf-8"));
      expect(current).toEqual(newContent);
    });

    it("should write atomically when requested", async () => {
      const filePath = join(testDir, "atomic.json");
      const content: TokenDocument = {
        test: { $value: "atomic" },
      };

      await writer.writeFile(filePath, content, {
        atomic: true,
      });

      const written = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(written);
      expect(parsed).toEqual(content);
    });

    it("should validate content when requested", async () => {
      const filePath = join(testDir, "validated.json");
      const invalidContent = {
        invalid: "not a valid token document",
      } as unknown as TokenDocument;

      await expect(
        writer.writeFile(filePath, invalidContent, { validate: true }),
      ).rejects.toThrow("Invalid token document");
    });

    it("should handle nested objects with sortKeys", async () => {
      const filePath = join(testDir, "nested-sorted.json");
      const content: TokenDocument = {
        z: {
          c: { $value: "c" },
          a: { $value: "a" },
          b: { $value: "b" },
        },
        a: {
          z: { $value: "z" },
          y: { $value: "y" },
        },
      };

      await writer.writeFile(filePath, content, {
        format: { sortKeys: true },
      });

      const written = await readFile(filePath, "utf-8");
      const lines = written.split("\n");

      // Check top-level ordering
      const aIndex = lines.findIndex((l) => l.includes('"a":'));
      const zIndex = lines.findIndex((l) => l.includes('"z":'));
      expect(aIndex).toBeLessThan(zIndex);
    });
  });

  describe("writeMultiple", () => {
    it("should write multiple files in parallel", async () => {
      const files = [
        { path: join(testDir, "file1.json"), content: { a: { $value: "1" } } },
        { path: join(testDir, "file2.json"), content: { b: { $value: "2" } } },
        { path: join(testDir, "file3.json"), content: { c: { $value: "3" } } },
      ];

      const results = await writer.writeMultiple(files);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify all files were written
      for (const file of files) {
        const written = JSON.parse(await readFile(file.path, "utf-8"));
        expect(written).toEqual(file.content);
      }
    });

    it("should handle errors without stopping by default", async () => {
      const files = [
        { path: join(testDir, "file1.json"), content: { a: { $value: "1" } } },
        {
          path: join(testDir, "invalid.json"),
          content: { invalid: "content" } as unknown as TokenDocument,
        },
        { path: join(testDir, "file3.json"), content: { c: { $value: "3" } } },
      ];

      const results = await writer.writeMultiple(files, { validate: true });

      expect(results).toHaveLength(3);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(false);
      expect(results[1]?.error).toBeDefined();
      expect(results[2]?.success).toBe(true);
    });

    it("should stop on error when requested", async () => {
      const files = [
        { path: join(testDir, "file1.json"), content: { a: { $value: "1" } } },
        {
          path: join(testDir, "invalid.json"),
          content: { invalid: "content" } as unknown as TokenDocument,
        },
        { path: join(testDir, "file3.json"), content: { c: { $value: "3" } } },
      ];

      await expect(
        writer.writeMultiple(files, { validate: true, stopOnError: true }),
      ).rejects.toThrow("Invalid token document");

      // First file should be written
      expect(existsSync(files[0]?.path ?? "")).toBe(true);
      // Third file should not be written
      expect(existsSync(files[2]?.path ?? "")).toBe(false);
    });

    it("should apply format options to all files", async () => {
      const files = [
        {
          path: join(testDir, "file1.json"),
          content: { z: { $value: "z" }, a: { $value: "a" } },
        },
        {
          path: join(testDir, "file2.json"),
          content: { y: { $value: "y" }, b: { $value: "b" } },
        },
      ];

      await writer.writeMultiple(files, {
        format: { sortKeys: true, indent: 4 },
      });

      for (const file of files) {
        const written = await readFile(file.path, "utf-8");
        expect(written).toContain("    "); // 4 spaces
        // Check keys are sorted
        const parsed = JSON.parse(written);
        const keys = Object.keys(parsed);
        expect(keys).toEqual(keys.slice().sort());
      }
    });

    it("should create directories for nested paths", async () => {
      const files = [
        {
          path: join(testDir, "deep", "nested", "dir", "file.json"),
          content: { test: { $value: "nested" } },
        },
      ];

      const results = await writer.writeMultiple(files);

      expect(results[0]?.success).toBe(true);
      expect(existsSync(files[0]?.path ?? "")).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should throw error for unsupported format", async () => {
      const filePath = join(testDir, "tokens.json");
      const content: TokenDocument = { test: { $value: "value" } };

      await expect(
        writer.writeFile(filePath, content, {
          format: { type: "xml" as any },
        }),
      ).rejects.toThrow("Unsupported format: xml");
    });

    it("should clean up temp file on atomic write failure", async () => {
      const filePath = join(testDir, "atomic-fail.json");
      const content: TokenDocument = { test: { $value: "value" } };

      // Mock rename to fail
      const { rename } = await import("node:fs/promises");
      vi.spyOn({ rename }, "rename").mockRejectedValueOnce(
        new Error("Rename failed"),
      );

      try {
        await writer.writeFile(filePath, content, { atomic: true });
      } catch {
        // Expected to fail
      }

      // Check no temp files remain
      const files = await import("node:fs/promises").then((fs) =>
        fs.readdir(testDir),
      );
      const tempFiles = files.filter((f) => f.includes(".tmp"));
      expect(tempFiles).toHaveLength(0);
    });
  });
});
