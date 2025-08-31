/**
 * Functional manifest linting
 */

import type { UPFTResolverManifest } from "@upft/foundation";
import { loadConfig, parseRuleSetting } from "./config.js";
import { MANIFEST_RULES } from "./manifest-rules.js";
import type { ManifestLinterOptions, RuleSetting } from "./manifest-types.js";
import type { LintResult, LintViolation } from "./token-types.js";

/**
 * Lint a UPFT manifest
 */
export function lintManifest(
  manifest: UPFTResolverManifest,
  options: ManifestLinterOptions = {},
): LintResult {
  const violations: LintViolation[] = [];

  // Load configuration
  const config = loadConfig(options.configPath);
  const manifestConfig = config.lintManifest || {};

  // Apply extends presets
  const extendsValue = Array.isArray(manifestConfig.extends)
    ? manifestConfig.extends[0]
    : manifestConfig.extends;
  const baseRules = extendsValue ? getManifestPreset(extendsValue) : {};

  const rules = resolveManifestRules(
    { ...baseRules, ...(manifestConfig.rules || {}) },
    options.rules,
  );

  // Run each enabled rule
  for (const [ruleName, setting] of Object.entries(rules)) {
    const { severity, options: ruleOptions } = parseRuleSetting(setting);

    if (severity === "off") continue;

    const rule = MANIFEST_RULES[ruleName];
    if (!rule) continue;

    const ruleViolations = rule.check(manifest, ruleOptions);

    // Apply severity
    for (const violation of ruleViolations) {
      // Map 'info' to 'warn' with a special flag if needed
      const mappedSeverity = severity === "info" ? "info" : severity;
      violation.severity = mappedSeverity as "error" | "warn" | "info";
      violations.push(violation);
    }
  }

  // Calculate summary
  const summary = {
    errors: violations.filter((v) => v.severity === "error").length,
    warnings: violations.filter((v) => v.severity === "warn").length,
    info: violations.filter((v) => v.severity === "info").length,
  };

  return { violations, summary };
}

/**
 * Get manifest preset rules
 */
function getManifestPreset(
  preset: string,
): Record<string, RuleSetting> | undefined {
  const presets: Record<string, Record<string, RuleSetting>> = {
    minimal: {
      "no-empty-sets": "error",
      "no-duplicate-files": "warn",
    },
    recommended: {
      "no-empty-sets": "error",
      "no-duplicate-files": "warn",
      "no-unused-modifiers": "warn",
      "consistent-modifier-naming": ["warn", { style: "kebab-case" }],
      "modifier-description-required": "warn",
      "prefer-default-values": "info",
      "reasonable-permutation-count": ["warn", { max: 50 }],
    },
    strict: {
      "no-empty-sets": "error",
      "no-duplicate-files": "error",
      "no-unused-modifiers": "error",
      "consistent-modifier-naming": ["error", { style: "kebab-case" }],
      "modifier-description-required": "error",
      "prefer-default-values": "warn",
      "reasonable-permutation-count": ["error", { max: 30 }],
      "consistent-output-paths": ["warn", { pattern: "^dist/.*\\.json$" }],
    },
  };

  return presets[preset] || presets.recommended || {};
}

/**
 * Resolve manifest rules from config
 */
function resolveManifestRules(
  configRules: Record<string, RuleSetting>,
  overrideRules?: Record<string, RuleSetting>,
): Record<string, RuleSetting> {
  // Default to recommended preset if no extends specified
  const defaultRules = getManifestPreset("recommended");

  return {
    ...defaultRules,
    ...configRules,
    ...overrideRules,
  };
}
