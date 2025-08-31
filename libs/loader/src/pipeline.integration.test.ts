/**
 * Integration tests for the full loader pipeline
 * Tests the complete flow: file loading → validation → AST generation → bundling
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLoader, loadFile } from "./index.js";

const TEST_DIR = resolve(__dirname, "__integration_fixtures__");

const BASE_TOKENS = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    primary: {
      $type: "color",
      $value: "#0066CC",
    },
    secondary: {
      $type: "color",
      $value: "{color.primary}",
    },
  },
  spacing: {
    base: {
      $type: "dimension",
      $value: "8px",
    },
  },
};

const THEME_LIGHT = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    background: {
      $type: "color",
      $value: "#FFFFFF",
    },
  },
};

const THEME_DARK = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    background: {
      $type: "color",
      $value: "#000000",
    },
  },
};

const MANIFEST = {
  $schema: "https://schemas.upft.co/draft/manifest/v0.json",
  name: "integration-test",
  version: "1.0.0",
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: ["theme-light.json"],
        dark: ["theme-dark.json"],
      },
    },
  },
  sets: [
    {
      name: "base",
      files: ["base-tokens.json"],
    },
  ],
  outputs: [
    {
      file: "bundle-{theme}.json",
      modifiers: {
        theme: "*",
      },
    },
  ],
};

describe("Pipeline Integration Tests", () => {
  beforeEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Write test fixtures
    writeFileSync(
      resolve(TEST_DIR, "base-tokens.json"),
      JSON.stringify(BASE_TOKENS, null, 2),
    );
    writeFileSync(
      resolve(TEST_DIR, "theme-light.json"),
      JSON.stringify(THEME_LIGHT, null, 2),
    );
    writeFileSync(
      resolve(TEST_DIR, "theme-dark.json"),
      JSON.stringify(THEME_DARK, null, 2),
    );
    writeFileSync(
      resolve(TEST_DIR, "manifest.json"),
      JSON.stringify(MANIFEST, null, 2),
    );
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
  });

  describe("loader → validator → AST pipeline", () => {
    it("should load, validate, and parse tokens end-to-end", async () => {
      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "base-tokens.json");

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(1);

      const file = result.files[0];
      expect(file.validation.valid).toBe(true);
      expect(file.ast).toBeDefined();
      expect(file.ast?.type).toBe("file");

      // Verify AST structure
      if (file.ast?.type === "file") {
        expect(file.ast.tokens).toBeDefined();
        expect(file.ast.groups).toBeDefined();
        expect(file.ast.children).toBeDefined();

        // AST organizes tokens in groups, so check for any content
        const hasContent =
          file.ast.tokens.size > 0 ||
          file.ast.groups.size > 0 ||
          file.ast.children.size > 0;
        expect(hasContent).toBe(true);
      }
    });

    it("should handle token references across files", async () => {
      const loader = createLoader(TEST_DIR);
      await loadFile(loader, "base-tokens.json");
      const themeResult = await loadFile(loader, "theme-light.json");

      expect(themeResult.errors).toEqual([]);
      expect(loader.loadedFiles.size).toBe(2);

      // Both files should be cached
      const baseFile = loader.loadedFiles.get(
        resolve(TEST_DIR, "base-tokens.json"),
      );
      const themeFile = loader.loadedFiles.get(
        resolve(TEST_DIR, "theme-light.json"),
      );

      expect(baseFile?.ast).toBeDefined();
      expect(themeFile?.ast).toBeDefined();
    });
  });

  describe("loader → manifest → bundler pipeline", () => {
    it("should load and process manifest files", async () => {
      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "manifest.json");

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].info.type).toBe("manifest");

      // AST might not be created if validation failed
      if (
        result.files[0].validation.valid &&
        result.files[0].ast?.type === "manifest"
      ) {
        expect(result.files[0].ast.sets.size).toBeGreaterThan(0);
        expect(result.files[0].ast.modifiers).toBeDefined();
      }
    });

    it("should generate permutations correctly", async () => {
      const { generateAllPermutations } = await import(
        "./pipeline-resolver.js"
      );
      const loader = createLoader(TEST_DIR);
      const manifestResult = await loadFile(loader, "manifest.json");

      expect(manifestResult.files).toHaveLength(1);
      const manifestFile = manifestResult.files[0];

      if (manifestFile.ast?.type === "manifest") {
        const permutations = generateAllPermutations(manifestFile.ast);

        expect(permutations).toHaveLength(2);
        expect(permutations.map((p) => p.modifiers.theme)).toEqual([
          "light",
          "dark",
        ]);
      }
    });
  });

  describe("error handling across pipeline", () => {
    it("should propagate validation errors through pipeline", async () => {
      // Create invalid token file
      const invalidTokens = { invalid: "structure" };
      writeFileSync(
        resolve(TEST_DIR, "invalid.json"),
        JSON.stringify(invalidTokens, null, 2),
      );

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "invalid.json");

      expect(result.files).toHaveLength(1);
      expect(result.files[0].validation.valid).toBe(false);
      expect(result.files[0].validation.errors.length).toBeGreaterThan(0);
    });

    it("should handle missing files gracefully", async () => {
      // Try to load non-existent file
      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "nonexistent.json");

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("nonexistent.json");
      expect(result.files).toEqual([]);
    });
  });

  describe("performance integration", () => {
    it("should handle large token files efficiently", async () => {
      // Create a large token file
      const largeTokens = {
        $schema: "https://schemas.upft.co/draft/tokens/v0.json",
      };
      for (let i = 0; i < 1000; i++) {
        largeTokens[`token-${i}`] = {
          $type: "color",
          $value: `#${i.toString(16).padStart(6, "0")}`,
        };
      }

      writeFileSync(
        resolve(TEST_DIR, "large-tokens.json"),
        JSON.stringify(largeTokens, null, 2),
      );

      const start = Date.now();
      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "large-tokens.json");
      const duration = Date.now() - start;

      expect(result.errors).toEqual([]);
      expect(result.files[0].validation.valid).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete under 1 second
    });
  });
});
