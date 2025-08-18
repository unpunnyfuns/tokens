import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChildLogger,
  createLogger,
  debug,
  error,
  formatMessage,
  info,
  LogLevel,
  log,
  resetDefaultConfig,
  setDefaultConfig,
  shouldLog,
  verbose,
  warn,
} from "./logger.js";

describe("Logger", () => {
  let mockWriter: any;

  beforeEach(() => {
    mockWriter = vi.fn();
    // Reset to default config
    resetDefaultConfig();
    setDefaultConfig({ level: LogLevel.INFO, colors: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("shouldLog", () => {
    it("should return true when level is below or equal to configured level", () => {
      const config = { level: LogLevel.INFO };

      expect(shouldLog(LogLevel.ERROR, config)).toBe(true);
      expect(shouldLog(LogLevel.WARN, config)).toBe(true);
      expect(shouldLog(LogLevel.INFO, config)).toBe(true);
      expect(shouldLog(LogLevel.DEBUG, config)).toBe(false);
      expect(shouldLog(LogLevel.VERBOSE, config)).toBe(false);
    });

    it("should return false when silent is true", () => {
      const config = { level: LogLevel.DEBUG, silent: true };

      expect(shouldLog(LogLevel.ERROR, config)).toBe(false);
      expect(shouldLog(LogLevel.INFO, config)).toBe(false);
    });

    it("should use INFO as default level", () => {
      const config = {};

      expect(shouldLog(LogLevel.INFO, config)).toBe(true);
      expect(shouldLog(LogLevel.DEBUG, config)).toBe(false);
    });
  });

  describe("formatMessage", () => {
    it("should format message without colors or prefix", () => {
      const config = { colors: false };
      const result = formatMessage(LogLevel.INFO, "test message", config);

      expect(result).toBe("test message");
    });

    it("should add prefix when configured", () => {
      const config = { colors: false, prefix: "MODULE" };
      const result = formatMessage(LogLevel.INFO, "test message", config);

      expect(result).toBe("[MODULE] test message");
    });

    it("should add colors when enabled", () => {
      const config = { colors: true };

      const errorMsg = formatMessage(LogLevel.ERROR, "error", config);
      expect(errorMsg).toContain("\x1b[31m"); // red
      expect(errorMsg).toContain("error");
      expect(errorMsg).toContain("\x1b[0m"); // reset

      const warnMsg = formatMessage(LogLevel.WARN, "warning", config);
      expect(warnMsg).toContain("\x1b[33m"); // yellow

      const debugMsg = formatMessage(LogLevel.DEBUG, "debug", config);
      expect(debugMsg).toContain("\x1b[36m"); // cyan

      const verboseMsg = formatMessage(LogLevel.VERBOSE, "verbose", config);
      expect(verboseMsg).toContain("\x1b[90m"); // gray
    });

    it("should combine colors and prefix", () => {
      const config = { colors: true, prefix: "APP" };
      const result = formatMessage(LogLevel.ERROR, "error", config);

      expect(result).toContain("\x1b[31m");
      expect(result).toContain("[APP] error");
      expect(result).toContain("\x1b[0m");
    });
  });

  describe("log function", () => {
    it("should log when level is appropriate", () => {
      const config = { level: LogLevel.INFO, writer: mockWriter };

      log(LogLevel.INFO, "test message", config);

      expect(mockWriter).toHaveBeenCalledWith("test message");
    });

    it("should not log when level is too high", () => {
      const config = { level: LogLevel.INFO, writer: mockWriter };

      log(LogLevel.DEBUG, "debug message", config);

      expect(mockWriter).not.toHaveBeenCalled();
    });

    it("should handle additional arguments", () => {
      const config = { level: LogLevel.INFO, writer: mockWriter };

      log(LogLevel.INFO, "message", config, "arg1", "arg2");

      expect(mockWriter).toHaveBeenCalledWith("message arg1 arg2");
    });

    it("should use console.log as default writer", () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // Empty mock implementation
      });
      const config = { level: LogLevel.INFO };

      log(LogLevel.INFO, "test", config);

      expect(consoleLogSpy).toHaveBeenCalledWith("test");
    });
  });

  describe("createLogger", () => {
    it("should create logger with fixed config", () => {
      const config = {
        level: LogLevel.VERBOSE,
        writer: mockWriter,
        colors: false,
      };
      const logger = createLogger(config);

      logger.error("error msg");
      expect(mockWriter).toHaveBeenCalledWith("error msg");

      logger.warn("warn msg");
      expect(mockWriter).toHaveBeenCalledWith("warn msg");

      logger.info("info msg");
      expect(mockWriter).toHaveBeenCalledWith("info msg");

      logger.debug("debug msg");
      expect(mockWriter).toHaveBeenCalledWith("debug msg");

      logger.verbose("verbose msg");
      expect(mockWriter).toHaveBeenCalledWith("verbose msg");
    });

    it("should respect log level in created logger", () => {
      const config = { level: LogLevel.WARN, writer: mockWriter };
      const logger = createLogger(config);

      logger.error("error");
      logger.warn("warn");
      logger.info("info");
      logger.debug("debug");

      expect(mockWriter).toHaveBeenCalledTimes(2);
      expect(mockWriter).toHaveBeenCalledWith("error");
      expect(mockWriter).toHaveBeenCalledWith("warn");
    });
  });

  describe("createChildLogger", () => {
    it("should create child logger with combined prefix", () => {
      const parentConfig = {
        prefix: "PARENT",
        writer: mockWriter,
        colors: false,
      };
      const childLogger = createChildLogger(parentConfig, "CHILD");

      childLogger.info("message");

      expect(mockWriter).toHaveBeenCalledWith("[PARENT:CHILD] message");
    });

    it("should handle parent without prefix", () => {
      const parentConfig = { writer: mockWriter, colors: false };
      const childLogger = createChildLogger(parentConfig, "CHILD");

      childLogger.info("message");

      expect(mockWriter).toHaveBeenCalledWith("[CHILD] message");
    });

    it("should inherit other config from parent", () => {
      const parentConfig = {
        level: LogLevel.DEBUG,
        colors: true,
        writer: mockWriter,
      };
      const childLogger = createChildLogger(parentConfig, "CHILD");

      childLogger.debug("debug message");

      expect(mockWriter).toHaveBeenCalled();
      const call = mockWriter.mock.calls[0][0];
      expect(call).toContain("[CHILD]");
      expect(call).toContain("\x1b[36m"); // cyan for debug
    });
  });

  describe("setDefaultConfig", () => {
    it("should update default config", () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // Empty mock implementation
      });

      setDefaultConfig({ level: LogLevel.ERROR });

      error("error msg");
      warn("warn msg");
      info("info msg");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("error msg");
    });

    it("should merge with existing config", () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // Empty mock implementation
      });

      setDefaultConfig({ colors: true });
      setDefaultConfig({ prefix: "APP" });

      info("test");

      const call = consoleLogSpy.mock.calls[0]?.[0] || "";
      expect(call).toContain("[APP]");
      expect(call).toContain("\x1b["); // has color codes
    });
  });

  describe("convenience functions", () => {
    beforeEach(() => {
      // Clear any previous prefix config
      resetDefaultConfig();
      setDefaultConfig({
        writer: mockWriter,
        colors: false,
      });
    });

    it("error should log at ERROR level", () => {
      setDefaultConfig({
        level: LogLevel.ERROR,
        writer: mockWriter,
        colors: false,
      });

      error("error message");
      warn("warn message");

      expect(mockWriter).toHaveBeenCalledTimes(1);
      expect(mockWriter).toHaveBeenCalledWith("error message");
    });

    it("warn should log at WARN level", () => {
      setDefaultConfig({
        level: LogLevel.WARN,
        writer: mockWriter,
        colors: false,
      });

      warn("warn message");
      info("info message");

      expect(mockWriter).toHaveBeenCalledTimes(1);
      expect(mockWriter).toHaveBeenCalledWith("warn message");
    });

    it("info should log at INFO level", () => {
      setDefaultConfig({
        level: LogLevel.INFO,
        writer: mockWriter,
        colors: false,
      });

      info("info message");
      debug("debug message");

      expect(mockWriter).toHaveBeenCalledTimes(1);
      expect(mockWriter).toHaveBeenCalledWith("info message");
    });

    it("debug should log at DEBUG level", () => {
      setDefaultConfig({
        level: LogLevel.DEBUG,
        writer: mockWriter,
        colors: false,
      });

      debug("debug message");
      verbose("verbose message");

      expect(mockWriter).toHaveBeenCalledTimes(1);
      expect(mockWriter).toHaveBeenCalledWith("debug message");
    });

    it("verbose should log at VERBOSE level", () => {
      setDefaultConfig({
        level: LogLevel.VERBOSE,
        writer: mockWriter,
        colors: false,
      });

      verbose("verbose message");

      expect(mockWriter).toHaveBeenCalledWith("verbose message");
    });

    it("should handle additional arguments", () => {
      setDefaultConfig({
        level: LogLevel.INFO,
        writer: mockWriter,
        colors: false,
      });

      info("message", "arg1", { key: "value" });

      expect(mockWriter).toHaveBeenCalledWith("message arg1 [object Object]");
    });
  });

  describe("edge cases", () => {
    it("should handle empty message", () => {
      const config = { writer: mockWriter };

      log(LogLevel.INFO, "", config);

      expect(mockWriter).toHaveBeenCalledWith("");
    });

    it("should handle undefined additional args", () => {
      const config = { writer: mockWriter };

      log(LogLevel.INFO, "message", config, undefined, null);

      // The actual logger implementation filters out empty args
      expect(mockWriter).toHaveBeenCalledWith("message  ");
    });

    it("should not throw when writer is undefined and not logging", () => {
      const config = { level: LogLevel.ERROR };

      expect(() => {
        log(LogLevel.DEBUG, "should not log", config);
      }).not.toThrow();
    });
  });
});
