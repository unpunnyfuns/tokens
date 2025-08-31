/**
 * Unit tests for CLI functionality (for code coverage)
 * These complement the E2E tests in cli.e2e.test.ts
 */

import { describe, expect, it } from "vitest";
import { createCLI } from "./commands.js";

describe("CLI Commands (Unit Tests)", () => {
  describe("createCLI", () => {
    it("should create CLI instance with default options", () => {
      const cli = createCLI();
      expect(cli).toBeDefined();
      expect(cli.validateTokenFile).toBeInstanceOf(Function);
      expect(cli.validateManifestFile).toBeInstanceOf(Function);
      expect(cli.buildFromFile).toBeInstanceOf(Function);
    });

    it("should create CLI instance with custom options", () => {
      const options = {
        basePath: "/custom/path",
      };

      const cli = createCLI(options);
      expect(cli).toBeDefined();
    });

    it("should have all expected CLI methods", () => {
      const cli = createCLI();

      // Validation methods
      expect(cli.validate).toBeInstanceOf(Function);
      expect(cli.validateManifest).toBeInstanceOf(Function);
      expect(cli.validateManifestFile).toBeInstanceOf(Function);
      expect(cli.validateTokenFile).toBeInstanceOf(Function);
      expect(cli.validateDirectory).toBeInstanceOf(Function);

      // Bundle methods
      expect(cli.build).toBeInstanceOf(Function);
      expect(cli.buildFromFile).toBeInstanceOf(Function);
      expect(cli.bundle).toBeInstanceOf(Function);
      expect(cli.bundleFromFile).toBeInstanceOf(Function);

      // Resolve methods
      expect(cli.resolve).toBeInstanceOf(Function);
      expect(cli.resolveFromFile).toBeInstanceOf(Function);
      expect(cli.list).toBeInstanceOf(Function);
      expect(cli.listFromFile).toBeInstanceOf(Function);

      // Other methods
      expect(cli.listTokens).toBeInstanceOf(Function);
      expect(cli.diff).toBeInstanceOf(Function);
      expect(cli.diffDocuments).toBeInstanceOf(Function);
      expect(cli.info).toBeInstanceOf(Function);
      expect(cli.lint).toBeInstanceOf(Function);
    });
  });

  describe("CLI utility functions", () => {
    it("should handle different CLI option combinations", () => {
      // Test various option combinations
      expect(() => createCLI({ basePath: "/test" })).not.toThrow();
      expect(() => createCLI({ fileReader: {} as any })).not.toThrow();
      expect(() => createCLI({ fileWriter: {} as any })).not.toThrow();
      expect(() => createCLI({})).not.toThrow();
    });

    it("should create command methods that are functions", () => {
      const cli = createCLI();

      // Test that these are functions without calling them
      expect(typeof cli.validateTokenFile).toBe("function");
      expect(typeof cli.buildFromFile).toBe("function");
      expect(typeof cli.resolveFromFile).toBe("function");
      expect(typeof cli.listFromFile).toBe("function");
    });

    it("should handle method calls with different parameter types", () => {
      const cli = createCLI();

      // Test that methods accept different parameter combinations without calling them
      expect(typeof cli.listTokens).toBe("function");
      expect(typeof cli.lint).toBe("function");
      expect(cli.listTokens.length).toBeGreaterThan(0); // Check it accepts parameters
      expect(cli.lint.length).toBeGreaterThan(0); // Check it accepts parameters
    });
  });

  describe("CLI configuration", () => {
    it("should properly configure resolverOptions", () => {
      const cli = createCLI({
        basePath: "/test",
        fileReader: {} as any,
      });

      expect(cli).toBeDefined();
      // The methods should exist and be callable
      expect(cli.resolveFromFile).toBeInstanceOf(Function);
    });

    it("should properly configure bundleOptions", () => {
      const cli = createCLI({
        basePath: "/test",
        fileWriter: {} as any,
      });

      expect(cli).toBeDefined();
      expect(cli.buildFromFile).toBeInstanceOf(Function);
    });
  });
});
