/**
 * Debug test to see why coverage is 0%
 */

import { describe, expect, it } from "vitest";

describe("Coverage Debug", () => {
  it("should import and execute code to check coverage instrumentation", async () => {
    // Import the module directly
    const module = await import("./index.js");

    expect(module.validateManifest).toBeDefined();
    expect(module.validateTokenDocument).toBeDefined();
    expect(module.detectFileType).toBeDefined();

    // Try to call the functions to see if they execute
    console.log("Calling detectFileType...");
    const result1 = module.detectFileType({
      colors: { primary: { $value: "red" } },
    });
    console.log("detectFileType result:", result1);
    expect(result1).toBe("tokens");

    console.log("Calling validateTokenDocument...");
    const result2 = module.validateTokenDocument({ test: true });
    console.log("validateTokenDocument result:", result2);
    expect(typeof result2.valid).toBe("boolean");

    console.log("Calling validateManifest...");
    const result3 = module.validateManifest({ sets: [], modifiers: {} });
    console.log("validateManifest result:", result3);
    expect(typeof result3.valid).toBe("boolean");
  });
});
