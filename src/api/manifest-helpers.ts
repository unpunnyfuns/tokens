/**
 * Manifest helper functions
 */

import { ManifestValidator } from "../validation/manifest-validator.js";
import type { UPFTResolverManifest } from "../resolver/upft-types.js";

export interface ParsedManifest {
  valid: boolean;
  manifest?: UPFTResolverManifest;
  errors: string[];
}

/**
 * Parse and validate a manifest
 */
export async function parseManifest(
  manifest: unknown,
): Promise<ParsedManifest> {
  const validator = new ManifestValidator();

  try {
    const validation = validator.validateManifest(manifest);

    const result: ParsedManifest = {
      valid: validation.valid,
      errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
    };

    if (validation.valid) {
      result.manifest = manifest as UPFTResolverManifest;
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
