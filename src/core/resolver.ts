/**
 * @module core/resolver
 * @description Core reference resolution API - clean barrel file
 */

// Core resolver functionality
export { ReferenceResolver, type ResolverOptions } from "./resolver-core.ts";

// Legacy export for backwards compatibility
export function validateReferences(_tokens: unknown): string[] {
  // This is a stub function for backward compatibility
  return [];
}

// File loading utilities
export {
  clearFileCache,
  createFileCache,
  getCacheStats,
  loadExternalFile,
} from "./file-loader.ts";

// Reference map and value lookup
export {
  buildReferenceMap,
  createPointerFromPath,
  getPathFromPointer,
  getValueByPath,
  type TokenValue,
} from "./reference-map.ts";
// Reference parsing utilities
export {
  isValidReferenceFormat,
  normalizeReference,
  parseReference,
} from "./reference-parser.ts";

// Re-export the convenience function
import { ReferenceResolver, type ResolverOptions } from "./resolver-core.ts";

/**
 * Convenience function to resolve all references in tokens
 */
export async function resolveReferences(
  tokens: Record<string, unknown>,
  options?: ResolverOptions,
): Promise<Record<string, unknown>> {
  // If mode is explicitly false, return tokens unchanged
  if (options?.mode === false) {
    return tokens;
  }

  const resolver = new ReferenceResolver(tokens, options);
  return resolver.resolveTree(tokens) as Promise<Record<string, unknown>>;
}
