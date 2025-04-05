#!/usr/bin/env node --experimental-strip-types

/**
 * Internal development CLI for schema maintenance
 * This is for developing the schemas themselves, not for end users
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { getProjectRoot } from "../src/validation/utils.ts";
import { validateSchemas } from "./internal/schema-validator.ts";

interface PackageJson {
  version: string;
  name: string;
}

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(getProjectRoot(), "package.json"), "utf-8"),
) as PackageJson;

const program = new Command();

program
  .name("dev-cli")
  .description(pc.bold("Internal development CLI for schema maintenance"))
  .version(packageJson.version);

// Validate schemas command
program
  .command("validate-schemas")
  .alias("vs")
  .description("Validate that schema files are valid JSON Schema documents")
  .option("-d, --directory <path>", "Schema directory", "schemas")
  .action(async (options) => {
    try {
      console.log(
        pc.blue(`🔍 Validating schema definitions in ${options.directory}...`),
      );
      const schemasDir = join(getProjectRoot(), options.directory);
      const valid = await validateSchemas(schemasDir);

      if (valid) {
        console.log(
          pc.green("\n✅ All schemas are valid JSON Schema documents!"),
        );
        process.exit(0);
      } else {
        console.log(pc.red("\n❌ Some schemas have validation errors"));
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(pc.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Test schemas against examples
program
  .command("test")
  .description("Test schemas by validating all example files")
  .action(async () => {
    try {
      console.log(pc.blue("🧪 Testing schemas against example files..."));
      // This imports and runs the validation
      const { validateFiles } = await import("../src/validation/index.ts");
      const valid = await validateFiles(join(getProjectRoot(), "examples"));

      if (valid) {
        console.log(pc.green("\n✅ All examples validate against schemas!"));
        process.exit(0);
      } else {
        console.log(pc.red("\n❌ Some examples failed validation"));
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(pc.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

// Build schemas for distribution
program
  .command("build")
  .description("Build schemas for distribution")
  .action(async () => {
    try {
      console.log(pc.blue("📦 Building schemas for distribution..."));
      const { execSync } = await import("node:child_process");
      execSync("node --experimental-strip-types scripts/build-schemas.ts", {
        stdio: "inherit",
      });
      console.log(pc.green("\n✅ Schemas built successfully!"));
    } catch (error) {
      const err = error as Error;
      console.error(pc.red(`\n❌ Build failed: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
