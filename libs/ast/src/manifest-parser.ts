/**
 * Convert UPFT manifests into AST structures for holistic analysis
 */

import type { TokenDocument } from "@upft/foundation";
import type {
  ManifestAST,
  ModifierAST,
  PermutationAST,
  TokenSetAST,
} from "./types.js";

/**
 * Parse a manifest object into a ManifestAST
 */
export function parseManifestAST(
  manifest: unknown,
  manifestPath = "manifest.json",
): ManifestAST | null {
  if (!isValidManifestInput(manifest)) {
    return null;
  }

  const obj = manifest as Record<string, unknown>;

  const manifestAST = createBaseManifestAST(obj, manifestPath);
  parseSetsIntoAST(obj, manifestAST, manifestPath);
  parseModifiersIntoAST(obj, manifestAST);

  return manifestAST;
}

/**
 * Validate manifest input
 */
function isValidManifestInput(manifest: unknown): boolean {
  return !!(
    manifest &&
    typeof manifest === "object" &&
    (manifest as Record<string, unknown>).sets &&
    Array.isArray((manifest as Record<string, unknown>).sets)
  );
}

/**
 * Create base manifest AST structure
 */
function createBaseManifestAST(
  obj: Record<string, unknown>,
  manifestPath: string,
): ManifestAST {
  return {
    type: "manifest",
    path: manifestPath,
    name: typeof obj.name === "string" ? obj.name : "Unknown Manifest",
    manifestType: "upft", // Default to UPFT format
    sets: new Map(),
    modifiers: new Map(),
    permutations: new Map(),
  };
}

/**
 * Parse sets into AST
 */
function parseSetsIntoAST(
  obj: Record<string, unknown>,
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  const sets = obj.sets as Array<unknown>;
  for (let i = 0; i < sets.length; i++) {
    const setData = sets[i];
    if (setData && typeof setData === "object") {
      const setAST = parseSetData(setData, i, manifestPath);
      if (setAST) {
        manifestAST.sets.set(setAST.name, setAST);
      }
    }
  }
}

/**
 * Parse individual set data
 */
function parseSetData(
  setData: unknown,
  index: number,
  manifestPath: string,
): TokenSetAST | null {
  const set = setData as Record<string, unknown>;
  const setName = typeof set.name === "string" ? set.name : `set-${index}`;
  const files = Array.isArray(set.files)
    ? set.files.filter((f) => typeof f === "string")
    : [];

  return {
    name: setName,
    path: `${manifestPath}#${setName}`,
    files: files as string[],
    metadata: extractSetMetadata(set),
  } as TokenSetAST;
}

/**
 * Parse modifiers into AST
 */
function parseModifiersIntoAST(
  obj: Record<string, unknown>,
  manifestAST: ManifestAST,
): void {
  if (obj.modifiers && typeof obj.modifiers === "object") {
    const modifiers = obj.modifiers as Record<string, unknown>;
    for (const [modifierName, modifierData] of Object.entries(modifiers)) {
      if (modifierData && typeof modifierData === "object") {
        const modifier = parseModifier(
          modifierName,
          modifierData as Record<string, unknown>,
        );
        if (modifier) {
          manifestAST.modifiers.set(modifierName, modifier);
        }
      }
    }
  }
}

/**
 * Parse a modifier configuration into ModifierAST
 */
function parseModifier(
  name: string,
  data: Record<string, unknown>,
): ModifierAST | null {
  if (Array.isArray(data.oneOf)) {
    return parseOneOfModifier(name, data);
  }

  if (Array.isArray(data.anyOf)) {
    return parseAnyOfModifier(name, data);
  }

  return null;
}

/**
 * Parse oneOf modifier
 */
function parseOneOfModifier(
  name: string,
  data: Record<string, unknown>,
): ModifierAST {
  const options = (data.oneOf as unknown[]).filter(
    (opt: unknown) => typeof opt === "string",
  ) as string[];
  const values = parseModifierValues(data);

  return createModifierAST(name, "oneOf", options, values, data);
}

/**
 * Parse anyOf modifier
 */
function parseAnyOfModifier(
  name: string,
  data: Record<string, unknown>,
): ModifierAST {
  const options = (data.anyOf as unknown[]).filter(
    (opt: unknown) => typeof opt === "string",
  ) as string[];
  const values = parseModifierValues(data);

  return createModifierAST(name, "anyOf", options, values, data);
}

/**
 * Parse modifier values from data
 */
function parseModifierValues(
  data: Record<string, unknown>,
): Map<string, string[]> {
  const values = new Map<string, string[]>();

  if (data.values && typeof data.values === "object") {
    const valuesObj = data.values as Record<string, unknown>;
    for (const [option, fileList] of Object.entries(valuesObj)) {
      if (Array.isArray(fileList)) {
        const files = fileList.filter((f) => typeof f === "string") as string[];
        values.set(option, files);
      }
    }
  }

  return values;
}

/**
 * Create modifier AST object
 */
function createModifierAST(
  name: string,
  constraintType: "oneOf" | "anyOf",
  options: string[],
  values: Map<string, string[]>,
  data: Record<string, unknown>,
): ModifierAST {
  return {
    name,
    path: `manifest#${name}`,
    constraintType,
    options,
    values,
    metadata: extractModifierMetadata(data),
  } as ModifierAST;
}

/**
 * Extract metadata from set configuration
 */
function extractSetMetadata(
  set: Record<string, unknown>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  // Copy known metadata fields
  if (typeof set.description === "string") {
    metadata.description = set.description;
  }
  if (typeof set.namespace === "string") {
    metadata.namespace = set.namespace;
  }

  // Copy any other fields that aren't core properties
  for (const [key, value] of Object.entries(set)) {
    if (!["name", "files"].includes(key)) {
      metadata[key] = value;
    }
  }

  return metadata;
}

/**
 * Extract metadata from modifier configuration
 */
function extractModifierMetadata(
  modifier: Record<string, unknown>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  // Copy any fields that aren't core constraint properties
  for (const [key, value] of Object.entries(modifier)) {
    if (!["oneOf", "anyOf", "values"].includes(key)) {
      metadata[key] = value;
    }
  }

  return metadata;
}

/**
 * Generate unique ID for a permutation
 */
export function generatePermutationId(
  input: Record<string, string | string[]>,
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      parts.push(`${key}-${value}`);
    } else if (Array.isArray(value)) {
      parts.push(`${key}-${value.join(",")}`);
    }
  }

  return parts.sort().join("&");
}

/**
 * Resolve files for a permutation based on manifest structure
 */
export function resolvePermutationFiles(
  manifestAST: ManifestAST,
  permutation: PermutationAST,
): string[] {
  const files = new Set<string>();

  // Add all base set files
  for (const set of manifestAST.sets.values()) {
    for (const file of set.files) {
      files.add(file);
    }
  }

  // Add files from matching modifiers
  for (const [modifierName, modifierValue] of Object.entries(
    permutation.input,
  )) {
    const modifier = manifestAST.modifiers.get(modifierName);
    if (!modifier) continue;

    const value =
      typeof modifierValue === "string" ? modifierValue : modifierValue[0];
    if (!value) continue;

    // Get files for this modifier value
    const modifierFiles =
      modifier.values.get(value) || modifier.values.get("*") || [];
    for (const file of modifierFiles) {
      files.add(file);
    }
  }

  return Array.from(files);
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
  permutation.resolvedFiles = [...files];
  permutation.tokens = tokens;

  if (resolvedTokens) {
    permutation.metadata = {
      ...permutation.metadata,
      resolvedTokens,
    };
  }
}
