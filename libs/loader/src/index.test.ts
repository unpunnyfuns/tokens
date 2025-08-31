/**
 * Comprehensive tests for the loader package
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearCache, createLoader, loadFile, loadFiles } from "./index.js";

const TEST_DIR = resolve(__dirname, "__test_fixtures__");

const VALID_TOKEN_JSON = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    primary: {
      $type: "color",
      $value: "#FF0000",
    },
  },
};

const VALID_MANIFEST_JSON = {
  $schema: "https://schemas.upft.co/draft/manifest/v0.json",
  name: "test-manifest",
  version: "1.0.0",
  modifiers: {},
  sets: [
    {
      files: ["tokens.json"],
    },
  ],
};

const INVALID_JSON = "{ invalid json";
const UNKNOWN_TYPE_JSON = { unknown: "type" };

describe("Loader Core Functions", () => {
  beforeEach(() => {
    // Clean up and create test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
  });

  describe("createLoader", () => {
    it("should create loader with default base path", () => {
      const loader = createLoader();
      expect(loader.basePath).toBe(process.cwd());
      expect(loader.loadedFiles).toBeInstanceOf(Map);
      expect(loader.loadedFiles.size).toBe(0);
    });

    it("should create loader with custom base path", () => {
      const customPath = "/custom/path";
      const loader = createLoader(customPath);
      expect(loader.basePath).toBe(resolve(customPath));
    });
  });

  describe("clearCache", () => {
    it("should clear loaded files cache", () => {
      const loader = createLoader();
      loader.loadedFiles.set("/test/file.json", {
        info: { path: "/test/file.json", content: "{}", type: "tokens" },
        data: {},
        validation: { valid: true, errors: [], warnings: [] },
      });

      expect(loader.loadedFiles.size).toBe(1);
      clearCache(loader);
      expect(loader.loadedFiles.size).toBe(0);
    });
  });

  describe("loadFile", () => {
    it("should load a valid token file", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "tokens.json");

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].info.type).toBe("tokens");
      expect(result.files[0].validation.valid).toBe(true);
      expect(result.files[0].ast).toBeDefined();
    });

    it("should load a manifest file and attempt validation", async () => {
      const manifestPath = resolve(TEST_DIR, "manifest.json");
      writeFileSync(manifestPath, JSON.stringify(VALID_MANIFEST_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "manifest.json");

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].info.type).toBe("manifest");
      expect(result.files[0].validation).toBeDefined();
      // AST should be created if validation passes
      if (result.files[0].validation.valid) {
        expect(result.files[0].ast).toBeDefined();
      }
    });

    it("should handle invalid JSON", async () => {
      const invalidPath = resolve(TEST_DIR, "invalid.json");
      writeFileSync(invalidPath, INVALID_JSON);

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "invalid.json");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to load");
      expect(result.errors[0]).toContain("Invalid JSON");
      expect(result.files).toEqual([]);
    });

    it("should handle unknown file types", async () => {
      const unknownPath = resolve(TEST_DIR, "unknown.json");
      writeFileSync(unknownPath, JSON.stringify(UNKNOWN_TYPE_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "unknown.json");

      // Unknown types generate an error about file type determination
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Could not determine file type");
      expect(result.files).toHaveLength(1);
      expect(result.files[0].info.type).toBe("unknown");
      expect(result.files[0].validation.valid).toBe(false);
    });

    it("should handle non-existent files", async () => {
      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "nonexistent.json");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to load");
      expect(result.files).toEqual([]);
    });

    it("should skip validation when disabled", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "tokens.json", { validate: false });

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].validation.valid).toBe(true); // No validation = valid
    });

    it("should skip AST parsing when disabled", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFile(loader, "tokens.json", {
        parseToAST: false,
      });

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].ast).toBeUndefined();
    });

    it("should cache loaded files", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));

      const loader = createLoader(TEST_DIR);

      // Load file twice
      await loadFile(loader, "tokens.json");
      const result2 = await loadFile(loader, "tokens.json");

      expect(loader.loadedFiles.size).toBe(1);
      expect(result2.files).toHaveLength(1);
    });
  });

  describe("loadFiles", () => {
    it("should load multiple files", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      const manifestPath = resolve(TEST_DIR, "manifest.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));
      writeFileSync(manifestPath, JSON.stringify(VALID_MANIFEST_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFiles(loader, ["tokens.json", "manifest.json"]);

      expect(result.errors).toEqual([]);
      expect(result.files).toHaveLength(2);
      expect(result.files.map((f) => f.info.type).sort()).toEqual([
        "manifest",
        "tokens",
      ]);
    });

    it("should handle mixed valid and invalid files", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      const invalidPath = resolve(TEST_DIR, "invalid.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));
      writeFileSync(invalidPath, INVALID_JSON);

      const loader = createLoader(TEST_DIR);
      const result = await loadFiles(loader, ["tokens.json", "invalid.json"]);

      expect(result.errors).toHaveLength(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].info.type).toBe("tokens");
    });

    it("should set entry point to first file", async () => {
      const tokenPath = resolve(TEST_DIR, "tokens.json");
      writeFileSync(tokenPath, JSON.stringify(VALID_TOKEN_JSON, null, 2));

      const loader = createLoader(TEST_DIR);
      const result = await loadFiles(loader, ["tokens.json"]);

      expect(result.entryPoint).toBe(resolve(TEST_DIR, "tokens.json"));
    });

    it("should handle empty file list", async () => {
      const loader = createLoader(TEST_DIR);
      const result = await loadFiles(loader, []);

      expect(result.errors).toEqual([]);
      expect(result.files).toEqual([]);
      expect(result.entryPoint).toBe("");
    });
  });
});
