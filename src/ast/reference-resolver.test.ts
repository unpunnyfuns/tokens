import { describe, expect, it } from "vitest";
import {
  loadErrorCase,
  loadTokenFile,
} from "../../test/helpers/load-examples.js";
import type { TokenDocument } from "../types.js";
import { buildASTFromDocument } from "./ast-builder.js";
import {
  getResolutionOrder,
  ReferenceResolver,
  resolveReferences,
  resolveTokenValue,
} from "./reference-resolver.js";

describe("Reference Resolver", () => {
  describe("ReferenceResolver class", () => {
    it("should resolve simple references", () => {
      const doc: TokenDocument = {
        base: { $value: "#0066cc" },
        primary: { $value: "{base}" },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      resolver.resolve();

      const primary = resolver.getResolvedValue("primary");
      expect(primary).toBe("#0066cc");
    });

    it("should resolve chain references", () => {
      const doc: TokenDocument = {
        base: { $value: "#0066cc" },
        primary: { $value: "{base}" },
        button: { $value: "{primary}" },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      resolver.resolve();

      const button = resolver.getResolvedValue("button");
      expect(button).toBe("#0066cc");
    });

    it("should resolve JSON Schema $ref format", () => {
      const doc: TokenDocument = {
        base: { $value: "#0066cc" },
        primary: { $value: { $ref: "#/base/$value" } },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      resolver.resolve();

      const primary = resolver.getResolvedValue("primary");
      expect(primary).toBe("#0066cc");
    });

    it("should handle composite values with references", () => {
      const doc: TokenDocument = {
        color: { $value: "#0066cc" },
        width: { $value: "2px" },
        border: {
          $value: {
            color: "{color}",
            width: "{width}",
            style: "solid",
          },
        },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      resolver.resolve();

      const border = resolver.getResolvedValue("border");
      expect(border).toEqual({
        color: "#0066cc",
        width: "2px",
        style: "solid",
      });
    });

    it("should detect circular references", () => {
      const doc: TokenDocument = {
        a: { $value: "{b}" },
        b: { $value: "{a}" },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      const errors = resolver.resolve();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.type === "circular")).toBe(true);
    });

    it("should handle missing references", () => {
      const doc: TokenDocument = {
        primary: { $value: "{nonexistent}" },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      const errors = resolver.resolve();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.type === "missing")).toBe(true);

      const primary = resolver.getResolvedValue("primary");
      expect(primary).toBe("{nonexistent}"); // Keep original when can't resolve
    });

    it("should track resolution chains", () => {
      const doc: TokenDocument = {
        a: { $value: "#000" },
        b: { $value: "{a}" },
        c: { $value: "{b}" },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      resolver.resolve();

      const chain = resolver.getResolutionChain("c");
      expect(chain).toEqual(["c", "b", "a"]);
    });

    it("should handle partial resolution", () => {
      const doc: TokenDocument = {
        color: { $value: "#0066cc" },
        missing: { $value: "{nonexistent}" },
        border: {
          $value: {
            color: "{color}",
            width: "{missing}",
          },
        },
      };

      const ast = buildASTFromDocument(doc);
      const resolver = new ReferenceResolver(ast);

      resolver.resolve();

      const border = resolver.getResolvedValue("border");
      expect(border).toEqual({
        color: "#0066cc",
        width: "{nonexistent}", // Partially resolved
      });
    });
  });

  describe("resolveReferences", () => {
    it("should resolve all references in AST", async () => {
      const doc = await loadTokenFile<TokenDocument>("reference-patterns.json");
      const ast = buildASTFromDocument(doc);

      const { resolved, errors } = resolveReferences(ast);

      expect(resolved).toBeDefined();
      expect(errors.length).toBe(0);
    });

    it("should return errors for broken references", async () => {
      const doc = await loadErrorCase<TokenDocument>("broken-references.json");
      const ast = buildASTFromDocument(doc);

      const { resolved, errors } = resolveReferences(ast);

      expect(resolved).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("resolveTokenValue", () => {
    it("should resolve string references", () => {
      const tokens = {
        base: { $value: "#0066cc" },
        primary: { $value: "{base}" },
      };

      const resolved = resolveTokenValue("{base}", tokens);
      expect(resolved).toBe("#0066cc");
    });

    it("should resolve nested object references", () => {
      const tokens = {
        color: { $value: "#0066cc" },
        width: { $value: "2px" },
        border: {
          $value: {
            color: "{color}",
            width: "{width}",
          },
        },
      };

      const value = {
        color: "{color}",
        width: "{width}",
      };

      const resolved = resolveTokenValue(value, tokens);
      expect(resolved).toEqual({
        color: "#0066cc",
        width: "2px",
      });
    });

    it("should resolve array references", () => {
      const tokens = {
        primary: { $value: "Inter" },
        fallback: { $value: "sans-serif" },
      };

      const value = ["{primary}", "{fallback}"];

      const resolved = resolveTokenValue(value, tokens);
      expect(resolved).toEqual(["Inter", "sans-serif"]);
    });

    it("should handle mixed references and literals", () => {
      const tokens = {
        base: { $value: 1.5 },
      };

      const value = {
        lineHeight: "{base}",
        letterSpacing: "0.02em",
        fontWeight: 500,
      };

      const resolved = resolveTokenValue(value, tokens);
      expect(resolved).toEqual({
        lineHeight: 1.5,
        letterSpacing: "0.02em",
        fontWeight: 500,
      });
    });
  });

  describe("getResolutionOrder", () => {
    it("should return correct resolution order", () => {
      const doc: TokenDocument = {
        c: { $value: "{b}" },
        b: { $value: "{a}" },
        a: { $value: "#000" },
        d: { $value: "{c}" },
      };

      const ast = buildASTFromDocument(doc);
      const order = getResolutionOrder(ast);

      // 'a' should come before 'b', 'b' before 'c', etc.
      const aIndex = order.indexOf("a");
      const bIndex = order.indexOf("b");
      const cIndex = order.indexOf("c");
      const dIndex = order.indexOf("d");

      expect(aIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(cIndex);
      expect(cIndex).toBeLessThan(dIndex);
    });

    it("should handle independent tokens", () => {
      const doc: TokenDocument = {
        a: { $value: "#000" },
        b: { $value: "#fff" },
        c: { $value: "16px" },
      };

      const ast = buildASTFromDocument(doc);
      const order = getResolutionOrder(ast);

      // All are independent, so should all be present
      expect(order).toContain("a");
      expect(order).toContain("b");
      expect(order).toContain("c");
    });

    it("should handle circular references", () => {
      const doc: TokenDocument = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{a}" },
      };

      const ast = buildASTFromDocument(doc);
      const order = getResolutionOrder(ast);

      // Should still include all tokens even with circular refs
      expect(order).toContain("a");
      expect(order).toContain("b");
      expect(order).toContain("c");
    });

    it("should prioritize tokens without references", () => {
      const doc: TokenDocument = {
        derived: { $value: "{base}" },
        base: { $value: "#000" },
      };

      const ast = buildASTFromDocument(doc);
      const order = getResolutionOrder(ast);

      const baseIndex = order.indexOf("base");
      const derivedIndex = order.indexOf("derived");

      expect(baseIndex).toBeLessThan(derivedIndex);
    });
  });

  describe("complex scenarios", () => {
    it("should handle typography tokens with multiple references", async () => {
      const doc = await loadTokenFile<TokenDocument>("composite-tokens.json");
      const ast = buildASTFromDocument(doc);

      const resolver = new ReferenceResolver(ast);
      const errors = resolver.resolve();

      expect(errors.length).toBe(0);

      // Check that composite values are properly resolved
      const typography = resolver.getResolvedValue("typography.heading");
      if (typography && typeof typography === "object") {
        expect(typography).toHaveProperty("fontFamily");
        expect(typography).toHaveProperty("fontSize");
      }
    });

    it("should resolve theme overrides correctly", async () => {
      const doc = await loadTokenFile<TokenDocument>("themes/dark.json");
      const ast = buildASTFromDocument(doc);

      const resolver = new ReferenceResolver(ast);
      resolver.resolve();

      // Dark theme should have its references resolved
      const resolved = resolver.getAllResolvedValues();
      expect(Object.keys(resolved).length).toBeGreaterThan(0);
    });
  });
});
