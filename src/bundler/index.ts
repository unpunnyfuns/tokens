import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { getProjectRoot } from "../validation/utils.ts";
import { convertToDTCG } from "./dtcg-exporter.ts";
import { resolveReferences } from "./resolver.ts";

interface ReferenceStrategy {
  preserveExternal?: boolean;
  convertInternal?: boolean;
  warnOnConversion?: boolean;
}

interface BundleOptions {
  manifest: string;
  theme?: string;
  mode?: string;
  resolveValues?: boolean;
  format?: "dtcg" | "json-schema" | "preserve";
  referenceStrategy?: ReferenceStrategy;
  [key: string]: unknown; // For custom modifiers
}

interface Manifest {
  sets?: Array<{
    values: string[];
  }>;
  modifiers?: Array<{
    name: string;
    values: Array<{
      name: string;
      values: string[];
    }>;
  }>;
}

interface Modifier {
  name: string;
  values: string[];
}

/**
 * Bundle tokens based on a resolver manifest
 * All external references are resolved during bundling.
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

  // Then either fully resolve values or convert to chosen format
  if (resolveValues) {
    // Fully resolve all references to actual values
    tokens = await resolveReferences(tokens, { mode: true });
  } else if (format === "dtcg") {
    // Convert internal references to DTCG aliases
    tokens = convertToDTCG(tokens);
  }
  // format === "json-schema" keeps internal $ref format

  // Validate no external references remain
  const { hasExternal } = checkForExternalReferences(tokens);
  if (hasExternal) {
    throw new Error(
      "Bundle should not contain external references after processing",
    );
  }

  return tokens;
}

/**
 * Load a token file
 */
async function loadTokenFile(
  filePath: string,
): Promise<Record<string, unknown>> {
  const content = await readFile(filePath, "utf-8");
  const data = JSON.parse(content);

  // Remove $schema property if present
  const { $schema, ...tokens } = data;
  return tokens;
}

/**
 * Load modifier tokens
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

/**
 * Merge tokens with proper precedence
 * Later tokens override earlier ones
 */
export function mergeTokens(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };

  for (const key in override) {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (isTokenLeaf(overrideValue)) {
      // Direct token replacement
      result[key] = overrideValue;
    } else if (typeof overrideValue === "object" && overrideValue !== null) {
      // Nested group - recursive merge
      if (
        typeof baseValue === "object" &&
        baseValue !== null &&
        !isTokenLeaf(baseValue)
      ) {
        result[key] = mergeTokens(
          baseValue as Record<string, unknown>,
          overrideValue as Record<string, unknown>,
        );
      } else {
        result[key] = overrideValue;
      }
    } else {
      result[key] = overrideValue;
    }
  }

  return result;
}

/**
 * Check if an object is a token leaf (has $value or $ref)
 */
function isTokenLeaf(obj: unknown): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return record.$value !== undefined || record.$ref !== undefined;
}

/**
 * Resolve all external references in tokens
 * External refs are replaced with the actual token content
 */
async function resolveExternalReferences(
  tokens: Record<string, unknown>,
  basePath: string,
): Promise<Record<string, unknown>> {
  const externalCache = new Map<string, Record<string, unknown>>();

  async function resolveExternal(obj: unknown): Promise<unknown> {
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => resolveExternal(item)));
    }

    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    // Handle $ref that points to external file
    const record = obj as Record<string, unknown>;
    if (record.$ref && typeof record.$ref === "string") {
      const ref = record.$ref;

      // Check if it's an external reference
      if (
        ref.includes(".json") ||
        ref.startsWith("./") ||
        ref.startsWith("../")
      ) {
        const [filePath, fragment] = ref.split("#");
        const resolvedPath = resolve(basePath, filePath);

        // Load external file (with caching)
        if (!externalCache.has(resolvedPath)) {
          const content = await readFile(resolvedPath, "utf-8");
          const data = JSON.parse(content);
          // Remove $schema from loaded data
          const { $schema, ...tokens } = data;
          externalCache.set(resolvedPath, tokens);
        }

        const externalTokens = externalCache.get(resolvedPath);

        if (fragment) {
          // Extract specific token from external file
          const path = fragment.substring(1).split("/");
          let value: unknown = externalTokens;

          for (const segment of path) {
            if (value && typeof value === "object") {
              value = (value as Record<string, unknown>)[segment];
            } else {
              throw new Error(`Cannot resolve external reference: ${ref}`);
            }
          }

          // Convert to internal reference after resolution
          const internalPath = fragment.substring(1);
          return { $ref: `#${fragment}` };
        }
        // Merge entire external file content
        return externalTokens;
      }
    }

    // Handle $value with embedded $ref
    if (
      record.$value &&
      typeof record.$value === "object" &&
      (record.$value as Record<string, unknown>).$ref
    ) {
      const resolved = await resolveExternal(record.$value);
      return { ...record, $value: resolved };
    }

    // Recursively resolve nested objects
    const result: Record<string, unknown> = {};
    for (const key in record) {
      result[key] = await resolveExternal(record[key]);
    }

    return result;
  }

  return resolveExternal(tokens) as Promise<Record<string, unknown>>;
}

/**
 * Check if tokens contain any external references
 */
function checkForExternalReferences(tokens: Record<string, unknown>): {
  hasExternal: boolean;
  external: Array<{ path: string; ref: string }>;
} {
  const external: Array<{ path: string; ref: string }> = [];

  function check(obj: unknown, path = ""): void {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => check(item, `${path}[${i}]`));
      return;
    }

    if (typeof obj !== "object" || obj === null) {
      return;
    }

    // Check for external $ref
    const record = obj as Record<string, unknown>;
    if (record.$ref && typeof record.$ref === "string") {
      const ref = record.$ref;
      if (
        ref.includes(".json") ||
        ref.startsWith("./") ||
        ref.startsWith("../")
      ) {
        external.push({ path, ref });
      }
    }

    // Check in $value
    if (
      record.$value &&
      typeof record.$value === "object" &&
      (record.$value as Record<string, unknown>).$ref
    ) {
      const ref = (record.$value as Record<string, unknown>).$ref as string;
      if (
        ref.includes(".json") ||
        ref.startsWith("./") ||
        ref.startsWith("../")
      ) {
        external.push({ path: `${path}.$value`, ref });
      }
    }

    // Recurse
    for (const key in record) {
      if (key !== "$ref" && key !== "$value") {
        check(record[key], path ? `${path}.${key}` : key);
      }
    }
  }

  check(tokens);

  return {
    hasExternal: external.length > 0,
    external,
  };
}
