/**
 * E2E tests for CLI commands
 * These tests spawn actual processes and are slower than unit tests
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLI_PATH = join(process.cwd(), "src/cli/cli.ts");
const EXAMPLES_PATH = join(process.cwd(), "src/examples");

describe("CLI E2E Tests", () => {
  describe("validate command", () => {
    it("should validate a single token file with -f flag", () => {
      const filePath = join(EXAMPLES_PATH, "tokens/primitives/colors.json");

      // Should not throw if valid
      expect(() => {
        execSync(`npx tsx ${CLI_PATH} validate ${filePath} -f`, {
          encoding: "utf8",
          stdio: "pipe", // Suppress output
        });
      }).not.toThrow();
    });

    it("should validate a directory with -d flag", () => {
      const dirPath = join(EXAMPLES_PATH, "tokens/primitives");

      expect(() => {
        execSync(`npx tsx ${CLI_PATH} validate ${dirPath} -d`, {
          encoding: "utf8",
          stdio: "pipe",
        });
      }).not.toThrow();
    });

    it("should validate a manifest with -m flag", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      expect(() => {
        execSync(`npx tsx ${CLI_PATH} validate ${manifestPath} -m`, {
          encoding: "utf8",
          stdio: "pipe",
        });
      }).not.toThrow();
    });

    it("should fail on invalid token file", () => {
      const invalidPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      expect(() => {
        execSync(`npx tsx ${CLI_PATH} validate ${invalidPath} -f`, {
          encoding: "utf8",
          stdio: "pipe",
        });
      }).toThrow();
    });
  });

  describe("preview command", () => {
    it("should preview a manifest with modifiers", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );
      const result = execSync(
        `npx tsx ${CLI_PATH} preview ${manifestPath} --modifiers theme=light`,
        { encoding: "utf8", stdio: "pipe" },
      );

      expect(result).toContain("Preview: theme-light");
      expect(result).toContain("Total tokens: 6");
    });

    it("should preview with JSON output", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );
      const result = execSync(
        `npx tsx ${CLI_PATH} preview ${manifestPath} --modifiers theme=light --json`,
        { encoding: "utf8", stdio: "pipe" },
      );

      const parsed = JSON.parse(result);
      expect(parsed.spacing).toBeDefined();
      expect(parsed.color).toBeDefined();
    });
  });

  describe("list command", () => {
    it("should list tokens from a token file", () => {
      const tokenPath = join(EXAMPLES_PATH, "test-scenarios/theme-light.json");
      const result = execSync(`npx tsx ${CLI_PATH} list ${tokenPath}`, {
        encoding: "utf8",
        stdio: "pipe",
      });

      expect(result).toContain("spacing.small");
      expect(result).toContain("color.primary");
    });

    it("should filter tokens by type", () => {
      const tokenPath = join(EXAMPLES_PATH, "test-scenarios/theme-light.json");
      const result = execSync(
        `npx tsx ${CLI_PATH} list ${tokenPath} --type color --json`,
        { encoding: "utf8", stdio: "pipe" },
      );

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.every((t: any) => t.type === "color")).toBe(true);
    });
  });

  describe("diff command", () => {
    it("should compare two token files directly", () => {
      const file1 = join(EXAMPLES_PATH, "test-scenarios/theme-light.json");
      const file2 = join(EXAMPLES_PATH, "test-scenarios/theme-dark.json");

      const result = execSync(`npx tsx ${CLI_PATH} diff ${file1} ${file2}`, {
        encoding: "utf8",
        stdio: "pipe",
      });

      expect(result).toContain("Comparing files:");
      expect(result).toContain("Changed  2");
    });

    it("should compare manifest permutations with -m flag", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      const result = execSync(
        `npx tsx ${CLI_PATH} diff ${manifestPath} -m --left-modifiers theme=light --right-modifiers theme=dark`,
        { encoding: "utf8", stdio: "pipe" },
      );

      expect(result).toContain("Comparing:");
      expect(result).toContain("Changed  2");
    });
  });

  describe("lint command", () => {
    it("should lint token files", () => {
      const filePath = join(EXAMPLES_PATH, "tokens/primitives/colors.json");

      expect(() => {
        execSync(`npx tsx ${CLI_PATH} lint ${filePath} 2>/dev/null`, {
          encoding: "utf8",
        });
      }).not.toThrow();
    });

    it("should report lint errors for invalid files", () => {
      const manifestFile = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );

      // Linting a manifest as tokens should report errors
      const result = execSync(
        `npx tsx ${CLI_PATH} lint ${manifestFile} 2>&1 || true`,
        {
          encoding: "utf8",
          stdio: "pipe",
        },
      );

      // Should output error message
      expect(result).toContain("errors");
    });
  });
});
