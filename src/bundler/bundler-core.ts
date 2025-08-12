/**
 * Core bundler logic separated from I/O concerns
 * This makes the bundler testable without filesystem dependencies
 */

import { resolveReferences } from "../core/resolver.ts";
import { convertToDTCG } from "./dtcg-exporter.ts";
import type { Manifest } from "./token-loader.ts";

export interface BundlerConfig {
  theme?: string;
  mode?: string;
  resolveValues?: boolean;
  format?: "dtcg" | "json-schema" | "preserve";
}

export interface TokenSource {
  getManifest(): Promise<Manifest>;
  getTokensForFiles(files: string[]): Promise<Record<string, unknown>>;
}

/**
 * Get files to load based on manifest and config
 */
export function selectFilesFromManifest(
  manifest: Manifest,
  config: BundlerConfig,
): string[] {
  const files: string[] = [];

  // Add base set files
  if (manifest.sets) {
    for (const set of manifest.sets) {
      files.push(...set.values);
    }
  }

  // Add modifier files based on config
  if (manifest.modifiers) {
    for (const modifier of manifest.modifiers) {
      const value = config[modifier.name as keyof BundlerConfig];

      if (typeof value === "string") {
        const valueSet = modifier.values.find((v) => v.name === value);
        if (valueSet) {
          files.push(...valueSet.values);
        }
      }
    }
  }

  return files;
}

/**
 * Apply transformations to tokens based on config
 */
export async function transformTokens(
  tokens: Record<string, unknown>,
  config: BundlerConfig,
): Promise<Record<string, unknown>> {
  let result = { ...tokens };

  // Resolve references if requested
  if (config.resolveValues) {
    result = await resolveReferences(result, {
      mode: config.mode === "external-only" ? "external-only" : true,
      strict: false,
    });
  }

  // Convert format if requested
  if (config.format === "dtcg") {
    result = convertToDTCG(result);
  }

  return result;
}

/**
 * Core bundler that works with abstract token source
 */
export class Bundler {
  private source: TokenSource;

  constructor(source: TokenSource) {
    this.source = source;
  }

  async bundle(config: BundlerConfig = {}): Promise<Record<string, unknown>> {
    // Get manifest
    const manifest = await this.source.getManifest();

    // Select files based on config
    const files = selectFilesFromManifest(manifest, config);

    // Load tokens from selected files
    const tokens = await this.source.getTokensForFiles(files);

    // Apply transformations
    return await transformTokens(tokens, config);
  }
}

/**
 * Merge token objects, with later values overwriting earlier ones
 */
export function mergeTokens(
  ...tokenSets: Record<string, unknown>[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const tokens of tokenSets) {
    deepMerge(result, tokens);
  }

  return result;
}

/**
 * Deep merge objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // If source value is a token (has $value), replace entirely
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      "$value" in sourceValue
    ) {
      target[key] = sourceValue;
    }
    // If both are objects (but not tokens), merge recursively
    else if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue) &&
      !("$value" in targetValue)
    ) {
      deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    }
    // Otherwise, replace the value
    else {
      target[key] = sourceValue;
    }
  }
}
