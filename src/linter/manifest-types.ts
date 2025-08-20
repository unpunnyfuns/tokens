/**
 * Types for manifest linting
 */

import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import type { LintViolation } from "./token-types.js";

/**
 * Manifest lint rule definition
 */
export interface ManifestLintRule {
  name: string;
  description: string;
  category: "structure" | "performance" | "documentation" | "best-practice";
  check: (
    manifest: UPFTResolverManifest,
    options: Record<string, unknown>,
  ) => LintViolation[];
}

/**
 * Manifest linter options
 */
export interface ManifestLinterOptions {
  configPath?: string;
  rules?: Record<string, RuleSetting>;
  checkFiles?: boolean; // Whether to check if referenced files exist
}

/**
 * Rule setting (same as token linting)
 */
export type RuleSetting =
  | "off"
  | "warn"
  | "error"
  | "info"
  | ["off" | "warn" | "error" | "info", Record<string, unknown>];
