import { describe, expect, it } from "vitest";
import type { TokenDocument } from "../../types.js";
import {
  convertDTCGToJSONPath,
  convertJSONPathToDTCG,
  deleteTokenAtPath,
  getAllPaths,
  getParentPath,
  getTokenAtPath,
  getTokenName,
  joinPath,
  parsePath,
  resolvePath,
  setTokenAtPath,
} from "./path.js";

describe("Token Path Utilities", () => {
  describe("parsePath", () => {
    it("should parse dot notation paths", () => {
      expect(parsePath("colors.primary")).toEqual(["colors", "primary"]);
      expect(parsePath("typography.body.fontSize")).toEqual([
        "typography",
        "body",
        "fontSize",
      ]);
      expect(parsePath("spacing.0")).toEqual(["spacing", "0"]);
    });

    it("should handle single segment paths", () => {
      expect(parsePath("colors")).toEqual(["colors"]);
    });

    it("should handle empty paths", () => {
      expect(parsePath("")).toEqual([]);
    });

    it("should parse JSON pointer paths", () => {
      expect(parsePath("#/colors/primary")).toEqual(["colors", "primary"]);
      expect(parsePath("#/colors/primary/$value")).toEqual([
        "colors",
        "primary",
        "$value",
      ]);
    });
  });

  describe("joinPath", () => {
    it("should join path segments with dots", () => {
      expect(joinPath(["colors", "primary"])).toBe("colors.primary");
      expect(joinPath(["typography", "body", "fontSize"])).toBe(
        "typography.body.fontSize",
      );
    });

    it("should handle single segments", () => {
      expect(joinPath(["colors"])).toBe("colors");
    });

    it("should handle empty arrays", () => {
      expect(joinPath([])).toBe("");
    });

    it("should handle segments with special characters", () => {
      expect(joinPath(["colors", "primary-500"])).toBe("colors.primary-500");
      expect(joinPath(["spacing", "2xl"])).toBe("spacing.2xl");
    });
  });

  describe("getParentPath", () => {
    it("should return parent path", () => {
      expect(getParentPath("colors.primary.500")).toBe("colors.primary");
      expect(getParentPath("colors.primary")).toBe("colors");
      expect(getParentPath("colors")).toBe("");
    });

    it("should handle empty paths", () => {
      expect(getParentPath("")).toBe("");
    });
  });

  describe("getTokenName", () => {
    it("should return the last segment of the path", () => {
      expect(getTokenName("colors.primary.500")).toBe("500");
      expect(getTokenName("colors.primary")).toBe("primary");
      expect(getTokenName("colors")).toBe("colors");
    });

    it("should handle empty paths", () => {
      expect(getTokenName("")).toBe("");
    });
  });

  describe("resolvePath", () => {
    it("should resolve relative paths", () => {
      expect(resolvePath("colors.primary", "../secondary")).toBe(
        "colors.secondary",
      );
      expect(resolvePath("colors.brand.primary", "../../spacing")).toBe(
        "colors.spacing",
      );
      expect(resolvePath("colors.primary", "./light")).toBe(
        "colors.primary.light",
      );
    });

    it("should handle absolute paths", () => {
      expect(resolvePath("colors.primary", "spacing.small")).toBe(
        "spacing.small",
      );
    });

    it("should handle current directory references", () => {
      expect(resolvePath("colors.primary", ".")).toBe("colors.primary");
    });
  });

  describe("getTokenAtPath", () => {
    it("should retrieve token at specified path", async () => {
      const tokens = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;

      const primary = getTokenAtPath(tokens, "colors.primary");
      expect(primary).toBeDefined();
      expect(primary?.$type).toBe("color");

      const small = getTokenAtPath(tokens, "spacing.small");
      expect(small).toBeDefined();
      expect(small?.$value).toEqual({
        value: 4,
        unit: "px",
      });
    });

    it("should return undefined for non-existent paths", async () => {
      const tokens = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;

      expect(getTokenAtPath(tokens, "colors.nonexistent")).toBeUndefined();
      expect(getTokenAtPath(tokens, "spacing.large.extra")).toBeUndefined();
    });

    it("should handle nested groups", () => {
      const tokens: TokenDocument = {
        colors: {
          brand: {
            primary: {
              base: { $value: "#0066cc" },
            },
          },
        },
      };

      const base = getTokenAtPath(tokens, "colors.brand.primary.base");
      expect(base?.$value).toBe("#0066cc");

      const brand = getTokenAtPath(tokens, "colors.brand");
      expect(brand).toBeDefined();
      expect(brand?.primary).toBeDefined();
    });
  });

  describe("setTokenAtPath", () => {
    it("should set token at specified path", () => {
      const tokens: TokenDocument = {};

      setTokenAtPath(tokens, "colors.primary", { $value: "#0066cc" });
      expect((tokens.colors as any).primary.$value).toBe("#0066cc");

      setTokenAtPath(tokens, "spacing.small", { $value: "4px" });
      expect((tokens.spacing as any).small.$value).toBe("4px");
    });

    it("should create intermediate groups as needed", () => {
      const tokens: TokenDocument = {};

      setTokenAtPath(tokens, "colors.brand.primary.base", {
        $value: "#0066cc",
      });

      expect(tokens.colors).toBeDefined();
      expect((tokens.colors as any).brand).toBeDefined();
      expect((tokens.colors as any).brand.primary).toBeDefined();
      expect((tokens.colors as any).brand.primary.base.$value).toBe("#0066cc");
    });

    it("should overwrite existing tokens", () => {
      const tokens: TokenDocument = {
        colors: {
          primary: { $value: "#ff0000" },
        },
      };

      setTokenAtPath(tokens, "colors.primary", { $value: "#0066cc" });
      expect((tokens.colors as any).primary.$value).toBe("#0066cc");
    });
  });

  describe("deleteTokenAtPath", () => {
    it("should delete token at specified path", () => {
      const tokens: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc" },
          secondary: { $value: "#ff6600" },
        },
      };

      expect(deleteTokenAtPath(tokens, "colors.primary")).toBe(true);
      expect((tokens.colors as any).primary).toBeUndefined();
      expect((tokens.colors as any).secondary).toBeDefined();
    });

    it("should return false for non-existent paths", () => {
      const tokens: TokenDocument = {};
      expect(deleteTokenAtPath(tokens, "colors.primary")).toBe(false);
    });

    it("should handle nested paths", () => {
      const tokens: TokenDocument = {
        colors: {
          brand: {
            primary: { $value: "#0066cc" },
            secondary: { $value: "#ff6600" },
          },
        },
      };

      expect(deleteTokenAtPath(tokens, "colors.brand.primary")).toBe(true);
      expect((tokens.colors as any).brand.primary).toBeUndefined();
      expect((tokens.colors as any).brand.secondary).toBeDefined();
    });
  });

  describe("getAllPaths", () => {
    it("should return all token paths", () => {
      const tokens: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc" },
          secondary: { $value: "#ff6600" },
        },
        spacing: {
          small: { $value: "4px" },
          medium: { $value: "8px" },
        },
      };

      const paths = getAllPaths(tokens);

      expect(paths).toContain("colors");
      expect(paths).toContain("colors.primary");
      expect(paths).toContain("colors.secondary");
      expect(paths).toContain("spacing");
      expect(paths).toContain("spacing.small");
      expect(paths).toContain("spacing.medium");
    });

    it("should handle nested groups", () => {
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

      const paths = getAllPaths(tokens);

      expect(paths).toContain("colors");
      expect(paths).toContain("colors.brand");
      expect(paths).toContain("colors.brand.primary");
      expect(paths).toContain("colors.brand.primary.base");
      expect(paths).toContain("colors.brand.primary.hover");
    });

    it("should filter to only tokens when specified", () => {
      const tokens: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc" },
        },
      };

      const allPaths = getAllPaths(tokens, false);
      const tokenPaths = getAllPaths(tokens, true);

      expect(allPaths).toContain("colors");
      expect(allPaths).toContain("colors.primary");

      expect(tokenPaths).not.toContain("colors");
      expect(tokenPaths).toContain("colors.primary");
    });
  });

  describe("Path Conversion", () => {
    describe("convertDTCGToJSONPath", () => {
      it("should convert DTCG references to JSON pointer", () => {
        expect(convertDTCGToJSONPath("{colors.primary}")).toBe(
          "#/colors/primary/$value",
        );
        expect(convertDTCGToJSONPath("{typography.body.fontSize}")).toBe(
          "#/typography/body/fontSize/$value",
        );
      });

      it("should handle non-DTCG strings", () => {
        expect(convertDTCGToJSONPath("colors.primary")).toBe("colors.primary");
        expect(convertDTCGToJSONPath("#/colors/primary")).toBe(
          "#/colors/primary",
        );
      });
    });

    describe("convertJSONPathToDTCG", () => {
      it("should convert JSON pointer to DTCG format", () => {
        expect(convertJSONPathToDTCG("#/colors/primary/$value")).toBe(
          "{colors.primary}",
        );
        expect(convertJSONPathToDTCG("#/colors/primary")).toBe(
          "{colors.primary}",
        );
        expect(convertJSONPathToDTCG("#/typography/body/fontSize/$value")).toBe(
          "{typography.body.fontSize}",
        );
      });

      it("should handle non-JSON pointer strings", () => {
        expect(convertJSONPathToDTCG("{colors.primary}")).toBe(
          "{colors.primary}",
        );
        expect(convertJSONPathToDTCG("colors.primary")).toBe("colors.primary");
      });
    });
  });
});
