/**
 * Core type definitions for the design token platform
 */

// Token value types based on DTCG specification
export type TokenValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

// Base token structure
export interface Token {
  $value?: TokenValue;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

// Token or token group
export type TokenOrGroup = Token | TokenGroup;

// Token group (contains nested tokens/groups)
export interface TokenGroup {
  $description?: string;
  $type?: string;
  [key: string]: TokenOrGroup | string | undefined;
}

// Token document (root level)
export interface TokenDocument {
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: TokenOrGroup | string | Record<string, unknown> | undefined;
}

// Reference formats
export type DTCGReference = string; // {colors.primary}
export type JSONSchemaReference = string; // #/colors/primary/$value

// Validation types
export type {
  ValidationError,
  ValidationResult,
  ValidationResultWithStats,
  TokenValidationResult,
  ManifestValidationResult,
} from "./types/validation.js";

// Type organization:
// - Core token types: This file
// - Validation types: ./types/validation.ts
// - Option types: ./types/options.ts
// - AST types: ./ast/types.ts
// - Filesystem types: ./filesystem/types.ts
// - Resolver types: ./resolver/upft-types.ts
// - All types: ./types/index.ts (centralized exports)

// CLI options (move to options.ts in future)
export interface CLIOptions {
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
  output?: string;
  noColors?: boolean;
}
