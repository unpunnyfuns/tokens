/**
 * E2E tests for the complete bundling workflow
 * Tests real CLI commands with actual files on disk
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEST_DIR = resolve(__dirname, "__e2e_fixtures__");
const CLI_BINARY = resolve(__dirname, "../dist/cli.js");

const BASE_TOKENS = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    brand: {
      primary: {
        $type: "color",
        $value: "#0066CC",
      },
      secondary: {
        $type: "color",
        $value: "{color.brand.primary}",
      },
    },
    neutral: {
      white: {
        $type: "color",
        $value: "#FFFFFF",
      },
      black: {
        $type: "color",
        $value: "#000000",
      },
    },
  },
  spacing: {
    scale: {
      xs: { $type: "dimension", $value: "4px" },
      sm: { $type: "dimension", $value: "8px" },
      md: { $type: "dimension", $value: "16px" },
      lg: { $type: "dimension", $value: "24px" },
    },
  },
};

const SEMANTIC_TOKENS = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    surface: {
      background: {
        $type: "color",
        $value: "{color.neutral.white}",
      },
      foreground: {
        $type: "color",
        $value: "{color.neutral.black}",
      },
    },
    interactive: {
      default: {
        $type: "color",
        $value: "{color.brand.primary}",
      },
    },
  },
};

const THEME_DARK = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    surface: {
      background: {
        $type: "color",
        $value: "{color.neutral.black}",
      },
      foreground: {
        $type: "color",
        $value: "{color.neutral.white}",
      },
    },
  },
};

const MANIFEST = {
  $schema: "https://schemas.upft.co/draft/manifest/v0.json",
  name: "e2e-test-system",
  version: "1.0.0",
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: [],
        dark: ["theme-dark.json"],
      },
    },
  },
  sets: [
    {
      name: "primitives",
      files: ["base-tokens.json"],
    },
    {
      name: "semantic",
      files: ["semantic-tokens.json"],
    },
  ],
  outputs: [
    {
      file: "tokens-{theme}.json",
      modifiers: {
        theme: "*",
      },
    },
  ],
};

describe("Bundler E2E Tests", () => {
  beforeEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Directory may not exist, ignore
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Create test fixtures
    writeFileSync(
      join(TEST_DIR, "base-tokens.json"),
      JSON.stringify(BASE_TOKENS, null, 2),
    );
    writeFileSync(
      join(TEST_DIR, "semantic-tokens.json"),
      JSON.stringify(SEMANTIC_TOKENS, null, 2),
    );
    writeFileSync(
      join(TEST_DIR, "theme-dark.json"),
      JSON.stringify(THEME_DARK, null, 2),
    );
    writeFileSync(
      join(TEST_DIR, "manifest.json"),
      JSON.stringify(MANIFEST, null, 2),
    );
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Directory may not exist, ignore
    }
  });

  describe("full bundling workflow", () => {
    it("should create themed bundles from manifest", async () => {
      const result = await execa(CLI_BINARY, [
        "bundle",
        join(TEST_DIR, "manifest.json"),
        "--output-dir",
        TEST_DIR,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("✓ Bundled");
      expect(result.stdout).toContain("tokens-light.json");
      expect(result.stdout).toContain("tokens-dark.json");

      // Verify output files exist
      const lightBundle = JSON.parse(
        readFileSync(join(TEST_DIR, "tokens-light.json"), "utf-8"),
      );
      const darkBundle = JSON.parse(
        readFileSync(join(TEST_DIR, "tokens-dark.json"), "utf-8"),
      );

      // Light theme should have white background
      expect(lightBundle.color.surface.background).toBe("#FFFFFF");
      expect(lightBundle.color.surface.foreground).toBe("#000000");

      // Dark theme should have black background
      expect(darkBundle.color.surface.background).toBe("#000000");
      expect(darkBundle.color.surface.foreground).toBe("#FFFFFF");

      // Both should have resolved references
      expect(lightBundle.color.brand.secondary).toBe("#0066CC");
      expect(darkBundle.color.brand.secondary).toBe("#0066CC");
    });

    it("should validate inputs before bundling", async () => {
      // Create invalid token file
      writeFileSync(join(TEST_DIR, "invalid.json"), "{ invalid json");

      const invalidManifest = {
        ...MANIFEST,
        sets: [{ name: "invalid", files: ["invalid.json"] }],
      };
      writeFileSync(
        join(TEST_DIR, "invalid-manifest.json"),
        JSON.stringify(invalidManifest, null, 2),
      );

      await expect(
        execa(CLI_BINARY, ["bundle", join(TEST_DIR, "invalid-manifest.json")]),
      ).rejects.toMatchObject({
        exitCode: 1,
      });
    });

    it("should handle missing referenced files", async () => {
      const badManifest = {
        ...MANIFEST,
        sets: [{ name: "missing", files: ["nonexistent.json"] }],
      };
      writeFileSync(
        join(TEST_DIR, "bad-manifest.json"),
        JSON.stringify(badManifest, null, 2),
      );

      await expect(
        execa(CLI_BINARY, ["bundle", join(TEST_DIR, "bad-manifest.json")]),
      ).rejects.toMatchObject({
        exitCode: 1,
      });
    });
  });

  describe("CLI validation workflow", () => {
    it("should validate all files in bundling process", async () => {
      const result = await execa(CLI_BINARY, [
        "validate",
        join(TEST_DIR, "manifest.json"),
        "-m",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Valid");
    });

    it("should validate individual token files", async () => {
      const result = await execa(CLI_BINARY, [
        "validate",
        join(TEST_DIR, "base-tokens.json"),
        "-f",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
    });
  });

  describe("CLI info and inspection workflow", () => {
    it("should show manifest information", async () => {
      const result = await execa(CLI_BINARY, [
        "info",
        join(TEST_DIR, "manifest.json"),
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("e2e-test-system");
      expect(result.stdout).toContain("Sets: 2");
      expect(result.stdout).toContain("Modifiers: 1");
      expect(result.stdout).toContain("Possible permutations: 2");
    });

    it("should list all tokens from files", async () => {
      const result = await execa(CLI_BINARY, [
        "list",
        join(TEST_DIR, "base-tokens.json"),
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("color.brand.primary");
      expect(result.stdout).toContain("spacing.scale.xs");
    });

    it("should show permutations from manifest", async () => {
      const result = await execa(CLI_BINARY, [
        "permutations",
        join(TEST_DIR, "manifest.json"),
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Available permutations:");
      expect(result.stdout).toContain("theme: light");
      expect(result.stdout).toContain("theme: dark");
    });
  });

  describe("error reporting and debugging", () => {
    it("should provide clear error messages for broken references", async () => {
      const brokenTokens = {
        $schema: "https://schemas.upft.co/draft/tokens/v0.json",
        color: {
          broken: {
            $type: "color",
            $value: "{nonexistent.token}",
          },
        },
      };

      writeFileSync(
        join(TEST_DIR, "broken.json"),
        JSON.stringify(brokenTokens, null, 2),
      );

      const brokenManifest = {
        ...MANIFEST,
        sets: [{ name: "broken", files: ["broken.json"] }],
      };
      writeFileSync(
        join(TEST_DIR, "broken-manifest.json"),
        JSON.stringify(brokenManifest, null, 2),
      );

      const result = await execa(
        CLI_BINARY,
        ["bundle", join(TEST_DIR, "broken-manifest.json")],
        { reject: false },
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("nonexistent.token");
    });

    it("should show verbose output when requested", async () => {
      const result = await execa(CLI_BINARY, [
        "bundle",
        join(TEST_DIR, "manifest.json"),
        "--verbose",
        "--output-dir",
        TEST_DIR,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Loading manifest");
      expect(result.stdout).toContain("Processing permutation");
    });
  });

  describe("output format and customization", () => {
    it("should support JSON output for programmatic use", async () => {
      const result = await execa(CLI_BINARY, [
        "info",
        join(TEST_DIR, "manifest.json"),
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      const info = JSON.parse(result.stdout);
      expect(info).toHaveProperty("name", "e2e-test-system");
      expect(info).toHaveProperty("sets");
      expect(info).toHaveProperty("modifiers");
    });

    it("should allow custom output directory", async () => {
      const customDir = join(TEST_DIR, "custom-output");
      mkdirSync(customDir);

      const result = await execa(CLI_BINARY, [
        "bundle",
        join(TEST_DIR, "manifest.json"),
        "--output-dir",
        customDir,
      ]);

      expect(result.exitCode).toBe(0);

      // Verify files are in custom directory
      const lightBundle = readFileSync(
        join(customDir, "tokens-light.json"),
        "utf-8",
      );
      expect(JSON.parse(lightBundle)).toHaveProperty("color");
    });
  });
});
