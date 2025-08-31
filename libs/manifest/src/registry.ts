/**
 * Manifest resolver registry for pluggable manifest format support
 */

import type { ManifestAST } from "@upft/ast";
import type { ValidationResult } from "@upft/foundation";

/**
 * Interface for manifest resolvers
 */
export interface ManifestResolver {
  /** Unique name for the resolver */
  name: string;
  /** Detect if a manifest object matches this format */
  detect(manifest: unknown): boolean;
  /** Parse manifest object into standardized ManifestAST */
  parse(manifest: unknown, path: string): ManifestAST;
  /** Optional validation for the manifest format */
  validate?(manifest: unknown): ValidationResult;
}

/**
 * Registry for manifest resolvers
 */
const manifestResolvers = new Map<string, ManifestResolver>();

/**
 * Register a new manifest resolver
 */
export function registerManifestResolver(resolver: ManifestResolver): void {
  manifestResolvers.set(resolver.name, resolver);
}

/**
 * Get all registered resolver names
 */
export function getRegisteredResolvers(): string[] {
  return Array.from(manifestResolvers.keys());
}

/**
 * Detect the manifest format from a manifest object
 */
export function detectManifestFormat(manifest: unknown): string | null {
  for (const resolver of manifestResolvers.values()) {
    if (resolver.detect(manifest)) {
      return resolver.name;
    }
  }
  return null;
}

/**
 * Parse a manifest object using the appropriate resolver
 */
export function parseManifestWithRegistry(
  manifest: unknown,
  path: string = "manifest.json",
): ManifestAST {
  const format = detectManifestFormat(manifest);
  if (!format) {
    const availableFormats = getRegisteredResolvers().join(", ");
    throw new Error(
      `Unknown manifest format. Available formats: ${availableFormats}`,
    );
  }

  const resolver = manifestResolvers.get(format);
  if (!resolver) {
    throw new Error(`No resolver found for format: ${format}`);
  }
  return resolver.parse(manifest, path);
}

/**
 * Validate a manifest object using the appropriate resolver
 */
export function validateManifestWithRegistry(
  manifest: unknown,
): ValidationResult {
  const format = detectManifestFormat(manifest);
  if (!format) {
    return {
      valid: false,
      errors: [
        {
          message: "Unknown manifest format",
          path: "manifest",
          severity: "error",
        },
      ],
      warnings: [],
    };
  }

  const resolver = manifestResolvers.get(format);
  if (!resolver) {
    return {
      valid: false,
      errors: [
        {
          message: `No resolver found for format: ${format}`,
          path: "manifest",
          severity: "error",
        },
      ],
      warnings: [],
    };
  }
  if (!resolver.validate) {
    // If no validation function, assume valid for detection
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  return resolver.validate(manifest);
}
