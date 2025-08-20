/**
 * Modifier validation logic
 */

import type { ValidationError } from "../../types/validation.js";

/**
 * Check if modifier has valid choice type
 */
export function validateModifierChoiceType(
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
export function validateModifierArrays(
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
export function validateModifierOptions(
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
export function validateModifier(
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
 * Validate modifiers section
 */
export function validateModifiers(
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
 * Check if modifier structure is valid
 */
export function isValidModifierStructure(modifier: unknown): boolean {
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
