/**
 * Build configuration parser and loader
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  BuildConfig,
  BuildConfigOutput,
  ValidationResult,
} from "@upft/foundation";
import { isBuildConfig } from "@upft/foundation";

export interface BuildConfigParseResult {
  config: BuildConfig;
  errors: string[];
  warnings: string[];
}

/**
 * Load and parse a build configuration file
 */
export async function loadBuildConfig(
  configPath: string,
): Promise<BuildConfigParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const configContent = await readFile(configPath, "utf-8");
    const configData = JSON.parse(configContent);

    if (!isBuildConfig(configData)) {
      errors.push("Invalid build configuration format");
      return {
        config: {} as BuildConfig,
        errors,
        warnings,
      };
    }

    // Validate the configuration
    const validation = validateBuildConfig(configData);
    errors.push(...validation.errors.map((e) => e.message));
    warnings.push(...validation.warnings.map((w) => w.message));

    // Resolve manifest path relative to config file
    const configDir = resolve(configPath, "..");
    const resolvedConfig = {
      ...configData,
      manifest: resolve(configDir, configData.manifest),
    };

    return {
      config: resolvedConfig,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(
      `Failed to load build config: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      config: {} as BuildConfig,
      errors,
      warnings,
    };
  }
}

/**
 * Validate a build configuration
 */
export function validateBuildConfig(config: BuildConfig): ValidationResult {
  const errors: Array<{
    message: string;
    path: string;
    severity: "error" | "warning";
  }> = [];
  const warnings: Array<{
    message: string;
    path: string;
    severity: "error" | "warning";
  }> = [];

  // Validate outputs
  const validOutputs = (config.outputs || []).filter(
    (output) => output !== null && output !== undefined,
  );

  if (validOutputs.length === 0) {
    errors.push({
      message: "Build configuration must have at least one output",
      path: "outputs",
      severity: "error",
    });
  } else {
    for (let i = 0; i < config.outputs.length; i++) {
      const output = config.outputs[i];
      if (!output) continue;

      const outputPath = `outputs[${i}]`;
      validateBuildConfigOutput(output, outputPath, errors, warnings);
    }
  }

  // Check for duplicate output names
  const outputNames = new Set<string>();
  for (const output of config.outputs || []) {
    if (!output) continue; // Skip null outputs

    if (outputNames.has(output.name)) {
      warnings.push({
        message: `Duplicate output name: ${output.name}`,
        path: "outputs",
        severity: "warning",
      });
    }
    outputNames.add(output.name);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single build config output
 */
function validateBuildConfigOutput(
  output: BuildConfigOutput,
  basePath: string,
  errors: Array<{
    message: string;
    path: string;
    severity: "error" | "warning";
  }>,
  warnings: Array<{
    message: string;
    path: string;
    severity: "error" | "warning";
  }>,
): void {
  if (!output.name) {
    errors.push({
      message: "Output must have a name",
      path: `${basePath}.name`,
      severity: "error",
    });
  }

  if (!output.output?.path) {
    errors.push({
      message: "Output must have a path",
      path: `${basePath}.output.path`,
      severity: "error",
    });
  }

  if (!output.modifiers || Object.keys(output.modifiers).length === 0) {
    warnings.push({
      message: "Output has no modifiers - will use base tokens only",
      path: `${basePath}.modifiers`,
      severity: "warning",
    });
  }

  // Validate path templating
  const pathTemplates = extractPathTemplates(output.output?.path || "");
  const modifierKeys = Object.keys(output.modifiers || {});

  for (const template of pathTemplates) {
    if (!modifierKeys.includes(template)) {
      errors.push({
        message: `Path template {${template}} not found in modifiers`,
        path: `${basePath}.output.path`,
        severity: "error",
      });
    }
  }
}

/**
 * Extract template variables from a path string
 */
export function extractPathTemplates(path: string): string[] {
  const templateRegex = /\{([^}]{1,100})\}/g;
  const templates: string[] = [];

  for (const match of path.matchAll(templateRegex)) {
    if (match[1]) {
      templates.push(match[1]);
    }
  }

  return templates;
}

/**
 * Resolve path templates with modifier values
 */
export function resolvePathTemplates(
  path: string,
  modifiers: Record<string, string | string[]>,
): string {
  return path.replace(/\{([^}]{1,100})\}/g, (match, key) => {
    const value = modifiers[key];
    if (Array.isArray(value)) {
      return value.join("-");
    }
    return String(value || match);
  });
}
