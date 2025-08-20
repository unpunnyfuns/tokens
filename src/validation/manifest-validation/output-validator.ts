/**
 * Output configuration validation
 */

import type { ValidationError } from "../../types/validation.js";

/**
 * Validate output configuration
 */
export function validateOutput(
  output: unknown,
  errors: ValidationError[],
): void {
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
