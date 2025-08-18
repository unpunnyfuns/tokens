/**
 * Pure functions for filtering sets and modifiers
 * Extracted from UPFTResolver class for functional composition
 */

import type { TokenFileReader } from "../filesystem/file-reader.js";
import type {
  UPFTResolverManifest,
  ResolutionInput,
  GenerateSpec,
  OneOfModifier,
  AnyOfModifier,
} from "./upft-types.js";
import { isAnyOfModifier, isOneOfModifier } from "./upft-types.js";

/**
 * Check if a set should be included based on filtering rules
 */
export function shouldIncludeSet(setName: string, spec: GenerateSpec): boolean {
  const { includeSets, excludeSets } = spec;

  // If exclude list specified and set is in it, exclude
  if (excludeSets?.includes(setName) || excludeSets?.includes("*")) {
    return false;
  }

  // If include list specified, only include if set is in it
  if (includeSets) {
    return includeSets.includes(setName) || includeSets.includes("*");
  }

  // Default: include if not explicitly excluded
  return true;
}

/**
 * Check if a modifier should be included based on filtering rules
 */
export function shouldIncludeModifier(
  modifierName: string,
  spec: GenerateSpec,
): boolean {
  const { includeModifiers, excludeModifiers } = spec;

  // Check exclude rules first (they take precedence)
  if (excludeModifiers) {
    for (const excludeSpec of excludeModifiers) {
      const [excludeModifier] = excludeSpec.split(":");
      if (excludeModifier === modifierName || excludeSpec === "*") {
        return false;
      }
    }
  }

  // Check include rules
  if (includeModifiers) {
    for (const includeSpec of includeModifiers) {
      const [includeModifier] = includeSpec.split(":");
      if (includeModifier === modifierName || includeSpec === "*") {
        return true;
      }
    }
    return false; // If include list specified but modifier not in it
  }

  // Default: include if not explicitly excluded
  return true;
}

/**
 * Get files for input with filtering applied
 */
export async function filterFiles(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
  spec: GenerateSpec,
  _fileReader: TokenFileReader,
): Promise<string[]> {
  const files: string[] = [];

  // Add filtered base sets
  addFilteredBaseSetFiles(manifest, spec, files);

  // Add filtered modifier files
  addFilteredModifierFiles(manifest, input, spec, files);

  return files;
}

/**
 * Add files from base sets with filtering
 */
function addFilteredBaseSetFiles(
  manifest: UPFTResolverManifest,
  spec: GenerateSpec,
  files: string[],
): void {
  for (const set of manifest.sets) {
    const setName = set.name;

    // Skip if no name (can't filter unnamed sets)
    if (!setName) {
      // If no filtering specified, include unnamed sets
      if (!(spec.includeSets || spec.excludeSets)) {
        files.push(...set.values);
      }
      continue;
    }

    // Apply include/exclude logic
    if (shouldIncludeSet(setName, spec)) {
      files.push(...set.values);
    }
  }
}

/**
 * Add files from modifiers with filtering
 */
function addFilteredModifierFiles(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
  spec: GenerateSpec,
  files: string[],
): void {
  for (const [modifierName, modifierDef] of Object.entries(
    manifest.modifiers,
  )) {
    // Check if this modifier should be included
    if (!shouldIncludeModifier(modifierName, spec)) continue;

    const inputValue = input[modifierName];

    if (isOneOfModifier(modifierDef)) {
      addOneOfFiles(modifierDef, inputValue as string, files);
    } else if (isAnyOfModifier(modifierDef)) {
      addAnyOfFiles(modifierDef, inputValue as string[] | undefined, files);
    }
  }
}

/**
 * Add files for oneOf modifier
 */
function addOneOfFiles(
  modifierDef: OneOfModifier & { values: Record<string, string[]> },
  inputValue: string | undefined,
  files: string[],
): void {
  const selected = inputValue ?? modifierDef.oneOf[0];
  if (selected && modifierDef.values[selected]) {
    files.push(...modifierDef.values[selected]);
  }
}

/**
 * Add files for anyOf modifier
 */
function addAnyOfFiles(
  modifierDef: AnyOfModifier & { values: Record<string, string[]> },
  inputValue: string[] | undefined,
  files: string[],
): void {
  const selected = inputValue ?? [];
  for (const value of selected) {
    if (modifierDef.values[value]) {
      files.push(...modifierDef.values[value]);
    }
  }
}
