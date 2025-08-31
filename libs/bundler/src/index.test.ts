/**
 * Tests for bundler package exports
 */

import { describe, expect, it } from "vitest";
import * as bundler from "./index.js";

describe("Bundler Package Exports", () => {
  describe("AST Bundler exports", () => {
    it("should export bundle function", () => {
      expect(bundler.bundle).toBeDefined();
      expect(typeof bundler.bundle).toBe("function");
    });

    it("should export bundlePermutation function", () => {
      expect(bundler.bundlePermutation).toBeDefined();
      expect(typeof bundler.bundlePermutation).toBe("function");
    });

    it("should export writeBundles function", () => {
      expect(bundler.writeBundles).toBeDefined();
      expect(typeof bundler.writeBundles).toBe("function");
    });

    it("should export writeBundlesToFiles function", () => {
      expect(bundler.writeBundlesToFiles).toBeDefined();
      expect(typeof bundler.writeBundlesToFiles).toBe("function");
    });

    it("should export BundlerOptions type alias", () => {
      // TypeScript types are not available at runtime, so we test that the export exists
      // by verifying the import doesn't throw
      expect(() => {
        const options: bundler.BundlerOptions = {
          outputFormat: "json",
          prettify: true,
        };
        return options;
      }).not.toThrow();
    });
  });

  describe("Build Config Parser exports", () => {
    it("should export extractPathTemplates function", () => {
      expect(bundler.extractPathTemplates).toBeDefined();
      expect(typeof bundler.extractPathTemplates).toBe("function");
    });

    it("should export loadBuildConfig function", () => {
      expect(bundler.loadBuildConfig).toBeDefined();
      expect(typeof bundler.loadBuildConfig).toBe("function");
    });

    it("should export resolvePathTemplates function", () => {
      expect(bundler.resolvePathTemplates).toBeDefined();
      expect(typeof bundler.resolvePathTemplates).toBe("function");
    });

    it("should export validateBuildConfig function", () => {
      expect(bundler.validateBuildConfig).toBeDefined();
      expect(typeof bundler.validateBuildConfig).toBe("function");
    });

    it("should export BuildConfigParseResult type", () => {
      // Test that we can use the type in a type assertion
      expect(() => {
        const result = {
          config: {} as any,
          errors: [],
          warnings: [],
        } as bundler.BuildConfigParseResult;
        return result;
      }).not.toThrow();
    });
  });

  describe("Bundle Validator exports", () => {
    it("should export validateBundle function", () => {
      expect(bundler.validateBundle).toBeDefined();
      expect(typeof bundler.validateBundle).toBe("function");
    });

    it("should export BundleValidationOptions type", () => {
      expect(() => {
        const options: bundler.BundleValidationOptions = {
          checkReferences: true,
          validateTypes: true,
        };
        return options;
      }).not.toThrow();
    });

    it("should export BundleValidationError type", () => {
      expect(() => {
        const error: bundler.BundleValidationError = {
          type: "error",
          message: "Test error",
          path: "test.path",
        };
        return error;
      }).not.toThrow();
    });

    it("should export BundleValidationResult type", () => {
      expect(() => {
        const result: bundler.BundleValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          stats: {
            totalTokens: 0,
            bundleSizeKB: 0,
            tokenTypes: {},
          },
        };
        return result;
      }).not.toThrow();
    });
  });

  describe("Complete type coverage", () => {
    it("should export all Bundle-related types", () => {
      expect(() => {
        const bundle: bundler.Bundle = {
          id: "test",
          tokens: {},
          files: [],
          format: "json",
        };
        return bundle;
      }).not.toThrow();

      expect(() => {
        const writeResult: bundler.BundleWriteResult = {
          filePath: "test.json",
          success: true,
        };
        return writeResult;
      }).not.toThrow();

      expect(() => {
        const transform: bundler.TokenTransform = (tokens) => tokens;
        return transform;
      }).not.toThrow();
    });

    it("should provide consistent API surface", () => {
      // Test that the main entry points are available - using static access to avoid linting warnings
      expect(bundler).toHaveProperty("bundle");
      expect(typeof bundler.bundle).toBe("function");

      expect(bundler).toHaveProperty("bundlePermutation");
      expect(typeof bundler.bundlePermutation).toBe("function");

      expect(bundler).toHaveProperty("writeBundles");
      expect(typeof bundler.writeBundles).toBe("function");

      expect(bundler).toHaveProperty("writeBundlesToFiles");
      expect(typeof bundler.writeBundlesToFiles).toBe("function");

      expect(bundler).toHaveProperty("extractPathTemplates");
      expect(typeof bundler.extractPathTemplates).toBe("function");

      expect(bundler).toHaveProperty("loadBuildConfig");
      expect(typeof bundler.loadBuildConfig).toBe("function");

      expect(bundler).toHaveProperty("resolvePathTemplates");
      expect(typeof bundler.resolvePathTemplates).toBe("function");

      expect(bundler).toHaveProperty("validateBuildConfig");
      expect(typeof bundler.validateBuildConfig).toBe("function");

      expect(bundler).toHaveProperty("validateBundle");
      expect(typeof bundler.validateBundle).toBe("function");
    });
  });

  describe("Functional integration", () => {
    it("should allow basic bundling workflow", () => {
      // Test that the exported functions can be used together
      // This is a smoke test to ensure the API works end-to-end
      expect(() => {
        const templates = bundler.extractPathTemplates("dist/{theme}.json");
        const resolved = bundler.resolvePathTemplates("dist/{theme}.json", {
          theme: "light",
        });

        expect(templates).toEqual(["theme"]);
        expect(resolved).toBe("dist/light.json");
      }).not.toThrow();
    });

    it("should allow validation workflow", () => {
      expect(() => {
        const testBundle = {
          colors: {
            primary: {
              $type: "color",
              $value: "#ff0000",
            },
          },
        };

        const result = bundler.validateBundle(testBundle);
        expect(result.valid).toBe(true);
        expect(result.stats.totalTokens).toBe(1);
      }).not.toThrow();
    });
  });
});
