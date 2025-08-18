/**
 * Types for the UPFT resolver format
 * Using JSON Schema terminology and explicit structure
 */

import type { TokenDocument } from "../types.js";

/**
 * Modifier with oneOf constraint (exactly one value)
 */
export interface OneOfModifier {
  oneOf: string[];
  values: Record<string, string[]>; // Map of option name to file paths
  default?: string; // First item is default if not specified
}

/**
 * Modifier with anyOf constraint (zero or more values)
 */
export interface AnyOfModifier {
  anyOf: string[];
  values: Record<string, string[]>; // Map of option name to file paths
}

/**
 * Set of base token files
 */
export interface TokenSet {
  values: string[]; // File paths
  name?: string; // Optional name for documentation
}

/**
 * Generation specification for selective output
 */
export interface GenerateSpec {
  [modifierName: string]: string | string[] | "*"; // '*' for all anyOf options
  output?: string; // Optional custom output path
  includeSets?: string[]; // Include only these named sets
  excludeSets?: string[]; // Exclude these named sets
  includeModifiers?: string[]; // Include modifiers (name or name:value)
  excludeModifiers?: string[]; // Exclude modifiers (name or name:value)
}

/**
 * UPFT resolver manifest
 */
export interface UPFTResolverManifest {
  $schema?: string; // e.g., "https://tokens.unpunny.fun/schemas/manifest/upft.json"
  name?: string;
  description?: string;

  // Base token sets (always included)
  sets: TokenSet[];

  // Modifiers with JSON Schema constraints
  modifiers: Record<string, OneOfModifier | AnyOfModifier>;

  // Optional selective generation
  generate?: GenerateSpec[];

  // Options
  options?: {
    resolveReferences?: boolean; // Default: false
    validation?: {
      mode?: "strict" | "loose"; // Default: strict
    };
  };
}

/**
 * Input for resolving a specific permutation
 */
export interface ResolutionInput {
  [modifierName: string]: string | string[] | null;
}

/**
 * Validation result for inputs
 */
export interface InputValidation {
  valid: boolean;
  errors: Array<{
    modifier: string;
    message: string;
    received: unknown;
    expected: string;
  }>;
}

/**
 * Resolved permutation result
 */
export interface ResolvedPermutation {
  id: string;
  input: ResolutionInput;
  files: string[]; // All files that were merged
  tokens: TokenDocument; // Merged tokens
  resolvedTokens?: TokenDocument; // If resolveReferences is true
  output?: string; // Custom output path if specified
}

/**
 * Type guards
 */
export function isOneOfModifier(
  modifier: OneOfModifier | AnyOfModifier,
): modifier is OneOfModifier {
  return "oneOf" in modifier;
}

export function isAnyOfModifier(
  modifier: OneOfModifier | AnyOfModifier,
): modifier is AnyOfModifier {
  return "anyOf" in modifier;
}

/**
 * Check if a manifest is UPFT resolver format
 */
export function isUPFTManifest(
  manifest: unknown,
): manifest is UPFTResolverManifest {
  if (!manifest || typeof manifest !== "object") return false;
  const m = manifest as Record<string, unknown>;

  // UPFT format has modifiers as an object with oneOf/anyOf structure
  return Boolean(
    m.modifiers &&
      typeof m.modifiers === "object" &&
      !Array.isArray(m.modifiers),
  );
}
