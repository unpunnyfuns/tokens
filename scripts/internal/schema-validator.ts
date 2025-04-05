import { promises as fs } from "node:fs";
import { findJsonFiles, getProjectRoot } from "../../src/validation/utils.ts";

// Validate schema files to ensure they are valid JSON Schema documents
export async function validateSchemas(directory: string): Promise<boolean> {
  try {
    console.log(`Finding all schema files in: ${directory}`);
    const schemaFiles = await findJsonFiles(directory);
    console.log(`Found ${schemaFiles.length} schema files`);

    let allValid = true;
    let validCount = 0;
    let invalidCount = 0;

    // Validate each schema file
    for (const filePath of schemaFiles) {
      const relativePath = filePath.replace(getProjectRoot(), "");
      console.log(`Processing schema: ${relativePath}`);

      try {
        const content = await fs.readFile(filePath, "utf8");
        const schema = JSON.parse(content);

        // Check if it has the $schema property
        if (!schema.$schema) {
          console.log(
            `⚠️ Schema file missing $schema property: ${relativePath}`,
          );
          continue;
        }

        // Basic JSON parsing validation - if we got here, it's valid JSON
        // For now, we'll assume schemas that parse successfully are valid
        // TODO: Add proper meta-schema validation with @hyperjump/json-schema
        console.log(`✅ Schema is valid JSON: ${relativePath}`);
        validCount++;
      } catch (error) {
        console.error(
          `Error reading/parsing schema file ${relativePath}:`,
          error,
        );
        allValid = false;
        invalidCount++;
      }
    }

    console.log("\nSchema validation summary:");
    console.log(`  Valid schemas: ${validCount}`);
    console.log(`  Invalid schemas: ${invalidCount}`);

    return allValid;
  } catch (error) {
    console.error("Error during schema validation:", error);
    return false;
  }
}
