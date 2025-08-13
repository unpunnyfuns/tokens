#!/usr/bin/env npx tsx

/**
 * Test bundler functionality by comparing outputs with expected results
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BUNDLER_FIXTURES = join(process.cwd(), "src/examples/bundler-fixtures");
const CLI_PATH = join(process.cwd(), "src/cli/cli.ts");

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

interface TestCase {
  name: string;
  manifest: string;
  expectedFiles: Array<{
    output: string;
    expected: string;
  }>;
}

const testCases: TestCase[] = [
  {
    name: "Simple Bundle - Merging multiple token files",
    manifest: "simple-bundle.manifest.json",
    expectedFiles: [
      {
        output: "output/simple-bundle.json",
        expected: "expected/simple-bundle.json",
      },
    ],
  },
  {
    name: "Theme Bundle - Generating theme variants with overrides",
    manifest: "theme-bundle.manifest.json",
    expectedFiles: [
      {
        output: "output/theme-light.json",
        expected: "expected/theme-light.json",
      },
      {
        output: "output/theme-dark.json",
        expected: "expected/theme-dark.json",
      },
    ],
  },
  {
    name: "Resolved References - Converting token references to values",
    manifest: "resolve-refs.manifest.json",
    expectedFiles: [
      {
        output: "output/resolved-refs.json",
        expected: "expected/resolved-refs.json",
      },
    ],
  },
];

function normalizeJson(json: string): object {
  return JSON.parse(json);
}

function compareJsonFiles(actualPath: string, expectedPath: string): boolean {
  const actual = normalizeJson(readFileSync(actualPath, "utf-8"));
  const expected = normalizeJson(readFileSync(expectedPath, "utf-8"));

  // Deep comparison
  return JSON.stringify(actual, null, 2) === JSON.stringify(expected, null, 2);
}

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n${colors.yellow}Testing: ${testCase.name}${colors.reset}`);

  try {
    // Change to bundler fixtures directory
    process.chdir(BUNDLER_FIXTURES);

    // Run bundler
    execSync(`npx tsx ${CLI_PATH} bundle ${testCase.manifest}`, {
      encoding: "utf8",
      stdio: "pipe",
    });

    // Check each expected file
    let allPassed = true;
    for (const file of testCase.expectedFiles) {
      const outputPath = join(BUNDLER_FIXTURES, file.output);
      const expectedPath = join(BUNDLER_FIXTURES, file.expected);

      if (!existsSync(outputPath)) {
        console.log(
          `  ${colors.red}✗${colors.reset} ${file.output} - File not generated`,
        );
        allPassed = false;
        continue;
      }

      if (compareJsonFiles(outputPath, expectedPath)) {
        console.log(`  ${colors.green}✓${colors.reset} ${file.output}`);
      } else {
        console.log(
          `  ${colors.red}✗${colors.reset} ${file.output} - Content mismatch`,
        );

        // Show diff for debugging
        const actual = JSON.parse(readFileSync(outputPath, "utf-8"));
        const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));
        console.log(
          "    Expected:",
          JSON.stringify(expected, null, 2).substring(0, 200),
        );
        console.log(
          "    Actual:",
          JSON.stringify(actual, null, 2).substring(0, 200),
        );

        allPassed = false;
      }
    }

    return allPassed;
  } catch (error) {
    console.log(
      `  ${colors.red}✗${colors.reset} Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function main() {
  console.log(`${colors.cyan}Testing Bundler Functionality${colors.reset}`);

  let totalTests = 0;
  let passedTests = 0;

  // Clean output directory
  try {
    execSync(`rm -rf ${join(BUNDLER_FIXTURES, "output")}`, { stdio: "pipe" });
    execSync(`mkdir -p ${join(BUNDLER_FIXTURES, "output")}`, { stdio: "pipe" });
  } catch {
    // Ignore errors
  }

  for (const testCase of testCases) {
    totalTests++;
    if (await runTest(testCase)) {
      passedTests++;
    }
  }

  // Summary
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Total: ${totalTests}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);

  if (passedTests < totalTests) {
    console.log(
      `  ${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`,
    );
    process.exit(1);
  } else {
    console.log(`\n${colors.green}All bundler tests passed!${colors.reset}`);
  }
}

main().catch((error) => {
  console.error(
    `${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`,
  );
  process.exit(1);
});
