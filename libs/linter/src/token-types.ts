/**
 * Types for the linter module
 */

import type { Token } from "@upft/foundation";

/**
 * Lint result
 */
export interface LintResult {
  violations: LintViolation[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Lint violation
 */
export interface LintViolation {
  path: string;
  rule: string;
  severity: "error" | "warn" | "info";
  message: string;
  fix?: string;
}

/**
 * Lint rule definition
 */
export interface LintRule {
  name: string;
  description: string;
  category:
    | "accessibility"
    | "naming"
    | "documentation"
    | "organization"
    | "quality";
  check: (
    token: Token,
    path: string,
    options: Record<string, unknown>,
  ) => LintViolation | null;
}

/**
 * Linter options
 */
export interface LinterOptions {
  configPath?: string;
  quiet?: boolean;
  maxWarnings?: number;
}
