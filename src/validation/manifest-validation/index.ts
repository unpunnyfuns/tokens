/**
 * Functional manifest validation API
 */

import type { UPFTResolverManifest } from "../../manifest/upft-types.js";
import type {
  ValidationError,
  ValidationResult,
} from "../../types/validation.js";
import {
  isValidModifierStructure,
  validateModifiers,
} from "./modifier-validator.js";
import { validateOutput } from "./output-validator.js";
import { validateSets } from "./set-validator.js";

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
