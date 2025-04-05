import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  addSchema,
  registerSchema,
  validate,
} from "@hyperjump/json-schema/draft-2020-12";
import { glob } from "glob";
import { findJsonFiles, getProjectRoot } from "./utils.ts";

// Track registered schemas to avoid duplicates
const registeredSchemas = new Set<string>();

// Validate all JSON files found in the specified directory
export async function validateFiles(directory: string): Promise<boolean> {
  try {
    console.log(`Finding all JSON files in: ${directory}`);
    const jsonFiles = await findJsonFiles(directory);
    console.log(`Found ${jsonFiles.length} JSON files`);

    const schemaDir = join(getProjectRoot(), "schemas");
    const schemaFiles = await findJsonFiles(schemaDir);
    console.log(`Preloading ${schemaFiles.length} schema files...`);

    // Register all schemas with hyperjump
    for (const schemaFile of schemaFiles) {
      try {
        const content = await fs.readFile(schemaFile, "utf8");
        const schema = JSON.parse(content);

        // Use a custom URI scheme for schema identifiers
        const relativePath = schemaFile.replace(`${getProjectRoot()}/`, "");
        const schemaUri = `schema://${relativePath}`;

        // Register schema with hyperjump if not already registered
        if (!registeredSchemas.has(schemaUri)) {
          await addSchema(schema, schemaUri);
          registeredSchemas.add(schemaUri);
        }

        // Also register by $id if present
        if (schema.$id && !registeredSchemas.has(schema.$id)) {
          await addSchema(schema, schema.$id);
          registeredSchemas.add(schema.$id);
        }
      } catch (error) {
        console.warn(`Failed to preload schema ${schemaFile}:`, error);
      }
    }

    let allValid = true;
    let validCount = 0;
    let invalidCount = 0;
    let skippedCount = 0;

    // Validate each JSON file
    for (const filePath of jsonFiles) {
      const relativePath = filePath.replace(`${getProjectRoot()}/`, "");
      console.log(`Processing: ${relativePath}`);

      // Read and parse the JSON file
      let data: unknown;
      try {
        const content = await fs.readFile(filePath, "utf8");
        data = JSON.parse(content);
      } catch (error) {
        const err = error as Error;
        console.log(
          `❌ Error reading/parsing file ${relativePath}: ${err.message}`,
        );
        invalidCount++;
        continue;
      }

      // Check if it has a $schema property
      const dataObj = data as Record<string, unknown>;
      if (!data || typeof data !== "object" || !dataObj.$schema) {
        console.log(`Skipping file without $schema: ${relativePath}`);
        skippedCount++;
        continue;
      }

      // Determine the schema path from the $schema URI
      let schemaPath: string;
      const schemaValue = dataObj.$schema as string;
      if (schemaValue.startsWith("file://")) {
        // File URI - extract path
        schemaPath = schemaValue.replace("file://", "");
      } else if (
        schemaValue.startsWith("./") ||
        schemaValue.startsWith("../")
      ) {
        // Relative path
        schemaPath = resolve(dirname(filePath), schemaValue);
        console.log(`Resolved relative schema: ${schemaPath}`);
      } else if (schemaValue.startsWith("https://")) {
        // URL reference - try to map to local schema
        const match = schemaValue.match(/schemas\/(.*).json/);
        if (match) {
          schemaPath = join(
            getProjectRoot(),
            "schemas",
            `${match[1]}.schema.json`,
          );
        } else {
          console.log(
            `⚠️ Unsupported schema URL in ${relativePath}: ${schemaValue}`,
          );
          invalidCount++;
          continue;
        }
      } else {
        // Assume it's a relative path from project root
        schemaPath = join(getProjectRoot(), "schemas", schemaValue);
      }

      // Verify schema file exists
      try {
        await fs.access(schemaPath);
      } catch {
        console.log(`⚠️ Schema file not found: ${schemaPath}`);
        console.log(`  Referenced by: ${relativePath}`);
        invalidCount++;
        continue;
      }

      // Register schema if not already registered
      const schemaRelativePath = schemaPath.replace(`${getProjectRoot()}/`, "");
      const schemaUri = `schema://${schemaRelativePath}`;

      if (!registeredSchemas.has(schemaUri)) {
        try {
          // Load the schema file
          const schemaContent = await fs.readFile(schemaPath, "utf8");
          const schema = JSON.parse(schemaContent);

          // Register with hyperjump
          await addSchema(schema, schemaUri);
          registeredSchemas.add(schemaUri);
        } catch (error) {
          const err = error as Error;
          console.log(
            `❌ Error loading schema for ${relativePath}: ${err.message}`,
          );
          invalidCount++;
          continue;
        }
      }

      // Remove $schema property from data for validation
      const { $schema, ...tokenData } = data as Record<string, unknown>;

      // Validate the file
      try {
        // biome-ignore lint/suspicious/noExplicitAny: hyperjump validate expects Json type but we have unknown from JSON.parse
        const result = await validate(schemaUri, tokenData as any);

        if (result.valid) {
          console.log(`✅ Validation successful for ${relativePath}`);
          validCount++;
        } else {
          allValid = false;
          invalidCount++;
          console.log(`❌ Validation failed for ${relativePath}`);
          console.log(JSON.stringify(result.errors, null, 2));
        }
      } catch (error) {
        const err = error as Error;
        allValid = false;
        invalidCount++;
        console.log(`❌ Validation error for ${relativePath}: ${err.message}`);
      }
    }

    console.log("\nValidation summary:");
    console.log(`  Valid files: ${validCount}`);
    console.log(`  Invalid files: ${invalidCount}`);
    console.log(`  Skipped files: ${skippedCount}`);

    return allValid;
  } catch (error) {
    const err = error as Error;
    console.error(`Error during validation: ${err.message}`);
    return false;
  }
}

// Validate a specific JSON file
export async function validateFile(
  filePath: string,
  schemaPath?: string,
): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(content);

    // Use provided schema or extract from $schema property
    let resolvedSchemaPath = schemaPath;
    if (!resolvedSchemaPath && data.$schema) {
      if (data.$schema.startsWith("./") || data.$schema.startsWith("../")) {
        const fileDir = join(filePath, "..");
        resolvedSchemaPath = join(fileDir, data.$schema);
      } else {
        resolvedSchemaPath = data.$schema;
      }
    }

    if (!resolvedSchemaPath) {
      console.error("No schema path provided and no $schema in file");
      return false;
    }

    // Load schema
    const schemaContent = await fs.readFile(resolvedSchemaPath, "utf8");
    const schema = JSON.parse(schemaContent);

    // Register schema with a temporary identifier
    const tempSchemaId = `temp-${Date.now()}-${Math.random()}`;
    await addSchema(schema, tempSchemaId);

    // Remove $schema property from data for validation
    const { $schema: _, ...tokenData } = data;

    // Validate
    try {
      // biome-ignore lint/suspicious/noExplicitAny: hyperjump validate expects Json type but we have unknown from JSON.parse
      const result = await validate(tempSchemaId, tokenData as any);

      if (!result.valid) {
        console.error("Validation errors:", result.errors);
      }

      return result.valid;
    } catch (error) {
      const err = error as Error;
      console.error(`Validation error: ${err.message}`);
      return false;
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Error validating file: ${err.message}`);
    return false;
  }
}
