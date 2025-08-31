/**
 * Comprehensive tests for pipeline.ts
 * Tests the high-level pipeline orchestration
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runPipeline } from "./pipeline.js";

let TEST_DIR: string;

const VALID_TOKENS = {
  $schema: "../../../schemas/tokens/base.schema.json",
  color: {
    primary: {
      $type: "color",
      $value: "#0066CC",
    },
  },
};

const VALID_MANIFEST = {
  $schema: "../../../schemas/manifest/base.schema.json",
  name: "test-manifest",
  version: "1.0.0",
  modifiers: {},
  sets: [
    {
      name: "base",
      files: ["tokens.json"],
    },
  ],
};

describe("Pipeline Core Functions", () => {
  beforeEach(() => {
    TEST_DIR = join(
      tmpdir(),
      `pipeline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
  });

  describe("runPipeline", () => {
    it("should execute complete pipeline successfully", async () => {
      // Create test files
      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      const result = await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      expect(result.errors).toEqual([]);
      expect(result.project).toBeDefined();
      expect(result.project.type).toBe("project");
      expect(result.manifest).toBeDefined();
      expect(result.manifest.type).toBe("manifest");
      expect(result.files).toBeDefined();
    });

    it("should handle missing manifest file", async () => {
      const result = await runPipeline(resolve(TEST_DIR, "nonexistent.json"), {
        basePath: TEST_DIR,
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Pipeline failed");
      expect(result.project.name).toBe("failed-project");
      expect(result.manifest.name).toBe("failed-manifest");
    });

    it("should handle invalid manifest content", async () => {
      writeFileSync(resolve(TEST_DIR, "invalid.json"), "{ invalid json");

      const result = await runPipeline(resolve(TEST_DIR, "invalid.json"), {
        basePath: TEST_DIR,
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Pipeline failed");
    });

    it("should handle manifest parsing errors", async () => {
      const invalidManifest = { not: "a manifest" };
      writeFileSync(
        resolve(TEST_DIR, "invalid-manifest.json"),
        JSON.stringify(invalidManifest, null, 2),
      );

      const result = await runPipeline(
        resolve(TEST_DIR, "invalid-manifest.json"),
        {
          basePath: TEST_DIR,
        },
      );

      // Should fail gracefully
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should use default base path when not provided", async () => {
      writeFileSync(
        resolve(process.cwd(), "test-manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      const result = await runPipeline("test-manifest.json");

      expect(result.project.basePath).toBe(process.cwd());

      // Cleanup
      try {
        rmSync(resolve(process.cwd(), "test-manifest.json"));
      } catch {
        /* Directory cleanup - ignore if doesn't exist */
      }
    });

    it("should collect token ASTs from loaded files", async () => {
      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      const result = await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      expect(result.files).toBeInstanceOf(Map);
      // Should have collected token files
      const tokenFile = Array.from(result.files.values()).find(
        (ast) => ast.type === "file",
      );
      expect(tokenFile).toBeDefined();
    });

    it("should handle dependency discovery errors gracefully", async () => {
      // Create manifest with missing dependency
      const manifestWithMissingDep = {
        ...VALID_MANIFEST,
        sets: [
          {
            name: "missing",
            files: ["missing-tokens.json"],
          },
        ],
      };
      writeFileSync(
        resolve(TEST_DIR, "manifest-missing.json"),
        JSON.stringify(manifestWithMissingDep, null, 2),
      );

      const result = await runPipeline(
        resolve(TEST_DIR, "manifest-missing.json"),
        {
          basePath: TEST_DIR,
        },
      );

      // Should complete but with errors
      expect(result.project).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should resolve permutations when manifest has them", async () => {
      const manifestWithPermutations = {
        ...VALID_MANIFEST,
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: [],
              dark: ["dark-tokens.json"],
            },
          },
        },
      };

      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "dark-tokens.json"),
        JSON.stringify(
          {
            $schema: "../../../schemas/tokens/base.schema.json",
            color: { bg: { $type: "color", $value: "#000" } },
          },
          null,
          2,
        ),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest-perms.json"),
        JSON.stringify(manifestWithPermutations, null, 2),
      );

      const result = await runPipeline(
        resolve(TEST_DIR, "manifest-perms.json"),
        {
          basePath: TEST_DIR,
        },
      );

      expect(result.project).toBeDefined();
      expect(result.manifest.permutations.size).toBeGreaterThan(0);
    });

    it("should handle permutation resolution errors", async () => {
      const manifestWithBrokenPermutations = {
        ...VALID_MANIFEST,
        modifiers: {
          broken: {
            oneOf: ["option"],
            values: {
              option: ["nonexistent-file.json"],
            },
          },
        },
      };

      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "broken-manifest.json"),
        JSON.stringify(manifestWithBrokenPermutations, null, 2),
      );

      const result = await runPipeline(
        resolve(TEST_DIR, "broken-manifest.json"),
        {
          basePath: TEST_DIR,
        },
      );

      // Should complete but collect errors from permutation resolution
      expect(result.project).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should show discovery progress when basePath provided", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // Mock implementation for console.log spy
      });

      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("🔍 Discovered"),
      );

      consoleSpy.mockRestore();
    });

    it("should not show discovery progress when no basePath", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // Mock implementation for console.log spy
      });

      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      await runPipeline(resolve(TEST_DIR, "manifest.json"));

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("🔍 Discovered"),
      );

      consoleSpy.mockRestore();
    });

    it("should clear loader cache after completion", async () => {
      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      // Cache should be cleared - this is tested indirectly by ensuring
      // the loader doesn't maintain state between calls
      const result2 = await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      expect(result2.project).toBeDefined();
    });

    it("should handle warnings from dependency discovery", async () => {
      // This would need mock implementation to inject warnings
      // For now, test that warnings array exists
      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      const result = await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should handle warnings from project resolution", async () => {
      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(VALID_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "manifest.json"),
        JSON.stringify(VALID_MANIFEST, null, 2),
      );

      const result = await runPipeline(resolve(TEST_DIR, "manifest.json"), {
        basePath: TEST_DIR,
      });

      expect(result.warnings).toBeDefined();
    });
  });

  describe("error handling edge cases", () => {
    it("should handle empty manifest file", async () => {
      writeFileSync(resolve(TEST_DIR, "empty.json"), "{}");

      const result = await runPipeline(resolve(TEST_DIR, "empty.json"), {
        basePath: TEST_DIR,
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle manifest with no sets", async () => {
      const emptyManifest = {
        ...VALID_MANIFEST,
        sets: [],
      };
      writeFileSync(
        resolve(TEST_DIR, "empty-sets.json"),
        JSON.stringify(emptyManifest, null, 2),
      );

      const result = await runPipeline(resolve(TEST_DIR, "empty-sets.json"), {
        basePath: TEST_DIR,
      });

      // Should complete but might have warnings
      expect(result.project).toBeDefined();
    });

    it("should handle very large manifests", async () => {
      const largeManifest = {
        ...VALID_MANIFEST,
        sets: Array.from({ length: 100 }, (_, i) => ({
          name: `set-${i}`,
          files: [`tokens-${i}.json`],
        })),
      };

      // Create a few token files
      for (let i = 0; i < 5; i++) {
        writeFileSync(
          resolve(TEST_DIR, `tokens-${i}.json`),
          JSON.stringify(VALID_TOKENS, null, 2),
        );
      }

      writeFileSync(
        resolve(TEST_DIR, "large-manifest.json"),
        JSON.stringify(largeManifest, null, 2),
      );

      const result = await runPipeline(
        resolve(TEST_DIR, "large-manifest.json"),
        {
          basePath: TEST_DIR,
        },
      );

      // Should handle large manifests (though with many missing file errors)
      expect(result.project).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0); // Missing files
    });
  });
});
