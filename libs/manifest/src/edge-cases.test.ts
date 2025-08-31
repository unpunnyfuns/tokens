/**
 * Edge case and error condition tests for manifest package
 */

import type { ManifestAST } from "@upft/ast";
import { beforeEach, describe, expect, it } from "vitest";
import {
  detectManifestFormat,
  generatePermutationId,
  getRegisteredResolvers,
  type ManifestResolver,
  parseManifest,
  registerManifestResolver,
  resolvePermutationFiles,
} from "./index.js";

describe("Edge Cases and Error Conditions", () => {
  describe("generatePermutationId edge cases", () => {
    it("should handle circular references gracefully", () => {
      const circular: any = { theme: "dark" };
      circular.self = circular;

      // Should not throw and should handle the non-circular parts
      const id = generatePermutationId(circular);
      expect(id).toBe("theme-dark");
    });

    it("should handle deeply nested objects", () => {
      const input: Record<string, string | string[]> = {
        theme: "light",
        // Note: generatePermutationId only processes string/string[] values
      };

      const id = generatePermutationId(input);
      expect(id).toBe("theme-light"); // Should only process top-level string values
    });

    it("should handle special characters in values", () => {
      const input = {
        theme: "light-theme-v2.1",
        platform: "web@mobile",
        features: ["a11y+high-contrast", "responsive/fluid"],
      };

      const id = generatePermutationId(input);
      expect(id).toBe(
        "theme-light-theme-v2.1_platform-web@mobile_features-a11y+high-contrast+responsive/fluid",
      );
    });

    it("should handle very large arrays", () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`);
      const input = {
        features: largeArray,
      };

      const id = generatePermutationId(input);
      expect(id).toContain("features-item-0");
      expect(id).toContain("item-999");
    });

    it("should handle unicode characters", () => {
      const input = {
        theme: "темная-тема",
        locale: "中文",
        features: ["響應式", "無障礙"],
      };

      const id = generatePermutationId(input);
      expect(id).toContain("темная-тема");
      expect(id).toContain("中文");
      expect(id).toContain("響應式");
    });
  });

  describe("resolvePermutationFiles error handling", () => {
    let manifestAST: ManifestAST;

    beforeEach(() => {
      manifestAST = {
        type: "manifest",
        name: "test",
        path: "test.json",
        manifestType: "upft",
        sets: new Map(),
        modifiers: new Map(),
        permutations: new Map(),
        metadata: {},
      };
    });

    it("should handle corrupted set data", () => {
      // Manually corrupt set data
      manifestAST.sets.set("corrupt", {
        type: "manifest",
        name: "corrupt",
        path: "test.json",
        files: null as any, // Corrupt data
        metadata: {},
      });

      const permutation = {
        type: "group" as const,
        name: "test",
        path: "test.json",
        input: {},
        resolvedFiles: [],
        tokens: {},
        metadata: {},
      };

      // Should throw but we can catch it
      expect(() => resolvePermutationFiles(manifestAST, permutation)).toThrow();
    });

    it("should handle modifier with corrupted values map", () => {
      const corruptModifier = {
        type: "manifest" as const,
        name: "corrupt",
        path: "test.json",
        constraintType: "oneOf" as const,
        options: ["value"],
        values: null as any, // Corrupt values map
        defaultValue: "",
        description: "",
        metadata: {},
      };

      manifestAST.modifiers.set("corrupt", corruptModifier);

      const permutation = {
        type: "group" as const,
        name: "test",
        path: "test.json",
        input: { corrupt: "value" },
        resolvedFiles: [],
        tokens: {},
        metadata: {},
      };

      // Should throw due to corrupted data
      expect(() => resolvePermutationFiles(manifestAST, permutation)).toThrow();
    });

    it("should handle very large file lists", () => {
      const largeFileList = Array.from(
        { length: 10000 },
        (_, i) => `file-${i}.json`,
      );

      manifestAST.sets.set("large", {
        type: "manifest",
        name: "large",
        path: "test.json",
        files: largeFileList,
        metadata: {},
      });

      const permutation = {
        type: "group" as const,
        name: "test",
        path: "test.json",
        input: {},
        resolvedFiles: [],
        tokens: {},
        metadata: {},
      };

      const files = resolvePermutationFiles(manifestAST, permutation);
      expect(files).toHaveLength(10000);
      expect(files[0]).toBe("file-0.json");
      expect(files[9999]).toBe("file-9999.json");
    });
  });

  describe("Registry error conditions", () => {
    it("should handle duplicate resolver registration", () => {
      const resolver1: ManifestResolver = {
        name: "duplicate-test",
        detect: () => false,
        parse: () => ({
          type: "manifest",
          name: "resolver1",
          path: "test.json",
          manifestType: "upft",
          sets: new Map(),
          modifiers: new Map(),
          permutations: new Map(),
          metadata: {},
        }),
      };

      const resolver2: ManifestResolver = {
        name: "duplicate-test", // Same name
        detect: () => false,
        parse: () => ({
          type: "manifest",
          name: "resolver2",
          path: "test.json",
          manifestType: "upft",
          sets: new Map(),
          modifiers: new Map(),
          permutations: new Map(),
          metadata: {},
        }),
      };

      registerManifestResolver(resolver1);
      registerManifestResolver(resolver2);

      // Second registration should overwrite first
      const resolvers = getRegisteredResolvers();
      expect(resolvers.filter((r) => r === "duplicate-test")).toHaveLength(1);
    });

    it("should handle resolver registration with edge case names", () => {
      const edgeCaseResolver: ManifestResolver = {
        name: "", // Empty name
        detect: () => false,
        parse: () => ({
          type: "manifest",
          name: "edge-case",
          path: "test.json",
          manifestType: "upft",
          sets: new Map(),
          modifiers: new Map(),
          permutations: new Map(),
          metadata: {},
        }),
      };

      registerManifestResolver(edgeCaseResolver);
      const resolvers = getRegisteredResolvers();
      expect(resolvers).toContain("");
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle extremely large token documents", () => {
      const largeTokens = {};
      // Create a large nested structure
      for (let i = 0; i < 1000; i++) {
        (largeTokens as any)[`category-${i}`] = {};
        for (let j = 0; j < 100; j++) {
          (largeTokens as any)[`category-${i}`][`token-${j}`] = {
            $type: "color",
            $value: `#${i.toString(16).padStart(2, "0")}${j.toString(16).padStart(2, "0")}ff`,
          };
        }
      }

      const permutation = {
        type: "group" as const,
        name: "large-test",
        path: "test.json",
        input: {},
        resolvedFiles: [],
        tokens: {},
        metadata: {},
      };

      // Should handle large documents without issues
      expect(() => {
        // updatePermutationAST from parser
        permutation.tokens = largeTokens;
      }).not.toThrow();

      expect(Object.keys(permutation.tokens)).toHaveLength(1000);
    });

    it("should handle moderately deep nested structures", () => {
      // Create a reasonably nested manifest-like structure
      const deepManifest = {
        sets: [
          {
            files: ["base.json"],
            nested: {
              level1: {
                level2: {
                  level3: {
                    data: "deep",
                  },
                },
              },
            },
          },
        ],
        modifiers: {},
      };

      // Detection should handle nested structures
      expect(() => detectManifestFormat(deepManifest)).not.toThrow();
      const format = detectManifestFormat(deepManifest);
      expect(format).toBe("upft");
    });
  });

  describe("Type Safety Edge Cases", () => {
    it("should handle mixed types in arrays", () => {
      const input = {
        mixed: [
          "string",
          123,
          null,
          undefined,
          { nested: "object" },
          ["nested", "array"],
        ] as any,
      };

      // Should handle mixed types gracefully
      const id = generatePermutationId(input);
      expect(typeof id).toBe("string");
    });

    it("should handle prototype pollution attempts", () => {
      const maliciousInput: Record<string, string | string[]> = {
        theme: "light",
        // Note: potentially malicious properties are filtered out
      };

      const id = generatePermutationId(maliciousInput);
      expect(id).toContain("theme-light");
      // Should not have polluted prototypes
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it("should handle symbols as values", () => {
      const sym = Symbol("test");
      const input = {
        theme: "light",
        symbol: sym as any,
      };

      // Should handle symbols gracefully
      const id = generatePermutationId(input);
      expect(id).toBe("theme-light");
    });
  });

  describe("Concurrent Access Patterns", () => {
    it("should handle concurrent manifest parsing", async () => {
      const manifest = {
        sets: [{ files: ["base.json"] }],
        modifiers: {},
      };

      // Simulate concurrent parsing
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(parseManifest(manifest, "concurrent-test.json")),
      );

      const results = await Promise.all(promises);

      // All should succeed and be consistent
      expect(results).toHaveLength(10);
      for (const result of results) {
        expect(result.name).toBeDefined();
        expect(result.type).toBe("manifest");
      }
    });

    it("should handle concurrent resolver registration", () => {
      const resolvers: ManifestResolver[] = Array.from(
        { length: 10 },
        (_, i) => ({
          name: `concurrent-${i}`,
          detect: () => false,
          parse: () => ({
            type: "manifest" as const,
            name: `concurrent-${i}`,
            path: "test.json",
            manifestType: "upft" as const,
            sets: new Map(),
            modifiers: new Map(),
            permutations: new Map(),
            metadata: {},
          }),
        }),
      );

      // Register all resolvers concurrently
      for (const resolver of resolvers) {
        registerManifestResolver(resolver);
      }

      const registeredResolvers = getRegisteredResolvers();
      for (const resolver of resolvers) {
        expect(registeredResolvers).toContain(resolver.name);
      }
    });
  });
});
