/**
 * Debug test to check if functions execute properly
 */

import { describe, expect, it } from "vitest";
import { detectFileType } from "./index.js";

describe("Debug Test", () => {
  it("should actually execute detectFileType", () => {
    console.log("Starting test");

    try {
      const result = detectFileType({ colors: { primary: { $value: "red" } } });
      console.log("detectFileType result:", result);
      expect(result).toBe("tokens");
      console.log("Test passed");
    } catch (error) {
      console.error("Error in detectFileType:", error);
      throw error;
    }
  });

  it("should detect unknown type", () => {
    const result = detectFileType(null);
    console.log("null result:", result);
    expect(result).toBe("unknown");
  });
});
