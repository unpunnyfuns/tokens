/**
 * Pure functions for collecting and loading token files
 * Extracted from UPFTResolver class for functional composition
 */

import { merge } from "../core/merge.js";
import type { TokenFileReader } from "../io/file-reader.js";
import type { TokenDocument } from "../types.js";
import type {
  AnyOfModifier,
  OneOfModifier,
  ResolutionInput,
  UPFTResolverManifest,
} from "./upft-types.js";
import { isAnyOfModifier, isOneOfModifier } from "./upft-types.js";

/**
 * Get all file paths for a given input
 */
export async function collectFiles(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
  _fileReader: TokenFileReader,
): Promise<string[]> {
  const files: string[] = [];

  // Add base sets
  const baseFiles = collectBaseSetFiles(manifest);
  files.push(...baseFiles);

  // Add modifier files
  const modifierFiles = collectModifierFiles(manifest, input);
  files.push(...modifierFiles);

  return files;
}

/**
 * Collect files from base sets
 */
export function collectBaseSetFiles(manifest: UPFTResolverManifest): string[] {
  const files: string[] = [];

  for (const set of manifest.sets) {
    files.push(...set.values);
  }

  return files;
}

/**
 * Collect files from selected modifiers
 */
export function collectModifierFiles(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
): string[] {
  const files: string[] = [];

  for (const [modifierName, modifierDef] of Object.entries(
    manifest.modifiers,
  )) {
    const inputValue = input[modifierName];

    if (isOneOfModifier(modifierDef)) {
      const oneOfFiles = collectOneOfFiles(modifierDef, inputValue as string);
      files.push(...oneOfFiles);
    } else if (isAnyOfModifier(modifierDef)) {
      const anyOfFiles = collectAnyOfFiles(modifierDef, inputValue as string[]);
      files.push(...anyOfFiles);
    }
  }

  return files;
}

/**
 * Collect files for oneOf modifier
 */
export function collectOneOfFiles(
  modifierDef: OneOfModifier & { values: Record<string, string[]> },
  inputValue: string | undefined,
): string[] {
  const files: string[] = [];
  const selected = inputValue ?? modifierDef.oneOf[0];

  if (selected && modifierDef.values[selected]) {
    files.push(...modifierDef.values[selected]);
  }

  return files;
}

/**
 * Collect files for anyOf modifier
 */
export function collectAnyOfFiles(
  modifierDef: AnyOfModifier & { values: Record<string, string[]> },
  inputValue: string[] | undefined,
): string[] {
  const files: string[] = [];
  const selected = inputValue ?? [];

  for (const value of selected) {
    if (modifierDef.values[value]) {
      files.push(...modifierDef.values[value]);
    }
  }

  return files;
}

/**
 * Load and merge all files using DTCG-aware merge
 */
export async function loadAndMergeFiles(
  files: string[],
  fileReader: TokenFileReader,
): Promise<TokenDocument> {
  let tokens: TokenDocument = {};

  for (const file of files) {
    const tokenFile = await fileReader.readFile(file);
    tokens = merge(tokens, tokenFile.tokens);
  }

  return tokens;
}
