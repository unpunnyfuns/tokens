import { describe, expect, it } from "vitest";
import type { TokenDocument, TokenOrGroup } from "../../types.js";
import { merge } from "../merge/index.js";
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

      const merged = merge(base, overlay);

      expect((merged.colors as any).primary.$value).toBe("#0099ff");
      expect((merged.colors as any).secondary.$value).toBe("#ff6600");
      expect((merged.colors as any).tertiary.$value).toBe("#00ff00");
    });

    it("should handle empty documents", () => {
      const base: TokenDocument = { colors: { $value: "red" } };
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
});
