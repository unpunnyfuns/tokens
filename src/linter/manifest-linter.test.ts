/**
 * Tests for manifest linting
 */

import { describe, expect, it } from "vitest";
import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import { lintManifest } from "./manifest-linter.js";
import { MANIFEST_RULES } from "./manifest-rules.js";

describe("Manifest Linting", () => {
  describe("rule: no-empty-sets", () => {
    it("should error on empty sets", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: [] }],
        modifiers: {},
      };

      const result = lintManifest(manifest);
      const violation = result.violations.find(
        (v) => v.rule === "no-empty-sets",
      );

      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("error");
      expect(violation?.message).toContain("at least one file");
    });

    it("should pass with non-empty sets", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["tokens.json"] }],
        modifiers: {},
      };

      const result = lintManifest(manifest);
      const violation = result.violations.find(
        (v) => v.rule === "no-empty-sets",
      );

      expect(violation).toBeUndefined();
    });
  });

  describe("rule: no-duplicate-files", () => {
    it("should warn about duplicate files", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["base.json", "theme.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["theme.json"],
              dark: ["dark.json"],
            },
          },
        },
      };

      const result = lintManifest(manifest);
      const violation = result.violations.find(
        (v) => v.rule === "no-duplicate-files",
      );

      expect(violation).toBeDefined();
      expect(violation?.message).toContain("theme.json");
      expect(violation?.message).toContain("2 places");
    });
  });

  describe("rule: consistent-modifier-naming", () => {
    it("should check modifier naming style", () => {
      const rule = MANIFEST_RULES["consistent-modifier-naming"];
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          myTheme: { oneOf: ["light", "dark"], values: {} },
          "color-mode": { oneOf: ["normal", "high"], values: {} },
        },
      };

      const violations = rule
        ? rule.check(manifest, { style: "kebab-case" })
        : [];

      expect(violations).toHaveLength(1);
      expect(violations[0]?.path).toBe("modifiers.myTheme");
      expect(violations[0]?.message).toContain("kebab-case");
    });

    it("should allow any style when configured", () => {
      const rule = MANIFEST_RULES["consistent-modifier-naming"];
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          myTheme: { oneOf: ["light", "dark"], values: {} },
          "color-mode": { oneOf: ["normal", "high"], values: {} },
        },
      };

      const violations = rule ? rule.check(manifest, { style: "any" }) : [];
      expect(violations).toHaveLength(0);
    });
  });

  describe("rule: no-unused-modifiers", () => {
    it("should find unused modifiers", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["base.json"] }],
        modifiers: {
          theme: { oneOf: ["light", "dark"], values: {} },
          density: { oneOf: ["compact", "comfortable"], values: {} },
        },
        generate: [
          { theme: "light", output: "light.json" },
          { theme: "dark", output: "dark.json" },
        ],
      };

      const result = lintManifest(manifest);
      const violation = result.violations.find(
        (v) => v.rule === "no-unused-modifiers",
      );

      expect(violation).toBeDefined();
      expect(violation?.path).toBe("modifiers.density");
      expect(violation?.message).toContain("not used in generate");
    });
  });

  describe("rule: reasonable-permutation-count", () => {
    it("should warn about too many permutations", () => {
      const rule = MANIFEST_RULES["reasonable-permutation-count"];
      const manifest: UPFTResolverManifest = {
        sets: [],
        modifiers: {
          theme: { oneOf: ["light", "dark", "auto"], values: {} },
          density: { oneOf: ["compact", "normal", "comfortable"], values: {} },
          contrast: { oneOf: ["normal", "high", "low"], values: {} },
          motion: { oneOf: ["normal", "reduced"], values: {} },
        },
      };

      // 3 * 3 * 3 * 2 = 54 permutations
      const violations = rule ? rule.check(manifest, { max: 50 }) : [];

      expect(violations).toHaveLength(1);
      expect(violations[0]?.message).toContain("54 permutations");
      expect(violations[0]?.message).toContain("max recommended: 50");
    });
  });

  describe("full manifest linting", () => {
    it("should lint a complete manifest", () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
        generate: [
          { theme: "light", output: "dist/light.json" },
          { theme: "dark", output: "dist/dark.json" },
        ],
      };

      const result = lintManifest(manifest);

      // Should have info about missing default
      const infoViolation = result.violations.find(
        (v) => v.severity === "info",
      );
      expect(infoViolation?.rule).toBe("prefer-default-values");

      expect(result.summary.errors).toBe(0);
      expect(result.summary.info).toBeGreaterThan(0);
    });
  });
});
