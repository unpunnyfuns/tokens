/**
 * @module validation/cli-validator
 * @description CLI-oriented validation functions with formatted console output.
 * Wraps the pure token-validator functions to provide user-friendly terminal output.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { validateTokenFile, validateTokenFiles } from "./token-validator.ts";
import { findJsonFiles, getProjectRoot } from "./utils.ts";

/**
 * Validates all JSON files in a directory or a single file and outputs results to console.
 * Automatically finds and preloads schema files for validation.
 * @param path - Directory path containing JSON token files or a single file to validate
 * @returns True if all files are valid, false otherwise
 * @example
 * const success = await validateFiles("/project/tokens")
 * // Outputs:
 * // ✅ Validation successful for tokens/colors.json
 * // ❌ Validation failed for tokens/invalid.json
 * //   - Missing required property: $value
 */
export async function validateFiles(path: string): Promise<boolean> {
  try {
    // Check if path is a file or directory
    const stats = await fs.stat(path);
    let jsonFiles: string[];

    if (stats.isFile()) {
      console.log(`Validating single file: ${path}`);
      jsonFiles = [path];
    } else {
      console.log(`Finding all JSON files in: ${path}`);
      jsonFiles = await findJsonFiles(path);
      console.log(`Found ${jsonFiles.length} JSON files`);
    }

    // Find schema files for preloading
    const schemaDir = join(getProjectRoot(), "schemas");
    const schemaFiles = await findJsonFiles(schemaDir);
    console.log(`Preloading ${schemaFiles.length} schema files...`);

    // Perform validation using pure functions
    const result = await validateTokenFiles(
      jsonFiles,
      getProjectRoot(),
      schemaFiles,
    );

    // Output results for each file
    for (const fileResult of result.results) {
      const relativePath = fileResult.filePath.replace(
        `${getProjectRoot()}/`,
        "",
      );

      if (fileResult.skipped) {
        console.log(`⚠️ Skipping ${relativePath}: ${fileResult.skipReason}`);
      } else if (fileResult.valid) {
        console.log(`✅ Validation successful for ${relativePath}`);
      } else {
        console.log(`❌ Validation failed for ${relativePath}`);
        if (fileResult.errors) {
          for (const error of fileResult.errors) {
            console.log(`  - ${error}`);
          }
        }
      }
    }

    // Output summary
    console.log("\nValidation summary:");
    console.log(`  Valid files: ${result.summary.valid}`);
    console.log(`  Invalid files: ${result.summary.invalid}`);
    console.log(`  Skipped files: ${result.summary.skipped}`);

    return result.valid;
  } catch (error) {
    const err = error as Error;
    console.error(`Error during validation: ${err.message}`);
    return false;
  }
}

/**
 * Validates a specific JSON file and outputs results to console.
 * @param filePath - Path to the JSON file to validate
 * @param schemaPath - Optional path to a specific schema file to use
 * @returns True if the file is valid, false otherwise
 * @example
 * const valid = await validateFile("/project/tokens/colors.json")
 * // Output: ✅ Validation successful for tokens/colors.json
 *
 * const valid = await validateFile("/project/tokens/invalid.json")
 * // Output: ❌ Validation failed for tokens/invalid.json
 * //   - Invalid token structure at path: colors.primary
 */
export async function validateFile(
  filePath: string,
  schemaPath?: string,
): Promise<boolean> {
  try {
    const result = await validateTokenFile(
      filePath,
      schemaPath,
      getProjectRoot(),
    );

    const relativePath = filePath.replace(`${getProjectRoot()}/`, "");

    if (result.skipped) {
      console.log(`⚠️ Skipping ${relativePath}: ${result.skipReason}`);
      return false;
    }

    if (result.valid) {
      console.log(`✅ Validation successful for ${relativePath}`);
      return true;
    }

    console.log(`❌ Validation failed for ${relativePath}`);
    if (result.errors) {
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }
    return false;
  } catch (error) {
    const err = error as Error;
    console.error(`Error validating file: ${err.message}`);
    return false;
  }
}
