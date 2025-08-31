import colorsBase from "@upft/fixtures/bundler-fixtures/input/colors-base.json" with {
  type: "json",
};
import type { TokenDocument, TokenOrGroup } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import { merge } from "./merge/index.js";
import { cloneToken, extractReferences } from "./operations.js";

describe("Token Operations", () => {
  describe("merge (DTCG-aware)", () => {
    it("should merge two token documents", async () => {
      const base = (
        await import("@upft/fixtures/tokens/primitives/colors.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const overlay = (
        await import("@upft/fixtures/tokens/themes/dark.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;

      const merged = merge(base, overlay);

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
      const base: TokenDocument = colorsBase;

      const overlay: TokenDocument = {
        color: {
          primary: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 0.6, 1],
              alpha: 1,
            },
          },
          tertiary: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0, 1, 0],
              alpha: 1,
            },
          },
        },
      };

      const merged = merge(base, overlay);

      expect((merged.color as any).primary.$value.components).toEqual([
        0, 0.6, 1,
      ]);
      expect((merged.color as any).secondary).toBeDefined();
      expect((merged.color as any).tertiary.$value.components).toEqual([
        0, 1, 0,
      ]);
    });

    it("should handle empty documents", () => {
      const base: TokenDocument = colorsBase;
      const empty: TokenDocument = {};

      expect(merge(base, empty)).toEqual(base);
      expect(merge(empty, base)).toEqual(base);
      expect(merge({}, {})).toEqual({});
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
      const original: TokenOrGroup = colorsBase;

      const cloned = cloneToken(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
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
      const token: TokenOrGroup = colorsBase.color.primary;

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
});
