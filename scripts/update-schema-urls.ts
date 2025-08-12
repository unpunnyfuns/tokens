#!/usr/bin/env node --experimental-strip-types

import * as fs from "node:fs";
import { globSync } from "glob";

const VERSION = process.argv[2] || "0.1.0";
const OLD_BASE = "https://token.unpunny.fun";
const NEW_BASE = `https://tokens.unpunny.fun/schema/${VERSION}`;

console.log(`Updating schema URLs from ${OLD_BASE} to ${NEW_BASE}`);

// Find all schema files
const schemaFiles = globSync("schemas/**/*.json");

for (const file of schemaFiles) {
  const content = fs.readFileSync(file, "utf8");
  const data = JSON.parse(content);

  // Update $id if present
  if (data.$id) {
    const oldId = data.$id;
    // Extract path after the domain
    const pathMatch = oldId.match(/https:\/\/token\.unpunny\.fun\/(.*)/);
    if (pathMatch) {
      data.$id = `${NEW_BASE}/${pathMatch[1]}`;
      console.log(`  ${file}: ${oldId} → ${data.$id}`);
    }
  }

  // Update any $ref that points to our schemas
  function updateRefs(obj: unknown): void {
    if (typeof obj !== "object" || obj === null) return;

    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (key === "$ref" && typeof record[key] === "string") {
        const refValue = record[key] as string;
        if (refValue.startsWith(OLD_BASE)) {
          const newRef = refValue.replace(OLD_BASE, NEW_BASE);
          record[key] = newRef;
        }
      } else {
        updateRefs(record[key]);
      }
    }
  }

  updateRefs(data);

  // Write back with proper formatting
  fs.writeFileSync(file, `${JSON.stringify(data, null, "\t")}\n`);
}

console.log(
  `\nUpdated ${schemaFiles.length} schema files to version ${VERSION}`,
);
