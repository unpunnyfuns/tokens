#!/usr/bin/env npx tsx

/**
 * Validate that all bundler output files are valid DTCG tokens
 */

import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TokenFileReader } from "../src/io/file-reader.js";
import { validateTokens } from "../src/validation/index.js";

const BUNDLER_FIXTURES = join(process.cwd(), "src/examples/bundler-fixtures");
const OUTPUT_DIR = join(BUNDLER_FIXTURES, "output");

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

interface ValidationFailure {
  file: string;
  errors: unknown;
}

async function generateBundlerOutputs() {
  console.log(`${colors.yellow}Generating bundler outputs...${colors.reset}`);

  const manifests = [
    { file: "simple-bundle.manifest.json", desc: "Basic token merging" },
    {
      file: "theme-bundle.manifest.json",
      desc: "Theme variants with overrides",
    },
    {
      file: "resolve-refs.manifest.json",
      desc: "Reference resolution to values",
    },
    { file: "complex-merge.manifest.json", desc: "Multi-layer composition" },
    {
      file: "complex-merge-resolved.manifest.json",
      desc: "Multi-layer with resolved refs",
    },
  ];

  // Clean and recreate output directory
  try {
    execSync(`rm -rf ${OUTPUT_DIR}`, { stdio: "pipe" });
    execSync(`mkdir -p ${OUTPUT_DIR}`, { stdio: "pipe" });
  } catch {
    // Ignore errors
  }

  // Generate all outputs
  for (const { file, desc } of manifests) {
    try {
      execSync(
        `cd ${BUNDLER_FIXTURES} && npx tsx ../../../src/cli/cli.ts bundle ${file}`,
        { stdio: "pipe" },
      );
      console.log(`  ${colors.green}✓${colors.reset} ${desc} (${file})`);
    } catch {
      console.log(`  ${colors.red}✗${colors.reset} Failed: ${desc} (${file})`);
    }
  }
}

async function validateSingleFile(
  file: string,
  fileReader: TokenFileReader,
): Promise<{ valid: boolean; errors?: unknown }> {
  try {
    const tokenFile = await fileReader.readFile(file);
    const result = validateTokens(tokenFile.tokens, {
      strict: true,
    });
    return {
      valid: result.valid,
      errors: result.valid ? undefined : result.errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateOutputFiles() {
  console.log(`\n${colors.yellow}Validating output files...${colors.reset}`);

  const fileReader = new TokenFileReader({ basePath: OUTPUT_DIR });

  let totalFiles = 0;
  let validFiles = 0;
  const failures: ValidationFailure[] = [];

  try {
    const files = readdirSync(OUTPUT_DIR);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(OUTPUT_DIR, file);
      const stat = statSync(filePath);

      if (!stat.isFile()) continue;

      totalFiles++;

      const result = await validateSingleFile(file, fileReader);

      if (result.valid) {
        console.log(`  ${colors.green}✓${colors.reset} ${file}`);
        validFiles++;
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${file}`);
        failures.push({ file, errors: result.errors });
      }
    }
  } catch (error) {
    console.error(`Error reading output directory: ${error}`);
    process.exit(1);
  }

  return { totalFiles, validFiles, failures };
}

function printSummary(
  totalFiles: number,
  validFiles: number,
  failures: ValidationFailure[],
) {
  console.log(`\n${colors.cyan}Validation Summary:${colors.reset}`);
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  ${colors.green}Valid: ${validFiles}${colors.reset}`);

  if (failures.length > 0) {
    console.log(`  ${colors.red}Invalid: ${failures.length}${colors.reset}`);
    console.log(`\n${colors.red}Validation Failures:${colors.reset}`);

    for (const { file, errors } of failures) {
      console.log(`\n  ${file}:`);
      if (typeof errors === "string") {
        console.log(`    ${errors}`);
      } else {
        console.log(
          `    ${JSON.stringify(errors, null, 2).split("\n").join("\n    ")}`,
        );
      }
    }

    process.exit(1);
  } else {
    console.log(
      `\n${colors.green}All bundler outputs are valid DTCG tokens!${colors.reset}`,
    );
  }
}

async function validateBundlerOutputs() {
  console.log(`${colors.cyan}Validating Bundler Output Files${colors.reset}\n`);

  await generateBundlerOutputs();
  const { totalFiles, validFiles, failures } = await validateOutputFiles();
  printSummary(totalFiles, validFiles, failures);
}

validateBundlerOutputs().catch((error) => {
  console.error(
    `${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`,
  );
  process.exit(1);
});
