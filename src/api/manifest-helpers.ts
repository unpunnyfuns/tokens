/**
 * Manifest helper functions
 */

import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import { validateManifest } from "../validation/index.js";

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
  try {
    const validation = validateManifest(manifest);

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
