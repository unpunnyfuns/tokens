/**
 * Pure validation functions for resolver inputs and manifests
 * Extracted from UPFTResolver class for functional composition
 */

import type {
  UPFTResolverManifest,
  ResolutionInput,
  InputValidation,
  OneOfModifier,
  AnyOfModifier,
} from "./upft-types.js";
import { isAnyOfModifier, isOneOfModifier } from "./upft-types.js";

/**
 * Validate input against resolver modifiers
 */
export function validateInput(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
): InputValidation {
  const errors: InputValidation["errors"] = [];

  // Validate known modifiers
  for (const [modifierName, modifierDef] of Object.entries(
    manifest.modifiers,
  )) {
    const inputValue = input[modifierName];

    if (isOneOfModifier(modifierDef)) {
      const oneOfErrors = validateOneOfInput(
        modifierName,
        modifierDef,
        inputValue,
      );
      errors.push(...oneOfErrors);
    } else if (isAnyOfModifier(modifierDef)) {
      const anyOfErrors = validateAnyOfInput(
        modifierName,
        modifierDef,
        inputValue,
      );
      errors.push(...anyOfErrors);
    }
  }

  // Check for unknown modifiers
  const unknownErrors = validateUnknownModifiers(manifest, input);
  errors.push(...unknownErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate oneOf modifier input
 */
export function validateOneOfInput(
  modifierName: string,
  modifierDef: OneOfModifier,
  inputValue: unknown,
): InputValidation["errors"] {
  const errors: InputValidation["errors"] = [];

  // Use default if not specified
  if (inputValue === null || inputValue === undefined) {
    return errors;
  }

  if (typeof inputValue !== "string") {
    errors.push({
      modifier: modifierName,
      message: `oneOf modifier expects a single string value, got ${typeof inputValue}`,
      received: inputValue,
      expected: `one of: ${modifierDef.oneOf.join(", ")}`,
    });
    return errors;
  }

  if (!modifierDef.oneOf.includes(inputValue)) {
    errors.push({
      modifier: modifierName,
      message: `Invalid value for oneOf modifier`,
      received: inputValue,
      expected: `one of: ${modifierDef.oneOf.join(", ")}`,
    });
  }

  return errors;
}

/**
 * Validate anyOf modifier input
 */
export function validateAnyOfInput(
  modifierName: string,
  modifierDef: AnyOfModifier,
  inputValue: unknown,
): InputValidation["errors"] {
  const errors: InputValidation["errors"] = [];

  // Empty is valid for anyOf
  if (
    inputValue === null ||
    inputValue === undefined ||
    (Array.isArray(inputValue) && inputValue.length === 0)
  ) {
    return errors;
  }

  if (!Array.isArray(inputValue)) {
    errors.push({
      modifier: modifierName,
      message: `anyOf modifier expects an array of strings, got ${typeof inputValue}`,
      received: inputValue,
      expected: `array containing any of: ${modifierDef.anyOf.join(", ")}`,
    });
    return errors;
  }

  for (const value of inputValue) {
    if (typeof value !== "string") {
      errors.push({
        modifier: modifierName,
        message: `anyOf modifier array must contain only strings`,
        received: value,
        expected: "string",
      });
    } else if (!modifierDef.anyOf.includes(value)) {
      errors.push({
        modifier: modifierName,
        message: `Invalid value in anyOf modifier array`,
        received: value,
        expected: `one of: ${modifierDef.anyOf.join(", ")}`,
      });
    }
  }

  return errors;
}

/**
 * Check for unknown modifiers in input
 */
export function validateUnknownModifiers(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
): InputValidation["errors"] {
  const errors: InputValidation["errors"] = [];

  for (const modifierName of Object.keys(input)) {
    if (!(modifierName in manifest.modifiers) && modifierName !== "output") {
      errors.push({
        modifier: modifierName,
        message: "Unknown modifier",
        received: modifierName,
        expected: `one of: ${Object.keys(manifest.modifiers).join(", ")}`,
      });
    }
  }

  return errors;
}
