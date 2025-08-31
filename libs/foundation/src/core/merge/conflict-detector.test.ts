/**
 * Tests for merge conflict detection
 */

import { describe, expect, it } from "vitest";
import type { TokenDocument } from "../../types.js";
import { detectConflicts } from "./conflict-detector.js";

describe("Conflict Detection", () => {
  describe("type conflicts", () => {
    it("should detect type mismatches between tokens", () => {
      const a: TokenDocument = {
        size: { medium: { $value: "16px", $type: "dimension" } },
      };

      const b: TokenDocument = {
        size: { medium: { $value: "#fff", $type: "color" } },
      };

      const conflicts = detectConflicts(a, b);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: "type-mismatch",
        path: "size.medium",
        message: expect.stringContaining("Type mismatch"),
        leftValue: "dimension",
        rightValue: "color",
      });
    });

    it("should detect inherited type conflicts", () => {
      const a: TokenDocument = {
        color: {
          $type: "color",
          primary: { $value: "#000" },
        },
      };

      const b: TokenDocument = {
        color: {
          primary: { $value: "16px", $type: "dimension" },
        },
      };

      const conflicts = detectConflicts(a, b);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("type-mismatch");
      expect(conflicts[0]?.path).toBe("color.primary");
    });

    it("should allow compatible undefined types", () => {
      const a: TokenDocument = {
        generic: { $value: "value1" },
      };

      const b: TokenDocument = {
        generic: { $value: "value2" },
      };

      const conflicts = detectConflicts(a, b);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("structure conflicts", () => {
    it("should detect token vs group conflicts", () => {
      const a: TokenDocument = {
        spacing: { $value: "16px", $type: "dimension" },
      };

      const b: TokenDocument = {
        spacing: {
          small: { $value: "8px", $type: "dimension" },
        },
      };

      const conflicts = detectConflicts(a, b);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: "group-token-conflict",
        path: "spacing",
        message: expect.stringContaining("Cannot merge token with group"),
      });
    });

    it("should detect group vs token conflicts", () => {
      const a: TokenDocument = {
        spacing: {
          small: { $value: "8px", $type: "dimension" },
        },
      };

      const b: TokenDocument = {
        spacing: { $value: "16px", $type: "dimension" },
      };

      const conflicts = detectConflicts(a, b);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("group-token-conflict");
      expect(conflicts[0]?.path).toBe("spacing");
    });
  });

  describe("multiple conflicts", () => {
    it("should detect multiple conflicts in different paths", () => {
      const a: TokenDocument = {
        color: { primary: { $value: "#000", $type: "color" } },
        size: { medium: { $value: "16px", $type: "dimension" } },
        spacing: { $value: "8px", $type: "dimension" },
      };

      const b: TokenDocument = {
        color: { primary: { $value: "#fff", $type: "dimension" } },
        size: { medium: { $value: "#red", $type: "color" } },
        spacing: { small: { $value: "4px", $type: "dimension" } },
      };

      const conflicts = detectConflicts(a, b);

      expect(conflicts).toHaveLength(3);

      const paths = conflicts.map((c) => c.path);
      expect(paths).toContain("color.primary");
      expect(paths).toContain("size.medium");
      expect(paths).toContain("spacing");
    });

    it("should detect nested conflicts", () => {
      const a: TokenDocument = {
        theme: {
          light: {
            color: { primary: { $value: "#000", $type: "color" } },
            size: { medium: { $value: "16px", $type: "dimension" } },
          },
        },
      };

      const b: TokenDocument = {
        theme: {
          light: {
            color: { primary: { $value: "#fff", $type: "dimension" } },
            size: { medium: { $value: "#blue", $type: "color" } },
          },
        },
      };

      const conflicts = detectConflicts(a, b);

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0]?.path).toBe("theme.light.color.primary");
      expect(conflicts[1]?.path).toBe("theme.light.size.medium");
    });
  });

  describe("no conflicts", () => {
    it("should return empty array when no conflicts exist", () => {
      const a: TokenDocument = {
        color: { primary: { $value: "#000", $type: "color" } },
      };

      const b: TokenDocument = {
        color: {
          primary: { $value: "#fff", $type: "color" },
          secondary: { $value: "#ccc", $type: "color" },
        },
      };

      const conflicts = detectConflicts(a, b);
      expect(conflicts).toHaveLength(0);
    });

    it("should allow merging compatible composite types", () => {
      const a: TokenDocument = {
        shadow: {
          elevation: {
            $value: { color: "#000", offsetX: "0px" },
            $type: "shadow",
          },
        },
      };

      const b: TokenDocument = {
        shadow: {
          elevation: {
            $value: { offsetY: "2px", blur: "4px" },
            $type: "shadow",
          },
        },
      };

      const conflicts = detectConflicts(a, b);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty documents", () => {
      const conflicts = detectConflicts(
        {},
        { color: { primary: { $value: "#000" } } },
      );
      expect(conflicts).toHaveLength(0);
    });

    it("should handle deeply nested structures", () => {
      const a: TokenDocument = {
        theme: {
          brand: { colors: { primary: { $value: "#000", $type: "color" } } },
        },
      };

      const b: TokenDocument = {
        theme: {
          brand: { colors: { primary: { $value: "#fff", $type: "color" } } },
        },
      };

      const conflicts = detectConflicts(a, b);
      expect(conflicts).toHaveLength(0);
    });

    it("should handle null and undefined values gracefully", () => {
      const a: TokenDocument = {
        optional: { $value: "present" },
      };

      const b: TokenDocument = {
        optional: null as any,
        newField: undefined as any,
      };

      const conflicts = detectConflicts(a, b);
      expect(conflicts).toHaveLength(0);
    });
  });
});
