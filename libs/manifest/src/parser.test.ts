/**
 * Unit tests for parser functions
 */

import type { ManifestAST, ModifierAST, PermutationAST } from "@upft/ast";
import type { TokenDocument } from "@upft/foundation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generatePermutationId,
  parseManifest,
  resolvePermutationFiles,
  updatePermutationAST,
} from "./parser.js";
import * as registry from "./registry.js";

// Mock the registry
vi.mock("./registry.js", () => ({
  parseManifestWithRegistry: vi.fn(),
}));

describe("parser", () => {
  describe("generatePermutationId", () => {
    it("should generate ID from string values", () => {
      const input = {
        theme: "dark",
        platform: "web",
      };

      const id = generatePermutationId(input);
      expect(id).toBe("theme-dark_platform-web");
    });

    it("should generate ID from array values", () => {
      const input = {
        features: ["responsive", "dark-mode"],
        platform: "mobile",
      };

      const id = generatePermutationId(input);
      expect(id).toBe("features-responsive+dark-mode_platform-mobile");
    });

    it("should skip output field", () => {
      const input = {
        theme: "light",
        output: "css",
        platform: "web",
      };

      const id = generatePermutationId(input);
      expect(id).toBe("theme-light_platform-web");
    });

    it("should skip null values", () => {
      const input = {
        theme: "dark",
        platform: null as any,
        features: "accessibility",
      };

      const id = generatePermutationId(input);
      expect(id).toBe("theme-dark_features-accessibility");
    });

    it("should skip empty arrays", () => {
      const input = {
        theme: "light",
        features: [],
        platform: "web",
      };

      const id = generatePermutationId(input);
      expect(id).toBe("theme-light_platform-web");
    });

    it("should skip empty strings", () => {
      const input = {
        theme: "",
        platform: "mobile",
      };

      const id = generatePermutationId(input);
      expect(id).toBe("platform-mobile");
    });

    it("should return default for empty input", () => {
      const id = generatePermutationId({});
      expect(id).toBe("default");
    });

    it("should return default when all values are excluded", () => {
      const input: Record<string, string | string[]> = {
        output: "css",
        // Note: null and empty arrays are filtered out
      } as any;

      const id = generatePermutationId(input);
      expect(id).toBe("default");
    });

    it("should handle mixed valid and invalid values", () => {
      const input: Record<string, string | string[]> = {
        theme: "dark",
        platform: "",
        features: ["responsive"],
        output: "scss",
      } as any;

      const id = generatePermutationId(input);
      expect(id).toBe("theme-dark_features-responsive");
    });
  });

  describe("resolvePermutationFiles", () => {
    let manifestAST: ManifestAST;
    let permutation: PermutationAST;

    beforeEach(() => {
      manifestAST = {
        type: "manifest",
        name: "test-manifest",
        path: "manifest.json",
        manifestType: "upft",
        sets: new Map(),
        modifiers: new Map(),
        permutations: new Map(),
        metadata: {},
      };

      permutation = {
        type: "group",
        name: "test-permutation",
        path: "manifest.json",
        input: {},
        resolvedFiles: [],
        tokens: {},
        metadata: {},
      };

      // Add base sets
      manifestAST.sets.set("base", {
        type: "manifest",
        name: "base",
        path: "manifest.json",
        files: ["base.json", "core.json"],
        metadata: {},
      });

      manifestAST.sets.set("components", {
        type: "manifest",
        name: "components",
        path: "manifest.json",
        files: ["button.json", "input.json"],
        metadata: {},
      });
    });

    it("should resolve base set files", () => {
      const files = resolvePermutationFiles(manifestAST, permutation);
      expect(files).toEqual([
        "base.json",
        "core.json",
        "button.json",
        "input.json",
      ]);
    });

    it("should include modifier files for string values", () => {
      // Add modifier
      const themeModifier: ModifierAST = {
        type: "manifest",
        name: "theme",
        path: "manifest.json",
        constraintType: "oneOf",
        options: ["light", "dark"],
        values: new Map([
          ["light", ["light-theme.json"]],
          ["dark", ["dark-theme.json", "dark-overrides.json"]],
        ]),
        defaultValue: "light",
        description: "Theme modifier",
        metadata: {},
      };

      manifestAST.modifiers.set("theme", themeModifier);
      permutation.input = { theme: "dark" };

      const files = resolvePermutationFiles(manifestAST, permutation);
      expect(files).toContain("dark-theme.json");
      expect(files).toContain("dark-overrides.json");
    });

    it("should include modifier files for array values", () => {
      // Add modifier
      const featuresModifier: ModifierAST = {
        type: "manifest",
        name: "features",
        path: "manifest.json",
        constraintType: "anyOf",
        options: ["responsive", "dark-mode", "a11y"],
        values: new Map([
          ["responsive", ["responsive.json"]],
          ["dark-mode", ["dark-mode.json"]],
          ["a11y", ["accessibility.json"]],
        ]),
        defaultValue: "",
        description: "Features modifier",
        metadata: {},
      };

      manifestAST.modifiers.set("features", featuresModifier);
      permutation.input = { features: ["responsive", "a11y"] };

      const files = resolvePermutationFiles(manifestAST, permutation);
      expect(files).toContain("responsive.json");
      expect(files).toContain("accessibility.json");
      expect(files).not.toContain("dark-mode.json");
    });

    it("should handle unknown modifier gracefully", () => {
      permutation.input = { unknownModifier: "value" };

      const files = resolvePermutationFiles(manifestAST, permutation);
      // Should still include base files
      expect(files).toEqual([
        "base.json",
        "core.json",
        "button.json",
        "input.json",
      ]);
    });

    it("should handle unknown modifier values gracefully", () => {
      const themeModifier: ModifierAST = {
        type: "manifest",
        name: "theme",
        path: "manifest.json",
        constraintType: "oneOf",
        options: ["light", "dark"],
        values: new Map([["light", ["light.json"]]]),
        defaultValue: "light",
        description: "",
        metadata: {},
      };

      manifestAST.modifiers.set("theme", themeModifier);
      permutation.input = { theme: "unknown" };

      const files = resolvePermutationFiles(manifestAST, permutation);
      // Should include base files but not unknown modifier files
      expect(files).toEqual([
        "base.json",
        "core.json",
        "button.json",
        "input.json",
      ]);
    });

    it("should remove duplicate files", () => {
      // Add modifier that includes already included base files
      const modifier: ModifierAST = {
        type: "manifest",
        name: "duplicate",
        path: "manifest.json",
        constraintType: "oneOf",
        options: ["test"],
        values: new Map([["test", ["base.json", "new.json"]]]),
        defaultValue: "test",
        description: "",
        metadata: {},
      };

      manifestAST.modifiers.set("duplicate", modifier);
      permutation.input = { duplicate: "test" };

      const files = resolvePermutationFiles(manifestAST, permutation);
      // Should not have duplicate "base.json"
      const baseCount = files.filter((f) => f === "base.json").length;
      expect(baseCount).toBe(1);
      expect(files).toContain("new.json");
    });

    it("should handle empty sets gracefully", () => {
      manifestAST.sets.clear();

      const files = resolvePermutationFiles(manifestAST, permutation);
      expect(files).toEqual([]);
    });
  });

  describe("updatePermutationAST", () => {
    let permutation: PermutationAST;
    let tokens: TokenDocument;
    let resolvedTokens: TokenDocument;

    beforeEach(() => {
      permutation = {
        type: "group",
        name: "test",
        path: "manifest.json",
        input: {},
        resolvedFiles: [],
        tokens: {},
        metadata: {},
      };

      tokens = {
        color: {
          primary: {
            $type: "color",
            $value: "#007bff",
          },
        },
      };

      resolvedTokens = {
        color: {
          primary: {
            $type: "color",
            $value: "#0056b3", // resolved value
          },
        },
      };
    });

    it("should update permutation with files and tokens", () => {
      const files = ["base.json", "theme.json"];

      updatePermutationAST(permutation, files, tokens);

      expect(permutation.resolvedFiles).toEqual(files);
      expect(permutation.tokens).toBe(tokens);
      expect(permutation.resolvedTokens).toBeUndefined();
    });

    it("should update permutation with resolved tokens when provided", () => {
      const files = ["base.json"];

      updatePermutationAST(permutation, files, tokens, resolvedTokens);

      expect(permutation.resolvedFiles).toEqual(files);
      expect(permutation.tokens).toBe(tokens);
      expect(permutation.resolvedTokens).toBe(resolvedTokens);
    });

    it("should handle empty files array", () => {
      updatePermutationAST(permutation, [], tokens);

      expect(permutation.resolvedFiles).toEqual([]);
      expect(permutation.tokens).toBe(tokens);
    });

    it("should handle empty tokens object", () => {
      const emptyTokens = {};
      updatePermutationAST(permutation, ["base.json"], emptyTokens);

      expect(permutation.tokens).toBe(emptyTokens);
    });
  });

  describe("parseManifest", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should delegate to parseManifestWithRegistry", () => {
      const manifest = { test: "manifest" };
      const path = "test.json";
      const expectedAST: ManifestAST = {
        type: "manifest",
        name: "test",
        path,
        manifestType: "upft",
        sets: new Map(),
        modifiers: new Map(),
        permutations: new Map(),
        metadata: {},
      };

      vi.mocked(registry.parseManifestWithRegistry).mockReturnValue(
        expectedAST,
      );

      const result = parseManifest(manifest, path);

      expect(registry.parseManifestWithRegistry).toHaveBeenCalledWith(
        manifest,
        path,
      );
      expect(result).toBe(expectedAST);
    });

    it("should use default path when not provided", () => {
      const manifest = { test: "manifest" };
      const expectedAST: ManifestAST = {
        type: "manifest",
        name: "test",
        path: "manifest.json",
        manifestType: "upft",
        sets: new Map(),
        modifiers: new Map(),
        permutations: new Map(),
        metadata: {},
      };

      vi.mocked(registry.parseManifestWithRegistry).mockReturnValue(
        expectedAST,
      );

      parseManifest(manifest);

      expect(registry.parseManifestWithRegistry).toHaveBeenCalledWith(
        manifest,
        "manifest.json",
      );
    });
  });
});
