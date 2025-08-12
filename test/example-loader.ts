/**
 * @module test/example-loader
 * @description Helper utilities for loading real example files in tests.
 * Provides easy access to DTCG example tokens from the examples directory.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Get the path to the examples directory.
 */
function getExamplesPath(): string {
  return join(process.cwd(), "examples");
}

/**
 * Load a JSON example file.
 * @param relativePath - Path relative to the examples directory
 * @returns Parsed JSON content
 * @example
 * const colors = loadExample("tokens/primitives/colors.json")
 * const dimensions = loadExample("tokens/primitives/dimensions.json")
 */
export function loadExample(relativePath: string): unknown {
  const fullPath = join(getExamplesPath(), relativePath);
  const content = readFileSync(fullPath, "utf-8");
  const data = JSON.parse(content);
  // Remove $schema to avoid conflicts
  const { $schema, ...tokens } = data;
  return tokens;
}

/**
 * Load multiple example files and merge them.
 * @param relativePaths - Array of paths relative to the examples directory
 * @returns Merged token object
 * @example
 * const tokens = loadAndMergeExamples([
 *   "tokens/primitives/colors.json",
 *   "tokens/primitives/dimensions.json"
 * ])
 */
export function loadAndMergeExamples(
  relativePaths: string[],
): Record<string, unknown> {
  let merged: Record<string, unknown> = {};

  for (const path of relativePaths) {
    const tokens = loadExample(path) as Record<string, unknown>;
    merged = mergeDeep(merged, tokens);
  }

  return merged;
}

/**
 * Get a specific token from an example file.
 * @param relativePath - Path to the example file
 * @param tokenPath - Dot-separated path to the token (e.g., "colors.blue.500")
 * @returns The token value or undefined if not found
 * @example
 * const blueToken = getExampleToken("tokens/primitives/colors.json", "colors.blue.500")
 */
export function getExampleToken(
  relativePath: string,
  tokenPath: string,
): unknown {
  const tokens = loadExample(relativePath) as Record<string, unknown>;
  const segments = tokenPath.split(".");

  let current: unknown = tokens;
  for (const segment of segments) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Deep merge helper for combining token objects.
 * @private
 */
function mergeDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue) &&
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = mergeDeep(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * List of available example files for reference.
 */
export const AVAILABLE_EXAMPLES = {
  primitives: {
    colors: "tokens/primitives/colors.json",
    dimensions: "tokens/primitives/dimensions.json",
    typography: "tokens/primitives/typography.json",
    borders: "tokens/primitives/borders.json",
    shadows: "tokens/primitives/shadows.json",
  },
  semantic: {
    light: "tokens/semantic/light.json",
    dark: "tokens/semantic/dark.json",
  },
  common: {
    tree: "common/tree.json",
  },
} as const;
