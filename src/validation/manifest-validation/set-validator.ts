/**
 * Set validation logic
 */

import type { ValidationError } from "../../types/validation.js";

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
export function validateSet(
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
 * Validate sets section
 */
export function validateSets(
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
