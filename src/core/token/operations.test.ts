import { describe, expect, it } from "vitest";
import { loadTokenFile } from "../../../test/helpers/load-examples.js";
import type { TokenDocument, TokenOrGroup } from "../../types.js";
import {
  cloneToken,
  extractReferences,
  hasCircularReference,
  mergeTokens,
  traverseTokens,
} from "./operations.js";

describe("Token Operations", () => {
  describe("mergeTokens", () => {
    it("should merge two token documents", async () => {
      const base = await loadTokenFile<TokenDocument>("primitives/colors.json");
      const overlay = await loadTokenFile<TokenDocument>("themes/dark.json");

      const merged = mergeTokens(base, overlay);

      // Base tokens should be present
      expect(merged.colors).toBeDefined();

      // Overlay tokens should override
      if (
        overlay.colors &&
        typeof overlay.colors === "object" &&
        "$value" in overlay.colors
      ) {
        expect(merged.colors).toEqual(overlay.colors);
      }
    });

    it("should deep merge nested groups", async () => {
      const base: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: "#0066cc",
          },
          secondary: {
            $type: "color",
            $value: "#ff6600",
          },
        },
      };

      const overlay: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: "#0099ff",
          },
          tertiary: {
            $type: "color",
            $value: "#00ff00",
          },
        },
      };

      const merged = mergeTokens(base, overlay);

      expect((merged.colors as any).primary.$value).toBe("#0099ff");
      expect((merged.colors as any).secondary.$value).toBe("#ff6600");
      expect((merged.colors as any).tertiary.$value).toBe("#00ff00");
    });

    it("should handle empty documents", () => {
      const base: TokenDocument = { colors: { $value: "red" } };
      const empty: TokenDocument = {};

      expect(mergeTokens(base, empty)).toEqual(base);
      expect(mergeTokens(empty, base)).toEqual(base);
      expect(mergeTokens({}, {})).toEqual({});
    });
  });

  describe("cloneToken", () => {
    it("should create a deep copy of a token", () => {
      const original: TokenOrGroup = {
        $type: "color",
        $value: {
          colorSpace: "srgb",
          components: [0, 0.4, 0.8],
          alpha: 1,
        },
      };

      const cloned = cloneToken(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);

      // Verify deep copy
      if (
        typeof original.$value === "object" &&
        typeof cloned.$value === "object"
      ) {
        expect(cloned.$value).not.toBe(original.$value);
      }
    });

    it("should handle nested groups", () => {
      const original: TokenOrGroup = {
        primary: {
          $type: "color",
          $value: "#0066cc",
        },
        shades: {
          light: { $value: "#3399ff" },
          dark: { $value: "#003366" },
        },
      };

      const cloned = cloneToken(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect((cloned as any).shades).not.toBe((original as any).shades);
    });
  });

  describe("traverseTokens", () => {
    it("should visit all tokens in a document", async () => {
      const tokens = await loadTokenFile<TokenDocument>("full-example.json");
      const visited: string[] = [];

      traverseTokens(tokens, (path, _token) => {
        visited.push(path);
        return true;
      });

      expect(visited).toContain("colors.primary");
      expect(visited).toContain("colors.secondary");
      expect(visited).toContain("spacing.small");
      expect(visited).toContain("spacing.medium");
    });

    it("should provide correct paths for nested tokens", () => {
      const tokens: TokenDocument = {
        colors: {
          brand: {
            primary: {
              base: { $value: "#0066cc" },
              hover: { $value: "#0099ff" },
            },
          },
        },
      };

      const paths: string[] = [];
      traverseTokens(tokens, (path) => {
        paths.push(path);
        return true;
      });

      expect(paths).toContain("colors");
      expect(paths).toContain("colors.brand");
      expect(paths).toContain("colors.brand.primary");
      expect(paths).toContain("colors.brand.primary.base");
      expect(paths).toContain("colors.brand.primary.hover");
    });

    it("should allow early exit", () => {
      const tokens: TokenDocument = {
        a: { $value: "1" },
        b: { $value: "2" },
        c: { $value: "3" },
      };

      const visited: string[] = [];
      traverseTokens(tokens, (path) => {
        visited.push(path);
        if (path === "b") return false; // Stop traversal
        return true;
      });

      expect(visited).toContain("a");
      expect(visited).toContain("b");
      expect(visited).not.toContain("c");
    });
  });

  describe("extractReferences", () => {
    it("should extract DTCG format references", () => {
      const token: TokenOrGroup = {
        $value: "{colors.primary}",
      };

      const refs = extractReferences(token);
      expect(refs).toContain("colors.primary");
    });

    it("should extract JSON Schema $ref references", () => {
      const token: TokenOrGroup = {
        $value: { $ref: "#/colors/primary/$value" },
      };

      const refs = extractReferences(token);
      expect(refs).toContain("#/colors/primary/$value");
    });

    it("should extract multiple references from composite values", () => {
      const token: TokenOrGroup = {
        $value: {
          color: "{colors.primary}",
          width: "{dimensions.border.width}",
        },
      };

      const refs = extractReferences(token);
      expect(refs).toContain("colors.primary");
      expect(refs).toContain("dimensions.border.width");
    });

    it("should handle tokens without references", () => {
      const token: TokenOrGroup = {
        $value: "#0066cc",
      };

      const refs = extractReferences(token);
      expect(refs).toHaveLength(0);
    });

    it("should extract references from typography tokens", () => {
      const token: TokenOrGroup = {
        $type: "typography",
        $value: {
          fontFamily: "{fonts.primary}",
          fontSize: "{sizes.body}",
          lineHeight: 1.5,
        },
      };

      const refs = extractReferences(token);
      expect(refs).toContain("fonts.primary");
      expect(refs).toContain("sizes.body");
    });
  });

  describe("hasCircularReference", () => {
    it("should detect direct circular references", () => {
      const tokens: TokenDocument = {
        a: { $value: "{b}" },
        b: { $value: "{a}" },
      };

      expect(hasCircularReference(tokens, "a")).toBe(true);
      expect(hasCircularReference(tokens, "b")).toBe(true);
    });

    it("should detect indirect circular references", () => {
      const tokens: TokenDocument = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{a}" },
      };

      expect(hasCircularReference(tokens, "a")).toBe(true);
      expect(hasCircularReference(tokens, "b")).toBe(true);
      expect(hasCircularReference(tokens, "c")).toBe(true);
    });

    it("should handle non-circular references", () => {
      const tokens: TokenDocument = {
        base: { $value: "#0066cc" },
        primary: { $value: "{base}" },
        button: { $value: "{primary}" },
      };

      expect(hasCircularReference(tokens, "button")).toBe(false);
      expect(hasCircularReference(tokens, "primary")).toBe(false);
      expect(hasCircularReference(tokens, "base")).toBe(false);
    });

    it("should handle self-references", () => {
      const tokens: TokenDocument = {
        recursive: { $value: "{recursive}" },
      };

      expect(hasCircularReference(tokens, "recursive")).toBe(true);
    });
  });
});
