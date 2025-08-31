/**
 * Comprehensive unit tests for CLI utility functions
 * Tests isolated utility functions without importing the main CLI module
 */

import type { LintResult } from "@upft/linter";
import { describe, expect, it } from "vitest";

// Recreate utility functions from cli.ts for isolated testing
const parseModifiers = (mods?: string[]) =>
  Object.fromEntries(
    (mods || []).map((m) => m.split("=")).filter(([k, v]) => k && v),
  );

const buildLintOptions = (opts: Record<string, unknown>) => {
  const lintOpts: any = {};
  if (opts.config) lintOpts.configPath = opts.config as string;
  if (opts.quiet) lintOpts.quiet = opts.quiet as boolean;
  if (opts.maxWarnings)
    lintOpts.maxWarnings = parseInt(opts.maxWarnings as string, 10);
  if (opts.manifest !== undefined) lintOpts.manifest = opts.manifest as boolean;
  return lintOpts;
};

const formatValidationError = (error: unknown): string => {
  if (typeof error === "string") {
    return `  ${error}`;
  }
  if (error && typeof error === "object" && "message" in error) {
    const err = error as { message: string; path?: string };
    return `  ${err.message}${err.path ? ` (${err.path})` : ""}`;
  }
  return `  ${String(error)}`;
};

const shouldExitWithError = (
  result: LintResult,
  maxWarnings?: string,
): boolean => {
  const hasErrors = result.summary.errors > 0;
  const exceedsWarnings =
    maxWarnings && result.summary.warnings > parseInt(maxWarnings, 10);
  return hasErrors || !!exceedsWarnings;
};

describe("CLI Utility Functions", () => {
  describe("parseModifiers", () => {
    it("should parse modifier strings into key-value pairs", () => {
      const result = parseModifiers(["theme=light", "platform=web"]);
      expect(result).toEqual({
        theme: "light",
        platform: "web",
      });
    });

    it("should handle empty modifiers array", () => {
      const result = parseModifiers([]);
      expect(result).toEqual({});
    });

    it("should handle undefined modifiers", () => {
      const result = parseModifiers();
      expect(result).toEqual({});
    });

    it("should filter out invalid modifiers", () => {
      const result = parseModifiers([
        "valid=value",
        "invalid",
        "=empty",
        "key=",
      ]);
      expect(result).toEqual({
        valid: "value",
      });
    });

    it("should handle complex values", () => {
      const result = parseModifiers(["theme=light-mode", "version=1.2.3"]);
      expect(result).toEqual({
        theme: "light-mode",
        version: "1.2.3",
      });
    });
  });

  describe("buildLintOptions", () => {
    it("should build lint options from CLI options", () => {
      const opts = {
        config: "/path/to/config",
        quiet: true,
        maxWarnings: "10",
        manifest: true,
      };

      const result = buildLintOptions(opts);
      expect(result).toEqual({
        configPath: "/path/to/config",
        quiet: true,
        maxWarnings: 10,
        manifest: true,
      });
    });

    it("should handle empty options", () => {
      const result = buildLintOptions({});
      expect(result).toEqual({});
    });

    it("should handle partial options", () => {
      const result = buildLintOptions({ quiet: true });
      expect(result).toEqual({ quiet: true });
    });

    it("should handle manifest false explicitly", () => {
      const result = buildLintOptions({ manifest: false });
      expect(result).toEqual({ manifest: false });
    });
  });

  describe("formatValidationError", () => {
    it("should format string errors", () => {
      const result = formatValidationError("Simple error message");
      expect(result).toBe("  Simple error message");
    });

    it("should format error objects with message", () => {
      const error = { message: "Invalid token" };
      const result = formatValidationError(error);
      expect(result).toBe("  Invalid token");
    });

    it("should format error objects with message and path", () => {
      const error = { message: "Invalid token", path: "tokens.color.primary" };
      const result = formatValidationError(error);
      expect(result).toBe("  Invalid token (tokens.color.primary)");
    });

    it("should handle unknown error types", () => {
      const result = formatValidationError(null);
      expect(result).toBe("  null");
    });

    it("should handle number errors", () => {
      const result = formatValidationError(404);
      expect(result).toBe("  404");
    });
  });

  describe("shouldExitWithError", () => {
    it("should return true when there are errors", () => {
      const result: LintResult = {
        files: [],
        summary: { errors: 1, warnings: 0 },
      };
      expect(shouldExitWithError(result)).toBe(true);
    });

    it("should return false when no errors and no max warnings", () => {
      const result: LintResult = {
        files: [],
        summary: { errors: 0, warnings: 5 },
      };
      expect(shouldExitWithError(result)).toBe(false);
    });

    it("should return true when warnings exceed maxWarnings", () => {
      const result: LintResult = {
        files: [],
        summary: { errors: 0, warnings: 10 },
      };
      expect(shouldExitWithError(result, "5")).toBe(true);
    });

    it("should return false when warnings don't exceed maxWarnings", () => {
      const result: LintResult = {
        files: [],
        summary: { errors: 0, warnings: 3 },
      };
      expect(shouldExitWithError(result, "5")).toBe(false);
    });
  });
});
