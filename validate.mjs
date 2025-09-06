#!/usr/bin/env node

/**
 * Quick validation script - no build required
 * Usage: node validate.mjs <file-or-directory>
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { validateManifest, validateTokenDocument } from "@upft/schema-validator";

const target = process.argv[2];
if (!target) {
  console.log("Usage: node validate.mjs <file-or-directory>");
  process.exit(1);
}

async function validateFile(filepath) {
  try {
    const content = JSON.parse(readFileSync(filepath, "utf8"));

    // Detect if it's a manifest by checking for common manifest properties
    const isManifest =
      (content && (content.sets || content.modifiers)) || filepath.includes("manifest");

    const result = isManifest
      ? await validateManifest(content)
      : await validateTokenDocument(content);

    if (result.valid) {
      console.log(`✅ ${filepath}`);
    } else {
      console.log(`❌ ${filepath}`);
      if (result.errors) {
        for (const err of result.errors) {
          console.log(
            `  - ${err.message} ${err.path ? `at ${err.path}` : ""}`,
          );
        }
      }
    }
    return result.valid;
  } catch (error) {
    console.log(`💥 ${filepath}: ${error && error.message ? error.message : String(error)}`);
    return false;
  }
}

async function validateDirectory(dirpath) {
  const files = readdirSync(dirpath);
  let allValid = true;

  for (const file of files) {
    const fullPath = join(dirpath, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const subValid = await validateDirectory(fullPath);
      allValid = allValid && subValid;
    } else if (extname(file) === ".json") {
      const valid = await validateFile(fullPath);
      allValid = allValid && valid;
    }
  }

  return allValid;
}

const stat = statSync(target);
const allValid = stat.isDirectory()
  ? await validateDirectory(target)
  : await validateFile(target);

process.exit(allValid ? 0 : 1);
