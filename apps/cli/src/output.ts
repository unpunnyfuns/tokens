/**
 * Functional CLI output utilities
 */

export interface OutputConfig {
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  noColors?: boolean;
}

/**
 * Output data respecting JSON flag
 */
export function outputData(data: unknown, config: OutputConfig): void {
  if (config.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

/**
 * Output success message
 */
export function outputSuccess(message: string, config: OutputConfig): void {
  if (config.quiet) return;

  const checkmark =
    config.noColors || !process.stdout.isTTY ? "✓" : "\x1b[32m✓\x1b[0m";

  console.log(`${checkmark} ${message}`);
}

/**
 * Output error message
 */
export function outputError(
  message: string,
  error: unknown | undefined,
  config: OutputConfig,
): void {
  const cross =
    config.noColors || !process.stderr.isTTY ? "✗" : "\x1b[31m✗\x1b[0m";

  console.error(`${cross} ${message}`);

  if (error && config.verbose) {
    console.error(error);
  }
}

/**
 * Output warning message
 */
export function outputWarning(message: string, config: OutputConfig): void {
  if (config.quiet) return;

  const warning =
    config.noColors || !process.stderr.isTTY ? "⚠" : "\x1b[33m⚠\x1b[0m";

  console.warn(`${warning} ${message}`);
}

/**
 * Output info message
 */
export function outputInfo(message: string, config: OutputConfig): void {
  if (!config.quiet) {
    console.log(message);
  }
}

/**
 * Output debug message
 */
export function outputDebug(message: string, config: OutputConfig): void {
  if (config.verbose) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Output a list with bullets
 */
export function outputList(
  items: string[],
  config: OutputConfig,
  indent = 2,
): void {
  if (config.quiet) return;

  const prefix = " ".repeat(indent);
  for (const item of items) {
    console.log(`${prefix}• ${item}`);
  }
}

/**
 * Output table data
 */
export function outputTable(
  data: Record<string, unknown>,
  config: OutputConfig,
): void {
  if (config.quiet) return;

  if (config.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const entries = Object.entries(data);
  if (entries.length === 0) return;

  const maxKeyLength = Math.max(...entries.map(([k]) => k.length));

  for (const [key, value] of entries) {
    const paddedKey = key.padEnd(maxKeyLength);
    console.log(`  ${paddedKey}  ${value}`);
  }
}

/**
 * Output section header
 */
export function outputSection(title: string, config: OutputConfig): void {
  if (config.quiet) return;

  const formatted =
    config.noColors || !process.stdout.isTTY
      ? `\n${title}`
      : `\n\x1b[1m${title}\x1b[0m`;

  console.log(formatted);
}

/**
 * Create output functions with fixed config
 */
export function createOutput(config: OutputConfig) {
  return {
    data: (data: unknown) => outputData(data, config),
    success: (message: string) => outputSuccess(message, config),
    error: (message: string, error?: unknown) =>
      outputError(message, error, config),
    warning: (message: string) => outputWarning(message, config),
    info: (message: string) => outputInfo(message, config),
    debug: (message: string) => outputDebug(message, config),
    list: (items: string[], indent?: number) =>
      outputList(items, config, indent),
    table: (data: Record<string, unknown>) => outputTable(data, config),
    section: (title: string) => outputSection(title, config),
  };
}
