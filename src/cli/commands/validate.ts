/**
 * Validation command implementation
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  ManifestValidator,
  TokenValidator,
  validateResolver,
} from "../../api/index.js";
import type { ValidationResult } from "../../types.js";

/**
 * Validate a resolver manifest
 */
export async function validateManifest(
  manifest: unknown,
): Promise<ValidationResult> {
  const manifestValidator = new ManifestValidator();
  return manifestValidator.validateManifest(manifest);
}

/**
 * Validate a token file
 */
export async function validateTokenFile(
  filePath: string,
): Promise<ValidationResult> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    const tokenValidator = new TokenValidator();
    return tokenValidator.validateDocument(data);
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          path: filePath,
          severity: "error",
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Validate all token files in a directory
 */
export async function validateDirectory(
  dirPath: string,
): Promise<ValidationResult> {
  const errors: ValidationResult["errors"] = [];

  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = join(dirPath, file);
      const result = await validateTokenFile(filePath);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          path: dirPath,
          severity: "error",
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Validate using API function for resolver manifests
 */
export async function validateResolverManifest(
  manifestPath: string,
  options?: { allPermutations?: boolean },
) {
  return validateResolver(manifestPath, options);
}
