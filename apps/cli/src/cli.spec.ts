/**
 * E2E tests for CLI commands using execa
 * These tests spawn actual CLI processes for realistic testing
 */

import { join } from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";

// When running from apps/cli, go up to monorepo root
const REPO_ROOT = join(process.cwd(), "..", "..");
const CLI_BINARY = join(REPO_ROOT, "apps/cli/dist/cli.js");
const EXAMPLES_PATH = join(REPO_ROOT, "libs/examples/src");

describe("CLI E2E Tests", () => {
  describe("basic functionality", () => {
    it("should display help", async () => {
      const result = await execa(CLI_BINARY, ["--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("UPFT - Universal Platform for Tokens");
      expect(result.stdout).toContain("Commands:");
      expect(result.stdout).toContain("validate");
    });

    it("should display version", async () => {
      const result = await execa(CLI_BINARY, ["--version"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Semantic version
    });
  });

  describe("validate command", () => {
    it("should validate a single token file", async () => {
      const filePath = join(EXAMPLES_PATH, "tokens/primitives/colors.json");

      const result = await execa(CLI_BINARY, ["validate", filePath, "-f"]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
    });

    it("should validate a directory of token files", async () => {
      const dirPath = join(EXAMPLES_PATH, "tokens/primitives");

      const result = await execa(CLI_BINARY, ["validate", dirPath, "-d"]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
    });

    it("should validate a manifest file", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = await execa(CLI_BINARY, ["validate", manifestPath, "-m"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Valid");
    });

    it("should fail on non-existent file", async () => {
      const invalidPath = join(EXAMPLES_PATH, "nonexistent.json");

      await expect(
        execa(CLI_BINARY, ["validate", invalidPath, "-f"]),
      ).rejects.toMatchObject({
        exitCode: 1,
      });
    });
  });

  describe("list command", () => {
    it("should list tokens from a file", async () => {
      const filePath = join(EXAMPLES_PATH, "tokens/primitives/colors.json");

      const result = await execa(CLI_BINARY, ["list", filePath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("color");
    });

    it("should list tokens with JSON output", async () => {
      const filePath = join(EXAMPLES_PATH, "tokens/primitives/colors.json");

      const result = await execa(CLI_BINARY, ["list", filePath, "--json"]);

      expect(result.exitCode).toBe(0);

      // Should be valid JSON
      const tokens = JSON.parse(result.stdout);
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe("info command", () => {
    it("should show manifest information", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = await execa(CLI_BINARY, ["info", manifestPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Sets:");
      expect(result.stdout).toContain("Modifiers:");
      expect(result.stdout).toContain("Possible permutations: 2");
    });

    it("should show manifest info with JSON output", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = await execa(CLI_BINARY, ["info", manifestPath, "--json"]);

      expect(result.exitCode).toBe(0);

      // Should be valid JSON
      const info = JSON.parse(result.stdout);
      expect(info).toHaveProperty("sets");
      expect(info).toHaveProperty("modifiers");
    });
  });

  describe("bundle command", () => {
    it("should bundle simple tokens from manifest", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "bundler-fixtures/simple-bundle.manifest.json",
      );

      const result = await execa(CLI_BINARY, ["bundle", manifestPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("✓ Bundled");
      expect(result.stdout).toContain("Created:");
    });

    it("should bundle theme variations from manifest", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "bundler-fixtures/theme-bundle.manifest.json",
      );

      const result = await execa(CLI_BINARY, ["bundle", manifestPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("✓ Bundled 2 outputs");
      // Should generate multiple bundles for theme variations
      expect(result.stdout).toMatch(/light|dark/);
    });

    it("should handle bundle command with verbose output", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "bundler-fixtures/simple-bundle.manifest.json",
      );

      const result = await execa(CLI_BINARY, [
        "bundle",
        manifestPath,
        "--verbose",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("✓ Bundled");
    });

    it("should report errors for invalid manifests", async () => {
      const invalidManifestPath = join(
        EXAMPLES_PATH,
        "nonexistent.manifest.json",
      );

      await expect(
        execa(CLI_BINARY, ["bundle", invalidManifestPath]),
      ).rejects.toMatchObject({
        exitCode: 1,
      });
    });
  });

  describe("preview command", () => {
    it("should preview tokens with modifiers", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = await execa(CLI_BINARY, [
        "preview",
        manifestPath,
        "--modifiers",
        "theme=light",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Preview:");
      expect(result.stdout).toContain("Files that would be merged:");
    });
  });

  describe("permutations command", () => {
    it("should list permutations from manifest", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = await execa(CLI_BINARY, ["permutations", manifestPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Available permutations:");
    });

    it("should list permutations as JSON", async () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = await execa(CLI_BINARY, [
        "permutations",
        manifestPath,
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      // Extract JSON part (after the discovery log)
      const jsonStart = result.stdout.indexOf("[");
      const jsonPart = result.stdout.slice(jsonStart);
      // Should be valid JSON
      expect(() => JSON.parse(jsonPart)).not.toThrow();
      const permutations = JSON.parse(jsonPart);
      expect(Array.isArray(permutations)).toBe(true);
      expect(permutations.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should show helpful error for unknown command", async () => {
      await expect(
        execa(CLI_BINARY, ["nonexistent-command"]),
      ).rejects.toMatchObject({
        exitCode: 1,
      });
    });

    it("should show helpful error for missing required argument", async () => {
      await expect(execa(CLI_BINARY, ["validate"])).rejects.toMatchObject({
        exitCode: 1,
      });
    });
  });
});
