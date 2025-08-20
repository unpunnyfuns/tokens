/**
 * Configuration system for UPFT linter
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import JSON5 from "json5";

/**
 * Linter configuration
 */
export interface LinterConfig {
  extends?: string | string[];
  rules?: RuleConfig;
  ignore?: string[];
}

/**
 * UPFT configuration (extensible for future features)
 */
export interface UpftConfig {
  lint?: LinterConfig;
  lintManifest?: LinterConfig;
  // Future: transform, bundle, validate, etc.
}

/**
 * Rule configuration
 */
export type RuleConfig = Record<string, RuleSetting>;

/**
 * Individual rule setting
 */
export type RuleSetting =
  | "off"
  | "warn"
  | "error"
  | "info"
  | ["off" | "warn" | "error" | "info", Record<string, unknown>];

/**
 * Rule severity level
 */
export type RuleSeverity = "off" | "warn" | "error" | "info";

/**
 * Built-in presets
 */
export const PRESETS: Record<string, RuleConfig> = {
  minimal: {
    "naming-convention": "warn",
    "duplicate-values": "warn",
  },
  recommended: {
    "min-font-size": ["warn", { minSize: "12px" }],
    "naming-convention": ["warn", { style: "any" }],
    "group-description-required": "warn",
    "max-nesting-depth": ["warn", { maxDepth: 4 }],
    "no-mixed-token-types": "warn",
    "duplicate-values": "warn",
    "prefer-references": ["warn", { threshold: 3 }],
  },
  strict: {
    // Includes all recommended rules
    "min-font-size": ["error", { minSize: "12px" }],
    "naming-convention": ["error", { style: "kebab-case" }],
    "group-description-required": "error",
    "max-nesting-depth": ["error", { maxDepth: 4 }],
    "no-mixed-token-types": "error",
    "duplicate-values": "error",
    "prefer-references": ["error", { threshold: 2 }],
    // Additional strict rules
    "prefer-rem-over-px": ["warn", { ignore: ["border", "outline"] }],
    "naming-hierarchy": ["warn", { separator: "." }],
    "description-required": "warn",
    "description-min-length": ["warn", { minLength: 10 }],
    "consistent-property-order": [
      "warn",
      { order: ["$type", "$value", "$description"] },
    ],
    "unused-tokens": "warn",
  },
};

/**
 * Load configuration from file or defaults
 */
export function loadConfig(configPath?: string): UpftConfig {
  // If explicit path provided
  if (configPath) {
    return loadConfigFile(configPath);
  }

  // Look for .upftrc.json in current directory and up
  const config = findConfig(process.cwd());
  if (config) {
    return config;
  }

  // Default to recommended preset for both token and manifest linting
  return {
    lint: {
      extends: "recommended",
    },
    lintManifest: {
      extends: "recommended",
    },
  };
}

/**
 * Find config file in directory or parent directories
 */
function findConfig(startDir: string): UpftConfig | null {
  let currentDir = startDir;

  while (currentDir !== dirname(currentDir)) {
    const configPath = join(currentDir, ".upftrc.json");
    if (existsSync(configPath)) {
      return loadConfigFile(configPath);
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Load config file
 */
function loadConfigFile(path: string): UpftConfig {
  try {
    const content = readFileSync(path, "utf-8");
    const config = JSON5.parse(content) as UpftConfig;
    return config;
  } catch (error) {
    throw new Error(`Failed to load config from ${path}: ${error}`);
  }
}

/**
 * Resolve configuration with extends
 */
export function resolveConfig(config: LinterConfig): RuleConfig {
  const rules: RuleConfig = {};

  // Apply extends
  if (config.extends) {
    const presetNames = Array.isArray(config.extends)
      ? config.extends
      : [config.extends];

    for (const presetName of presetNames) {
      const preset = PRESETS[presetName];
      if (!preset) {
        throw new Error(`Unknown preset: ${presetName}`);
      }
      Object.assign(rules, preset);
    }
  }

  // Apply custom rules (overrides presets)
  if (config.rules) {
    Object.assign(rules, config.rules);
  }

  return rules;
}

/**
 * Parse rule setting to get severity and options
 */
export function parseRuleSetting(setting: RuleSetting): {
  severity: RuleSeverity;
  options: Record<string, unknown>;
} {
  if (typeof setting === "string") {
    return {
      severity: setting,
      options: {},
    };
  }

  const [severity, options = {}] = setting;
  return { severity, options };
}
