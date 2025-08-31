import { describe, expect, it } from "vitest";
import type { TokenDocument } from "../../types.js";
import {
  hasType,
  hasValue,
  isBorderToken,
  isColorToken,
  isDimensionToken,
  isDTCGReference,
  isJSONSchemaReference,
  isReference,
  isShadowToken,
  isToken,
  isTokenDocument,
  isTokenGroup,
  isTypographyToken,
} from "./guards.js";

describe("Token Guards", () => {
  describe("isToken", () => {
    it("should identify tokens with $value", () => {
      expect(isToken({ $value: "#0066cc" })).toBe(true);
      expect(isToken({ $value: 16 })).toBe(true);
      expect(isToken({ $value: { color: "red" } })).toBe(true);
    });

    it("should reject non-tokens", () => {
      expect(isToken({})).toBe(false);
      expect(isToken({ color: "red" })).toBe(false);
      expect(isToken("string")).toBe(false);
      expect(isToken(null)).toBe(false);
      expect(isToken(undefined)).toBe(false);
    });

    it("should handle tokens with additional properties", () => {
      expect(
        isToken({
          $value: "#0066cc",
          $type: "color",
          $description: "Primary color",
        }),
      ).toBe(true);
    });
  });

  describe("isTokenGroup", () => {
    it("should identify groups containing tokens", () => {
      expect(
        isTokenGroup({
          primary: { $value: "#0066cc" },
          secondary: { $value: "#ff6600" },
        }),
      ).toBe(true);
    });

    it("should identify nested groups", () => {
      expect(
        isTokenGroup({
          brand: {
            primary: { $value: "#0066cc" },
          },
        }),
      ).toBe(true);
    });

    it("should reject tokens", () => {
      expect(isTokenGroup({ $value: "#0066cc" })).toBe(false);
    });

    it("should reject empty objects", () => {
      expect(isTokenGroup({})).toBe(false);
    });

    it("should handle groups with metadata", () => {
      expect(
        isTokenGroup({
          $description: "Color tokens",
          primary: { $value: "#0066cc" },
        }),
      ).toBe(true);
    });
  });

  describe("isTokenDocument", () => {
    it("should validate token documents", async () => {
      const doc = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      expect(isTokenDocument(doc)).toBe(true);
    });

    it("should reject invalid documents", () => {
      expect(isTokenDocument(null)).toBe(false);
      expect(isTokenDocument("string")).toBe(false);
      expect(isTokenDocument([])).toBe(false);
    });
  });

  describe("Reference Guards", () => {
    describe("isDTCGReference", () => {
      it("should identify DTCG format references", () => {
        expect(isDTCGReference("{colors.primary}")).toBe(true);
        expect(isDTCGReference("{spacing.small}")).toBe(true);
        expect(isDTCGReference("{typography.body.fontSize}")).toBe(true);
      });

      it("should reject non-DTCG references", () => {
        expect(isDTCGReference("#/colors/primary")).toBe(false);
        expect(isDTCGReference("colors.primary")).toBe(false);
        expect(isDTCGReference("{{colors.primary}}")).toBe(false);
        expect(isDTCGReference("{")).toBe(false);
      });
    });

    describe("isJSONSchemaReference", () => {
      it("should identify JSON Schema references", () => {
        expect(isJSONSchemaReference("#/colors/primary")).toBe(true);
        expect(isJSONSchemaReference("#/colors/primary/$value")).toBe(true);
        expect(isJSONSchemaReference("file.json#/colors")).toBe(true);
      });

      it("should reject non-JSON Schema references", () => {
        expect(isJSONSchemaReference("{colors.primary}")).toBe(false);
        expect(isJSONSchemaReference("colors/primary")).toBe(false);
        expect(isJSONSchemaReference("/colors/primary")).toBe(false);
      });
    });

    describe("isReference", () => {
      it("should identify any valid reference format", () => {
        expect(isReference("{colors.primary}")).toBe(true);
        expect(isReference("#/colors/primary")).toBe(true);
        expect(isReference("#/colors/primary/$value")).toBe(true);
      });

      it("should reject non-references", () => {
        expect(isReference("colors.primary")).toBe(false);
        expect(isReference("#0066cc")).toBe(false);
        expect(isReference("16px")).toBe(false);
      });
    });
  });

  describe("Token Property Guards", () => {
    describe("hasValue", () => {
      it("should check for $value property", () => {
        expect(hasValue({ $value: "test" })).toBe(true);
        expect(hasValue({ $value: null })).toBe(true);
        expect(hasValue({ $value: undefined })).toBe(true);
        expect(hasValue({})).toBe(false);
      });
    });

    describe("hasType", () => {
      it("should check for $type property", () => {
        expect(hasType({ $type: "color" })).toBe(true);
        expect(hasType({ $type: "" })).toBe(true);
        expect(hasType({})).toBe(false);
      });

      it("should check for specific type", () => {
        expect(hasType({ $type: "color" }, "color")).toBe(true);
        expect(hasType({ $type: "color" }, "dimension")).toBe(false);
        expect(hasType({}, "color")).toBe(false);
      });
    });
  });

  describe("Token Type Guards", () => {
    describe("isColorToken", () => {
      it("should identify color tokens", async () => {
        const tokens = (
          await import("@upft/fixtures/tokens/full-example.json", {
            with: { type: "json" },
          })
        ).default as TokenDocument;
        const primary = (tokens.colors as any)?.primary;

        if (primary) {
          expect(isColorToken(primary)).toBe(true);
        }
      });

      it("should reject non-color tokens", () => {
        expect(isColorToken({ $type: "dimension", $value: "16px" })).toBe(
          false,
        );
        expect(isColorToken({ $value: "#0066cc" })).toBe(false); // No type
      });
    });

    describe("isDimensionToken", () => {
      it("should identify dimension tokens", async () => {
        const tokens = (
          await import("@upft/fixtures/tokens/full-example.json", {
            with: { type: "json" },
          })
        ).default as TokenDocument;
        const small = (tokens.spacing as any)?.small;

        if (small) {
          expect(isDimensionToken(small)).toBe(true);
        }
      });

      it("should reject non-dimension tokens", () => {
        expect(isDimensionToken({ $type: "color", $value: "#0066cc" })).toBe(
          false,
        );
        expect(isDimensionToken({ $value: "16px" })).toBe(false); // No type
      });
    });

    describe("isTypographyToken", () => {
      it("should identify typography tokens", async () => {
        const tokens = (
          await import("@upft/fixtures/tokens/full-example.json", {
            with: { type: "json" },
          })
        ).default as TokenDocument;
        const heading = (tokens.typography as any)?.heading;

        if (heading) {
          expect(isTypographyToken(heading)).toBe(true);
        }
      });

      it("should reject non-typography tokens", () => {
        expect(isTypographyToken({ $type: "color", $value: "#0066cc" })).toBe(
          false,
        );
      });
    });

    describe("isShadowToken", () => {
      it("should identify shadow tokens", () => {
        const shadow = {
          $type: "shadow",
          $value: {
            color: "#00000033",
            offsetX: "0px",
            offsetY: "2px",
            blur: "4px",
          },
        };

        expect(isShadowToken(shadow)).toBe(true);
      });

      it("should reject non-shadow tokens", () => {
        expect(isShadowToken({ $type: "color", $value: "#0066cc" })).toBe(
          false,
        );
      });
    });

    describe("isBorderToken", () => {
      it("should identify border tokens", () => {
        const border = {
          $type: "border",
          $value: {
            color: "#0066cc",
            width: "1px",
            style: "solid",
          },
        };

        expect(isBorderToken(border)).toBe(true);
      });

      it("should reject non-border tokens", () => {
        expect(isBorderToken({ $type: "color", $value: "#0066cc" })).toBe(
          false,
        );
      });
    });
  });
});
