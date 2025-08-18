import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TokenBundler } from "./bundler/bundler.js";
import { TokenCLI } from "./cli/commands.js";
import { TokenFileReader } from "./filesystem/file-reader.js";
import { TokenFileWriter } from "./filesystem/file-writer.js";
import { resolvePermutation } from "./resolver/resolver-core.js";

describe("Integration Tests - Real Components", () => {
  let testDir: string;
  let fileReader: TokenFileReader;
  let fileWriter: TokenFileWriter;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `upft-test-${randomBytes(8).toString("hex")}`);
    await mkdir(testDir, { recursive: true });

    // Create real instances
    fileReader = new TokenFileReader({ basePath: testDir });
    fileWriter = new TokenFileWriter();
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe("End-to-end workflow", () => {
    it("should read files, resolve, bundle, and write output", async () => {
      // 1. Create test token files
      const coreTokens = {
        color: {
          primary: {
            $value: {
              colorSpace: "srgb",
              components: [0, 0.498, 1],
              alpha: 1,
            },
            $type: "color",
          },
        },
      };

      const themeTokens = {
        color: {
          background: { $value: "{color.primary}", $type: "color" },
        },
      };

      await writeFile(
        join(testDir, "core.json"),
        JSON.stringify(coreTokens, null, 2),
      );

      await writeFile(
        join(testDir, "theme.json"),
        JSON.stringify(themeTokens, null, 2),
      );

      // 2. Create manifest
      const manifest = {
        sets: [{ values: ["core.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light"],
            values: {
              light: ["theme.json"],
            },
          },
        },
        generate: [{ theme: "light", output: "output.json" }],
      };

      // 3. Test resolver can read real files
      const resolved = await resolvePermutation(
        manifest,
        { theme: "light" },
        { fileReader, basePath: testDir },
      );

      expect((resolved.tokens.color as any)?.primary?.$value).toEqual({
        colorSpace: "srgb",
        components: [0, 0.498, 1],
        alpha: 1,
      });
      expect((resolved.tokens.color as any)?.background?.$value).toBe(
        "{color.primary}",
      );

      // 4. Test bundler can generate bundles
      const bundler = new TokenBundler({
        fileReader,
        fileWriter,
        basePath: testDir,
      });
      const results = await bundler.bundleToFiles(manifest);

      console.log("Bundle results:", results);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.filePath).toBe("output.json");

      // 5. Verify file was actually written to the correct location
      const expectedPath = join(testDir, "output.json");
      const { existsSync } = await import("node:fs");
      expect(existsSync(expectedPath)).toBe(true);
    });

    it("should work with CLI commands", async () => {
      // Create test files
      await writeFile(
        join(testDir, "tokens.json"),
        JSON.stringify({
          color: {
            red: {
              $value: {
                colorSpace: "srgb",
                components: [1, 0, 0],
                alpha: 1,
              },
              $type: "color",
            },
          },
        }),
      );

      const manifest = {
        sets: [{ values: ["tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["default"],
            values: { default: [] },
          },
        },
      };

      // Test CLI with real filesystem
      const cli = new TokenCLI({ fileReader, fileWriter, basePath: testDir });

      // Validate
      const validation = await cli.validate(manifest);
      expect(validation.valid).toBe(true);

      // Resolve
      const resolved = await cli.resolve(manifest, { theme: "default" });
      expect((resolved.tokens.color as any)?.red?.$value).toEqual({
        colorSpace: "srgb",
        components: [1, 0, 0],
        alpha: 1,
      });

      // List
      const permutations = await cli.list(manifest);
      expect(permutations).toHaveLength(1);

      // Info
      const info = await cli.info(manifest);
      expect(info.modifiers).toHaveLength(1);
    });
  });

  describe("Type safety checks", () => {
    it("should enforce correct interfaces between components", async () => {
      // This test ensures components can work together
      const bundler = new TokenBundler({ fileReader, fileWriter });
      const cli = new TokenCLI({ fileReader, fileWriter });

      // If this compiles, interfaces match
      expect(bundler).toBeDefined();
      expect(cli).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing files gracefully", async () => {
      const manifest = {
        sets: [{ values: ["nonexistent.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light"],
            values: { light: [] },
          },
        },
      };

      await expect(
        resolvePermutation(
          manifest,
          { theme: "light" },
          { fileReader, basePath: testDir },
        ),
      ).rejects.toThrow();
    });
  });
});
