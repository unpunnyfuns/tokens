/**
 * Basic tests for parser exports (non-file I/O functions)
 */

import { describe, expect, it } from "vitest";

// Test the parseTokenDocument function with mock data
describe("parser - basic functionality", () => {
  it("should be importable", async () => {
    const module = await import("./parser.js");
    expect(module).toBeDefined();
    expect(module.parseTokenDocument).toBeDefined();
    expect(typeof module.parseTokenDocument).toBe("function");
  });

  // Note: Full parser testing would require complex setup with file mocking
  // For now, just verify the module exports are accessible
});
