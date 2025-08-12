/**
 * Token loader - responsible for loading token files
 * Separated from bundling logic for better testability
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface TokenLoader {
  loadJson(path: string): Promise<unknown>;
}

export class FileSystemTokenLoader implements TokenLoader {
  async loadJson(path: string): Promise<unknown> {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  }
}

export interface ManifestSet {
  values: string[];
}

export interface ManifestModifier {
  name: string;
  values: Array<{
    name: string;
    values: string[];
  }>;
}

export interface Manifest {
  sets?: ManifestSet[];
  modifiers?: ManifestModifier[];
}

/**
 * Load tokens from a list of file paths
 */
export async function loadTokenFiles(
  filePaths: string[],
  basePath: string,
  loader: TokenLoader = new FileSystemTokenLoader(),
): Promise<Record<string, unknown>> {
  const tokens: Record<string, unknown> = {};

  for (const file of filePaths) {
    const fullPath = join(basePath, file);
    const fileTokens = await loader.loadJson(fullPath);

    if (typeof fileTokens === "object" && fileTokens !== null) {
      Object.assign(tokens, fileTokens);
    }
  }

  return tokens;
}

/**
 * Get token files for a specific modifier combination
 */
export function getModifierFiles(
  manifest: Manifest,
  theme?: string,
  mode?: string,
): string[] {
  const files: string[] = [];

  // Add base set files
  if (manifest.sets) {
    for (const set of manifest.sets) {
      files.push(...set.values);
    }
  }

  // Add modifier files
  if (manifest.modifiers) {
    for (const modifier of manifest.modifiers) {
      let modifierValue: string | undefined;

      if (modifier.name === "theme") {
        modifierValue = theme;
      } else if (modifier.name === "mode") {
        modifierValue = mode;
      }

      if (modifierValue) {
        const valueSet = modifier.values.find((v) => v.name === modifierValue);
        if (valueSet) {
          files.push(...valueSet.values);
        }
      }
    }
  }

  return files;
}

/**
 * Create a reference map for token resolution
 */
export function createReferenceMap(
  tokens: Record<string, unknown>,
  prefix = "#",
): Map<string, unknown> {
  const refMap = new Map<string, unknown>();

  function addToMap(obj: Record<string, unknown>, path = "") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}/${key}` : key;

      if (typeof value === "object" && value !== null) {
        const valueObj = value as Record<string, unknown>;

        // Add token values to map
        if ("$value" in valueObj) {
          refMap.set(`${prefix}/${currentPath}/$value`, valueObj.$value);
          refMap.set(`${prefix}/${currentPath}`, valueObj);
        }

        // Recurse for nested objects
        if (!("$value" in valueObj)) {
          addToMap(valueObj, currentPath);
        }
      }
    }
  }

  addToMap(tokens);
  return refMap;
}
