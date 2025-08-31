/**
 * Validation command implementation using high-level APIs
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { analyzeTokens } from "@upft/analysis";
import type { ValidationResult } from "@upft/foundation";
import { runPipeline } from "@upft/loader";

/**
 * Validate a manifest file (use high-level API)
 */
export async function validateManifestObject(
  manifestPath: string,
): Promise<ValidationResult> {
  return validateManifestWithOptions(manifestPath, { allPermutations: false });
}

/**
 * Validate a token file using analysis
 */
export async function validateTokenFile(
  filePath: string,
): Promise<ValidationResult> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    // Use analysis to detect issues
    const analysis = analyzeTokens(data);
    const errors: ValidationResult["errors"] = [];

    // Check for unresolved references
    if (analysis.unresolvedReferences.length > 0) {
      errors.push(
        ...analysis.unresolvedReferences.map((ref) => ({
          message: `Unresolved reference: ${ref}`,
          path: filePath,
          severity: "error" as const,
        })),
      );
    }

    // Check for circular references
    if (analysis.circularReferences.length > 0) {
      errors.push(
        ...analysis.circularReferences.map((ref) => ({
          message: `Circular reference detected: ${ref}`,
          path: filePath,
          severity: "error" as const,
        })),
      );
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
 * Validate manifest using modern pipeline API
 */
export async function validateManifestWithOptions(
  manifestPath: string,
  _options?: { allPermutations?: boolean },
): Promise<ValidationResult> {
  try {
    const result = await runPipeline(manifestPath, {
      basePath: dirname(manifestPath),
      validate: true,
      parseToAST: true,
    });

    if (result.errors.length > 0) {
      return {
        valid: false,
        errors: result.errors.map((e) => ({
          message: e,
          path: manifestPath,
          severity: "error" as const,
        })),
        warnings: [],
      };
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          message: `Failed to validate manifest: ${error instanceof Error ? error.message : String(error)}`,
          path: manifestPath,
          severity: "error",
        },
      ],
      warnings: [],
    };
  }
}
