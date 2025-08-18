/**
 * API Convenience Layer
 * High-level functions for common token operations
 */

import { createAST } from "../ast/ast-builder.js";
import { TokenFileWriter } from "../io/file-writer.js";
import { resolvePermutation } from "../manifest/manifest-core.js";
import { readManifest } from "../manifest/manifest-reader.js";
import type { TokenDocument } from "../types.js";
import { validateTokens, validateManifest } from "../validation/index.js";
import {
  buildModifiers,
  createBundleMetadata,
  createValidationFunction,
  extractASTInfo,
  loadFromFiles,
  loadFromManifest,
} from "./bundle-helpers.js";
import type { ApiBundleOptions, BundleResult } from "./types.js";

// Re-export types
export type {
  ApiBundleOptions as BundleOptions,
  BundleMetadata,
  BundleResult,
  TokenAST,
} from "./types.js";

/**
 * Bundle tokens with metadata and validation
 */
export async function bundleWithMetadata(
  options: ApiBundleOptions,
): Promise<BundleResult> {
  const startTime = Date.now();
  const fileWriter = new TokenFileWriter();

  // Load tokens based on input type
  const { tokens, filePaths } = await loadTokens(options);

  // Build AST for analysis
  const ast = createAST(tokens);

  // Create metadata if requested
  const metadata = options.includeMetadata
    ? createBundleMetadata(tokens, filePaths, startTime)
    : undefined;

  // Create result object with methods
  return {
    tokens,
    ...(metadata && { metadata }),
    validate: createValidationFunction(tokens, ast),
    getAST: () => extractASTInfo(tokens, ast),
    write: async (path: string) => {
      await fileWriter.writeFile(path, tokens, {
        format: {
          type: options.format || "json",
          sortKeys: false,
        },
      });
    },
  };
}

/**
 * Load tokens based on bundle options
 */
async function loadTokens(
  options: ApiBundleOptions,
): Promise<{ tokens: TokenDocument; filePaths: string[] }> {
  if (options.manifest) {
    return loadFromManifest(options.manifest, buildModifiers(options));
  }
  if (options.files) {
    return loadFromFiles(options.files);
  }
  return { tokens: {}, filePaths: [] };
}

/**
 * Format error for display
 */
export function formatError(error: unknown, verbose = false): string {
  if (error instanceof Error) {
    if (verbose) {
      return `${error.message}\n${error.stack}`;
    }
    return error.message;
  }
  return String(error);
}

/**
 * Validate manifest with all permutations
 */
export async function validateManifestWithPermutations(
  manifestPath: string,
  options: {
    allPermutations?: boolean;
    crossPermutation?: boolean;
  } = {},
): Promise<{
  valid: boolean;
  errors: string[];
  permutationResults?: Array<{
    permutation: string;
    valid: boolean;
    errors: string[];
  }>;
}> {
  const manifest = await readManifest(manifestPath);

  // Validate manifest structure
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.valid) {
    return {
      valid: false,
      errors: manifestValidation.errors.map((e) => e.message),
    };
  }

  // Optionally validate all permutations
  if (options.allPermutations) {
    const permutationResults = [];
    const allModifierCombinations = generateAllCombinations(manifest.modifiers);

    for (const modifiers of allModifierCombinations) {
      const permId = Object.entries(modifiers)
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      try {
        const result = await resolvePermutation(manifest, modifiers);
        const validation = validateTokens(result.tokens);
        permutationResults.push({
          permutation: permId,
          valid: validation.valid,
          errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
        });
      } catch (error) {
        permutationResults.push({
          permutation: permId,
          valid: false,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    return {
      valid: permutationResults.every((r) => r.valid),
      errors: [],
      permutationResults,
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Generate all modifier combinations
 */
function generateAllCombinations(
  modifiers: Record<string, { oneOf?: string[]; anyOf?: string[] }>,
): Record<string, string>[] {
  const combinations: Record<string, string>[] = [];
  const modifierNames = Object.keys(modifiers || {});

  if (modifierNames.length === 0) return [{}];

  const getModifierValues = (modifier: {
    oneOf?: string[];
    anyOf?: string[];
  }): string[] => {
    if (modifier?.oneOf) return modifier.oneOf;
    if (modifier?.anyOf) return modifier.anyOf;
    return [];
  };

  function generate(index: number, current: Record<string, string>) {
    if (index === modifierNames.length) {
      combinations.push({ ...current });
      return;
    }

    const name = modifierNames[index];
    if (!name) return;

    const modifier = modifiers[name];
    if (!modifier) return;
    const values = getModifierValues(modifier);

    for (const value of values) {
      const newCurrent = { ...current, [name]: value };
      generate(index + 1, newCurrent);
    }
  }

  generate(0, {});
  return combinations;
}

// Re-export convenience functions from other modules
export { loadASTs } from "./workflows.js";
export { parseManifest } from "./manifest-helpers.js";

// Add resolveManifest function for backwards compatibility
import type {
  ResolutionInput,
  UPFTResolverManifest,
} from "../manifest/upft-types.js";
import type { TokenFileReader } from "../io/file-reader.js";

export async function resolveManifest(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
  options?: { fileReader?: TokenFileReader },
): Promise<{ id: string; tokens: TokenDocument }> {
  const { resolvePermutation } = await import("../manifest/manifest-core.js");
  return resolvePermutation(manifest, input, options);
}

// Add formatTokens function
export function formatTokens(tokens: TokenDocument): string {
  return JSON.stringify(tokens, null, 2);
}
