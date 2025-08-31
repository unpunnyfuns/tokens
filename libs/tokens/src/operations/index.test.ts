/**
 * Tests for operations index exports
 */

import { describe, expect, it } from "vitest";

describe("operations index exports", () => {
  it("should export merge functions", async () => {
    const module = await import("./index.js");
    expect(module.merge).toBeDefined();
    expect(typeof module.merge).toBe("function");
  });

  it("should export operation functions", async () => {
    const module = await import("./index.js");
    expect(module.cloneToken).toBeDefined();
    expect(module.extractReferences).toBeDefined();
    expect(typeof module.cloneToken).toBe("function");
    expect(typeof module.extractReferences).toBe("function");
  });

  it("should export path utilities", async () => {
    const module = await import("./index.js");
    expect(module.parsePath).toBeDefined();
    expect(module.joinPath).toBeDefined();
    expect(module.getParentPath).toBeDefined();
    expect(typeof module.parsePath).toBe("function");
    expect(typeof module.joinPath).toBe("function");
    expect(typeof module.getParentPath).toBe("function");
  });

  it("should export path index utilities", async () => {
    const module = await import("./index.js");
    expect(module.buildPathIndex).toBeDefined();
    expect(module.getTokenFromIndex).toBeDefined();
    expect(typeof module.buildPathIndex).toBe("function");
    expect(typeof module.getTokenFromIndex).toBe("function");
  });
});
