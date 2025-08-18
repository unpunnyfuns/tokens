/**
 * Info command implementation
 */

import type { UPFTResolverManifest } from "../../manifest/upft-types.js";

export interface ManifestInfo {
  name?: string;
  description?: string;
  sets: Array<{
    name?: string;
    fileCount: number;
  }>;
  modifiers: Array<{
    name: string;
    type: "oneOf" | "anyOf";
    options: string[];
  }>;
  possiblePermutations: number;
  generateCount?: number;
}

/**
 * Get information about a manifest
 */
export async function getManifestInfo(
  manifest: UPFTResolverManifest,
): Promise<ManifestInfo> {
  const modifierInfo = extractModifiers(manifest);

  return {
    ...(manifest.name && { name: manifest.name }),
    ...(manifest.description && { description: manifest.description }),
    sets: extractSets(manifest),
    modifiers: modifierInfo.modifiers,
    possiblePermutations: modifierInfo.permutations,
    ...(manifest.generate?.length && {
      generateCount: manifest.generate.length,
    }),
  };
}

function extractSets(manifest: UPFTResolverManifest): ManifestInfo["sets"] {
  if (!manifest.sets) return [];

  if (Array.isArray(manifest.sets)) {
    return manifest.sets.map((set) => ({
      ...(set.name && { name: set.name }),
      fileCount: set.values?.length || 0,
    }));
  }

  // Handle object format for sets (if supported)
  return Object.entries(manifest.sets).map(([name, values]) => ({
    name,
    fileCount: Array.isArray(values) ? values.length : 1,
  }));
}

function extractModifiers(manifest: UPFTResolverManifest): {
  modifiers: ManifestInfo["modifiers"];
  permutations: number;
} {
  const modifiers: ManifestInfo["modifiers"] = [];
  let permutations = 1;

  if (!manifest.modifiers) {
    return { modifiers, permutations };
  }

  for (const [name, modifier] of Object.entries(manifest.modifiers)) {
    if (typeof modifier !== "object" || modifier === null) continue;

    if ("oneOf" in modifier && Array.isArray(modifier.oneOf)) {
      modifiers.push({
        name,
        type: "oneOf",
        options: modifier.oneOf,
      });
      permutations *= modifier.oneOf.length;
    } else if ("anyOf" in modifier && Array.isArray(modifier.anyOf)) {
      modifiers.push({
        name,
        type: "anyOf",
        options: modifier.anyOf,
      });
      // anyOf creates 2^n permutations (all subsets including empty)
      permutations *= 2 ** modifier.anyOf.length;
    }
  }

  return { modifiers, permutations };
}
