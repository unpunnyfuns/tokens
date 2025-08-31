/**
 * UPFT Resolver implementation
 * Refactored from existing parser.ts to work with registry system
 */

import type { ManifestAST, ModifierAST, TokenSetAST } from "@upft/ast";
import type {
  AnyOfModifier,
  OneOfModifier,
  UPFTResolverManifest,
  ValidationResult,
} from "@upft/foundation";
import { isUPFTManifest } from "@upft/foundation";
import type { ManifestResolver } from "../registry.js";

/**
 * Convert UPFT manifest to AST structure
 */
function convertUPFTManifestToAST(
  manifest: UPFTResolverManifest,
  manifestPath: string,
): ManifestAST {
  const manifestAST: ManifestAST = createBaseManifestAST(
    manifest,
    manifestPath,
  );

  convertSetsToAST(manifest, manifestAST, manifestPath);
  convertModifiersToAST(manifest, manifestAST, manifestPath);
  convertOptionsToAST(manifest, manifestAST);

  return manifestAST;
}

/**
 * Create base manifest AST structure
 */
function createBaseManifestAST(
  manifest: UPFTResolverManifest,
  manifestPath: string,
): ManifestAST {
  return {
    type: "manifest",
    name: manifest.name || "manifest",
    path: manifestPath,
    manifestType: "upft",
    sets: new Map(),
    modifiers: new Map(),
    permutations: new Map(),
    metadata: {
      description: manifest.description,
      schema: manifest.$schema,
    },
  };
}

/**
 * Convert manifest sets to AST
 */
function convertSetsToAST(
  manifest: UPFTResolverManifest,
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  for (let i = 0; i < manifest.sets.length; i++) {
    const set = manifest.sets[i];
    if (!set) continue;
    const setId = set.name || `set-${i}`;

    const tokenSetAST: TokenSetAST = {
      type: "manifest", // Use existing type
      name: set.name || setId,
      path: manifestPath,
      files: set.files || [],
      metadata: {
        description: set.description,
        upftSetId: setId,
        upftValues: set.values,
      },
    };

    manifestAST.sets.set(setId, tokenSetAST);
  }
}

/**
 * Convert manifest modifiers to AST
 */
function convertModifiersToAST(
  manifest: UPFTResolverManifest,
  manifestAST: ManifestAST,
  manifestPath: string,
): void {
  for (const [modifierName, modifier] of Object.entries(manifest.modifiers)) {
    const modifierAST: ModifierAST = {
      type: "manifest", // Use existing type
      name: modifierName,
      path: manifestPath,
      constraintType: isOneOfModifier(modifier) ? "oneOf" : "anyOf",
      options: isOneOfModifier(modifier) ? modifier.oneOf : modifier.anyOf,
      values: new Map(),
      defaultValue: modifier.default || "",
      description: modifier.description || "",
      metadata: {
        upftModifierName: modifierName,
        upftType: isOneOfModifier(modifier) ? "oneOf" : "anyOf",
      },
    };

    // Convert modifier values to file paths
    for (const [value, files] of Object.entries(modifier.values)) {
      modifierAST.values.set(value, files);
    }

    manifestAST.modifiers.set(modifierName, modifierAST);
  }
}

/**
 * Convert manifest options to AST
 */
function convertOptionsToAST(
  manifest: UPFTResolverManifest,
  manifestAST: ManifestAST,
): void {
  if (manifest.options) {
    manifestAST.metadata = {
      ...manifestAST.metadata,
      options: manifest.options,
    };
  }
}

/**
 * Type guard for OneOf modifier
 */
function isOneOfModifier(
  modifier: OneOfModifier | AnyOfModifier,
): modifier is OneOfModifier {
  return "oneOf" in modifier;
}

/**
 * Validate UPFT manifest
 */
function validateUPFTManifest(manifest: unknown): ValidationResult {
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

  if (!isUPFTManifest(manifest)) {
    result.errors.push({
      message: "Invalid UPFT manifest format",
      path: "manifest",
      severity: "error",
    });
    return { valid: false, errors: result.errors, warnings: result.warnings };
  }

  validateUPFTSets(manifest.sets, result);

  if (manifest.modifiers) {
    validateUPFTModifiers(manifest.modifiers, result);
  }

  return {
    valid: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}

function validateUPFTSets(
  sets: unknown[],
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
  if (!sets || sets.length === 0) {
    result.errors.push({
      message: "Manifest must have at least one token set",
      path: "sets",
      severity: "error",
    });
    return;
  }

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    if (!set) continue;

    validateUPFTSingleSet(set, `sets[${i}]`, result);
  }
}

function validateUPFTSingleSet(
  set: unknown,
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
  const setObj = set as Record<string, unknown>;
  if (!(setObj.files || setObj.values)) {
    result.errors.push({
      message: "Token set must have either 'files' or 'values'",
      path: setPath,
      severity: "error",
    });
  }

  if (Array.isArray(setObj.files) && setObj.files.length === 0) {
    result.warnings.push({
      message: "Token set has empty files array",
      path: `${setPath}.files`,
      severity: "warning",
    });
  }
}

function validateUPFTModifiers(
  modifiers: Record<string, unknown>,
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
  for (const [modifierName, modifier] of Object.entries(modifiers)) {
    validateUPFTSingleModifier(modifier, modifierName, result);
  }
}

function validateUPFTSingleModifier(
  modifier: unknown,
  modifierName: string,
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
  const modifierPath = `modifiers.${modifierName}`;
  const modObj = modifier as OneOfModifier | AnyOfModifier;

  if (isOneOfModifier(modObj)) {
    if (!modObj.oneOf || modObj.oneOf.length === 0) {
      result.errors.push({
        message: "OneOf modifier must have values",
        path: `${modifierPath}.oneOf`,
        severity: "error",
      });
    }
  } else if (!modObj.anyOf || modObj.anyOf.length === 0) {
    result.errors.push({
      message: "AnyOf modifier must have values",
      path: `${modifierPath}.anyOf`,
      severity: "error",
    });
  }

  if (!modObj.values || Object.keys(modObj.values).length === 0) {
    result.errors.push({
      message: "Modifier must have values mapping",
      path: `${modifierPath}.values`,
      severity: "error",
    });
  }
}

/**
 * UPFT Resolver implementation
 */
export const upftResolver: ManifestResolver = {
  name: "upft",
  detect: isUPFTManifest,
  parse: convertUPFTManifestToAST,
  validate: validateUPFTManifest,
};
