import { describe, expect, it } from "vitest";
import { createAST } from "./ast-builder.js";
import { detectCycles } from "./cycle-detector/index.js";

describe("Cycle Detector", () => {
  describe("detectCycles", () => {
    it("should detect no cycles in valid document", () => {
      const document = {
        base: { $value: "#ff0000" },
        primary: { $value: "{base}" },
        secondary: { $value: "{base}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toEqual([]);
      expect(result.cyclicTokens.size).toBe(0);
      expect(result.topologicalOrder).not.toBe(null);
    });

    it("should detect simple cycle", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{a}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain("a");
      expect(result.cycles[0]).toContain("b");
      expect(result.cyclicTokens.has("a")).toBe(true);
      expect(result.cyclicTokens.has("b")).toBe(true);
      expect(result.topologicalOrder).toBe(null);
    });

    it("should detect self-reference", () => {
      const document = {
        self: { $value: "{self}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toEqual(["self"]);
      expect(result.cyclicTokens.has("self")).toBe(true);
    });

    it("should detect multiple cycles", () => {
      const document = {
        // First cycle
        a: { $value: "{b}" },
        b: { $value: "{a}" },
        // Second cycle
        c: { $value: "{d}" },
        d: { $value: "{c}" },
        // Non-cyclic
        e: { $value: "#value" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(2);
      expect(result.cyclicTokens.size).toBe(4);
    });

    it("should detect complex cycle", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{d}" },
        d: { $value: "{a}" },
        e: { $value: "{b}" }, // References into cycle but not part of it
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cyclicTokens.has("a")).toBe(true);
      expect(result.cyclicTokens.has("b")).toBe(true);
      expect(result.cyclicTokens.has("c")).toBe(true);
      expect(result.cyclicTokens.has("d")).toBe(true);
      expect(result.cyclicTokens.has("e")).toBe(false);
    });

    it("should handle document with no references", () => {
      const document = {
        red: { $value: "#ff0000" },
        green: { $value: "#00ff00" },
        blue: { $value: "#0000ff" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toEqual([]);
      expect(result.topologicalOrder).toEqual([]);
    });
  });

  describe("topological order in detectCycles result", () => {
    it("should return topological order for acyclic graph", () => {
      const document = {
        base: { $value: "#ff0000" },
        primary: { $value: "{base}" },
        button: { $value: "{primary}" },
        hover: { $value: "{button}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).not.toBe(null);

      const sorted = result.topologicalOrder;
      if (!sorted) throw new Error("Expected sorted array");

      // Should be in dependency order
      expect(sorted.indexOf("base")).toBeLessThan(sorted.indexOf("primary"));
      expect(sorted.indexOf("primary")).toBeLessThan(sorted.indexOf("button"));
      expect(sorted.indexOf("button")).toBeLessThan(sorted.indexOf("hover"));
    });

    it("should return null topological order for cyclic graph", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{a}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.topologicalOrder).toBe(null);
    });

    it("should handle complex dependency graph", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "#value" },
        d: { $value: "{b}" },
        e: { $value: "{d}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      const sorted = result.topologicalOrder;

      expect(sorted).not.toBe(null);
      if (!sorted) throw new Error("Expected sorted array");

      // c must come before b
      expect(sorted.indexOf("c")).toBeLessThan(sorted.indexOf("b"));
      // b must come before both a and d
      expect(sorted.indexOf("b")).toBeLessThan(sorted.indexOf("a"));
      expect(sorted.indexOf("b")).toBeLessThan(sorted.indexOf("d"));
      // d must come before e
      expect(sorted.indexOf("d")).toBeLessThan(sorted.indexOf("e"));
    });
  });

  describe("cycle detection with nested objects", () => {
    it("should detect cycles in nested token structures", () => {
      const document = {
        colors: {
          primary: { $value: "{colors.secondary}" },
          secondary: { $value: "{colors.primary}" },
        },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.cyclicTokens.has("colors.primary")).toBe(true);
      expect(result.cyclicTokens.has("colors.secondary")).toBe(true);
    });

    it("should handle cross-group references", () => {
      const document = {
        theme: {
          light: { $value: "{colors.white}" },
        },
        colors: {
          white: { $value: "#ffffff" },
          black: { $value: "#000000" },
        },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).not.toBe(null);
    });
  });

  describe("edge cases", () => {
    it("should handle empty document", () => {
      const document = {};

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toEqual([]);
      expect(result.topologicalOrder).toEqual([]);
    });

    it("should handle tokens with no value", () => {
      const document = {
        a: { $type: "color" },
        b: { $value: "{a}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
    });

    it("should handle mixed reference types", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "not-a-reference" },
        c: { $value: "{a}" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).not.toBe(null);
    });

    it("should handle typography composite values", () => {
      const document = {
        font: {
          size: { $value: "16px" },
          family: { $value: "Arial" },
        },
        heading: {
          $value: {
            fontSize: "{font.size}",
            fontFamily: "{font.family}",
          },
        },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
    });
  });
});
