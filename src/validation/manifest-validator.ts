import type { UPFTResolverManifest } from "../resolver/upft-types.js";
import type { ValidationError, ValidationResult } from "../types.js";

/**
 * Validator specifically for UPFT resolver manifests
 */
export class ManifestValidator {
  private validateSet(
    set: unknown,
    index: number,
    errors: ValidationError[],
  ): void {
    const s = set as Record<string, unknown>;

    if (!(s.values && Array.isArray(s.values))) {
      errors.push({
        path: `sets[${index}].values`,
        message: "Set must have a values array",
        severity: "error",
      });
      return;
    }

    (s.values as unknown[]).forEach((value: unknown, vIndex: number) => {
      if (typeof value !== "string") {
        errors.push({
          path: `sets[${index}].values[${vIndex}]`,
          message: "Value must be a string (file path)",
          severity: "error",
        });
      }
    });
  }

  private validateSets(
    manifest: Record<string, unknown>,
    errors: ValidationError[],
  ): void {
    if (!(manifest.sets && Array.isArray(manifest.sets))) {
      errors.push({
        path: "sets",
        message: "Missing or invalid sets array",
        severity: "error",
      });
      return;
    }

    manifest.sets.forEach((set: unknown, index: number) => {
      this.validateSet(set, index, errors);
    });
  }

  private validateModifierOptions(
    name: string,
    mod: Record<string, unknown>,
    options: unknown,
    errors: ValidationError[],
  ): void {
    if (!Array.isArray(options)) return;

    for (const option of options as string[]) {
      if (!(mod.values as Record<string, unknown>)?.[option]) {
        errors.push({
          path: `modifiers.${name}.values.${option}`,
          message: `Missing values for option '${option}'`,
          severity: "error",
        });
      }
    }
  }

  private validateModifier(
    name: string,
    modifier: unknown,
    errors: ValidationError[],
  ): void {
    const mod = modifier as Record<string, unknown>;
    const hasOneOf = mod?.oneOf;
    const hasAnyOf = mod?.anyOf;

    if (!(hasOneOf || hasAnyOf)) {
      errors.push({
        path: `modifiers.${name}`,
        message: "Modifier must have either oneOf or anyOf",
        severity: "error",
      });
    }

    if (!mod.values || typeof mod.values !== "object") {
      errors.push({
        path: `modifiers.${name}.values`,
        message: "Modifier must have a values object",
        severity: "error",
      });
    }

    if (hasOneOf && hasAnyOf) {
      errors.push({
        path: `modifiers.${name}`,
        message: "Modifier cannot have both oneOf and anyOf",
        severity: "error",
      });
      return;
    }

    const options = hasOneOf ? mod.oneOf : hasAnyOf ? mod.anyOf : [];
    this.validateModifierOptions(name, mod, options, errors);
  }

  private validateModifiers(
    manifest: Record<string, unknown>,
    errors: ValidationError[],
  ): void {
    if (!manifest.modifiers || typeof manifest.modifiers !== "object") {
      errors.push({
        path: "modifiers",
        message: "Missing or invalid modifiers object",
        severity: "error",
      });
      return;
    }

    for (const [name, modifier] of Object.entries(
      manifest.modifiers as Record<string, unknown>,
    )) {
      this.validateModifier(name, modifier, errors);
    }
  }
  /**
   * Validate a manifest structure
   */
  validateManifest(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!manifest || typeof manifest !== "object") {
      errors.push({
        path: "",
        message: "Manifest must be an object",
        severity: "error",
      });
      return { valid: false, errors, warnings: [] };
    }

    const m = manifest as Record<string, unknown>;

    // Validate structure
    this.validateSets(m, errors);
    this.validateModifiers(m, errors);

    // Check for generate field if present
    if (m.generate !== undefined && !Array.isArray(m.generate)) {
      errors.push({
        path: "generate",
        message: "Generate field must be an array",
        severity: "error",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Type guard to check if object is a valid manifest
   */
  isValidManifest(obj: unknown): obj is UPFTResolverManifest {
    const result = this.validateManifest(obj);
    return result.valid;
  }
}
