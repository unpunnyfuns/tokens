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
  message: string;
  path: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationStats {
  totalTokens: number;
  totalGroups: number;
  totalReferences: number;
}

export interface ValidationResultWithStats extends ValidationResult {
  stats: ValidationStats;
}

export interface TokenValidationResult extends ValidationResult {
  tokenPath?: string;
}

export interface ManifestValidationResult extends ValidationResult {
  manifestPath?: string;
}

// Manifest types
export interface OneOfModifier {
  oneOf: string[];
  values: Record<string, string[]>;
  default?: string;
  description?: string;
}

export interface AnyOfModifier {
  anyOf: string[];
  values: Record<string, string[]>;
  default?: string[];
  description?: string;
}

export interface TokenSet {
  files?: string[];
  values?: string[];
  name?: string;
  description?: string;
}

export interface GenerateSpec {
  [modifierName: string]: string | string[] | "*";
  output?: string;
  includeSets?: string[];
  excludeSets?: string[];
  includeModifiers?: string[];
  excludeModifiers?: string[];
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

// CLI options
export interface CLIOptions {
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
  output?: string;
  noColors?: boolean;
}

// File I/O interfaces for dependency injection
export interface FileReader {
  readFile(path: string, encoding?: string): Promise<string>;
}

export interface FileWriter {
  writeFile(path: string, content: string): Promise<void>;
}

// Token file metadata
export interface TokenFile {
  filePath: string;
  tokens: TokenDocument;
  format: "json" | "json5" | "yaml";
  metadata: {
    lastModified?: Date;
    size?: number;
    references?: Set<string>;
  };
}

// Token-specific file I/O interfaces
export interface TokenFileReader {
  readFile(
    filePath: string,
    options?: { resolveImports?: boolean; cache?: boolean; validate?: boolean },
  ): Promise<TokenFile>;
}

export interface TokenFileWriter {
  writeFile(
    filePath: string,
    tokens: TokenDocument,
    options?: {
      format?: { type?: string; indent?: number | string };
      atomic?: boolean;
      validate?: boolean;
      backup?: boolean;
    },
  ): Promise<void>;
  write(filePath: string, content: string): Promise<void>;
}

// CLI command options
export interface CLICommandOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
  outputDir?: string;
  skipValidation?: boolean;
  strict?: boolean;
}

// Build configuration types
export interface BuildConfigTransform {
  /** Transform name (builtin, local file, or package) */
  name: string;
  /** Transform options */
  options?: Record<string, unknown>;
}

export interface BuildConfigOutput {
  /** Output identifier */
  name: string;
  /** Modifier values for this output */
  modifiers: Record<string, string | string[]>;
  /** Output configuration */
  output: {
    /** Output file path (supports {modifier} templating) */
    path: string;
    /** Output format */
    format?: "json" | "yaml" | "json5";
    /** Prettify output */
    prettify?: boolean;
  };
  /** Output-specific transforms */
  transforms?: BuildConfigTransform[];
}

export interface BuildConfigValidation {
  /** Fail on validation warnings */
  strict?: boolean;
  /** Skip bundle validation */
  skipValidation?: boolean;
}

export interface BuildConfig {
  /** Schema reference */
  $schema?: string;
  /** Path to manifest file */
  manifest: string;
  /** Output configurations */
  outputs: BuildConfigOutput[];
  /** Global transforms applied to all outputs */
  transforms?: BuildConfigTransform[];
  /** Validation configuration */
  validation?: BuildConfigValidation;
}

/**
 * Type guard for build config
 */
export function isBuildConfig(obj: unknown): obj is BuildConfig {
  const config = obj as BuildConfig;
  return (
    config &&
    typeof config === "object" &&
    typeof config.manifest === "string" &&
    Array.isArray(config.outputs) &&
    config.outputs.every(isBuildConfigOutput)
  );
}

/**
 * Type guard for build config output
 */
export function isBuildConfigOutput(obj: unknown): obj is BuildConfigOutput {
  const output = obj as BuildConfigOutput;
  return (
    output &&
    typeof output === "object" &&
    typeof output.name === "string" &&
    output.modifiers &&
    typeof output.modifiers === "object" &&
    output.output &&
    typeof output.output === "object" &&
    typeof output.output.path === "string"
  );
}

/**
 * Type guard for transform
 */
export function isBuildConfigTransform(
  obj: unknown,
): obj is BuildConfigTransform {
  const transform = obj as BuildConfigTransform;
  return (
    transform &&
    typeof transform === "object" &&
    typeof transform.name === "string"
  );
}

/**
 * Type guard to check if an object is a valid UPFT resolver manifest.
 *
 * @param manifest - The object to check
 * @returns True if the object is a valid UPFT resolver manifest
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
