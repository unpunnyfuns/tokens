/**
 * API Convenience Layer
 * High-level functions for common token operations
 */

import { buildASTFromDocument } from "../ast/ast-builder.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import { readManifest } from "../resolver/manifest-reader.js";
import { resolvePermutation } from "../resolver/resolver-core.js";
import type { TokenDocument } from "../types.js";
import { ManifestValidator } from "../validation/manifest-validator.js";
import { TokenValidator } from "../validation/validator.js";
import {
  buildModifiers,
  loadFromManifest,
  loadFromFiles,
  createBundleMetadata,
  createValidationFunction,
  extractASTInfo,
} from "./bundle-helpers.js";
import type { BundleOptions, BundleResult } from "./types.js";

// Re-export types
export type {
  BundleOptions,
  BundleResult,
  BundleMetadata,
  TokenAST,
} from "./types.js";

/**
 * Bundle tokens with metadata and validation
 */
export async function bundleWithMetadata(
  options: BundleOptions,
): Promise<BundleResult> {
  const startTime = Date.now();
  const fileWriter = new TokenFileWriter();

  // Load tokens based on input type
  const { tokens, filePaths } = await loadTokens(options);

  // Build AST for analysis
  const ast = buildASTFromDocument(tokens);

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
  options: BundleOptions,
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
 * Validate resolver manifest
 */
export async function validateResolver(
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
  const validator = await TokenValidator.create();
  const manifestValidator = new ManifestValidator();

  const manifest = await readManifest(manifestPath);

  // Validate manifest structure
  const manifestValidation = manifestValidator.validateManifest(manifest);
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
        const validation = await validator.validateDocument(result.tokens);
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

// Re-export validators for commands
export { ManifestValidator, TokenValidator };
