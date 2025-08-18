/**
 * Pure functions for generating permutations and expansions
 * Extracted from UPFTResolver class for functional composition
 */

import type {
  GenerateSpec,
  ResolutionInput,
  UPFTResolverManifest,
} from "./upft-types.js";
import { isAnyOfModifier, isOneOfModifier } from "./upft-types.js";

/**
 * Expand wildcard in generate spec
 */
export function expandGenerateSpec(
  manifest: UPFTResolverManifest,
  spec: GenerateSpec,
): ResolutionInput {
  const expanded: ResolutionInput = {};

  // Process spec entries
  processSpecEntries(manifest, spec, expanded);

  // Process includeModifiers with specific values
  processIncludeModifiersWithValues(spec, expanded);

  return expanded;
}

/**
 * Process spec entries and add to expanded result
 */
function processSpecEntries(
  manifest: UPFTResolverManifest,
  spec: GenerateSpec,
  expanded: ResolutionInput,
): void {
  const skipKeys = new Set([
    "output",
    "includeSets",
    "excludeSets",
    "includeModifiers",
    "excludeModifiers",
  ]);

  for (const [modifierName, value] of Object.entries(spec)) {
    if (skipKeys.has(modifierName)) continue;

    const modifierDef = manifest.modifiers[modifierName];
    if (!modifierDef) continue;

    if (value === "*" && isAnyOfModifier(modifierDef)) {
      expanded[modifierName] = modifierDef.anyOf;
    } else {
      expanded[modifierName] = value;
    }
  }
}

/**
 * Process includeModifiers with specific values
 */
function processIncludeModifiersWithValues(
  spec: GenerateSpec,
  expanded: ResolutionInput,
): void {
  if (!spec.includeModifiers) return;

  for (const includeSpec of spec.includeModifiers) {
    if (includeSpec.includes(":")) {
      const [modifierName, specificValue] = includeSpec.split(":");
      if (modifierName && specificValue) {
        expanded[modifierName] = specificValue;
      }
    }
  }
}

/**
 * Generate all possible permutations (for when generate is not specified)
 */
export function generateAllPermutations(
  manifest: UPFTResolverManifest,
): ResolutionInput[] {
  const modifierOptions: Array<[string, string[] | string[][]]> = [];

  for (const [name, def] of Object.entries(manifest.modifiers)) {
    if (isOneOfModifier(def)) {
      // Each option is a single choice
      modifierOptions.push([name, def.oneOf]);
    } else if (isAnyOfModifier(def)) {
      // Generate all subsets (power set)
      const subsets = getPowerSet(def.anyOf);
      modifierOptions.push([name, subsets]);
    }
  }

  return cartesianProduct(modifierOptions);
}

/**
 * Get power set (all subsets) of an array
 */
export function getPowerSet(arr: string[]): string[][] {
  const result: string[][] = [[]];
  for (const item of arr) {
    const newSubsets = result.map((subset) => [...subset, item]);
    result.push(...newSubsets);
  }
  return result;
}

/**
 * Calculate cartesian product
 */
export function cartesianProduct(
  options: Array<[string, string[] | string[][]]>,
): ResolutionInput[] {
  if (options.length === 0) return [{}];

  const [first, ...rest] = options;
  if (!first) return [{}];
  const [name, values] = first;
  const restProduct = cartesianProduct(rest);

  const result: ResolutionInput[] = [];
  for (const value of values) {
    for (const restPerm of restProduct) {
      result.push({
        [name]: value,
        ...restPerm,
      });
    }
  }

  return result;
}

/**
 * Generate all combinations of expanding modifier values
 */
export function generateModifierCombinations(
  manifest: UPFTResolverManifest,
  expandingModifiers: string[],
): Array<Record<string, string>> {
  if (expandingModifiers.length === 0) return [{}];

  const [first, ...rest] = expandingModifiers;
  if (!first) return [{}];

  const firstModifier = manifest.modifiers[first];

  if (!(firstModifier && "oneOf" in firstModifier)) return [{}];

  const restCombinations = generateModifierCombinations(manifest, rest);
  const combinations: Array<Record<string, string>> = [];

  for (const value of firstModifier.oneOf) {
    for (const restCombination of restCombinations) {
      combinations.push({ [first]: value, ...restCombination });
    }
  }

  return combinations;
}

/**
 * Expand generate spec to handle filtering and multi-file generation
 */
export function expandSpecWithFiltering(
  manifest: UPFTResolverManifest,
  spec: GenerateSpec,
): Array<{ spec: GenerateSpec; output: string }> {
  // Check if this spec requires multi-file generation
  const expandingModifiers = getExpandingModifiers(manifest, spec);

  if (expandingModifiers.length === 0) {
    // No expansion needed, return single spec
    return [
      {
        spec: applyFiltering(manifest, spec),
        output: generateOutputName(spec, {}),
      },
    ];
  }

  // Generate cartesian product of all expanding modifiers
  const combinations = generateModifierCombinations(
    manifest,
    expandingModifiers,
  );

  return combinations.map((combination) => {
    const expandedSpec = createExpandedSpec(spec, combination);
    const filteredSpec = applyFiltering(manifest, expandedSpec);
    const output = generateOutputName(spec, combination);

    return { spec: filteredSpec, output };
  });
}

/**
 * Get modifiers that need expansion (includeModifiers without specific values)
 */
function getExpandingModifiers(
  manifest: UPFTResolverManifest,
  spec: GenerateSpec,
): string[] {
  if (!spec.includeModifiers) return [];

  return spec.includeModifiers.filter((modSpec) => {
    // If it contains ":", it's specific and doesn't need expansion
    if (modSpec.includes(":")) return false;

    // If a specific value is already provided in the spec, don't expand
    if (spec[modSpec] && typeof spec[modSpec] === "string") return false;

    // Check if this modifier exists and is oneOf (needs expansion)
    const modifierDef = manifest.modifiers[modSpec];
    return modifierDef && "oneOf" in modifierDef;
  });
}

/**
 * Create expanded spec with specific modifier values
 */
function createExpandedSpec(
  originalSpec: GenerateSpec,
  combination: Record<string, string>,
): GenerateSpec {
  const expanded = { ...originalSpec };

  // Add specific modifier values from combination
  for (const [modifier, value] of Object.entries(combination)) {
    expanded[modifier] = value;
  }

  return expanded;
}

/**
 * Apply filtering to spec by modifying which sets/modifiers are included
 */
function applyFiltering(
  _manifest: UPFTResolverManifest,
  spec: GenerateSpec,
): GenerateSpec {
  // For now, filtering is handled by creating a custom file collection method
  // The actual filtering happens in getFilesForInputWithFiltering
  return spec;
}

/**
 * Generate output filename based on modifier combination
 */
function generateOutputName(
  spec: GenerateSpec,
  combination: Record<string, string>,
): string {
  const baseName = spec.output || "output";

  // Remove extension and add modifier suffixes
  const nameWithoutExt = baseName.replace(/\.[^/.]+$/, "");

  if (Object.keys(combination).length === 0) {
    return `${nameWithoutExt}.json`;
  }

  const suffixes = Object.values(combination).join("-");
  return `${nameWithoutExt}-${suffixes}.json`;
}
