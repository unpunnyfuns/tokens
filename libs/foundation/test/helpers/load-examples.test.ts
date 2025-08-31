/**
 * Tests for load-examples helper
 */

import { describe, expect, it } from "vitest";
import { loadTokenFile } from "./load-examples.js";

describe("load-examples", () => {
  it("should load a token example", () => {
    const tokens = loadTokenFile("tokens/primitives/colors.json");
    expect(tokens).toBeDefined();
    expect(typeof tokens).toBe("object");
  });

  it("should handle missing files gracefully", () => {
    expect(() => loadTokenFile("non-existent/file.json")).toThrow();
  });
});
