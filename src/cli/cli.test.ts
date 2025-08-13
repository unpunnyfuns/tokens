/**
 * Integration tests for CLI commands
 * For E2E tests that spawn processes, see cli.e2e.test.ts
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLI_PATH = join(process.cwd(), "src/cli/cli.ts");
const EXAMPLES_PATH = join(process.cwd(), "src/examples");

// Helper to run CLI commands with suppressed stderr
function runCLI(command: string, options: { expectError?: boolean } = {}) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"], // Suppress stderr
    });
  } catch (error: any) {
    if (options.expectError) {
      throw error;
    }
    // Return stdout even on error
    return error.stdout || "";
  }
}

describe("CLI Integration Tests", () => {
  describe("help output", () => {
    it("should show help when --help is provided", () => {
      const result = runCLI(`npx tsx ${CLI_PATH} --help`);

      expect(result).toContain("Usage:");
      expect(result).toContain("Commands:");
      expect(result).toContain("validate");
      expect(result).toContain("preview");
      expect(result).toContain("bundle");
      expect(result).toContain("list");
      expect(result).toContain("diff");
    });

    it("should show help for validate command", () => {
      const result = runCLI(`npx tsx ${CLI_PATH} validate --help`);

      expect(result).toContain("Validate tokens or manifest");
      expect(result).toContain("-f, --file");
      expect(result).toContain("-d, --directory");
      expect(result).toContain("-m, --manifest");
    });

    it("should show help for preview command", () => {
      const result = runCLI(`npx tsx ${CLI_PATH} preview --help`);

      expect(result).toContain("Preview merged tokens");
      expect(result).toContain("-m, --modifiers");
      expect(result).toContain("--json");
    });
  });

  describe("error handling", () => {
    it("should error when validate is called without path", () => {
      expect(() => {
        runCLI(`npx tsx ${CLI_PATH} validate`, { expectError: true });
      }).toThrow();
    });

    it("should error when file doesn't exist", () => {
      expect(() => {
        runCLI(`npx tsx ${CLI_PATH} validate /nonexistent/file.json -f`, {
          expectError: true,
        });
      }).toThrow();
    });

    it("should error on invalid command", () => {
      expect(() => {
        runCLI(`npx tsx ${CLI_PATH} nonexistent`, { expectError: true });
      }).toThrow();
    });
  });

  describe("info command", () => {
    it("should show manifest information", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );
      const result = runCLI(`npx tsx ${CLI_PATH} info ${manifestPath}`);

      expect(result).toContain("Sets: 1");
      expect(result).toContain("Modifiers: 1");
      expect(result).toContain("theme (oneOf): light, dark");
      expect(result).toContain("Possible permutations: 2");
    });

    it("should output manifest info as JSON", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );
      const result = runCLI(`npx tsx ${CLI_PATH} info ${manifestPath} --json`);

      const parsed = JSON.parse(result);
      expect(parsed.sets).toHaveLength(1);
      expect(parsed.modifiers).toHaveLength(1);
      expect(parsed.possiblePermutations).toBe(2);
    });
  });

  describe("permutations command", () => {
    it("should list permutations from manifest", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );
      const result = runCLI(`npx tsx ${CLI_PATH} permutations ${manifestPath}`);

      expect(result).toContain("theme-light");
      expect(result).toContain("theme-dark");
    });

    it("should list permutations as JSON", () => {
      const manifestPath = join(
        EXAMPLES_PATH,
        "test-scenarios/simple.manifest.json",
      );
      const result = runCLI(
        `npx tsx ${CLI_PATH} permutations ${manifestPath} --json`,
      );

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty("id");
    });
  });
});
