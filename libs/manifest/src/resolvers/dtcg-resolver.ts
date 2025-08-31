/**
 * W3C DTCG Resolver implementation
 * Based on: https://github.com/design-tokens/community-group/pull/289
 */

import type { ManifestAST, ModifierAST, TokenSetAST } from "@upft/ast";
import type { ValidationResult } from "@upft/foundation";
import type { ManifestResolver } from "../registry.js";

/**
 * W3C DTCG Resolver manifest format
 */
export interface DTCGResolverManifest {
  /** Optional human-readable identifier */
  name?: string;
  /** Required version - user-defined version string */
  version: string;
  /** Optional description */
  description?: string;
  /** Required array of token subsets */
  sets: DTCGTokenSet[];
  /** Optional array of modifiers */
  modifiers?: DTCGModifier[];
  /** Optional extensions for arbitrary metadata */
  $extensions?: Record<string, unknown>;
}

/**
 * DTCG Token Set definition
 */
export interface DTCGTokenSet {
  /** File reference or inline tokens */
  source?: string;
  /** Inline token definitions */
  tokens?: Record<string, unknown>;
  /** Optional namespace prefix */
  namespace?: string;
  /** Optional description */
  description?: string;
}

/**
 * DTCG Modifier definition
 */
export interface DTCGModifier {
  /** Modifier name */
  name: string;
  /** Modifier type */
  type: "enumerated" | "include";
  /** Description */
  description?: string;
  /** For enumerated: available values */
  values?: string[];
  /** For enumerated: value-specific token sets */
  sets?: Record<string, DTCGTokenSet[]>;
  /** For include: conditional token sets */
  include?: DTCGTokenSet[];
}

/**
 * Type guard for DTCG resolver manifest
 * Detects DTCG format based on structure, not specific version values
 */
export function isDTCGManifest(
  manifest: unknown,
): manifest is DTCGResolverManifest {
  if (!manifest || typeof manifest !== "object") return false;
  const m = manifest as Record<string, unknown>;

  // Must have version and sets
  if (typeof m.version !== "string" || !Array.isArray(m.sets)) {
    return false;
  }

  // Sets must be non-empty
  if (m.sets.length === 0) {
    return false;
  }

  // Basic structural check - allow validation to handle detailed errors
  // Just check that sets contain objects (not primitive values)
  const setsAreObjects = m.sets.every(
    (set: unknown) => set && typeof set === "object",
  );

  if (!setsAreObjects) {
    return false;
  }

  // Check modifiers structure if present
  if (m.modifiers) {
    if (!Array.isArray(m.modifiers)) {
      return false;
    }

    // Basic check - modifiers should be objects with type field
    // Let validation handle missing names and other detailed errors
    const hasBasicModifierStructure = m.modifiers.every((mod: unknown) => {
      if (!mod || typeof mod !== "object") return false;
      const modObj = mod as Record<string, unknown>;
      return modObj.type === "enumerated" || modObj.type === "include";
    });

    if (!hasBasicModifierStructure) {
      return false;
    }
  }

  return true;
}

/**
 * Convert DTCG resolver manifest to ManifestAST
 */
function convertDTCGToAST(
  manifest: DTCGResolverManifest,
  manifestPath: string,
): ManifestAST {
  const manifestAST = createBaseDTCGManifestAST(manifest, manifestPath);
  convertDTCGSetsToAST(manifest.sets, manifestAST, manifestPath);

  if (manifest.modifiers) {
    convertDTCGModifiersToAST(manifest.modifiers, manifestAST, manifestPath);
  }

  return manifestAST;
}

function createBaseDTCGManifestAST(
  manifest: DTCGResolverManifest,
  manifestPath: string,
): ManifestAST {
  return {
    type: "manifest",
    name: manifest.name || "dtcg-resolver",
    path: manifestPath,
    manifestType: "dtcg",
    sets: new Map(),
    modifiers: new Map(),
    permutations: new Map(),
    metadata: {
      description: manifest.description,
      version: manifest.version,
      extensions: manifest.$extensions,
    },
  };
}

function convertDTCGSetsToAST(
  sets: DTCGTokenSet[],
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    if (!set) continue;

    const setId = `set-${i}`;
    const tokenSetAST = createDTCGTokenSetAST(set, setId, manifestPath);
    manifestAST.sets.set(setId, tokenSetAST);
  }
}

function createDTCGTokenSetAST(
  set: DTCGTokenSet,
  setId: string,
  manifestPath: string,
): TokenSetAST {
  return {
    type: "manifest",
    name: set.description || setId,
    path: manifestPath,
    files: set.source ? [set.source] : [],
    metadata: {
      description: set.description,
      dtcgSetId: setId,
      dtcgInlineTokens: set.tokens,
      dtcgNamespace: set.namespace,
      dtcgType: "tokenSet",
    },
  };
}

function convertDTCGModifiersToAST(
  modifiers: DTCGModifier[],
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  for (const modifier of modifiers) {
    const modifierAST = createDTCGModifierAST(modifier, manifestPath);
    processDTCGModifierFiles(modifier, modifierAST);
    manifestAST.modifiers.set(modifier.name, modifierAST);
  }
}

function createDTCGModifierAST(
  modifier: DTCGModifier,
  manifestPath: string,
): ModifierAST {
  return {
    type: "manifest",
    name: modifier.name,
    path: manifestPath,
    constraintType: modifier.type === "enumerated" ? "oneOf" : "anyOf",
    options: modifier.values || [],
    values: new Map(),
    defaultValue:
      modifier.type === "enumerated" ? modifier.values?.[0] || "" : "",
    description: modifier.description || "",
    metadata: {
      dtcgType: modifier.type,
      dtcgModifierName: modifier.name,
    },
  };
}

function processDTCGModifierFiles(
  modifier: DTCGModifier,
  modifierAST: ModifierAST,
): void {
  if (modifier.type === "enumerated" && modifier.sets) {
    processEnumeratedModifierFiles(modifier, modifierAST);
  } else if (modifier.type === "include" && modifier.include) {
    processIncludeModifierFiles(modifier, modifierAST);
  }
}

function processEnumeratedModifierFiles(
  modifier: DTCGModifier,
  modifierAST: ModifierAST,
): void {
  if (!modifier.sets) return;

  for (const [value, sets] of Object.entries(modifier.sets)) {
    const filePaths = extractFilePathsFromSets(sets, modifier.name, value);
    modifierAST.values.set(value, filePaths.paths);

    // Store virtual file metadata
    Object.assign(modifierAST.metadata || {}, filePaths.metadata);
  }
}

function processIncludeModifierFiles(
  modifier: DTCGModifier,
  modifierAST: ModifierAST,
): void {
  if (!modifier.include) return;

  const filePaths = extractFilePathsFromSets(
    modifier.include,
    modifier.name,
    "include",
  );
  modifierAST.values.set("*", filePaths.paths);

  // Store virtual file metadata
  Object.assign(modifierAST.metadata || {}, filePaths.metadata);
}

function extractFilePathsFromSets(
  sets: DTCGTokenSet[],
  modifierName: string,
  suffix: string,
): { paths: string[]; metadata: Record<string, unknown> } {
  const paths: string[] = [];
  const metadata: Record<string, unknown> = {};

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    if (set?.source) {
      paths.push(set.source);
    } else if (set?.tokens) {
      const virtualPath = `${modifierName}-${suffix}-${i}.virtual.json`;
      paths.push(virtualPath);
      metadata[`virtualFile_${virtualPath}`] = set.tokens;
    }
  }

  return { paths, metadata };
}

/**
 * Validate DTCG resolver manifest
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

  if (!validateBasicStructure(manifest, result)) {
    return { valid: false, errors: result.errors, warnings: result.warnings };
  }

  const dtcgManifest = manifest as DTCGResolverManifest;
  validateSets(dtcgManifest.sets, result);

  if (dtcgManifest.modifiers) {
    validateModifiers(dtcgManifest.modifiers, result);
  }

  return {
    valid: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}

function validateBasicStructure(
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
      message: "Invalid DTCG resolver manifest format",
      path: "manifest",
      severity: "error",
    });
    return false;
  }

  const m = manifest as Record<string, unknown>;

  if (typeof m.version !== "string") {
    result.errors.push({
      message: "Missing required version property",
      path: "version",
      severity: "error",
    });
  }

  if (!Array.isArray(m.sets)) {
    result.errors.push({
      message: "Missing or invalid sets property",
      path: "sets",
      severity: "error",
    });
    return false;
  }

  if (m.sets.length === 0) {
    result.errors.push({
      message: "Sets array cannot be empty",
      path: "sets",
      severity: "error",
    });
    return false;
  }

  if (!isDTCGManifest(manifest) && result.errors.length === 0) {
    result.errors.push({
      message: "Invalid DTCG resolver manifest format",
      path: "manifest",
      severity: "error",
    });
    return false;
  }

  return true;
}

function validateSets(
  sets: DTCGTokenSet[],
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
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    if (!set) continue;

    validateSingleSet(set, `sets[${i}]`, result);
  }
}

function validateSingleSet(
  set: DTCGTokenSet,
  setPath: string,
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
  if (!(set.source || set.tokens)) {
    result.errors.push({
      message: "Token set must have either 'source' or 'tokens'",
      path: setPath,
      severity: "error",
    });
  }

  if (set.source && set.tokens) {
    result.warnings.push({
      message:
        "Token set has both 'source' and 'tokens'. 'source' will take precedence",
      path: setPath,
      severity: "warning",
    });
  }
}

function validateModifiers(
  modifiers: DTCGModifier[],
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
  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i];
    if (!modifier) continue;

    validateSingleModifier(modifier, `modifiers[${i}]`, result);
  }
}

function validateSingleModifier(
  modifier: DTCGModifier,
  modifierPath: string,
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
  if (!modifier.name) {
    result.errors.push({
      message: "Modifier must have a name",
      path: `${modifierPath}.name`,
      severity: "error",
    });
  }

  if (
    modifier.type === "enumerated" &&
    (!modifier.values || modifier.values.length === 0)
  ) {
    result.errors.push({
      message: "Enumerated modifier must have values",
      path: `${modifierPath}.values`,
      severity: "error",
    });
  }
}

/**
 * W3C DTCG Resolver implementation
 */
export const dtcgResolver: ManifestResolver = {
  name: "dtcg",
  detect: isDTCGManifest,
  parse: convertDTCGToAST,
  validate: validateDTCGManifest,
};
