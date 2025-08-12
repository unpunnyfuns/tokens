#!/usr/bin/env node --experimental-strip-types

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

interface PackageJson {
  version: string;
  exports?: Record<string, string>;
}

// Get version from package.json
const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
) as PackageJson;

// Use dev version for local builds, actual version for releases
const isRelease =
  process.env.CI === "true" && process.env.GITHUB_REF?.startsWith("refs/tags/");
const VERSION = isRelease ? pkg.version : `${pkg.version}-dev`;

const SCHEMA_BASE_URL = `https://tokens.unpunny.fun/schema/${VERSION}`;
const SOURCE_DIR = path.join(ROOT, "schemas");
const DIST_DIR = path.join(ROOT, "dist", "schema");

console.log(`Building schemas for version ${VERSION}`);

// Clean and create dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(path.join(DIST_DIR, VERSION), { recursive: true });
fs.mkdirSync(path.join(DIST_DIR, "latest"), { recursive: true });

// Process each schema file
const schemaFiles = globSync("**/*.json", { cwd: SOURCE_DIR });

for (const file of schemaFiles) {
  const sourcePath = path.join(SOURCE_DIR, file);
  const content = fs.readFileSync(sourcePath, "utf8");
  const schema = JSON.parse(content);

  // Extract the schema name from file path
  const schemaName = path.basename(file, ".schema.json").replace(".json", "");
  const schemaId = `${SCHEMA_BASE_URL}/${schemaName}`;

  // Reorder schema to put $id right after $schema (if present)
  const orderedSchema: Record<string, unknown> = {};
  if (schema.$schema) {
    orderedSchema.$schema = schema.$schema;
  }
  orderedSchema.$id = schemaId;

  // Add all other properties
  for (const key in schema) {
    if (key !== "$schema" && key !== "$id") {
      orderedSchema[key] = schema[key];
    }
  }

  console.log(`  Added $id: ${schemaId}`);

  // Update internal $refs to use new URL structure
  function updateRefs(obj: unknown): void {
    if (typeof obj !== "object" || obj === null) return;

    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (key === "$ref" && typeof record[key] === "string") {
        const refValue = record[key] as string;
        // Update refs to other schemas in our set
        if (refValue.startsWith("https://token.unpunny.fun/")) {
          const pathMatch = refValue.match(
            /https:\/\/token\.unpunny\.fun\/(?:tokens\/)?(?:types\/)?(.*)/,
          );
          if (pathMatch) {
            // Flatten the path structure
            const schemaName = pathMatch[1].split("/").pop();
            record[key] = `${SCHEMA_BASE_URL}/${schemaName}`;
          }
        } else if (refValue.startsWith("./") || refValue.startsWith("../")) {
          // Handle relative references to schemas
          const refPath = refValue;
          // Extract just the filename without path and extension
          const match = refPath.match(/([^/]+)\.schema\.json/);
          if (match) {
            const schemaName = match[1];
            // Only update the path part, keep the fragment if present
            const fragmentIndex = refValue.indexOf("#");
            if (fragmentIndex !== -1) {
              const fragment = refValue.substring(fragmentIndex);
              record[key] = `${SCHEMA_BASE_URL}/${schemaName}${fragment}`;
            } else {
              record[key] = `${SCHEMA_BASE_URL}/${schemaName}`;
            }
          }
        }
      } else {
        updateRefs(record[key]);
      }
    }
  }

  updateRefs(orderedSchema);

  // Determine output filename (flatten structure)
  let outputName = path.basename(file);
  if (file.includes("tokens/types/")) {
    // Just use the filename for token types
    outputName = path.basename(file);
  } else if (file === "tokens/base.schema.json") {
    outputName = "base.json";
  } else if (file === "tokens/full.schema.json") {
    outputName = "full.json"; // Keep as full for clarity
  } else if (file === "tokens/value-types.schema.json") {
    outputName = "value-types.json";
  } else if (file === "resolver.schema.json") {
    outputName = "resolver.json";
  }

  // Remove .schema from filename if present
  outputName = outputName.replace(".schema.json", ".json");

  // Write to versioned directory
  const versionedPath = path.join(DIST_DIR, VERSION, outputName);
  fs.writeFileSync(versionedPath, JSON.stringify(orderedSchema, null, 2));

  // Also write to latest
  const latestPath = path.join(DIST_DIR, "latest", outputName);
  fs.writeFileSync(latestPath, JSON.stringify(orderedSchema, null, 2));

  console.log(`  Built: ${outputName}`);
}

console.log(`\n✅ Built ${schemaFiles.length} schemas for version ${VERSION}`);
console.log(`📁 Output directory: ${DIST_DIR}`);
console.log("🌐 Schemas will be available at:");
console.log(`   https://tokens.unpunny.fun/schema/${VERSION}/[schema-name]`);
console.log("   https://tokens.unpunny.fun/schema/latest/[schema-name]");
