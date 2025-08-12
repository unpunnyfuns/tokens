#!/usr/bin/env node --experimental-strip-types

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Command, Option } from "commander";
import pc from "picocolors";
import {
  executeAST,
  executeBundle,
  executeValidate,
  formatError,
  getExitCode,
} from "./api/cli-commands.ts";
import { getProjectRoot } from "./validation/utils.ts";

interface PackageJson {
  version: string;
  name: string;
}

interface Logger {
  info: (msg: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  dim?: (msg: string) => void;
}

// Read package.json for version
const packageJson: PackageJson = JSON.parse(
  readFileSync(join(getProjectRoot(), "package.json"), "utf-8"),
);

// Create CLI program with enhanced configuration
const program = new Command();

program
  .name("upft")
  .description(
    pc.bold("Design Token Schema Validator and Bundler with DTCG Support"),
  )
  .version(packageJson.version)
  .configureOutput({
    writeOut: (str) => process.stdout.write(pc.gray(str)),
    writeErr: (str) => process.stderr.write(pc.red(str)),
    outputError: (str, write) => write(pc.red(`\n❌ Error: ${str}`)),
  })
  .showHelpAfterError(true)
  .addHelpText(
    "after",
    `
${pc.bold("Examples:")}
  $ upft validate ./tokens             ${pc.gray("# Validate token files in directory")}
  $ upft validate ./design-tokens.json ${pc.gray("# Validate a single token file")}
  $ upft bundle -m manifest.json       ${pc.gray("# Bundle tokens from manifest")}
  $ upft bundle -m manifest.json -t dark -f dtcg  ${pc.gray("# Bundle dark theme as DTCG format")}
`,
  );

// Validate command - for validating token files
program
  .command("validate <path>")
  .description("Validate token files against DTCG schemas")
  .option("-v, --verbose", "Show detailed validation output")
  .option("--no-colors", "Disable colored output")
  .action(async (path, options) => {
    const colors = options.colors !== false;
    const log: Logger = {
      info: (msg: string) => console.log(colors ? pc.blue(msg) : msg),
      success: (msg: string) => console.log(colors ? pc.green(msg) : msg),
      error: (msg: string) => console.error(colors ? pc.red(msg) : msg),
    };

    try {
      log.info(`🔍 Validating token files in ${path}...`);

      const result = await executeValidate({
        path,
        verbose: options.verbose,
      });

      if (result.valid) {
        log.success(`\n${result.message}`);
      } else {
        log.error(`\n${result.message}`);
        if (result.details) {
          console.error(result.details);
        }
      }

      process.exit(getExitCode(result));
    } catch (error) {
      log.error(`Unexpected error: ${formatError(error, options.verbose)}`);
      process.exit(1);
    }
  });

// Bundle command with enhanced options
program
  .command("bundle")
  .description("Bundle tokens from resolver manifest")
  .requiredOption("-m, --manifest <path>", "Path to resolver manifest")
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .option("-t, --theme <name>", "Theme modifier to apply")
  .option("--mode <name>", "Mode modifier to apply")
  .addOption(
    new Option("-f, --format <type>", "Output format")
      .choices(["json-schema", "dtcg", "preserve"])
      .default("json-schema"),
  )
  .option("-r, --resolve-refs", "Resolve references to values")
  .option("--resolve-external", "Only resolve external references")
  .option("--preserve-external", "Keep external file references as $ref", true)
  .option("--no-convert-internal", "Don't convert internal references")
  .option("--quiet", "Suppress conversion warnings")
  .option("--pretty", "Pretty print JSON output", true)
  .option("-v, --verbose", "Show detailed error output")
  .action(async (options) => {
    const log: Logger = {
      info: (msg: string) => !options.quiet && console.log(pc.blue(msg)),
      success: (msg: string) => console.log(pc.green(msg)),
      error: (msg: string) => console.error(pc.red(msg)),
      dim: (msg: string) => !options.quiet && console.log(pc.gray(msg)),
    };

    try {
      // Show what we're doing
      log.info(`📦 Bundling tokens from ${options.manifest}`);
      if (options.theme) log.dim?.(`   Theme: ${options.theme}`);
      if (options.mode) log.dim?.(`   Mode: ${options.mode}`);
      if (options.format !== "json-schema")
        log.dim?.(`   Format: ${options.format}`);
      if (options.resolveRefs) log.dim?.("   Resolving references");

      const result = await executeBundle({
        manifest: options.manifest,
        output: options.output,
        theme: options.theme,
        mode: options.mode,
        format: options.format,
        resolveRefs: options.resolveRefs,
        resolveExternal: options.resolveExternal,
        preserveExternal: options.preserveExternal,
        convertInternal: options.convertInternal,
        quiet: options.quiet,
        pretty: options.pretty,
      });

      // Show metadata if available
      if (result.metadata) {
        log.dim?.(`   Loaded ${result.metadata.filesLoaded} files`);
        log.dim?.(`   Found ${result.metadata.totalTokens} tokens`);
        if (result.metadata.hasReferences) {
          log.dim?.("   Contains references");
        }

        // Show validation errors if any
        if (result.metadata.validationErrors) {
          log.error(
            `⚠️  Found ${result.metadata.validationErrors.length} reference errors`,
          );
          for (const err of result.metadata.validationErrors) {
            log.error(`   ${err}`);
          }
        }
      }

      // Output results
      if (options.output) {
        log.success(`✅ Bundled tokens written to ${options.output}`);
      } else {
        console.log(result.output);
      }
    } catch (error) {
      log.error(`Bundle error: ${formatError(error, options.verbose)}`);
      process.exit(1);
    }
  });

// AST command - generate AST from tokens
program
  .command("ast")
  .description("Generate AST representation from tokens")
  .requiredOption("-m, --manifest <path>", "Path to resolver manifest")
  .option("-t, --theme <name>", "Theme modifier to apply")
  .option("--mode <name>", "Mode modifier to apply")
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .option("--pretty", "Pretty print JSON output", true)
  .option("-v, --verbose", "Show detailed error output")
  .action(async (options) => {
    const log: Logger = {
      info: (msg: string) => console.log(pc.blue(msg)),
      success: (msg: string) => console.log(pc.green(msg)),
      error: (msg: string) => console.error(pc.red(msg)),
    };

    try {
      log.info(`🌲 Generating AST from ${options.manifest}`);

      const result = await executeAST({
        manifest: options.manifest,
        theme: options.theme,
        mode: options.mode,
        output: options.output,
        pretty: options.pretty,
      });

      if (options.output) {
        log.success(`✅ AST written to ${options.output}`);
      } else {
        console.log(result.output);
      }
    } catch (error) {
      log.error(`AST generation error: ${formatError(error, options.verbose)}`);
      process.exit(1);
    }
  });

// Default action when no command is specified shows help

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
