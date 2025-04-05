#!/usr/bin/env node --experimental-strip-types

import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, Option } from "commander";
import pc from "picocolors";
import { bundleWithMetadata } from "./bundler/api.ts";
import { validateFiles } from "./validation/index.ts";
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
      const valid = await validateFiles(path);

      if (valid) {
        log.success("\n✅ Token validation passed!");
      } else {
        log.error("\n❌ Token validation failed");
      }
      process.exit(valid ? 0 : 1);
    } catch (error) {
      const err = error as Error;
      log.error(`Validation error: ${err.message}`);
      if (options.verbose) {
        console.error(err.stack);
      }
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

      // Prepare bundle options
      const bundleOptions = {
        manifest: options.manifest,
        theme: options.theme,
        mode: options.mode,
        format: options.format,
        resolveRefs: options.resolveRefs
          ? options.resolveExternal
            ? "external-only"
            : true
          : false,
        referenceStrategy: {
          preserveExternal: options.preserveExternal,
          convertInternal: options.convertInternal !== false,
          warnOnConversion: !options.quiet,
        },
      };

      // Use our own API as dogfood
      const result = await bundleWithMetadata({
        ...bundleOptions,
        resolveValues: bundleOptions.resolveRefs === true,
        includeMetadata: !options.quiet,
      });

      // Show metadata if not quiet
      if (result.metadata && !options.quiet) {
        log.dim?.(`   Loaded ${result.metadata.files.count} files`);
        log.dim?.(`   Found ${result.metadata.stats.totalTokens} tokens`);
        if (result.metadata.stats.hasReferences) {
          log.dim?.("   Contains references");
        }
      }

      // Validate references if not resolving
      if (!bundleOptions.resolveRefs && !options.quiet) {
        const validation = await result.validate();
        if (!validation.valid) {
          log.error(`⚠️  Found ${validation.errors.length} reference errors`);
          for (const err of validation.errors) {
            log.error(`   ${err}`);
          }
        }
      }

      const output = options.pretty
        ? result.toJSON()
        : JSON.stringify(result.tokens);

      // Write output
      if (options.output) {
        await writeFile(options.output, output);
        log.success(`✅ Bundled tokens written to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      const err = error as Error;
      log.error(`Bundle error: ${err.message}`);
      if (options.verbose) {
        console.error(err.stack);
      }
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
  .action(async (options) => {
    const log: Logger = {
      info: (msg: string) => console.log(pc.blue(msg)),
      success: (msg: string) => console.log(pc.green(msg)),
      error: (msg: string) => console.error(pc.red(msg)),
    };

    try {
      log.info(`🌲 Generating AST from ${options.manifest}`);

      // Use our API to bundle and generate AST
      const result = await bundleWithMetadata({
        manifest: options.manifest,
        theme: options.theme,
        mode: options.mode,
        format: "preserve",
        includeMetadata: true,
      });

      const ast = result.getAST();

      // Add metadata to AST output
      const astOutput = {
        ast,
        metadata: {
          generated: new Date().toISOString(),
          manifest: options.manifest,
          theme: options.theme || null,
          mode: options.mode || null,
          stats: result.metadata ? result.metadata.stats : undefined,
        },
      };

      const output = options.pretty
        ? JSON.stringify(astOutput, null, 2)
        : JSON.stringify(astOutput);

      if (options.output) {
        await writeFile(options.output, output);
        log.success(`✅ AST written to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      const err = error as Error;
      log.error(`AST generation error: ${err.message}`);
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
