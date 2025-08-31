import { describe, expect, it } from "vitest";
import { createAST } from "./ast-builder.js";
import { detectCycles } from "./cycle-detector/index.js";

describe("Cycle Detector", () => {
  describe("detectCycles", () => {
    it("should detect no cycles in valid document", () => {
      const document = {
        base: { $value: "#ff0000", $type: "color" },
        primary: { $value: "{base}", $type: "color" },
        secondary: { $value: "{base}", $type: "color" },
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
        a: { $value: "{b}", $type: "color" },
        b: { $value: "{a}", $type: "color" },
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
        self: { $value: "{self}", $type: "color" },
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
        a: { $value: "{b}", $type: "color" },
        b: { $value: "{a}", $type: "color" },
        // Second cycle
        c: { $value: "{d}", $type: "color" },
        d: { $value: "{c}", $type: "color" },
        // Non-cyclic
        e: { $value: "#value", $type: "color" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(2);
      expect(result.cyclicTokens.size).toBe(4);
    });

    it("should detect complex cycle", () => {
      const document = {
        a: { $value: "{b}", $type: "color" },
        b: { $value: "{c}", $type: "color" },
        c: { $value: "{d}", $type: "color" },
        d: { $value: "{a}", $type: "color" },
        e: { $value: "{b}", $type: "color" }, // References into cycle but not part of it
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
        red: { $value: "#ff0000", $type: "color" },
        green: { $value: "#00ff00", $type: "color" },
        blue: { $value: "#0000ff", $type: "color" },
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
        base: { $value: "#ff0000", $type: "color" },
        primary: { $value: "{base}", $type: "color" },
        button: { $value: "{primary}", $type: "color" },
        hover: { $value: "{button}", $type: "color" },
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
        a: { $value: "{b}", $type: "color" },
        b: { $value: "{a}", $type: "color" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(true);
      expect(result.topologicalOrder).toBe(null);
    });

    it("should handle complex dependency graph", () => {
      const document = {
        a: { $value: "{b}", $type: "color" },
        b: { $value: "{c}", $type: "color" },
        c: { $value: "#value", $type: "color" },
        d: { $value: "{b}", $type: "color" },
        e: { $value: "{d}", $type: "color" },
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
          primary: { $value: "{colors.secondary}", $type: "color" },
          secondary: { $value: "{colors.primary}", $type: "color" },
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
          light: { $value: "{colors.white}", $type: "color" },
        },
        colors: {
          white: { $value: "#ffffff", $type: "color" },
          black: { $value: "#000000", $type: "color" },
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
        a: { $value: "test", $type: "color" },
        b: { $value: "{a}", $type: "color" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
    });

    it("should handle mixed reference types", () => {
      const document = {
        a: { $value: "{b}", $type: "color" },
        b: { $value: "not-a-reference", $type: "color" },
        c: { $value: "{a}", $type: "color" },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).not.toBe(null);
    });

    it("should handle typography composite values", () => {
      const document = {
        font: {
          size: { $value: "16px", $type: "dimension" },
          family: { $value: "Arial", $type: "fontFamily" },
        },
        heading: {
          $value: {
            fontSize: "{font.size}",
            fontFamily: "{font.family}",
          },
          $type: "typography",
        },
      };

      const ast = createAST(document);
      const result = detectCycles(ast);

      expect(result.hasCycles).toBe(false);
    });
  });
});
