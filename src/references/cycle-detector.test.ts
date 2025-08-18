import { describe, expect, it } from "vitest";
import {
  detectCycles,
  findShortestCycle,
  getTopologicalSort,
  wouldCreateCycle,
} from "./cycle-detector.js";

describe("Cycle Detector", () => {
  describe("detectCycles", () => {
    it("should detect no cycles in valid document", () => {
      const document = {
        color: {
          base: { $value: "#ff0000" },
          primary: { $value: "{color.base}" },
          button: { $value: "{color.primary}" },
        },
      };

      const result = detectCycles(document);

      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.cyclicTokens.size).toBe(0);
    });

    it("should detect simple cycle", () => {
      const document = {
        color: {
          a: { $value: "{color.b}" },
          b: { $value: "{color.a}" },
        },
      };

      const result = detectCycles(document);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain("color.a");
      expect(result.cycles[0]).toContain("color.b");
      expect(result.cyclicTokens.has("color.a")).toBe(true);
      expect(result.cyclicTokens.has("color.b")).toBe(true);
    });

    it("should detect self-reference", () => {
      const document = {
        color: {
          recursive: { $value: "{color.recursive}" },
        },
      };

      const result = detectCycles(document);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toEqual(["color.recursive"]);
    });

    it("should detect complex cycle", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{d}" },
        d: { $value: "{a}" },
        e: { $value: "{f}" },
        f: { $value: "#value" },
      };

      const result = detectCycles(document);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toHaveLength(4);
      expect(result.cyclicTokens.has("e")).toBe(false);
      expect(result.cyclicTokens.has("f")).toBe(false);
    });

    it("should detect multiple independent cycles", () => {
      const document = {
        cycle1: {
          a: { $value: "{cycle1.b}" },
          b: { $value: "{cycle1.a}" },
        },
        cycle2: {
          x: { $value: "{cycle2.y}" },
          y: { $value: "{cycle2.x}" },
        },
      };

      const result = detectCycles(document);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(2);
      expect(result.cyclicTokens.size).toBe(4);
    });
  });

  describe("findShortestCycle", () => {
    it("should find shortest cycle from token", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{a}" },
        d: { $value: "{b}" }, // Also connects but not part of shortest
      };

      const cycle = findShortestCycle(document, "a");

      expect(cycle).toEqual(["a", "b", "c", "a"]);
    });

    it("should return null if no cycle from token", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "#value" },
      };

      const cycle = findShortestCycle(document, "a");

      expect(cycle).toBe(null);
    });

    it("should find self-reference cycle", () => {
      const document = {
        self: { $value: "{self}" },
      };

      const cycle = findShortestCycle(document, "self");

      expect(cycle).toEqual(["self", "self"]);
    });
  });

  describe("wouldCreateCycle", () => {
    it("should detect potential cycle", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "#value" },
      };

      // Adding c -> a would create cycle
      expect(wouldCreateCycle(document, "c", "a")).toBe(true);
    });

    it("should allow non-cyclic reference", () => {
      const document = {
        a: { $value: "#value" },
        b: { $value: "#value" },
      };

      // Adding b -> a would not create cycle
      expect(wouldCreateCycle(document, "b", "a")).toBe(false);
    });

    it("should detect indirect cycle", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{d}" },
        d: { $value: "#value" },
      };

      // Adding d -> a would create cycle through chain
      expect(wouldCreateCycle(document, "d", "a")).toBe(true);
    });
  });

  describe("getTopologicalSort", () => {
    it("should return topological order for acyclic graph", () => {
      const document = {
        base: { $value: "#ff0000" },
        primary: { $value: "{base}" },
        button: { $value: "{primary}" },
        hover: { $value: "{button}" },
      };

      const sorted = getTopologicalSort(document);

      expect(sorted).not.toBe(null);
      if (!sorted) throw new Error("Expected sorted array");

      // base should come before primary
      expect(sorted.indexOf("base")).toBeLessThan(sorted.indexOf("primary"));
      // primary should come before button
      expect(sorted.indexOf("primary")).toBeLessThan(sorted.indexOf("button"));
      // button should come before hover
      expect(sorted.indexOf("button")).toBeLessThan(sorted.indexOf("hover"));
    });

    it("should return null for cyclic graph", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{a}" },
      };

      const sorted = getTopologicalSort(document);

      expect(sorted).toBe(null);
    });

    it("should handle disconnected components", () => {
      const document = {
        group1: {
          a: { $value: "{group1.b}" },
          b: { $value: "#value1" },
        },
        group2: {
          x: { $value: "{group2.y}" },
          y: { $value: "#value2" },
        },
      };

      const sorted = getTopologicalSort(document);

      expect(sorted).not.toBe(null);
      if (!sorted) throw new Error("Expected sorted array");

      expect(sorted.indexOf("group1.b")).toBeLessThan(
        sorted.indexOf("group1.a"),
      );
      expect(sorted.indexOf("group2.y")).toBeLessThan(
        sorted.indexOf("group2.x"),
      );
    });
  });
});
