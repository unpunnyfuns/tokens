#!/usr/bin/env node --experimental-strip-types

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

interface PackageJson {
  version: string;
}

// Get version from package.json
const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
) as PackageJson;
const VERSION = pkg.version;

const SCHEMA_BASE_URL = `https://tokens.unpunny.fun/schema/${VERSION}`;
const SOURCE_DIR = path.join(ROOT, "schemas");
const DIST_DIR = path.join(ROOT, "dist", "schema");

console.log(`Building schemas for version ${VERSION}`);

// Create dist directory if it doesn't exist
// BUT DON'T DELETE IT - keep old versions!
fs.mkdirSync(path.join(DIST_DIR, VERSION), { recursive: true });

// Process each schema file
function findJsonFiles(dir: string, basePath = ""): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = basePath ? path.join(basePath, item) : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsonFiles(fullPath, relativePath));
    } else if (item.endsWith(".json")) {
      files.push(relativePath);
    }
  }

  return files;
}

const schemaFiles = findJsonFiles(SOURCE_DIR);

for (const file of schemaFiles) {
  const sourcePath = path.join(SOURCE_DIR, file);
  const content = fs.readFileSync(sourcePath, "utf8");
  const schema = JSON.parse(content);

  // Update $id if present
  if (schema.$id) {
    const schemaName = path.basename(file, ".schema.json").replace(".json", "");
    schema.$id = `${SCHEMA_BASE_URL}/${schemaName}`;
  }

  // Update internal $refs
  function updateRefs(obj: unknown): void {
    if (typeof obj !== "object" || obj === null) return;

    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (key === "$ref" && typeof record[key] === "string") {
        const refValue = record[key] as string;
        if (refValue.startsWith("https://token.unpunny.fun/")) {
          const pathMatch = refValue.match(
            /https:\/\/token\.unpunny\.fun\/(?:tokens\/)?(?:types\/)?(.*)/,
          );
          if (pathMatch) {
            const schemaName = pathMatch[1].split("/").pop();
            record[key] = `${SCHEMA_BASE_URL}/${schemaName}`;
          }
        }
      } else {
        updateRefs(record[key]);
      }
    }
  }

  updateRefs(schema);

  // Determine output filename
  let outputName = path.basename(file);
  if (file.includes("tokens/types/")) {
    outputName = path.basename(file);
  } else if (file === "tokens/base.schema.json") {
    outputName = "base.json";
  } else if (file === "tokens/full.schema.json") {
    outputName = "tokens.json";
  } else if (file === "resolver.schema.json") {
    outputName = "resolver.json";
  }

  outputName = outputName.replace(".schema.json", ".json");

  // Write to versioned directory
  const versionedPath = path.join(DIST_DIR, VERSION, outputName);
  fs.writeFileSync(versionedPath, JSON.stringify(schema, null, "\t"));

  console.log(`  Built: ${outputName}`);
}

// Update latest symlink/copy
if (fs.existsSync(path.join(DIST_DIR, "latest"))) {
  fs.rmSync(path.join(DIST_DIR, "latest"), { recursive: true });
}
fs.mkdirSync(path.join(DIST_DIR, "latest"), { recursive: true });

// Copy current version to latest
for (const file of schemaFiles) {
  const outputName = path.basename(file).replace(".schema.json", ".json");
  const sourcePath = path.join(DIST_DIR, VERSION, outputName);
  const latestPath = path.join(DIST_DIR, "latest", outputName);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, latestPath);
  }
}

// Create version manifest
const versions = fs
  .readdirSync(DIST_DIR)
  .filter(
    (d) => d !== "latest" && fs.statSync(path.join(DIST_DIR, d)).isDirectory(),
  )
  .sort();

fs.writeFileSync(
  path.join(DIST_DIR, "versions.json"),
  JSON.stringify({ current: VERSION, versions }, null, 2),
);

console.log(`\n✅ Built ${schemaFiles.length} schemas for version ${VERSION}`);
console.log(`📁 Available versions: ${versions.join(", ")}`);
console.log("🌐 Schemas will be available at:");
console.log(`   https://tokens.unpunny.fun/schema/${VERSION}/[schema-name]`);
console.log("   https://tokens.unpunny.fun/schema/latest/[schema-name]");
