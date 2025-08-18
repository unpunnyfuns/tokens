import { describe, expect, it } from "vitest";
import type { TokenDocument, TokenValue } from "../types.js";
import {
  countTokens,
  extractTokenPaths,
  filterTokensByType,
  getTokenByPath,
  hasReference,
  isToken,
  setTokenByPath,
} from "./token-helpers.js";

describe("Token Helpers", () => {
  describe("countTokens", () => {
    it("should count tokens in a document", () => {
      const doc = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
          secondary: { $value: "#6c757d", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      expect(countTokens(doc)).toBe(3);
    });

    it("should count nested tokens", () => {
      const doc = {
        theme: {
          colors: {
            background: {
              primary: { $value: "#ffffff", $type: "color" },
              secondary: { $value: "#f8f9fa", $type: "color" },
            },
          },
        },
      };

      expect(countTokens(doc)).toBe(2);
    });

    it("should return 0 for empty document", () => {
      expect(countTokens({})).toBe(0);
    });

    it("should ignore non-token properties", () => {
      const doc = {
        $description: "Document description",
        $version: "1.0",
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      expect(countTokens(doc)).toBe(1);
    });

    it("should handle null and undefined", () => {
      expect(countTokens(null)).toBe(0);
      expect(countTokens(undefined)).toBe(0);
    });

    it("should handle non-object values", () => {
      expect(countTokens("string")).toBe(0);
      expect(countTokens(123)).toBe(0);
      expect(countTokens(true)).toBe(0);
    });
  });

  describe("extractTokenPaths", () => {
    it("should extract all token paths", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
          secondary: { $value: "#6c757d", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const paths = extractTokenPaths(doc);

      expect(paths).toEqual([
        "color.primary",
        "color.secondary",
        "spacing.small",
      ]);
    });

    it("should handle deeply nested tokens", () => {
      const doc: TokenDocument = {
        theme: {
          colors: {
            background: {
              primary: { $value: "#ffffff", $type: "color" },
            },
          },
        },
      };

      const paths = extractTokenPaths(doc);

      expect(paths).toEqual(["theme.colors.background.primary"]);
    });

    it("should use prefix when provided", () => {
      const doc: TokenDocument = {
        primary: { $value: "#007acc", $type: "color" },
      };

      const paths = extractTokenPaths(doc, "color");

      expect(paths).toEqual(["color.primary"]);
    });

    it("should return empty array for empty document", () => {
      expect(extractTokenPaths({})).toEqual([]);
    });

    it("should ignore groups without tokens", () => {
      const doc: TokenDocument = {
        emptyGroup: {},
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      const paths = extractTokenPaths(doc);

      expect(paths).toEqual(["color.primary"]);
    });
  });

  describe("getTokenByPath", () => {
    it("should get token by path", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      const token = getTokenByPath(doc, "color.primary");

      expect(token).toEqual({ $value: "#007acc", $type: "color" });
    });

    it("should get deeply nested tokens", () => {
      const doc: TokenDocument = {
        theme: {
          colors: {
            background: {
              primary: { $value: "#ffffff", $type: "color" },
            },
          },
        },
      };

      const token = getTokenByPath(doc, "theme.colors.background.primary");

      expect(token).toEqual({ $value: "#ffffff", $type: "color" });
    });

    it("should return undefined for non-existent path", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      expect(getTokenByPath(doc, "color.missing")).toBeUndefined();
      expect(getTokenByPath(doc, "missing.path")).toBeUndefined();
    });

    it("should return undefined for empty path", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      expect(getTokenByPath(doc, "")).toBeUndefined();
    });

    it("should handle groups", () => {
      const doc: TokenDocument = {
        color: {
          $type: "color",
          primary: { $value: "#007acc" },
        },
      };

      const group = getTokenByPath(doc, "color");

      expect(group).toEqual({
        $type: "color",
        primary: { $value: "#007acc" },
      });
    });
  });

  describe("setTokenByPath", () => {
    it("should set token by path", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      const newToken: TokenValue = { $value: "#ff0000", $type: "color" };
      const updated = setTokenByPath(doc, "color.secondary", newToken);

      expect(updated.color).toBeDefined();
      expect((updated.color as any).secondary).toEqual(newToken);
      // Original should be unchanged
      expect((doc.color as any).secondary).toBeUndefined();
    });

    it("should create nested paths if they do not exist", () => {
      const doc: TokenDocument = {};
      const token: TokenValue = { $value: "#007acc", $type: "color" };

      const updated = setTokenByPath(doc, "theme.colors.primary", token);

      expect((updated as any).theme.colors.primary).toEqual(token);
    });

    it("should replace existing token", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      const newToken: TokenValue = { $value: "#ff0000", $type: "color" };
      const updated = setTokenByPath(doc, "color.primary", newToken);

      expect((updated.color as any).primary).toEqual(newToken);
    });
  });

  describe("filterTokensByType", () => {
    it("should filter tokens by type", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
          secondary: { $value: "#6c757d", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
          large: { $value: "16px", $type: "dimension" },
        },
      };

      const colors = filterTokensByType(doc, "color");

      expect(colors).toEqual({
        "color.primary": { $value: "#007acc", $type: "color" },
        "color.secondary": { $value: "#6c757d", $type: "color" },
      });
    });

    it("should return empty object for non-existent type", () => {
      const doc: TokenDocument = {
        color: {
          primary: { $value: "#007acc", $type: "color" },
        },
      };

      const result = filterTokensByType(doc, "nonexistent");
      expect(result).toEqual({});
    });

    it("should handle nested tokens", () => {
      const doc: TokenDocument = {
        theme: {
          colors: {
            background: {
              primary: { $value: "#ffffff", $type: "color" },
              secondary: { $value: "#f8f9fa", $type: "color" },
            },
          },
          spacing: {
            small: { $value: "4px", $type: "dimension" },
          },
        },
      };

      const colors = filterTokensByType(doc, "color");

      expect(colors).toEqual({
        "theme.colors.background.primary": {
          $value: "#ffffff",
          $type: "color",
        },
        "theme.colors.background.secondary": {
          $value: "#f8f9fa",
          $type: "color",
        },
      });
    });
  });

  describe("isToken", () => {
    it("should identify tokens", () => {
      expect(isToken({ $value: "#007acc" })).toBe(true);
      expect(isToken({ $value: "#007acc", $type: "color" })).toBe(true);
      expect(isToken({ $value: null })).toBe(true);
    });

    it("should reject non-tokens", () => {
      expect(isToken({})).toBe(false);
      expect(isToken({ $type: "color" })).toBe(false);
      expect(isToken({ value: "#007acc" })).toBe(false);
      expect(isToken(null)).toBe(false);
      expect(isToken(undefined)).toBe(false);
      expect(isToken("string")).toBe(false);
      expect(isToken(123)).toBe(false);
    });
  });

  describe("hasReference", () => {
    it("should detect string references", () => {
      expect(hasReference("{color.primary}")).toBe(true);
      expect(hasReference("#007acc")).toBe(false);
      expect(hasReference("{}")).toBe(false);
      expect(hasReference("{color.primary} {color.secondary}")).toBe(false); // Not a single reference
    });

    it("should detect $ref property", () => {
      const tokenWithRef = { $ref: "color.primary" };
      expect(hasReference(tokenWithRef as TokenValue)).toBe(true);

      const tokenWithoutRef = { $value: "#007acc" };
      expect(hasReference(tokenWithoutRef)).toBe(false);
    });

    it("should handle non-string values", () => {
      expect(hasReference(123 as any)).toBe(false);
      expect(hasReference(null as any)).toBe(false);
      expect(hasReference(undefined as any)).toBe(false);
    });

    it("should check nested objects for references", () => {
      const nestedWithRef = {
        composite: {
          color: "{color.primary}",
        },
      };
      expect(hasReference(nestedWithRef as TokenValue)).toBe(true);

      const nestedWithoutRef = {
        composite: {
          color: "#007acc",
        },
      };
      expect(hasReference(nestedWithoutRef as TokenValue)).toBe(false);
    });
  });
});
