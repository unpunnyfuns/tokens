/**
 * Lint command implementation
 */

import { readFileSync } from "node:fs";
import type { TokenDocument, UPFTResolverManifest } from "@upft/foundation";
import { isUPFTManifest } from "@upft/foundation";
import type { LinterOptions, LintResult, LintViolation } from "@upft/linter";
import { lintManifest, TokenLinter } from "@upft/linter";

/**
 * Lint command options
 */
export interface LintCommandOptions extends LinterOptions {
  format?: "stylish" | "json" | "compact";
  manifest?: boolean;
}

/**
 * Lint a file (auto-detect or explicit type)
 */
export async function lintFile(
  filePath: string,
  options: LintCommandOptions = {},
): Promise<LintResult> {
  // Read the file
  const content = readFileSync(filePath, "utf-8");
  const document = JSON.parse(content);

  // Determine if it's a manifest
  const isManifest =
    options.manifest !== undefined
      ? options.manifest
      : isUPFTManifest(document) || isLikelyManifest(document);

  if (isManifest) {
    // Lint as manifest
    return lintManifest(document as UPFTResolverManifest, options);
  }
  // Lint as tokens
  const linter = new TokenLinter(options);
  return linter.lint(document as TokenDocument);
}

/**
 * Lint a token file (explicit)
 */
export async function lintTokenFile(
  filePath: string,
  options: LintCommandOptions = {},
): Promise<LintResult> {
  return lintFile(filePath, { ...options, manifest: false });
}

/**
 * Lint a manifest file (explicit)
 */
export async function lintManifestFile(
  filePath: string,
  options: LintCommandOptions = {},
): Promise<LintResult> {
  return lintFile(filePath, { ...options, manifest: true });
}

/**
 * Check if document looks like a manifest (even without modifiers)
 */
function isLikelyManifest(doc: unknown): boolean {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return false;
  }

  const obj = doc as Record<string, unknown>;

  // Has manifest-specific properties
  return "sets" in obj || "generate" in obj;
}

/**
 * Format lint results for console output
 */
export function formatLintResults(
  results: LintResult,
  format: "stylish" | "json" | "compact" = "stylish",
): string {
  if (format === "json") {
    return JSON.stringify(results, null, 2);
  }

  if (format === "compact") {
    return formatCompact(results);
  }

  return formatStylish(results);
}

/**
 * Format results in compact style
 */
function formatCompact(results: LintResult): string {
  return results.violations
    .map((v) => `${v.path}: ${v.severity} ${v.rule} - ${v.message}`)
    .join("\n");
}

/**
 * Format results in stylish style
 */
function formatStylish(results: LintResult): string {
  const lines: string[] = [];

  if (results.violations.length === 0) {
    lines.push("✓ No linting issues found");
    return lines.join("\n");
  }

  // Group violations by path
  const byPath = groupViolationsByPath(results.violations);

  // Format each path's violations
  for (const [path, violations] of byPath) {
    lines.push(`\n${path}`);
    for (const v of violations) {
      lines.push(...formatViolation(v));
    }
  }

  // Add summary
  lines.push("", formatSummary(results.summary));

  return lines.join("\n");
}

/**
 * Group violations by path
 */
function groupViolationsByPath(
  violations: LintViolation[],
): Map<string, LintViolation[]> {
  const byPath = new Map<string, LintViolation[]>();
  for (const violation of violations) {
    if (!byPath.has(violation.path)) {
      byPath.set(violation.path, []);
    }
    byPath.get(violation.path)?.push(violation);
  }
  return byPath;
}

/**
 * Format a single violation
 */
function formatViolation(v: LintViolation): string[] {
  const icon = v.severity === "error" ? "✖" : v.severity === "warn" ? "⚠" : "ℹ";
  const severity = v.severity.padEnd(5);
  return [`  ${icon} ${severity} ${v.message}`, `    ${v.rule}`];
}

/**
 * Format summary line
 */
function formatSummary(summary: LintResult["summary"]): string {
  const { errors, warnings, info } = summary;
  const parts = [];

  if (errors > 0) parts.push(`${errors} error${errors !== 1 ? "s" : ""}`);
  if (warnings > 0)
    parts.push(`${warnings} warning${warnings !== 1 ? "s" : ""}`);
  if (info > 0) parts.push(`${info} info`);

  const icon = errors > 0 ? "✖" : warnings > 0 ? "⚠" : "ℹ";
  return `${icon} ${parts.join(", ")}`;
}
