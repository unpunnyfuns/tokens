import { promises as fs } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import type { ValidationResult } from "./types.ts";
import { getProjectRoot } from "./utils.ts";

// Track registered schemas
const _registeredResolverSchemas = new Set<string>();

/**
 * Validates a resolver manifest file against the resolver schema.
 * Checks manifest structure and verifies that referenced token files exist.
 * @param filePath - Path to the manifest.json file to validate
 * @returns Validation result with errors and warnings
 * @example
 * const result = await validateResolverManifest("/project/manifest.json")
 * if (result.valid) {
 *   console.log("Manifest is valid")
 * }
 */
interface ResolverManifest {
  sets?: Array<{ values: string[] }>;
  modifiers?: Array<{
    name?: string;
    values?: Array<{
      name?: string;
      values?: string[];
    }>;
  }>;
}

export async function validateResolverManifest(
  filePath: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    console.log(`Validating resolver manifest: ${filePath}`);

    // Read the manifest file
    const content = await fs.readFile(filePath, "utf8");
    const manifest = JSON.parse(content) as ResolverManifest;

    // Load the resolver schema
    const schemaPath = join(getProjectRoot(), "schemas/resolver.schema.json");
    const schemaContent = await fs.readFile(schemaPath, "utf8");
    const schema = JSON.parse(schemaContent);

    // Create AJV instance and validate
    const ajv = new Ajv({ strict: false, allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate(manifest);

    if (valid) {
      console.log(`✅ Valid resolver manifest: ${filePath}`);

      // Validate that referenced token files exist
      const allTokenFiles = [];

      // Validate sets exist
      if (!manifest.sets || manifest.sets.length === 0) {
        errors.push("Manifest must have at least one set");
      } else {
        // Collect token files from sets
        for (const set of manifest.sets) {
          allTokenFiles.push(...set.values);
        }
      }

      // Collect token files from modifiers
      if (manifest.modifiers) {
        for (const modifier of manifest.modifiers) {
          if (!modifier.name) {
            errors.push("Modifier must have a name property");
          }
          for (const value of modifier.values || []) {
            allTokenFiles.push(...(value.values || []));
          }
        }
      }

      // Check if files exist (relative to manifest location)
      const manifestDir = join(filePath, "..");
      const missingFiles = [];

      for (const tokenFile of allTokenFiles) {
        const fullPath = join(manifestDir, tokenFile);
        try {
          await fs.access(fullPath);
        } catch {
          missingFiles.push(tokenFile);
        }
      }

      if (missingFiles.length > 0) {
        for (const file of missingFiles) {
          warnings.push(`Referenced file does not exist: ${file}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }

    console.log(`❌ Invalid resolver manifest: ${filePath}`);

    // Convert AJV errors to strings
    if (validate.errors) {
      for (const error of validate.errors) {
        const path = error.instancePath || "";
        const msg = `${path ? `${path}: ` : ""}${error.message}`;
        errors.push(msg);
      }
    }

    return {
      valid: false,
      errors,
      warnings,
    };
  } catch (error) {
    const err = error as Error;
    console.error(`Error validating resolver manifest: ${err.message}`);

    if (err.message.includes("JSON")) {
      errors.push(`Invalid JSON: ${err.message}`);
    } else {
      errors.push(err.message);
    }

    return {
      valid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Resolves and merges tokens from a manifest file based on selected modifiers.
 * Loads base sets first, then applies modifier-specific token overrides.
 * @param manifestPath - Path to the manifest.json file
 * @param modifiers - Object mapping modifier names to selected values (e.g., { theme: "dark", mode: "compact" })
 * @returns Merged token structure or null if resolution fails
 * @example
 * const tokens = await resolveTokens("/project/manifest.json", { theme: "dark" })
 * // Returns base tokens merged with dark theme overrides
 */
export async function resolveTokens(
  manifestPath: string,
  modifiers: Record<string, string> = {},
): Promise<Record<string, unknown> | null> {
  try {
    // Read the manifest
    const content = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(content) as ResolverManifest;
    const manifestDir = join(manifestPath, "..");

    // Start with base sets
    let resolvedTokens: Record<string, unknown> = {};

    // Load and merge base sets
    if (manifest.sets) {
      for (const set of manifest.sets) {
        for (const tokenFile of set.values) {
          const filePath = join(manifestDir, tokenFile);
          const fileContent = await fs.readFile(filePath, "utf8");
          const tokens = JSON.parse(fileContent);
          resolvedTokens = mergeDeep(resolvedTokens, tokens);
        }
      }
    }

    // Apply modifiers
    if (manifest.modifiers) {
      for (const modifier of manifest.modifiers) {
        if (!modifier.name || !modifier.values) continue;
        const modifierValue = modifiers[modifier.name];
        if (!modifierValue) continue;

        const matchingValue = modifier.values.find(
          (v) => v?.name === modifierValue,
        );
        if (!matchingValue || !matchingValue.values) continue;

        for (const tokenFile of matchingValue.values) {
          const filePath = join(manifestDir, tokenFile);
          const fileContent = await fs.readFile(filePath, "utf8");
          const tokens = JSON.parse(fileContent);
          resolvedTokens = mergeDeep(resolvedTokens, tokens);
        }
      }
    }

    return resolvedTokens;
  } catch (error) {
    console.error("Error resolving tokens:", error);
    return null;
  }
}

/**
 * Deep merges two token objects, with source values overriding target values.
 * @param target - The base object to merge into
 * @param source - The object to merge from (overrides target values)
 * @returns New merged object
 * @private
 */
function mergeDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue) &&
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = mergeDeep(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}
