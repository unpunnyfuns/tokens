/**
 * CLI commands orchestrator
 * Re-exports the functional API for CLI commands
 */

export {
  createCLI,
  TokenCLI,
  type CommandOptions,
  type ValidationResult,
  type ManifestInfo,
  type TokenDiff,
} from "./commands-functional.js";

// For backwards compatibility
export type TokenCLIOptions = import("./commands-functional.js").CommandOptions;
