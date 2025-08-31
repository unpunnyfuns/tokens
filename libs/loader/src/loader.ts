/**
 * File loader that orchestrates the UPFT pipeline
 *
 * Responsibilities:
 * 1. Use @upft/io to read files from disk
 * 2. Use @upft/schema-validator to validate against schemas
 * 3. Detect file types (tokens vs manifest)
 * 4. Follow references to load dependencies
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Use real implementations
import {
  detectFileType,
  type SchemaValidationOptions,
  validateManifest,
  validateTokenDocument,
} from "@upft/schema-validator";

const readFile = async (path: string, options: { encoding: "utf-8" }) => {
  return readFileSync(path, options);
};

import type { ManifestAST, TokenAST, UPFTResolverManifest } from "@upft/ast";
// Import AST types
import type { TokenDocument } from "@upft/foundation";
import type { FileInfo, LoadedFile, LoadOptions, LoadResult } from "./types.js";

/**
 * Parse a validated token document into AST using existing builders
 */
async function parseTokenDocument(
  data: TokenDocument,
  options: { filePath: string },
): Promise<{ ast: TokenAST; warnings: string[] }> {
  try {
    const { parseTokenDocument } = await import("@upft/tokens");
    const result = parseTokenDocument(data, {
      filePath: options.filePath,
      basePath: dirname(options.filePath),
    });

    return {
      ast: result.ast,
      warnings: result.warnings,
    };
  } catch (error) {
    const warnings = [
      `Failed to parse token document: ${error instanceof Error ? error.message : String(error)}`,
    ];

    // Return empty TokenAST on error
    const ast: TokenAST = {
      type: "file",
      path: options.filePath,
      name: options.filePath.split("/").pop() || "",
      filePath: options.filePath,
      crossFileReferences: new Map(),
      children: new Map(),
      tokens: new Map(),
      groups: new Map(),
    };

    return { ast, warnings };
  }
}

/**
 * Parse a validated manifest into AST structure
 */
function parseManifestDocument(
  data: UPFTResolverManifest,
  options: { filePath: string },
): { ast: ManifestAST; warnings: string[] } {
  const warnings: string[] = [];

  // Create ManifestAST structure
  const ast: ManifestAST = {
    type: "manifest",
    path: options.filePath,
    name: data.name || "unnamed",
    manifestType: "upft",
    sets: new Map(),
    modifiers: new Map(),
    permutations: new Map(),
  };

  return { ast, warnings };
}

export interface LoaderState {
  basePath: string;
  loadedFiles: Map<string, LoadedFile>;
}

export function createLoader(basePath: string = process.cwd()): LoaderState {
  return {
    basePath: resolve(basePath),
    loadedFiles: new Map(),
  };
}

/**
 * Load a single file (no dependency following - resolver handles that)
 */
export async function loadFile(
  state: LoaderState,
  filePath: string,
  options: LoadOptions = {},
): Promise<LoadResult> {
  const errors: string[] = [];
  const entryPath = resolve(state.basePath, filePath);

  try {
    await loadSingleFile(state, entryPath, options, errors);
  } catch (error) {
    errors.push(
      `Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    files: Array.from(state.loadedFiles.values()),
    errors,
    entryPoint: entryPath,
  };
}

/**
 * Load multiple files (no dependency following)
 */
export async function loadFiles(
  state: LoaderState,
  filePaths: string[],
  options: LoadOptions = {},
): Promise<LoadResult> {
  const errors: string[] = [];
  const entryPath = filePaths[0] ? resolve(state.basePath, filePaths[0]) : "";

  for (const filePath of filePaths) {
    try {
      await loadSingleFile(
        state,
        resolve(state.basePath, filePath),
        options,
        errors,
      );
    } catch (error) {
      errors.push(
        `Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    files: Array.from(state.loadedFiles.values()),
    errors,
    entryPoint: entryPath,
  };
}

/**
 * Clear loaded files cache
 */
export function clearCache(state: LoaderState): void {
  state.loadedFiles.clear();
}

export async function loadSingleFile(
  state: LoaderState,
  absolutePath: string,
  options: LoadOptions,
  errors: string[],
): Promise<void> {
  // Skip if already loaded
  if (state.loadedFiles.has(absolutePath)) {
    return;
  }

  // Phase 1: Read file content
  const content = await readFile(absolutePath, { encoding: "utf-8" });

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(content.toString());
  } catch (error) {
    throw new Error(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Phase 2: Detect file type
  const fileType = detectFileType(data);
  if (fileType === "unknown") {
    errors.push(`Could not determine file type for ${absolutePath}`);
  }

  // Phase 3: Schema validation
  const validation =
    options.validate !== false
      ? validateFile(data, fileType)
      : { valid: true, errors: [], warnings: [] };

  // Phase 4: Parse to AST if enabled and validation passed
  let ast: TokenAST | ManifestAST | undefined;
  let parseWarnings: string[] = [];

  if (
    options.parseToAST !== false &&
    validation.valid &&
    fileType !== "unknown"
  ) {
    try {
      const parseResult = await parseToAST(data, fileType, absolutePath);
      ast = parseResult.ast;
      parseWarnings = parseResult.warnings;
    } catch (error) {
      errors.push(
        `Failed to parse ${absolutePath} to AST: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Create file info
  const fileInfo: FileInfo = {
    path: absolutePath,
    content: content.toString(),
    type: fileType as "manifest" | "tokens" | "unknown",
  };

  const loadedFile: LoadedFile = {
    info: fileInfo,
    data,
    validation,
    ...(ast && { ast }),
    ...(parseWarnings.length > 0 && { parseWarnings }),
  };

  // Cache the loaded file
  state.loadedFiles.set(absolutePath, loadedFile);
}

function validateFile(data: unknown, fileType: string) {
  const schemaOptions: SchemaValidationOptions = {};

  switch (fileType) {
    case "manifest":
      return validateManifest(data, schemaOptions);
    case "tokens":
      return validateTokenDocument(data, schemaOptions);
    default:
      return {
        valid: false,
        errors: [
          {
            message: `Unknown file type: ${fileType}`,
            path: "",
            severity: "error" as const,
          },
        ],
        warnings: [],
      };
  }
}

async function parseToAST(data: unknown, fileType: string, filePath: string) {
  switch (fileType) {
    case "tokens":
      return await parseTokenDocument(data as TokenDocument, { filePath });
    case "manifest":
      return parseManifestDocument(data as UPFTResolverManifest, { filePath });
    default:
      throw new Error(`Cannot parse file type: ${fileType}`);
  }
}
