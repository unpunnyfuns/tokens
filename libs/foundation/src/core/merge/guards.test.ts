/**
 * Tests for additional guard functions coverage
 */

import { describe, expect, it } from "vitest";
import { getGroupType, isCompositeType } from "./guards.js";

describe("merge guards - additional coverage", () => {
  describe("getGroupType", () => {
    it("should return parentType when no direct $type and parentType exists", () => {
      const group = { primary: { $value: "red" } };
      const result = getGroupType(group, "color");
      expect(result).toBe("color");
    });

    it("should return undefined when no $type or parentType", () => {
      const group = { primary: { $value: "red" } };
      const result = getGroupType(group);
      expect(result).toBeUndefined();
    });

    it("should prefer direct $type over parentType", () => {
      const group = { $type: "dimension", primary: { $value: "16px" } };
      const result = getGroupType(group, "color");
      expect(result).toBe("dimension");
    });
  });

  describe("isCompositeType", () => {
    it("should handle undefined type", () => {
      expect(isCompositeType(undefined)).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isCompositeType("")).toBe(false);
    });

    it("should identify composite types", () => {
      expect(isCompositeType("typography")).toBe(true);
      expect(isCompositeType("shadow")).toBe(true);
      expect(isCompositeType("border")).toBe(true);
      expect(isCompositeType("transition")).toBe(true);
    });

    it("should identify non-composite types", () => {
      expect(isCompositeType("color")).toBe(false);
      expect(isCompositeType("dimension")).toBe(false);
      expect(isCompositeType("string")).toBe(false);
    });
  });
});
