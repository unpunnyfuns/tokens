#!/usr/bin/env npx tsx

/**
 * Validate all example token files and manifests
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TokenFileReader } from "../src/io/file-reader.js";
import { validateManifest, validateTokens } from "../src/validation/index.js";

const EXAMPLES_DIR = "src/examples";

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

// Initialize file reader
const fileReader = new TokenFileReader();

async function validateFile(filePath: string) {
  try {
    const tokens = await fileReader.readFile(filePath);
    const result = validateTokens(tokens.tokens);
    if (!result.valid) {
      return { success: false, error: JSON.stringify(result.errors, null, 2) };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateDirectory(dirPath: string) {
  try {
    const files = await fileReader.readDirectory(dirPath);
    for (const file of files) {
      const result = validateTokens(file.tokens);
      if (!result.valid) {
        return {
          success: false,
          error: `${file.filePath}: ${JSON.stringify(result.errors, null, 2)}`,
        };
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateManifestFile(manifestPath: string) {
  try {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    const result = validateManifest(manifest);
    if (!result.valid) {
      return { success: false, error: JSON.stringify(result.errors, null, 2) };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function findTokenFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (!["node_modules", "dist", "coverage", ".git"].includes(item)) {
        findTokenFiles(fullPath, files);
      }
    } else if (stat.isFile() && item.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function validateTokenFiles() {
  const tokenDirs = ["tokens", "test-fixtures", "test-scenarios"];
  let totalFiles = 0;
  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ file: string; error: string }> = [];

  console.log(
    `${colors.yellow}Validating individual token files:${colors.reset}`,
  );

  for (const dir of tokenDirs) {
    const dirPath = join(EXAMPLES_DIR, dir);
    if (!existsSync(dirPath)) continue;

    const files = findTokenFiles(dirPath).filter(
      (f) => !f.includes(".manifest."),
    );

    for (const file of files) {
      totalFiles++;
      const result = await validateFile(file);

      if (result.success) {
        console.log(`  ${colors.green}✓${colors.reset} ${file}`);
        successCount++;
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${file}`);
        failureCount++;
        failures.push({ file, error: result.error ?? "Unknown error" });
      }
    }
  }

  return { totalFiles, successCount, failureCount, failures };
}

async function validateDirectories() {
  const dirsToValidate = [
    join(EXAMPLES_DIR, "tokens"),
    join(EXAMPLES_DIR, "tokens/primitives"),
    join(EXAMPLES_DIR, "tokens/semantic"),
    join(EXAMPLES_DIR, "tokens/components"),
  ];

  let totalFiles = 0;
  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ file: string; error: string }> = [];

  console.log(`\n${colors.yellow}Validating token directories:${colors.reset}`);

  for (const dir of dirsToValidate) {
    if (existsSync(dir)) {
      totalFiles++;
      const result = await validateDirectory(dir);

      if (result.success) {
        console.log(`  ${colors.green}✓${colors.reset} ${dir}`);
        successCount++;
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${dir}`);
        failureCount++;
        failures.push({ file: dir, error: result.error ?? "Unknown error" });
      }
    }
  }

  return { totalFiles, successCount, failureCount, failures };
}

async function validateManifests() {
  const manifests = [
    join(EXAMPLES_DIR, "manifest.json"),
    join(EXAMPLES_DIR, "test-scenarios/simple.manifest.json"),
    join(EXAMPLES_DIR, "test-scenarios/density-variants.manifest.json"),
    join(EXAMPLES_DIR, "test-scenarios/group-mode.manifest.json"),
  ];

  let totalFiles = 0;
  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ file: string; error: string }> = [];

  console.log(`\n${colors.yellow}Validating manifest files:${colors.reset}`);

  for (const manifest of manifests) {
    if (existsSync(manifest)) {
      totalFiles++;
      const result = await validateManifestFile(manifest);

      if (result.success) {
        console.log(`  ${colors.green}✓${colors.reset} ${manifest}`);
        successCount++;
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${manifest}`);
        failureCount++;
        failures.push({
          file: manifest,
          error: result.error ?? "Unknown error",
        });
      }
    }
  }

  return { totalFiles, successCount, failureCount, failures };
}

async function main() {
  console.log(
    `${colors.cyan}Validating example token files and manifests...${colors.reset}\n`,
  );

  // Validate all types of files
  const tokenResults = await validateTokenFiles();
  const dirResults = await validateDirectories();
  const manifestResults = await validateManifests();

  // Combine results
  const totalFiles =
    tokenResults.totalFiles +
    dirResults.totalFiles +
    manifestResults.totalFiles;
  const successCount =
    tokenResults.successCount +
    dirResults.successCount +
    manifestResults.successCount;
  const failureCount =
    tokenResults.failureCount +
    dirResults.failureCount +
    manifestResults.failureCount;
  const failures = [
    ...tokenResults.failures,
    ...dirResults.failures,
    ...manifestResults.failures,
  ];

  // Print summary
  console.log(`\n${colors.cyan}Validation Summary:${colors.reset}`);
  console.log(`  Total: ${totalFiles}`);
  console.log(`  ${colors.green}Success: ${successCount}${colors.reset}`);
  if (failureCount > 0) {
    console.log(`  ${colors.red}Failed: ${failureCount}${colors.reset}`);
  }

  // Print failure details
  if (failures.length > 0) {
    console.log(`\n${colors.red}Failures:${colors.reset}`);
    for (const { file, error } of failures) {
      console.log(`\n  ${file}:`);
      console.log(`    ${error.split("\n").join("\n    ")}`);
    }
    process.exit(1);
  }

  console.log(`\n${colors.green}All validations passed!${colors.reset}`);
}

main().catch((error) => {
  console.error(
    `${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`,
  );
  process.exit(1);
});
