/**
 * Standard types for validation module
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ResolveResult<T = Record<string, unknown>> {
  tokens: T | null;
  errors: string[];
}
