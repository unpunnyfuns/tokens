/**
 * Workflow utilities for common token operations
 */

import { compareTokenDocumentsDetailed } from "../analysis/token-comparison.js";
import { createAST } from "../ast/ast-builder.js";
import { findAllTokens, findTokensByType } from "../ast/query.js";
import type { ASTNode } from "../ast/types.js";
import { merge } from "../core/merge.js";
import { resolvePermutation } from "../manifest/manifest-core.js";
import { readManifest } from "../manifest/manifest-reader.js";
import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import type { TokenDocument } from "../types.js";
import { TokenFileSystem } from "./token-file-system.js";

/**
 * Modifier option structure
 */
interface ModifierOption {
  name: string;
  values: string[];
}

/**
 * Get modifier options in a structured format
 */
function getModifierOptions(manifest: UPFTResolverManifest): ModifierOption[] {
  if (!manifest.modifiers) return [];

  return Object.entries(manifest.modifiers).map(([name, modifier]) => ({
    name,
    values:
      "oneOf" in modifier
        ? modifier.oneOf
        : "anyOf" in modifier
          ? modifier.anyOf
          : [],
  }));
}

/**
 * Result of building AST with optional resolver metadata
 */
export interface ASTWithMetadata {
  ast: ASTNode;
  resolver?: {
    currentPermutation: { id: string };
    groups: string[];
    availablePermutations: Array<{ id: string }>;
    modifierOptions: Array<{
      name: string;
      values: string[];
    }>;
  };
}

/**
 * Load AST from file system
 */
export async function loadASTs(fs: TokenFileSystem): Promise<ASTWithMetadata> {
  const documents = fs.getDocuments();

  // Merge all documents
  const bundled: TokenDocument =
    documents.length > 0
      ? documents.reduce((acc, doc) => merge(acc, doc), {} as TokenDocument)
      : {};

  // Create AST
  const ast = createAST(bundled);

  // Build result with optional resolver metadata
  const result: ASTWithMetadata = { ast };

  const manifests = fs.getManifests();
  if (manifests.length > 0) {
    const manifest = manifests[0]; // Use first manifest
    if (manifest?.modifiers) {
      result.resolver = {
        currentPermutation: { id: "default" },
        groups: Object.keys(manifest.modifiers),
        availablePermutations: generatePermutations(manifest),
        modifierOptions: getModifierOptions(manifest),
      };
    }
  }

  return result;
}

/**
 * Generate all permutations from manifest
 */
function generatePermutations(
  manifest: UPFTResolverManifest,
): Array<{ id: string }> {
  const permutations: Array<{ id: string }> = [];
  const modifiers = manifest.modifiers || {};
  const modifierNames = Object.keys(modifiers);

  if (modifierNames.length === 0) {
    return [{ id: "default" }];
  }

  const getModifierValues = (modifier: {
    oneOf?: string[];
    anyOf?: string[];
  }): string[] => {
    if (modifier?.oneOf) return modifier.oneOf;
    if (modifier?.anyOf) return modifier.anyOf;
    return [];
  };

  const generateId = (current: Record<string, string>): string => {
    return Object.entries(current)
      .map(([k, v]) => `${k}-${v}`)
      .join("_");
  };

  function generate(index: number, current: Record<string, string>) {
    if (index === modifierNames.length) {
      permutations.push({ id: generateId(current) });
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
  return permutations;
}

/**
 * Compare two permutations
 */
export async function compare(
  manifestPath: string,
  modifiers1: Record<string, string>,
  modifiers2: Record<string, string>,
): Promise<{
  differences: Array<{
    path: string;
    value1: unknown;
    value2: unknown;
  }>;
  stats: {
    totalTokens: number;
    differentTokens: number;
    addedTokens: number;
    removedTokens: number;
  };
}> {
  const manifest = await readManifest(manifestPath);

  // Resolve both permutations
  const result1 = await resolvePermutation(manifest, modifiers1);
  const result2 = await resolvePermutation(manifest, modifiers2);

  // Use shared comparison utility
  const comparison = compareTokenDocumentsDetailed(
    result1.tokens,
    result2.tokens,
  );

  // Transform to match existing interface
  const differences = comparison.differences.map((diff) => ({
    path: diff.path,
    value1: diff.leftValue,
    value2: diff.rightValue,
  }));

  // Get token counts for stats
  const ast1 = createAST(result1.tokens);
  const ast2 = createAST(result2.tokens);
  const tokens1 = findAllTokens(ast1);
  const tokens2 = findAllTokens(ast2);

  return {
    differences,
    stats: {
      totalTokens: Math.max(tokens1.length, tokens2.length),
      differentTokens: comparison.summary.changed,
      addedTokens: comparison.summary.added,
      removedTokens: comparison.summary.removed,
    },
  };
}

/**
 * Workflow utilities collection
 */
export const workflows = {
  compare,
  loadASTs,

  /**
   * Extract tokens by type
   */
  extractByType(document: TokenDocument, type: string): TokenDocument {
    const ast = createAST(document);
    const tokens = findTokensByType(ast, type);
    const result: TokenDocument = {};

    // Rebuild document with only matching tokens
    for (const token of tokens) {
      const pathParts = token.path.split(".");
      let current: Record<string, unknown> = result;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (part && !current[part]) {
          current[part] = {};
        }
        if (part) {
          current = current[part] as Record<string, unknown>;
        }
      }

      const leafName = pathParts[pathParts.length - 1];
      if (leafName) {
        current[leafName] = {
          $type: token.tokenType,
          $value: token.value,
        };
      }
    }

    return result;
  },

  /**
   * Find tokens with specific value
   */
  findByValue(
    document: TokenDocument,
    value: unknown,
  ): Array<{ path: string; token: unknown }> {
    const results: Array<{ path: string; token: unknown }> = [];
    const targetValue = JSON.stringify(value);

    const isToken = (obj: Record<string, unknown>): boolean => {
      return "$value" in obj;
    };

    const hasMatchingValue = (obj: Record<string, unknown>): boolean => {
      return JSON.stringify(obj.$value) === targetValue;
    };

    function traverse(obj: unknown, path: string[] = []) {
      if (!obj || typeof obj !== "object") return;

      const record = obj as Record<string, unknown>;

      if (isToken(record) && hasMatchingValue(record)) {
        results.push({
          path: path.join("."),
          token: obj,
        });
      }

      for (const key in record) {
        if (!key.startsWith("$")) {
          traverse(record[key], [...path, key]);
        }
      }
    }

    traverse(document);
    return results;
  },
};

// Export types and classes
export { TokenFileSystem };
export type { TokenDocument, UPFTResolverManifest, ASTNode };
