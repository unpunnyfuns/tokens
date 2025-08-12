/**
 * Main bundling functionality for design tokens
 * Handles manifest loading, file merging, and output formatting
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { resolveReferences } from "../core/resolver.ts";
import { mergeTokens } from "./bundler-core.ts";
import { convertToDTCG } from "./dtcg-exporter.ts";
import {
  checkForExternalReferences,
  resolveExternalReferences,
} from "./external-resolver.ts";

/**
 * Strategy for handling references during bundling.
 */
interface ReferenceStrategy {
  /** Whether to preserve external file references */
  preserveExternal?: boolean;
  /** Whether to convert internal references to DTCG format */
  convertInternal?: boolean;
  /** Whether to warn when converting references */
  warnOnConversion?: boolean;
}

/**
 * Options for bundling tokens from a manifest.
 */
export interface BundleOptions {
  /** Path to the manifest.json file */
  manifest: string;
  /** Theme modifier to apply (e.g., "dark", "light") */
  theme?: string;
  /** Mode modifier to apply (e.g., "compact", "comfortable") */
  mode?: string;
  /** Whether to resolve all references to their actual values */
  resolveValues?: boolean;
  /** Output format: "dtcg" (aliases), "json-schema" ($ref), or "preserve" */
  format?: "dtcg" | "json-schema" | "preserve";
  /** Strategy for handling references */
  referenceStrategy?: ReferenceStrategy;
  /** Custom modifiers (key-value pairs for additional manifest modifiers) */
  [key: string]: unknown;
}

/**
 * Structure of a resolver manifest file.
 */
interface Manifest {
  /** Base token sets to load */
  sets?: Array<{
    values: string[];
  }>;
  /** Modifiers that can be applied */
  modifiers?: Array<{
    name: string;
    values: Modifier[];
  }>;
}

/**
 * Modifier value in manifest
 */
interface Modifier {
  name: string;
  values: string[];
}

/**
 * Main bundle function that creates a design token bundle from a manifest
 * @param options - Bundle configuration options
 * @returns Promise resolving to bundled tokens
 * @example
 * const tokens = await bundle({
 *   manifest: "./resolver.manifest.json",
 *   theme: "dark",
 *   mode: "compact",
 *   resolveValues: true,
 *   format: "dtcg"
 * })
 */
export async function bundle(
  options: BundleOptions,
): Promise<Record<string, unknown>> {
  const {
    manifest: manifestPath,
    theme,
    mode,
    resolveValues = false,
    format = "dtcg",
  } = options;

  // Load manifest
  const manifestContent = await readFile(manifestPath, "utf-8");
  const manifest: Manifest = JSON.parse(manifestContent);
  const manifestDir = dirname(manifestPath);

  // Initialize token collection
  let tokens: Record<string, unknown> = {};

  // Load base sets
  if (manifest.sets) {
    for (const set of manifest.sets) {
      for (const file of set.values) {
        const filePath = resolve(manifestDir, file);
        const content = await loadTokenFile(filePath);
        tokens = mergeTokens(tokens, content);
      }
    }
  }

  // Apply modifiers
  if (manifest.modifiers) {
    for (const modifier of manifest.modifiers) {
      let modifierTokens: Record<string, unknown> | null = null;

      // Handle theme modifier
      if (modifier.name === "theme" && theme) {
        const themeModifier = modifier.values.find(
          (v: Modifier) => v.name === theme,
        );
        if (themeModifier) {
          modifierTokens = await loadModifierTokens(themeModifier, manifestDir);
        }
      }

      // Handle mode modifier
      if (modifier.name === "mode" && mode) {
        const modeModifier = modifier.values.find(
          (v: Modifier) => v.name === mode,
        );
        if (modeModifier) {
          modifierTokens = await loadModifierTokens(modeModifier, manifestDir);
        }
      }

      // Handle custom modifiers
      if (
        modifier.name !== "theme" &&
        modifier.name !== "mode" &&
        options[modifier.name]
      ) {
        const customModifier = modifier.values.find(
          (v: Modifier) => v.name === (options[modifier.name] as string),
        );
        if (customModifier) {
          modifierTokens = await loadModifierTokens(
            customModifier,
            manifestDir,
          );
        }
      }

      if (modifierTokens) {
        tokens = mergeTokens(tokens, modifierTokens);
      }
    }
  }

  // First, resolve all external references during merging
  tokens = await resolveExternalReferences(tokens, manifestDir);

  // Resolve values if requested
  if (resolveValues) {
    tokens = await resolveReferences(tokens, {
      basePath: manifestDir,
      mode: true,
      strict: false,
    });
  }

  // Apply output format
  if (format === "dtcg") {
    // Check for remaining external references
    const externalCheck = checkForExternalReferences(tokens);
    if (externalCheck.hasExternal) {
      console.warn(
        "Warning: External references found, some may not convert properly to DTCG format:",
        externalCheck.externalRefs,
      );
    }

    tokens = convertToDTCG(tokens);
  }

  return tokens;
}

/**
 * Loads a single token file and removes the $schema property.
 * @param filePath - Absolute path to the token file
 * @returns Token data without $schema property
 * @private
 */
async function loadTokenFile(
  filePath: string,
): Promise<Record<string, unknown>> {
  const content = await readFile(filePath, "utf-8");
  const data = JSON.parse(content);
  // Remove $schema property to avoid conflicts during merging
  const { $schema, ...tokens } = data;
  return tokens;
}

/**
 * Loads and merges all token files for a modifier value.
 * @param modifier - Modifier value with its token files
 * @param baseDir - Base directory for resolving relative paths
 * @returns Merged tokens from all modifier files
 * @private
 */
async function loadModifierTokens(
  modifier: Modifier,
  baseDir: string,
): Promise<Record<string, unknown>> {
  let tokens: Record<string, unknown> = {};
  for (const file of modifier.values) {
    const filePath = resolve(baseDir, file);
    const content = await loadTokenFile(filePath);
    tokens = mergeTokens(tokens, content);
  }
  return tokens;
}
