/**
 * Tests for core foundation exports
 */

import { describe, expect, it } from "vitest";
import { extractReferences } from "./index.js";
import {
  getEffectiveType,
  getGroupType,
  isCompositeType,
  isGroup,
  isToken,
} from "./merge/guards.js";
import { isToken as tokenIsToken } from "./token/guards.js";

describe("core foundation exports", () => {
  it("should export all guard functions", () => {
    expect(typeof isToken).toBe("function");
    expect(typeof isGroup).toBe("function");
    expect(typeof getEffectiveType).toBe("function");
    expect(typeof getGroupType).toBe("function");
    expect(typeof isCompositeType).toBe("function");
  });

  it("should export extractReferences function", () => {
    expect(typeof extractReferences).toBe("function");
  });

  it("should work with exported functions", () => {
    const token = { $value: "test" };
    expect(isToken(token)).toBe(true);
    expect(isGroup(token)).toBe(false);
    expect(tokenIsToken(token)).toBe(true);
  });
});
