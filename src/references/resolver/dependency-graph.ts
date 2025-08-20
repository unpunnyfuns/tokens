/**
 * Dependency graph utilities for reference resolution
 */

import { buildPathIndex } from "../../core/path-index.js";
import type { TokenDocument } from "../../types.js";
import { extractReferencesFromToken } from "./reference-utils.js";

/**
 * Get all references in a token document
 */
export function getAllReferences(
  document: TokenDocument,
): Map<string, string[]> {
  const references = new Map<string, string[]>();
  const index = buildPathIndex(document);

  for (const [path, token] of index.tokens) {
    const refs = extractReferencesFromToken(token);
    if (refs.length > 0) {
      references.set(path, refs);
    }
  }

  return references;
}

/**
 * Build a dependency graph of references
 */
export function buildDependencyGraph(document: TokenDocument): {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
} {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  const references = getAllReferences(document);

  for (const [path, refs] of references) {
    // This token depends on these references
    dependencies.set(path, new Set(refs));

    // These references have this token as a dependent
    for (const ref of refs) {
      if (!dependents.has(ref)) {
        dependents.set(ref, new Set());
      }
      dependents.get(ref)?.add(path);
    }
  }

  return { dependencies, dependents };
}
