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
export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
  rule?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Manifest types (used by filesystem and resolver layers)
export interface OneOfModifier {
  oneOf: string[];
  values: Record<string, string[]>;
  default?: string;
}

export interface AnyOfModifier {
  anyOf: string[];
  values: Record<string, string[]>;
}

export interface TokenSet {
  values: string[];
  name?: string;
}

export interface GenerateSpec {
  [modifierName: string]: string | string[] | "*";
  output?: string;
  includeSets?: string[]; // Include only these named sets
  excludeSets?: string[]; // Exclude these named sets
  includeModifiers?: string[]; // Include modifiers (name or name:value)
  excludeModifiers?: string[]; // Exclude modifiers (name or name:value)
}

export interface UPFTResolverManifest {
  $schema?: string;
  name?: string;
  description?: string;
  sets: TokenSet[];
  modifiers: Record<string, OneOfModifier | AnyOfModifier>;
  generate?: GenerateSpec[];
  options?: {
    resolveReferences?: boolean;
    validation?: {
      mode?: "strict" | "loose";
    };
  };
}

// Note: AST types are in ./ast/types.js
// Note: Filesystem types are in ./filesystem/types.js

// Bundle options
export interface BundleOptions {
  resolveReferences?: boolean;
  format?: "dtcg" | "json-schema";
  validate?: boolean;
  optimize?: boolean;
}

// CLI options
export interface CLIOptions {
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
  output?: string;
  noColors?: boolean;
}
