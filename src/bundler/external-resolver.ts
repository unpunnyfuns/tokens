/**
 * External reference resolution for design tokens
 * Handles loading external files and converting external refs to internal refs
 */

import {
  loadExternalFile as loadExternal,
  parseReference,
} from "../core/resolver.ts";

/**
 * Resolve only external references in tokens
 * External refs are replaced with internal refs after loading the external files
 * This preserves the reference structure instead of fully resolving values
 */
export async function resolveExternalReferences(
  tokens: Record<string, unknown>,
  baseDir: string,
): Promise<Record<string, unknown>> {
  const fileCache = new Map<string, unknown>();

  async function resolveExternal(value: unknown): Promise<unknown> {
    if (!value || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return Promise.all(value.map(resolveExternal));
    }

    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key in record) {
      if (key === "$ref" && typeof record.$ref === "string") {
        const ref = record.$ref;
        const parsed = parseReference(ref);

        // Only process external references
        if (parsed.type === "external" && parsed.filePath) {
          // Load the external file
          const externalTokens = await loadExternal(
            parsed.filePath,
            baseDir,
            fileCache,
          );

          // Convert to internal reference
          if (parsed.fragment) {
            // Keep as reference but make it internal
            // Fragment already includes # prefix from parseReference
            result.$ref = parsed.fragment;
          } else {
            // No fragment means we import the whole file
            return externalTokens;
          }
        } else {
          // Keep internal references as-is
          result[key] = record[key];
        }
      } else {
        // Recursively process nested objects
        result[key] = await resolveExternal(record[key]);
      }
    }

    return result;
  }

  return (await resolveExternal(tokens)) as Record<string, unknown>;
}

/**
 * Check if tokens contain external references
 */
export function checkForExternalReferences(tokens: unknown): {
  hasExternal: boolean;
  externalRefs: string[];
} {
  const externalRefs: string[] = [];

  function check(value: unknown, path = ""): void {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => check(item, `${path}[${index}]`));
      return;
    }

    const record = value as Record<string, unknown>;

    if (record.$ref && typeof record.$ref === "string") {
      const parsed = parseReference(record.$ref);
      if (parsed.type === "external") {
        externalRefs.push(record.$ref);
      }
    }

    for (const key in record) {
      if (!key.startsWith("$")) {
        check(record[key], path ? `${path}.${key}` : key);
      }
    }
  }

  check(tokens);

  return {
    hasExternal: externalRefs.length > 0,
    externalRefs,
  };
}

/**
 * Load an external file and cache it
 */
export async function loadExternalFile(
  filePath: string,
  basePath: string,
  cache?: Map<string, unknown>,
): Promise<unknown> {
  return loadExternal(filePath, basePath, cache || new Map());
}
