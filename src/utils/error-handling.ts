/**
 * Consistent error handling utilities
 */

import type { ValidationResult } from "../types.js";

/**
 * Create a validation error result
 */
export function createValidationError(
  message: string,
  path?: string,
): ValidationResult {
  return {
    valid: false,
    errors: [
      {
        message,
        path: path || "",
        severity: "error",
      },
    ],
    warnings: [],
  };
}

/**
 * Safely parse JSON with validation result
 */
export function safeParseJSON(
  content: string,
  filePath?: string,
): { data?: unknown; error?: ValidationResult } {
  try {
    return { data: JSON.parse(content) };
  } catch (error) {
    return {
      error: createValidationError(
        error instanceof Error ? error.message : String(error),
        filePath,
      ),
    };
  }
}

/**
 * Wrap async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    return {
      error: new Error(
        `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    };
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: Array<{ message: string; path?: string }>,
  prefix = "  - ",
): string {
  return errors
    .map((e) => `${prefix}${e.path ? `${e.path}: ` : ""}${e.message}`)
    .join("\n");
}
