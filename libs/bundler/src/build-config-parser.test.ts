/**
 * Tests for build configuration parser
 */

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BuildConfig, BuildConfigOutput } from "@upft/foundation";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  extractPathTemplates,
  loadBuildConfig,
  resolvePathTemplates,
  validateBuildConfig,
} from "./build-config-parser.js";

describe("build-config-parser", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = join(tmpdir(), `bundler-test-${Date.now()}-${Math.random()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory (basic cleanup, don't worry about errors)
    try {
      await import("node:fs/promises").then(({ rm }) =>
        rm(tempDir, { recursive: true, force: true }),
      );
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("loadBuildConfig", () => {
    it("should load and parse a valid build configuration", async () => {
      const validConfig: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: {
              path: "dist/{theme}-{size}.json",
            },
            modifiers: {
              theme: ["light", "dark"],
              size: ["sm", "lg"],
            },
          },
        ],
      };

      const configPath = join(tempDir, "build.config.json");
      await writeFile(configPath, JSON.stringify(validConfig, null, 2));

      const result = await loadBuildConfig(configPath);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.config).toMatchObject({
        manifest: expect.stringContaining("tokens.json"),
        outputs: [
          {
            name: "web",
            output: {
              path: "dist/{theme}-{size}.json",
            },
            modifiers: {
              theme: ["light", "dark"],
              size: ["sm", "lg"],
            },
          },
        ],
      });
      // Should resolve manifest path relative to config
      expect(result.config.manifest).toBe(join(tempDir, "tokens.json"));
    });

    it("should handle non-existent config file", async () => {
      const result = await loadBuildConfig("/non/existent/config.json");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to load build config");
      expect(result.config).toEqual({});
    });

    it("should handle invalid JSON", async () => {
      const configPath = join(tempDir, "invalid.json");
      await writeFile(configPath, "{ invalid json }");

      const result = await loadBuildConfig(configPath);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to load build config");
    });

    it("should handle invalid config format", async () => {
      const invalidConfig = {
        notAValidConfig: true,
      };

      const configPath = join(tempDir, "invalid-format.json");
      await writeFile(configPath, JSON.stringify(invalidConfig));

      const result = await loadBuildConfig(configPath);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Invalid build configuration format");
    });

    it("should include validation errors and warnings", async () => {
      const configWithIssues: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: {
              path: "dist/{nonexistent}.json", // Template not in modifiers
            },
            modifiers: {
              theme: ["light", "dark"],
            },
          },
        ],
      };

      const configPath = join(tempDir, "issues.json");
      await writeFile(configPath, JSON.stringify(configWithIssues));

      const result = await loadBuildConfig(configPath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some((e) =>
          e.includes("Path template {nonexistent} not found in modifiers"),
        ),
      ).toBe(true);
    });
  });

  describe("validateBuildConfig", () => {
    it("should validate a correct build configuration", () => {
      const validConfig: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: {
              path: "dist/web.json",
            },
            modifiers: {
              theme: ["light", "dark"],
            },
          },
        ],
      };

      const result = validateBuildConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should require at least one output", () => {
      const configWithoutOutputs: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [],
      };

      const result = validateBuildConfig(configWithoutOutputs);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe(
        "Build configuration must have at least one output",
      );
      expect(result.errors[0].path).toBe("outputs");
    });

    it("should validate output names", () => {
      const configWithInvalidOutput: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "", // Empty name
            output: {
              path: "dist/output.json",
            },
            modifiers: {
              theme: ["light"],
            },
          },
        ],
      };

      const result = validateBuildConfig(configWithInvalidOutput);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message === "Output must have a name"),
      ).toBe(true);
    });

    it("should validate output paths", () => {
      const configWithInvalidPath: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: {
              path: "", // Empty path
            },
            modifiers: {
              theme: ["light"],
            },
          },
        ],
      };

      const result = validateBuildConfig(configWithInvalidPath);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message === "Output must have a path"),
      ).toBe(true);
    });

    it("should warn about outputs with no modifiers", () => {
      const configWithoutModifiers: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: {
              path: "dist/web.json",
            },
            modifiers: {}, // Empty modifiers
          },
        ],
      };

      const result = validateBuildConfig(configWithoutModifiers);

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe(
        "Output has no modifiers - will use base tokens only",
      );
    });

    it("should validate path templates", () => {
      const configWithInvalidTemplate: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: {
              path: "dist/{theme}-{size}.json",
            },
            modifiers: {
              theme: ["light", "dark"],
              // Missing 'size' modifier
            },
          },
        ],
      };

      const result = validateBuildConfig(configWithInvalidTemplate);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Path template {size} not found in modifiers"),
        ),
      ).toBe(true);
    });

    it("should warn about duplicate output names", () => {
      const configWithDuplicates: BuildConfig = {
        manifest: "./tokens.json",
        outputs: [
          {
            name: "web",
            output: { path: "dist/web1.json" },
            modifiers: { theme: ["light"] },
          },
          {
            name: "web", // Duplicate name
            output: { path: "dist/web2.json" },
            modifiers: { theme: ["dark"] },
          },
        ],
      };

      const result = validateBuildConfig(configWithDuplicates);

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe("Duplicate output name: web");
    });

    it("should handle config with null outputs gracefully", () => {
      const configWithNullOutput = {
        manifest: "./tokens.json",
        outputs: [null] as unknown as BuildConfigOutput[],
      };

      const result = validateBuildConfig(configWithNullOutput as BuildConfig);

      // Should not crash - null outputs are skipped, so if there's only null it has no valid outputs
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("at least one output")),
      ).toBe(true);
    });
  });

  describe("extractPathTemplates", () => {
    it("should extract template variables from path", () => {
      const templates = extractPathTemplates("dist/{theme}-{size}.{format}");

      expect(templates).toEqual(["theme", "size", "format"]);
    });

    it("should handle paths with no templates", () => {
      const templates = extractPathTemplates("dist/static.json");

      expect(templates).toEqual([]);
    });

    it("should handle empty or malformed templates", () => {
      const templates = extractPathTemplates("dist/{}.json");

      // Empty braces don't produce a template match
      expect(templates).toEqual([]);
    });

    it("should handle multiple occurrences of same template", () => {
      const templates = extractPathTemplates("dist/{theme}/{theme}.json");

      expect(templates).toEqual(["theme", "theme"]);
    });

    it("should handle nested braces", () => {
      const templates = extractPathTemplates("dist/{theme-{nested}}.json");

      expect(templates).toEqual(["theme-{nested"]);
    });

    it("should handle edge cases", () => {
      expect(extractPathTemplates("")).toEqual([]);
      expect(extractPathTemplates("{}")).toEqual([]);
      expect(extractPathTemplates("{")).toEqual([]);
      expect(extractPathTemplates("}")).toEqual([]);
    });
  });

  describe("resolvePathTemplates", () => {
    it("should resolve simple templates", () => {
      const resolved = resolvePathTemplates("dist/{theme}.json", {
        theme: "light",
      });

      expect(resolved).toBe("dist/light.json");
    });

    it("should resolve multiple templates", () => {
      const resolved = resolvePathTemplates("dist/{theme}-{size}.json", {
        theme: "light",
        size: "lg",
      });

      expect(resolved).toBe("dist/light-lg.json");
    });

    it("should handle array values by joining with dash", () => {
      const resolved = resolvePathTemplates("dist/{platforms}.json", {
        platforms: ["web", "mobile"],
      });

      expect(resolved).toBe("dist/web-mobile.json");
    });

    it("should handle missing modifiers by keeping template", () => {
      const resolved = resolvePathTemplates("dist/{theme}-{missing}.json", {
        theme: "light",
      });

      expect(resolved).toBe("dist/light-{missing}.json");
    });

    it("should handle non-string modifier values", () => {
      const resolved = resolvePathTemplates("dist/{count}.json", {
        count: 42 as unknown as string,
      });

      expect(resolved).toBe("dist/42.json");
    });

    it("should handle empty and null modifiers", () => {
      // Empty string is falsy, so it falls back to the original template
      const resolved1 = resolvePathTemplates("dist/{theme}.json", {
        theme: "",
      });
      expect(resolved1).toBe("dist/{theme}.json");

      // null is also falsy, so it falls back to the original template
      const resolved2 = resolvePathTemplates("dist/{theme}.json", {
        theme: null as unknown as string,
      });
      expect(resolved2).toBe("dist/{theme}.json");

      // Test undefined/missing modifier - should keep the template unchanged
      const resolved3 = resolvePathTemplates("dist/{theme}.json", {});
      expect(resolved3).toBe("dist/{theme}.json");

      // Test with actual string value to show it works
      const resolved4 = resolvePathTemplates("dist/{theme}.json", {
        theme: "light",
      });
      expect(resolved4).toBe("dist/light.json");
    });

    it("should handle paths with no templates", () => {
      const resolved = resolvePathTemplates("dist/static.json", {
        theme: "light",
      });

      expect(resolved).toBe("dist/static.json");
    });

    it("should handle complex array joins", () => {
      const resolved = resolvePathTemplates(
        "dist/{features}-{platforms}.json",
        {
          features: ["auth", "payments", "analytics"],
          platforms: ["web", "ios", "android"],
        },
      );

      expect(resolved).toBe(
        "dist/auth-payments-analytics-web-ios-android.json",
      );
    });
  });
});
