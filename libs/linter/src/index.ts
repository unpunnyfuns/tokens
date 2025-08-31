/**
 * Linter module exports
 */

export type {
  LinterConfig,
  RuleConfig,
  RuleSetting,
  RuleSeverity,
  UpftConfig,
} from "./config.js";
// Configuration
export { loadConfig, PRESETS, resolveConfig } from "./config.js";

// Manifest linting
export { lintManifest } from "./manifest-linter.js";
export { MANIFEST_RULES } from "./manifest-rules.js";
export type {
  ManifestLinterOptions,
  ManifestLintRule,
} from "./manifest-types.js";
// Token linting
export { TokenLinter } from "./token-linter.js";
export { RULES } from "./token-rules.js";
// Types
export type {
  LinterOptions,
  LintResult,
  LintRule,
  LintViolation,
} from "./token-types.js";
