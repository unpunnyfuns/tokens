/**
 * Functional logger for UPFT
 *
 * Provides pure functions for logging with configurable options
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

export interface LoggerConfig {
  level?: LogLevel;
  silent?: boolean;
  prefix?: string;
  colors?: boolean;
  writer?: (message: string) => void;
}

/**
 * Check if a message should be logged
 */
export function shouldLog(level: LogLevel, config: LoggerConfig): boolean {
  const currentLevel = config.level ?? LogLevel.INFO;
  return !config.silent && level <= currentLevel;
}

/**
 * Format a log message with optional colors and prefix
 */
export function formatMessage(
  level: LogLevel,
  message: string,
  config: LoggerConfig,
): string {
  const prefix = config.prefix ? `[${config.prefix}] ` : "";

  if (!config.colors) {
    return `${prefix}${message}`;
  }

  // ANSI color codes
  const colors: Record<LogLevel, string> = {
    [LogLevel.ERROR]: "\x1b[31m", // red
    [LogLevel.WARN]: "\x1b[33m", // yellow
    [LogLevel.INFO]: "\x1b[0m", // default
    [LogLevel.DEBUG]: "\x1b[36m", // cyan
    [LogLevel.VERBOSE]: "\x1b[90m", // gray
  };
  const reset = "\x1b[0m";

  return `${colors[level]}${prefix}${message}${reset}`;
}

/**
 * Core logging function
 */
export function log(
  level: LogLevel,
  message: string,
  config: LoggerConfig = {},
  ...args: unknown[]
): void {
  if (!shouldLog(level, config)) {
    return;
  }

  const formatted = formatMessage(level, message, config);
  const writer = config.writer ?? console.log;

  if (args.length > 0) {
    writer(`${formatted} ${args.join(" ")}`);
  } else {
    writer(formatted);
  }
}

/**
 * Create a logger with fixed configuration
 */
export function createLogger(defaultConfig: LoggerConfig = {}) {
  return {
    error: (message: string, ...args: unknown[]) =>
      log(LogLevel.ERROR, message, defaultConfig, ...args),
    warn: (message: string, ...args: unknown[]) =>
      log(LogLevel.WARN, message, defaultConfig, ...args),
    info: (message: string, ...args: unknown[]) =>
      log(LogLevel.INFO, message, defaultConfig, ...args),
    debug: (message: string, ...args: unknown[]) =>
      log(LogLevel.DEBUG, message, defaultConfig, ...args),
    verbose: (message: string, ...args: unknown[]) =>
      log(LogLevel.VERBOSE, message, defaultConfig, ...args),
  };
}

/**
 * Create a child logger with additional prefix
 */
export function createChildLogger(
  parentConfig: LoggerConfig,
  childPrefix: string,
) {
  return createLogger({
    ...parentConfig,
    prefix: parentConfig.prefix
      ? `${parentConfig.prefix}:${childPrefix}`
      : childPrefix,
  });
}

// Default logger instance
let defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  colors: process.stdout.isTTY,
};

export function setDefaultConfig(config: LoggerConfig): void {
  defaultConfig = { ...defaultConfig, ...config };
}

// Convenience functions using default config
export const error = (message: string, ...args: unknown[]) =>
  log(LogLevel.ERROR, message, defaultConfig, ...args);

export const warn = (message: string, ...args: unknown[]) =>
  log(LogLevel.WARN, message, defaultConfig, ...args);

export const info = (message: string, ...args: unknown[]) =>
  log(LogLevel.INFO, message, defaultConfig, ...args);

export const debug = (message: string, ...args: unknown[]) =>
  log(LogLevel.DEBUG, message, defaultConfig, ...args);

export const verbose = (message: string, ...args: unknown[]) =>
  log(LogLevel.VERBOSE, message, defaultConfig, ...args);
