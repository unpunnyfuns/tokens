/**
 * Tests for manifest resolver registry
 */

import type { ManifestAST } from "@upft/ast";
import type { ValidationResult } from "@upft/foundation";
import { beforeEach, describe, expect, it } from "vitest";
import {
  detectManifestFormat,
  getRegisteredResolvers,
  type ManifestResolver,
  parseManifestWithRegistry,
  registerManifestResolver,
  validateManifestWithRegistry,
} from "./registry.js";

// Mock resolver for testing
const mockResolver: ManifestResolver = {
  name: "mock",
  detect: (manifest: unknown) => {
    return (
      typeof manifest === "object" &&
      manifest !== null &&
      "mockFormat" in manifest
    );
  },
  parse: (_manifest: unknown, path: string): ManifestAST => {
    return {
      type: "manifest",
      name: "mock-manifest",
      path,
      manifestType: "mock" as any,
      sets: new Map(),
      modifiers: new Map(),
      permutations: new Map(),
      metadata: { format: "mock" },
    };
  },
  validate: (_manifest: unknown): ValidationResult => {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  },
};

describe("Manifest Resolver Registry", () => {
  describe("registerManifestResolver", () => {
    it("should register a new resolver", () => {
      const initialResolvers = getRegisteredResolvers();
      registerManifestResolver(mockResolver);

      const updatedResolvers = getRegisteredResolvers();
      expect(updatedResolvers).toContain("mock");
      expect(updatedResolvers.length).toBe(initialResolvers.length + 1);
    });
  });

  describe("detectManifestFormat", () => {
    beforeEach(() => {
      registerManifestResolver(mockResolver);
    });

    it("should detect registered format", () => {
      const testManifest = { mockFormat: true };
      const format = detectManifestFormat(testManifest);
      expect(format).toBe("mock");
    });

    it("should return null for unknown format", () => {
      const unknownManifest = { unknownFormat: true };
      const format = detectManifestFormat(unknownManifest);
      expect(format).toBe(null);
    });

    it("should return null for invalid input", () => {
      expect(detectManifestFormat(null)).toBe(null);
      expect(detectManifestFormat(undefined)).toBe(null);
      expect(detectManifestFormat("string")).toBe(null);
      expect(detectManifestFormat(123)).toBe(null);
    });
  });

  describe("parseManifestWithRegistry", () => {
    beforeEach(() => {
      registerManifestResolver(mockResolver);
    });

    it("should parse manifest with registered resolver", () => {
      const manifest = { mockFormat: true };
      const ast = parseManifestWithRegistry(manifest, "test.json");

      expect(ast.name).toBe("mock-manifest");
      expect(ast.path).toBe("test.json");
      expect(ast.manifestType).toBe("mock");
      expect(ast.metadata?.format).toBe("mock");
    });

    it("should throw error for unknown format", () => {
      const manifest = { unknownFormat: true };

      expect(() => parseManifestWithRegistry(manifest, "test.json")).toThrow(
        "Unknown manifest format",
      );
    });

    it("should include available formats in error message", () => {
      const manifest = { unknownFormat: true };

      expect(() => parseManifestWithRegistry(manifest, "test.json")).toThrow(
        /Available formats:.*mock/,
      );
    });
  });

  describe("validateManifestWithRegistry", () => {
    beforeEach(() => {
      registerManifestResolver(mockResolver);
    });

    it("should validate manifest with registered resolver", () => {
      const manifest = { mockFormat: true };
      const result = validateManifestWithRegistry(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should return invalid for unknown format", () => {
      const manifest = { unknownFormat: true };
      const result = validateManifestWithRegistry(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe("Unknown manifest format");
    });

    it("should handle resolver without validation function", () => {
      const resolverWithoutValidation: ManifestResolver = {
        name: "no-validate",
        detect: (manifest: unknown) =>
          typeof manifest === "object" &&
          manifest !== null &&
          "noValidate" in manifest,
        parse: mockResolver.parse,
        // No validate function
      };

      registerManifestResolver(resolverWithoutValidation);

      const manifest = { noValidate: true };
      const result = validateManifestWithRegistry(manifest);

      expect(result.valid).toBe(true);
    });
  });

  describe("getRegisteredResolvers", () => {
    it("should return array of resolver names", () => {
      registerManifestResolver(mockResolver);
      const resolvers = getRegisteredResolvers();

      expect(Array.isArray(resolvers)).toBe(true);
      expect(resolvers).toContain("mock");
    });
  });
});
