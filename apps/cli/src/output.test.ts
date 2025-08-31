/**
 * Tests for CLI output utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOutput,
  outputData,
  outputDebug,
  outputError,
  outputInfo,
  outputList,
  outputSection,
  outputSuccess,
  outputTable,
  outputWarning,
} from "./output.js";

describe("CLI Output Utilities", () => {
  // Mock console methods
  const consoleSpy = {
    log: vi.spyOn(console, "log").mockImplementation(() => undefined),
    error: vi.spyOn(console, "error").mockImplementation(() => undefined),
    warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
  };

  beforeEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("outputData", () => {
    it("should output data as JSON when json flag is true", () => {
      const testData = { test: "data", number: 42 };
      outputData(testData, { json: true });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        JSON.stringify(testData, null, 2),
      );
    });

    it("should output data directly when json flag is false", () => {
      const testData = { test: "data" };
      outputData(testData, { json: false });

      expect(consoleSpy.log).toHaveBeenCalledWith(testData);
    });

    it("should output data directly when no json flag", () => {
      const testData = "simple string";
      outputData(testData, {});

      expect(consoleSpy.log).toHaveBeenCalledWith(testData);
    });
  });

  describe("outputSuccess", () => {
    it("should output success message with checkmark", () => {
      outputSuccess("Operation completed", {});
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should suppress output in quiet mode", () => {
      outputSuccess("Should be suppressed", { quiet: true });
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it("should handle noColors option", () => {
      outputSuccess("No colors", { noColors: true });
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe("outputError", () => {
    it("should output error message with X mark", () => {
      outputError("Operation failed", undefined, {});
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should output error even in quiet mode", () => {
      outputError("Critical error", undefined, { quiet: true });
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should handle noColors option", () => {
      outputError("No colors error", undefined, { noColors: true });
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should output error details in verbose mode", () => {
      const error = new Error("Test error");
      outputError("Operation failed", error, { verbose: true });
      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });
  });

  describe("outputInfo", () => {
    it("should output info message", () => {
      outputInfo("Information message", {});
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should suppress output in quiet mode", () => {
      outputInfo("Should be suppressed", { quiet: true });
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle null/undefined data", () => {
      outputData(null, {});
      outputData(undefined, {});
      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
    });

    it("should handle empty strings", () => {
      outputSuccess("", {});
      outputError("", undefined, {});
      outputInfo("", {});
      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // success and info
      expect(consoleSpy.error).toHaveBeenCalledTimes(1); // error
    });

    it("should handle complex nested objects in JSON mode", () => {
      const complexData = {
        nested: {
          array: [1, 2, { deep: "value" }],
          boolean: true,
          null: null,
        },
      };

      outputData(complexData, { json: true });
      expect(consoleSpy.log).toHaveBeenCalledWith(
        JSON.stringify(complexData, null, 2),
      );
    });
  });

  describe("outputWarning", () => {
    it("should output warning message", () => {
      outputWarning("Warning message", {});
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should suppress output in quiet mode", () => {
      outputWarning("Should be suppressed", { quiet: true });
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it("should handle noColors option", () => {
      outputWarning("No colors warning", { noColors: true });
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe("outputDebug", () => {
    it("should output debug message in verbose mode", () => {
      outputDebug("Debug message", { verbose: true });
      expect(consoleSpy.log).toHaveBeenCalledWith("[DEBUG] Debug message");
    });

    it("should suppress output when not verbose", () => {
      outputDebug("Should be suppressed", {});
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe("outputList", () => {
    it("should output list with bullets", () => {
      outputList(["Item 1", "Item 2"], {});
      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenCalledWith("  • Item 1");
      expect(consoleSpy.log).toHaveBeenCalledWith("  • Item 2");
    });

    it("should handle custom indent", () => {
      outputList(["Item 1"], {}, 4);
      expect(consoleSpy.log).toHaveBeenCalledWith("    • Item 1");
    });

    it("should suppress output in quiet mode", () => {
      outputList(["Item 1"], { quiet: true });
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe("outputTable", () => {
    it("should output table data", () => {
      outputTable({ key1: "value1", key2: "value2" }, {});
      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
    });

    it("should output JSON when json flag is true", () => {
      const data = { key: "value" };
      outputTable(data, { json: true });
      expect(consoleSpy.log).toHaveBeenCalledWith(
        JSON.stringify(data, null, 2),
      );
    });

    it("should suppress output in quiet mode", () => {
      outputTable({ key: "value" }, { quiet: true });
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it("should handle empty data", () => {
      outputTable({}, {});
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe("outputSection", () => {
    it("should output section header", () => {
      outputSection("Section Title", {});
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should suppress output in quiet mode", () => {
      outputSection("Should be suppressed", { quiet: true });
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it("should handle noColors option", () => {
      outputSection("No colors section", { noColors: true });
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe("createOutput", () => {
    it("should create output functions with fixed config", () => {
      const output = createOutput({ json: true, verbose: true });

      expect(output.data).toBeInstanceOf(Function);
      expect(output.success).toBeInstanceOf(Function);
      expect(output.error).toBeInstanceOf(Function);
      expect(output.warning).toBeInstanceOf(Function);
      expect(output.info).toBeInstanceOf(Function);
      expect(output.debug).toBeInstanceOf(Function);
      expect(output.list).toBeInstanceOf(Function);
      expect(output.table).toBeInstanceOf(Function);
      expect(output.section).toBeInstanceOf(Function);
    });

    it("should use fixed config in created functions", () => {
      const output = createOutput({ json: true });
      const data = { test: "value" };

      output.data(data);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        JSON.stringify(data, null, 2),
      );
    });

    it("should handle quiet mode in created functions", () => {
      const output = createOutput({ quiet: true });

      output.success("Should be suppressed");
      output.info("Should be suppressed");
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });
});
