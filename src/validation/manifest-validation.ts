/**
 * Functional manifest validation API - Refactored with reduced complexity
 */

import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import type { ValidationError, ValidationResult } from "../types/validation.js";

/**
 * Check if modifier has valid choice type
 */
function validateModifierChoiceType(
  name: string,
  mod: Record<string, unknown>,
  errors: ValidationError[],
): { hasOneOf: boolean; hasAnyOf: boolean } {
  const hasOneOf = "oneOf" in mod;
  const hasAnyOf = "anyOf" in mod;

  if (!(hasOneOf || hasAnyOf)) {
    errors.push({
      path: `modifiers.${name}`,
      message: "Modifier must have either oneOf or anyOf",
      severity: "error",
    });
  }

  if (hasOneOf && hasAnyOf) {
    errors.push({
      path: `modifiers.${name}`,
      message: "Modifier cannot have both oneOf and anyOf",
      severity: "error",
    });
  }

  return { hasOneOf, hasAnyOf };
}

/**
 * Validate modifier arrays
 */
function validateModifierArrays(
  name: string,
  mod: Record<string, unknown>,
  hasOneOf: boolean,
  hasAnyOf: boolean,
  errors: ValidationError[],
): void {
  if (hasOneOf && !Array.isArray(mod.oneOf)) {
    errors.push({
      path: `modifiers.${name}.oneOf`,
      message: "oneOf must be an array",
      severity: "error",
    });
  }

  if (hasAnyOf && !Array.isArray(mod.anyOf)) {
    errors.push({
      path: `modifiers.${name}.anyOf`,
      message: "anyOf must be an array",
      severity: "error",
    });
  }
}

/**
 * Validate modifier options have values
 */
function validateModifierOptions(
  name: string,
  mod: Record<string, unknown>,
  hasOneOf: boolean,
  errors: ValidationError[],
): void {
  const options = (mod.oneOf || mod.anyOf) as unknown[];
  if (!Array.isArray(options)) return;

  const optionType = hasOneOf ? "oneOf" : "anyOf";
  const values = mod.values as Record<string, unknown>;

  for (const option of options) {
    if (typeof option !== "string") {
      errors.push({
        path: `modifiers.${name}.${optionType}`,
        message: "Options must be strings",
        severity: "error",
      });
      continue;
    }

    if (!values?.[option]) {
      errors.push({
        path: `modifiers.${name}.values.${option}`,
        message: `Missing values for option '${option}'`,
        severity: "error",
      });
    }
  }
}

/**
 * Validate a modifier definition
 */
function validateModifier(
  name: string,
  modifier: unknown,
  errors: ValidationError[],
): void {
  if (!modifier || typeof modifier !== "object") {
    errors.push({
      path: `modifiers.${name}`,
      message: "Modifier must be an object",
      severity: "error",
    });
    return;
  }

  const mod = modifier as Record<string, unknown>;

  // Validate choice type
  const { hasOneOf, hasAnyOf } = validateModifierChoiceType(name, mod, errors);

  // Validate arrays
  validateModifierArrays(name, mod, hasOneOf, hasAnyOf, errors);

  // Validate values object exists
  if (!mod.values || typeof mod.values !== "object") {
    errors.push({
      path: `modifiers.${name}.values`,
      message: "Modifier must have a values object",
      severity: "error",
    });
    return;
  }

  // Validate options have corresponding values
  validateModifierOptions(name, mod, hasOneOf, errors);
}

/**
 * Validate set files
 */
function validateSetFiles(
  index: number,
  files: unknown[],
  errors: ValidationError[],
): void {
  files.forEach((file, fileIndex) => {
    if (typeof file !== "string") {
      errors.push({
        path: `sets[${index}].files[${fileIndex}]`,
        message: "File path must be a string",
        severity: "error",
      });
    }
  });
}

/**
 * Validate set values
 */
function validateSetValues(
  index: number,
  values: unknown[],
  errors: ValidationError[],
): void {
  values.forEach((value, valueIndex) => {
    if (typeof value !== "string") {
      errors.push({
        path: `sets[${index}].values[${valueIndex}]`,
        message: "Value must be a string (file path)",
        severity: "error",
      });
    }
  });
}

/**
 * Validate a set definition
 */
function validateSet(
  set: unknown,
  index: number,
  errors: ValidationError[],
): void {
  if (!set || typeof set !== "object") {
    errors.push({
      path: `sets[${index}]`,
      message: "Set must be an object",
      severity: "error",
    });
    return;
  }

  const s = set as Record<string, unknown>;
  const hasFiles = "files" in s && Array.isArray(s.files);
  const hasValues = "values" in s && Array.isArray(s.values);

  if (!(hasFiles || hasValues)) {
    errors.push({
      path: `sets[${index}]`,
      message: "Set must have either files or values array",
      severity: "error",
    });
    return;
  }

  if (hasFiles) {
    validateSetFiles(index, s.files as unknown[], errors);
  }

  if (hasValues) {
    validateSetValues(index, s.values as unknown[], errors);
  }

  if ("modifiers" in s && s.modifiers && typeof s.modifiers !== "object") {
    errors.push({
      path: `sets[${index}].modifiers`,
      message: "Modifiers must be an object",
      severity: "error",
    });
  }
}

/**
 * Validate output configuration
 */
function validateOutput(output: unknown, errors: ValidationError[]): void {
  if (!output || typeof output !== "object") {
    errors.push({
      path: "output",
      message: "Output must be an object",
      severity: "error",
    });
    return;
  }

  const out = output as Record<string, unknown>;

  if ("directory" in out && typeof out.directory !== "string") {
    errors.push({
      path: "output.directory",
      message: "Output directory must be a string",
      severity: "error",
    });
  }

  if ("filename" in out && typeof out.filename !== "string") {
    errors.push({
      path: "output.filename",
      message: "Output filename must be a string",
      severity: "error",
    });
  }

  if ("merge" in out && typeof out.merge !== "boolean") {
    errors.push({
      path: "output.merge",
      message: "Output merge must be a boolean",
      severity: "error",
    });
  }

  if (
    "resolveReferences" in out &&
    typeof out.resolveReferences !== "boolean"
  ) {
    errors.push({
      path: "output.resolveReferences",
      message: "Output resolveReferences must be a boolean",
      severity: "error",
    });
  }
}

/**
 * Validate modifiers section
 */
function validateModifiers(
  modifiers: unknown,
  errors: ValidationError[],
): void {
  if (!modifiers || typeof modifiers !== "object") {
    errors.push({
      path: "modifiers",
      message: "Modifiers must be an object",
      severity: "error",
    });
    return;
  }

  for (const [name, modifier] of Object.entries(modifiers)) {
    validateModifier(name, modifier, errors);
  }
}

/**
 * Validate sets section
 */
function validateSets(
  sets: unknown,
  warnings: ValidationError[],
  errors: ValidationError[],
): void {
  if (!Array.isArray(sets)) {
    errors.push({
      path: "sets",
      message: "Manifest must have a sets array",
      severity: "error",
    });
    return;
  }

  sets.forEach((set, index) => {
    validateSet(set, index, errors);
  });

  if (sets.length === 0) {
    warnings.push({
      path: "sets",
      message: "Sets array is empty",
      severity: "warning",
    });
  }
}

/**
 * Validate a UPFT manifest document structure
 */
export function validateManifestDocument(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!manifest || typeof manifest !== "object") {
    errors.push({
      path: "/",
      message: "Manifest must be an object",
      severity: "error",
    });
    return { valid: false, errors, warnings };
  }

  const m = manifest as Record<string, unknown>;

  // Validate modifiers if present
  if ("modifiers" in m) {
    validateModifiers(m.modifiers, errors);
  }

  // Validate sets (required)
  if ("sets" in m) {
    validateSets(m.sets, warnings, errors);
  } else {
    errors.push({
      path: "sets",
      message: "Manifest must have a sets array",
      severity: "error",
    });
  }

  // Validate output if present
  if ("output" in m && m.output) {
    validateOutput(m.output, errors);
  }

  // Validate options if present
  if ("options" in m && m.options && typeof m.options !== "object") {
    errors.push({
      path: "options",
      message: "Options must be an object",
      severity: "error",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if modifier structure is valid
 */
function isValidModifierStructure(modifier: unknown): boolean {
  if (!modifier || typeof modifier !== "object") return false;

  const mod = modifier as Record<string, unknown>;
  const hasOneOf = "oneOf" in mod;
  const hasAnyOf = "anyOf" in mod;

  // Must have exactly one choice type
  if (!(hasOneOf || hasAnyOf)) return false;
  if (hasOneOf && hasAnyOf) return false;

  // Must have values
  if (!("values" in mod)) return false;

  return true;
}

/**
 * Check if a value is a valid manifest (quick check)
 */
export function isValidManifest(manifest: unknown): boolean {
  if (!manifest || typeof manifest !== "object") return false;

  const m = manifest as Record<string, unknown>;

  // Must have sets array
  if (!("sets" in m && Array.isArray(m.sets))) return false;

  // Sets must not be empty
  if (m.sets.length === 0) return false;

  // If modifiers exist, check basic structure
  if ("modifiers" in m && m.modifiers) {
    if (typeof m.modifiers !== "object") return false;

    for (const modifier of Object.values(m.modifiers)) {
      if (!isValidModifierStructure(modifier)) return false;
    }
  }

  return true;
}

/**
 * Validate manifest and return typed result
 */
export function validateAndParseManifest(
  manifest: unknown,
):
  | { valid: true; manifest: UPFTResolverManifest }
  | { valid: false; errors: ValidationError[] } {
  const result = validateManifestDocument(manifest);

  if (result.valid) {
    return { valid: true, manifest: manifest as UPFTResolverManifest };
  }

  return { valid: false, errors: result.errors };
}
