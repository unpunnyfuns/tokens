/**
 * Manifest resolver registry for pluggable manifest format support
 */

import type { ManifestAST } from "@upft/ast";
import type { ValidationResult } from "@upft/foundation";
// Statically import built-in resolvers for on-demand, synchronous registration
import { upftResolver } from "./resolvers/upft-resolver.js";
import { dtcgResolver } from "./resolvers/dtcg-resolver.js";
import { dtcgManifestResolver } from "./resolvers/dtcg-manifest-resolver.js";

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
 * Registry for manifest resolvers (default active registry)
 */
let activeRegistry: Map<string, ManifestResolver> = new Map();

/**
 * Ensure default (built-in) resolvers are present in the active registry.
 * This runs lazily on first use and is idempotent. It only mutates the
 * active registry; custom registries passed explicitly are respected.
 */
function ensureDefaultResolvers(
  registry: Map<string, ManifestResolver> = activeRegistry,
): void {
  if (registry !== activeRegistry) return; // don't mutate caller-provided registries
  // Register only missing built-ins
  if (!registry.has("upft")) registerManifestResolver(upftResolver, registry);
  if (!registry.has("dtcg")) registerManifestResolver(dtcgResolver, registry);
  if (!registry.has("dtcg-manifest"))
    registerManifestResolver(dtcgManifestResolver, registry);
}

/** Create a new empty registry */
export function createRegistry(): Map<string, ManifestResolver> {
  return new Map<string, ManifestResolver>();
}

/** Get the active registry */
export function getRegistry(): Map<string, ManifestResolver> {
  ensureDefaultResolvers(activeRegistry);
  return activeRegistry;
}

/** Replace the active registry */
export function setRegistry(registry: Map<string, ManifestResolver>): void {
  activeRegistry = registry;
}

/** Clear the active registry */
export function clearRegistry(): void {
  activeRegistry.clear();
}

/**
 * Register built-in resolvers into a registry (explicit opt-in)
 */
export async function registerBuiltInResolvers(
  registry: Map<string, ManifestResolver> = activeRegistry,
): Promise<void> {
  // Prefer dynamic import to keep bundles lean when consumers explicitly opt-in
  const [{ upftResolver }, { dtcgResolver }, { dtcgManifestResolver }] =
    await Promise.all([
      import("./resolvers/upft-resolver.js"),
      import("./resolvers/dtcg-resolver.js"),
      import("./resolvers/dtcg-manifest-resolver.js"),
    ]);
  registerManifestResolver(upftResolver, registry);
  registerManifestResolver(dtcgResolver, registry);
  registerManifestResolver(dtcgManifestResolver, registry);
}

/**
 * Register a new manifest resolver
 */
export function registerManifestResolver(
  resolver: ManifestResolver,
  registry: Map<string, ManifestResolver> = activeRegistry,
): void {
  if (registry.has(resolver.name)) {
    // Duplicate-name guard
    return;
  }
  registry.set(resolver.name, resolver);
}

/**
 * Get all registered resolver names
 */
export function getRegisteredResolvers(): string[] {
  return Array.from(activeRegistry.keys());
}

/**
 * Detect the manifest format from a manifest object
 */
export function detectManifestFormat(
  manifest: unknown,
  registry: Map<string, ManifestResolver> = activeRegistry,
): string | null {
  ensureDefaultResolvers(registry);
  for (const resolver of registry.values()) {
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
  registry: Map<string, ManifestResolver> = activeRegistry,
): ManifestAST {
  ensureDefaultResolvers(registry);
  const format = detectManifestFormat(manifest, registry);
  if (!format) {
    const availableFormats = Array.from(registry.keys()).join(", ");
    throw new Error(
      `Unknown manifest format. Available formats: ${availableFormats}`,
    );
  }

  const resolver = registry.get(format);
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
  registry: Map<string, ManifestResolver> = activeRegistry,
): ValidationResult {
  ensureDefaultResolvers(registry);
  const format = detectManifestFormat(manifest, registry);
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

  const resolver = registry.get(format);
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
