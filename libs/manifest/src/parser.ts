/**
 * UPFT manifest parsing and loading - moved from @upft/ast
 */

import type { ManifestAST, ModifierAST, PermutationAST } from "@upft/ast";
import type { TokenDocument } from "@upft/foundation";

import { parseManifestWithRegistry } from "./registry.js";

/**
 * Parse a manifest object into ManifestAST using the registry system
 * This function now delegates to the registry for pluggable manifest support
 */
export function parseManifest(
  manifest: unknown,
  manifestPath: string = "manifest.json",
): ManifestAST {
  return parseManifestWithRegistry(manifest, manifestPath);
}

/**
 * Generate unique ID for a permutation
 */
export function generatePermutationId(
  input: Record<string, string | string[]>,
): string {
  const parts: string[] = [];

  for (const [name, value] of Object.entries(input)) {
    if (name === "output") continue;
    if (value === null) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        parts.push(`${name}-${value.join("+")}`);
      }
    } else if (value && typeof value === "string") {
      parts.push(`${name}-${value}`);
    }
  }

  return parts.join("_") || "default";
}

/**
 * Resolve files for a permutation based on manifest structure
 */
export function resolvePermutationFiles(
  manifestAST: ManifestAST,
  permutation: PermutationAST,
): string[] {
  const files: string[] = [];

  addBaseSetFiles(manifestAST, files);
  addModifierFiles(manifestAST, permutation, files);

  return [...new Set(files)]; // Remove duplicates
}

function addBaseSetFiles(manifestAST: ManifestAST, files: string[]): void {
  for (const set of manifestAST.sets.values()) {
    files.push(...set.files);
  }
}

function addModifierFiles(
  manifestAST: ManifestAST,
  permutation: PermutationAST,
  files: string[],
): void {
  for (const [modifierName, value] of Object.entries(permutation.input)) {
    const modifier = manifestAST.modifiers.get(modifierName);
    if (!modifier) continue;

    if (Array.isArray(value)) {
      addAnyOfModifierFiles(modifier, value, files);
    } else if (typeof value === "string") {
      addOneOfModifierFiles(modifier, value, files);
    }
  }
}

function addAnyOfModifierFiles(
  modifier: ModifierAST,
  values: string[],
  files: string[],
): void {
  for (const option of values) {
    const optionFiles = modifier.values.get(option);
    if (optionFiles) {
      files.push(...optionFiles);
    }
  }
}

function addOneOfModifierFiles(
  modifier: ModifierAST,
  value: string,
  files: string[],
): void {
  const optionFiles = modifier.values.get(value);
  if (optionFiles) {
    files.push(...optionFiles);
  }
}

/**
 * Update permutation with resolved files and tokens
 */
export function updatePermutationAST(
  permutation: PermutationAST,
  files: string[],
  tokens: TokenDocument,
  resolvedTokens?: TokenDocument,
): void {
  permutation.resolvedFiles = files;
  permutation.tokens = tokens;
  if (resolvedTokens) {
    permutation.resolvedTokens = resolvedTokens;
  }
}
