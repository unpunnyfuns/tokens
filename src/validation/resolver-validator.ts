import { promises as fs } from "node:fs";
import { join } from "node:path";
import { addSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { getProjectRoot } from "./utils.ts";

// Track registered schemas
const registeredResolverSchemas = new Set<string>();

// Validate resolver manifest files
export async function validateResolverManifest(
  filePath: string,
): Promise<boolean> {
  try {
    console.log(`Validating resolver manifest: ${filePath}`);

    // Read the manifest file
    const content = await fs.readFile(filePath, "utf8");
    const manifest = JSON.parse(content);

    // Load the resolver schema
    const schemaPath = join(getProjectRoot(), "schemas/resolver.schema.json");
    const schemaContent = await fs.readFile(schemaPath, "utf8");
    const schema = JSON.parse(schemaContent);

    // Register schema with hyperjump
    const schemaId = `resolver-schema-${Date.now()}`;
    await addSchema(schema, schemaId);

    // Validate manifest
    // biome-ignore lint/suspicious/noExplicitAny: hyperjump validate expects Json type but we have unknown from JSON.parse
    const result = await validate(schemaId, manifest as any);
    const valid = result.valid;

    if (valid) {
      console.log(`✅ Valid resolver manifest: ${filePath}`);

      // Validate that referenced token files exist
      const allTokenFiles = [];

      // Collect token files from sets
      for (const set of manifest.sets) {
        allTokenFiles.push(...set.values);
      }

      // Collect token files from modifiers
      for (const modifier of manifest.modifiers) {
        for (const value of modifier.values) {
          allTokenFiles.push(...value.values);
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
        console.warn("⚠️ Referenced token files not found:");
        for (const file of missingFiles) {
          console.warn(`  - ${file}`);
        }
        return false;
      }

      return true;
    }
    console.log(`❌ Invalid resolver manifest: ${filePath}`);
    console.log(JSON.stringify(result.errors, null, 2));
    return false;
  } catch (error) {
    const err = error as Error;
    console.error(`Error validating resolver manifest: ${err.message}`);
    return false;
  }
}

// Resolve tokens for given modifiers
export async function resolveTokens(
  manifestPath: string,
  modifiers: Record<string, string> = {},
): Promise<Record<string, unknown> | null> {
  try {
    // Read the manifest
    const content = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(content);
    const manifestDir = join(manifestPath, "..");

    // Start with base sets
    let resolvedTokens: Record<string, unknown> = {};

    // Load and merge base sets
    for (const set of manifest.sets) {
      for (const tokenFile of set.values) {
        const fullPath = join(manifestDir, tokenFile);
        const tokenContent = await fs.readFile(fullPath, "utf8");
        const tokens = JSON.parse(tokenContent);
        resolvedTokens = deepMerge(resolvedTokens, tokens) as Record<
          string,
          unknown
        >;
      }
    }

    // Apply modifiers
    for (const modifier of manifest.modifiers) {
      const modifierName = modifier.name;
      const selectedValue = modifiers[modifierName];

      if (selectedValue) {
        // Find the matching modifier value
        const modifierValue = modifier.values.find(
          (v: { name: string; values: string[] }) => v.name === selectedValue,
        );

        if (modifierValue) {
          // Load and merge modifier token files
          for (const tokenFile of modifierValue.values) {
            const fullPath = join(manifestDir, tokenFile);
            const tokenContent = await fs.readFile(fullPath, "utf8");
            const tokens = JSON.parse(tokenContent);
            resolvedTokens = deepMerge(resolvedTokens, tokens) as Record<
              string,
              unknown
            >;
          }
        }
      }
    }

    return resolvedTokens;
  } catch (error) {
    const err = error as Error;
    console.error(`Error resolving tokens: ${err.message}`);
    return null;
  }
}

// Deep merge utility for token objects
function deepMerge(target: unknown, source: unknown): unknown {
  const result: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };

  const sourceRecord = source as Record<string, unknown>;
  for (const key in sourceRecord) {
    if (Object.hasOwn(sourceRecord, key)) {
      const sourceValue = sourceRecord[key];
      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue)
      ) {
        const sourceObj = sourceValue as Record<string, unknown>;
        // If it's a token (has $value or $ref), replace entirely
        if (sourceObj.$value !== undefined || sourceObj.$ref !== undefined) {
          result[key] = sourceValue;
        } else {
          // Otherwise, merge recursively
          result[key] = deepMerge(result[key] || {}, sourceValue);
        }
      } else {
        result[key] = sourceValue;
      }
    }
  }

  return result;
}
