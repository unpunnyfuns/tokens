/**
 * W3C DTCG Manifest implementation
 * Supports the standard DTCG manifest format with sources, themes, and outputs
 */

import { dirname, resolve } from "node:path";
import type { ManifestAST, ModifierAST, TokenSetAST } from "@upft/ast";
import type { ValidationResult } from "@upft/foundation";
import { glob } from "glob";
import type { ManifestResolver } from "../registry.js";

/**
 * W3C DTCG Manifest format
 */
export interface DTCGManifest {
  /** JSON schema reference */
  $schema?: string;
  /** Optional human-readable identifier */
  name?: string;
  /** Required version - user-defined version string */
  version?: string;
  /** Optional description */
  description?: string;
  /** Required array of token sources */
  sources: DTCGSource[];
  /** Optional array of themes */
  themes?: DTCGTheme[];
  /** Optional array of outputs */
  outputs?: DTCGOutput[];
  /** Optional extensions for arbitrary metadata */
  $extensions?: Record<string, unknown>;
}

/**
 * DTCG Source definition
 */
export interface DTCGSource {
  /** Source name/identifier */
  name: string;
  /** Array of file patterns to include */
  include: string[];
  /** Optional conditions for when this source applies */
  conditions?: Record<string, string>;
  /** Optional description */
  description?: string;
}

/**
 * DTCG Theme definition
 */
export interface DTCGTheme {
  /** Theme identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Conditions that activate this theme */
  conditions: Record<string, string>;
  /** Array of source names to include in this theme */
  sources: string[];
}

/**
 * DTCG Output definition
 */
export interface DTCGOutput {
  /** Output format */
  format: string;
  /** Destination path pattern */
  destination: string;
  /** Optional format-specific options */
  options?: Record<string, unknown>;
  /** Optional prefix for tokens */
  prefix?: string;
}

/**
 * Type guard for DTCG manifest format
 */
export function isDTCGManifestFormat(
  manifest: unknown,
): manifest is DTCGManifest {
  if (!manifest || typeof manifest !== "object") return false;
  const m = manifest as Record<string, unknown>;

  // Must have sources array
  if (!Array.isArray(m.sources)) {
    return false;
  }

  // Sources must be non-empty
  if (m.sources.length === 0) {
    return false;
  }

  // Basic structural check for sources
  const sourcesAreValid = m.sources.every((source: unknown) => {
    if (!source || typeof source !== "object") return false;
    const s = source as Record<string, unknown>;
    return typeof s.name === "string" && Array.isArray(s.include);
  });

  if (!sourcesAreValid) {
    return false;
  }

  // Check themes structure if present
  if (m.themes) {
    if (!Array.isArray(m.themes)) {
      return false;
    }

    const themesAreValid = m.themes.every((theme: unknown) => {
      if (!theme || typeof theme !== "object") return false;
      const t = theme as Record<string, unknown>;
      return (
        typeof t.id === "string" &&
        typeof t.name === "string" &&
        typeof t.conditions === "object" &&
        Array.isArray(t.sources)
      );
    });

    if (!themesAreValid) {
      return false;
    }
  }

  return true;
}

/**
 * Convert DTCG manifest to ManifestAST
 */
function convertDTCGManifestToAST(
  manifest: DTCGManifest,
  manifestPath: string,
): ManifestAST {
  const manifestAST = createBaseDTCGManifestAST(manifest, manifestPath);

  // Convert sources to token sets
  convertDTCGSourcesToAST(manifest.sources, manifestAST, manifestPath);

  // Convert themes to modifiers if present
  if (manifest.themes) {
    convertDTCGThemesToAST(manifest.themes, manifestAST, manifestPath);
  }

  return manifestAST;
}

function createBaseDTCGManifestAST(
  manifest: DTCGManifest,
  manifestPath: string,
): ManifestAST {
  return {
    type: "manifest",
    name: manifest.name || "dtcg-manifest",
    path: manifestPath,
    manifestType: "dtcg-manifest",
    sets: new Map(),
    modifiers: new Map(),
    permutations: new Map(),
    metadata: {
      description: manifest.description,
      version: manifest.version,
      extensions: manifest.$extensions,
      dtcgOutputs: manifest.outputs,
    },
  };
}

function convertDTCGSourcesToAST(
  sources: DTCGSource[],
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  for (const source of sources) {
    const tokenSetAST = createDTCGSourceTokenSetAST(source, manifestPath);
    manifestAST.sets.set(source.name, tokenSetAST);
  }
}

function createDTCGSourceTokenSetAST(
  source: DTCGSource,
  manifestPath: string,
): TokenSetAST {
  // Resolve glob patterns to actual file paths
  const manifestDir = dirname(manifestPath);
  const resolvedFiles: string[] = [];

  for (const pattern of source.include) {
    // If pattern starts with ./, make it relative to manifest directory
    const resolvedPattern = pattern.startsWith("./")
      ? resolve(manifestDir, pattern)
      : pattern;

    try {
      // Use glob to expand patterns
      const matches = glob.sync(resolvedPattern, {
        absolute: false,
        cwd: manifestDir,
      });
      resolvedFiles.push(...matches);
    } catch {
      // If glob fails, try the pattern as-is (might be a direct file path)
      resolvedFiles.push(pattern);
    }
  }

  return {
    type: "manifest",
    name: source.name,
    path: manifestPath,
    files: resolvedFiles.length > 0 ? resolvedFiles : source.include,
    metadata: {
      description: source.description,
      dtcgSourceName: source.name,
      dtcgConditions: source.conditions,
      dtcgType: "source",
    },
  };
}

function convertDTCGThemesToAST(
  themes: DTCGTheme[],
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  // Extract all unique condition keys from themes
  const conditionKeys = new Set<string>();
  for (const theme of themes) {
    for (const key of Object.keys(theme.conditions)) {
      conditionKeys.add(key);
    }
  }

  // Create modifiers for each condition key
  for (const conditionKey of conditionKeys) {
    const values = themes
      .map((theme) => theme.conditions[conditionKey])
      .filter((value): value is string => value !== undefined)
      .filter((value, index, arr) => arr.indexOf(value) === index);

    if (values.length > 0) {
      const modifierAST = createDTCGThemeModifierAST(
        conditionKey,
        values,
        themes,
        manifestPath,
      );
      manifestAST.modifiers.set(conditionKey, modifierAST);
    }
  }
}

function createDTCGThemeModifierAST(
  conditionKey: string,
  values: string[],
  themes: DTCGTheme[],
  manifestPath: string,
): ModifierAST {
  const modifierAST: ModifierAST = {
    type: "manifest",
    name: conditionKey,
    path: manifestPath,
    constraintType: "oneOf",
    options: values,
    values: new Map(),
    defaultValue: values[0] || "",
    description: `Theme modifier for ${conditionKey}`,
    metadata: {
      dtcgType: "theme-modifier",
      dtcgConditionKey: conditionKey,
    },
  };

  // Map each theme value to its associated source names
  // Note: The upft pipeline will resolve source names to actual files
  for (const value of values) {
    const associatedThemes = themes.filter(
      (theme) => theme.conditions[conditionKey] === value,
    );

    // Collect all source names from associated themes
    const sourceNames = new Set<string>();
    for (const theme of associatedThemes) {
      for (const sourceName of theme.sources) {
        sourceNames.add(sourceName);
      }
    }

    modifierAST.values.set(value, Array.from(sourceNames));
  }

  return modifierAST;
}

/**
 * Validate DTCG manifest
 */
function validateDTCGManifest(manifest: unknown): ValidationResult {
  const result = {
    errors: [] as Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>,
    warnings: [] as Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>,
  };

  if (!validateDTCGManifestBasicStructure(manifest, result)) {
    return { valid: false, errors: result.errors, warnings: result.warnings };
  }

  const dtcgManifest = manifest as DTCGManifest;
  validateDTCGSources(dtcgManifest.sources, result);

  if (dtcgManifest.themes) {
    validateDTCGThemes(dtcgManifest.themes, dtcgManifest.sources, result);
  }

  if (dtcgManifest.outputs) {
    validateDTCGOutputs(dtcgManifest.outputs, result);
  }

  return {
    valid: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}

function validateDTCGManifestBasicStructure(
  manifest: unknown,
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): boolean {
  if (!manifest || typeof manifest !== "object") {
    result.errors.push({
      message: "Invalid DTCG manifest format",
      path: "manifest",
      severity: "error",
    });
    return false;
  }

  const m = manifest as Record<string, unknown>;

  if (!Array.isArray(m.sources)) {
    result.errors.push({
      message: "Missing or invalid sources property",
      path: "sources",
      severity: "error",
    });
    return false;
  }

  if (m.sources.length === 0) {
    result.errors.push({
      message: "Sources array cannot be empty",
      path: "sources",
      severity: "error",
    });
    return false;
  }

  return true;
}

function validateDTCGSources(
  sources: DTCGSource[],
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): void {
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (!source) continue;

    validateDTCGSingleSource(source, `sources[${i}]`, result);
  }
}

function validateDTCGSingleSource(
  source: DTCGSource,
  sourcePath: string,
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): void {
  if (!source.name) {
    result.errors.push({
      message: "Source must have a name",
      path: `${sourcePath}.name`,
      severity: "error",
    });
  }

  if (!Array.isArray(source.include) || source.include.length === 0) {
    result.errors.push({
      message: "Source must have non-empty include array",
      path: `${sourcePath}.include`,
      severity: "error",
    });
  }
}

function validateDTCGThemes(
  themes: DTCGTheme[],
  sources: DTCGSource[],
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): void {
  const sourceNames = new Set(sources.map((s) => s.name));

  for (let i = 0; i < themes.length; i++) {
    const theme = themes[i];
    if (!theme) continue;

    validateDTCGSingleTheme(theme, `themes[${i}]`, sourceNames, result);
  }
}

function validateDTCGSingleTheme(
  theme: DTCGTheme,
  themePath: string,
  sourceNames: Set<string>,
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): void {
  if (!theme.id) {
    result.errors.push({
      message: "Theme must have an id",
      path: `${themePath}.id`,
      severity: "error",
    });
  }

  if (!theme.name) {
    result.errors.push({
      message: "Theme must have a name",
      path: `${themePath}.name`,
      severity: "error",
    });
  }

  if (!theme.conditions || Object.keys(theme.conditions).length === 0) {
    result.errors.push({
      message: "Theme must have conditions",
      path: `${themePath}.conditions`,
      severity: "error",
    });
  }

  if (!Array.isArray(theme.sources) || theme.sources.length === 0) {
    result.errors.push({
      message: "Theme must have non-empty sources array",
      path: `${themePath}.sources`,
      severity: "error",
    });
  } else {
    // Check if all referenced sources exist
    for (const sourceName of theme.sources) {
      if (!sourceNames.has(sourceName)) {
        result.errors.push({
          message: `Theme references unknown source: ${sourceName}`,
          path: `${themePath}.sources`,
          severity: "error",
        });
      }
    }
  }
}

function validateDTCGOutputs(
  outputs: DTCGOutput[],
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): void {
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    if (!output) continue;

    validateDTCGSingleOutput(output, `outputs[${i}]`, result);
  }
}

function validateDTCGSingleOutput(
  output: DTCGOutput,
  outputPath: string,
  result: {
    errors: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
    warnings: Array<{
      message: string;
      path: string;
      severity: "error" | "warning";
    }>;
  },
): void {
  if (!output.format) {
    result.errors.push({
      message: "Output must have a format",
      path: `${outputPath}.format`,
      severity: "error",
    });
  }

  if (!output.destination) {
    result.errors.push({
      message: "Output must have a destination",
      path: `${outputPath}.destination`,
      severity: "error",
    });
  }
}

/**
 * W3C DTCG Manifest resolver implementation
 */
export const dtcgManifestResolver: ManifestResolver = {
  name: "dtcg-manifest",
  detect: isDTCGManifestFormat,
  parse: convertDTCGManifestToAST,
  validate: validateDTCGManifest,
};
