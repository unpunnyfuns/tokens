#!/usr/bin/env node

/**
 * UPFT CLI - Lean and mean
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { countTokens } from "@upft/analysis";
import type { TokenDocument, UPFTResolverManifest } from "@upft/foundation";
import type { LintResult } from "@upft/linter";
import { Command } from "commander";
import JSON5 from "json5";
import type { LintCommandOptions } from "./commands/index.js";
import { formatLintResults } from "./commands/index.js";
import { createCLI } from "./commands.js";
import { createOutput } from "./output.js";

const packageJson = JSON.parse(
  await fs.readFile(
    join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
    "utf-8",
  ),
);

/**
 * Helper to read and parse JSON5 files (supports comments, trailing commas, etc.)
 */
const readJson = async (filePath: string): Promise<unknown> => {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON5.parse(content);
};

const program = new Command()
  .name("upft")
  .description("UPFT - Universal Platform for Tokens")
  .version(packageJson.version);

const parseModifiers = (mods?: string[]) =>
  Object.fromEntries(
    (mods || []).map((m) => m.split("=")).filter(([k, v]) => k && v),
  );

/**
 * Build lint options from CLI options
 */
const buildLintOptions = (
  opts: Record<string, unknown>,
): LintCommandOptions => {
  const lintOpts: LintCommandOptions = {};
  if (opts.config) lintOpts.configPath = opts.config as string;
  if (opts.quiet) lintOpts.quiet = opts.quiet as boolean;
  if (opts.maxWarnings)
    lintOpts.maxWarnings = parseInt(opts.maxWarnings as string, 10);
  if (opts.manifest !== undefined) lintOpts.manifest = opts.manifest as boolean;
  return lintOpts;
};

/**
 * Handle lint output and formatting
 */
const handleLintOutput = (
  result: LintResult,
  format: string | undefined,
  output: ReturnType<typeof createOutput>,
): void => {
  const formatted = formatLintResults(
    result,
    (format || "stylish") as "stylish" | "json" | "compact",
  );
  if (format === "json") {
    output.data(JSON.parse(formatted));
  } else {
    console.log(formatted);
  }
};

/**
 * Format a single validation error
 */
const formatValidationError = (error: unknown): string => {
  if (typeof error === "string") {
    return `  ${error}`;
  }
  if (error && typeof error === "object" && "message" in error) {
    const err = error as { message: string; path?: string };
    return `  ${err.message}${err.path ? ` (${err.path})` : ""}`;
  }
  return `  ${String(error)}`;
};

/**
 * Output validation errors
 */
const outputValidationErrors = (
  errors: unknown[],
  output: ReturnType<typeof createOutput>,
) => {
  output.error("Validation failed");
  if (errors && errors.length > 0) {
    for (const error of errors) {
      output.error(formatValidationError(error));
    }
  } else {
    output.error("  No specific errors provided");
  }
};

/**
 * Handle validation command
 */
const handleValidateCommand = async (
  path: string,
  opts: Record<string, unknown>,
) => {
  const output = createOutput(opts);
  const cli = createCLI();
  try {
    const result = opts.manifest
      ? await cli.validateManifestFile(path)
      : opts.directory
        ? await cli.validateDirectory(path)
        : await cli.validateTokenFile(path);

    if (!result.valid) {
      outputValidationErrors(result.errors, output);
      process.exit(1);
    }
    output.success("Valid");
  } catch (e) {
    output.error("Failed", e);
    if (e instanceof Error) {
      output.error(e.message);
      if (e.stack && opts.verbose) {
        console.error(e.stack);
      }
    }
    process.exit(1);
  }
};

/**
 * Determine if lint should exit with error
 */
const shouldExitWithError = (
  result: LintResult,
  maxWarnings?: string,
): boolean => {
  const hasErrors = result.summary.errors > 0;
  const exceedsWarnings =
    maxWarnings && result.summary.warnings > parseInt(maxWarnings, 10);
  return hasErrors || !!exceedsWarnings;
};

/**
 * Handle build command
 */
const handleBuildCommand = async (
  configPath: string,
  opts: { dryRun?: boolean; verbose?: boolean },
): Promise<void> => {
  const output = createOutput(opts);
  try {
    const cli = createCLI({
      skipValidation: false,
      strict: false,
    });
    const results = await cli.buildFromConfig(configPath, {
      dryRun: opts.dryRun ?? false,
    });

    reportBuildResults(results, opts, output);
  } catch (e) {
    handleBuildError(e, opts, output);
  }
};

/**
 * Report build results
 */
const reportBuildResults = (
  results: Array<{ success: boolean; filePath: string; error?: string }>,
  opts: { dryRun?: boolean },
  output: ReturnType<typeof createOutput>,
): void => {
  if (opts.dryRun) {
    output.info(`Would build ${results.length} outputs:`);
  } else {
    output.success(`Built ${results.length} outputs`);
  }

  for (const result of results) {
    if (result.success) {
      const prefix = opts.dryRun ? "  → Would create:" : "  ✓ Created:";
      output.info(`${prefix} ${result.filePath}`);
    } else {
      output.error(`  ✗ Failed: ${result.filePath} - ${result.error}`);
    }
  }
};

/**
 * Handle build errors
 */
const handleBuildError = (
  e: unknown,
  opts: { verbose?: boolean },
  output: ReturnType<typeof createOutput>,
): never => {
  output.error("Build failed", e);
  if (e instanceof Error) {
    output.error(e.message);
    if (opts.verbose && e.stack) {
      console.error(e.stack);
    }
  }
  process.exit(1);
};

const commands = {
  validate: (p: Command) =>
    p
      .command("validate <path>")
      .alias("v")
      .description("Validate token files or manifests")
      .option("-f, --file", "Validate as token file")
      .option("-d, --directory", "Validate all token files in directory")
      .option("-m, --manifest", "Validate as resolver manifest")
      .option("-q, --quiet", "Quiet")
      .option("-v, --verbose", "Verbose")
      .action(handleValidateCommand),

  preview: (p: Command) =>
    p
      .command("preview <manifest>")
      .alias("p")
      .description("Preview merged tokens from manifest with modifiers")
      .option("-m, --modifiers <mods...>", "Modifiers")
      .option("--json", "JSON output")
      .option("-v, --verbose", "Verbose output")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const cli = createCLI();
          const result = await cli.resolveFromFile(
            path,
            parseModifiers(opts.modifiers),
          );
          if (opts.json) {
            output.data(result.tokens);
          } else {
            output.section(`Preview: ${result.id}`);
            output.info("Files that would be merged:");
            output.list(result.files);
            output.info(`\nTotal tokens: ${countTokens(result.tokens)}`);
          }
        } catch (e) {
          output.error("Failed", e);
          if (e instanceof Error) {
            output.error(e.message);
            if (opts.verbose && e.stack) {
              console.error(e.stack);
            }
          }
          process.exit(1);
        }
      }),

  diff: (p: Command) =>
    p
      .command("diff <left> [right]")
      .option("-m, --manifest", "Manifest mode")
      .option("-l, --left-modifiers <mods...>", "Left")
      .option("-r, --right-modifiers <mods...>", "Right")
      .option("--json", "JSON output")
      .action(async (left, right, opts) => {
        const output = createOutput(opts);
        try {
          const cli = createCLI({ basePath: dirname(left) });
          const diff = opts.manifest
            ? await cli.diff(
                (await readJson(left)) as UPFTResolverManifest,
                parseModifiers(opts.leftModifiers),
                parseModifiers(opts.rightModifiers),
              )
            : await cli.diffDocuments(
                (await readJson(left)) as TokenDocument,
                (await readJson(right)) as TokenDocument,
              );

          if (opts.json) {
            output.data(diff);
          } else {
            output.section(opts.manifest ? "Comparing:" : "Comparing files:");
            if (!opts.manifest && right) {
              output.info(`  Left:  ${left}`);
              output.info(`  Right: ${right}`);
            }
            output.section("Summary:");
            output.table({
              Changed: diff.summary.changed,
              Added: diff.summary.added,
              Removed: diff.summary.removed,
            });
          }
        } catch (e) {
          output.error("Failed", e);
          process.exit(1);
        }
      }),

  list: (p: Command) =>
    p
      .command("list <file>")
      .alias("ls")
      .option("-t, --type <type>", "Filter by type")
      .option("--json", "JSON output")
      .action(async (file, opts) => {
        const output = createOutput(opts);
        try {
          const tokens = await createCLI().listTokens(file, opts);
          if (opts.json) {
            output.data(tokens);
          } else {
            for (const t of tokens) output.info(t.path);
          }
        } catch (e) {
          output.error("Failed", e);
          process.exit(1);
        }
      }),

  bundle: (p: Command) =>
    p
      .command("bundle <manifest>")
      .option("-o, --output <file>", "Output file")
      .option("--output-dir <dir>", "Output directory for bundle files")
      .option("-v, --verbose", "Verbose output")
      .option("--skip-validation", "Skip bundle validation")
      .option("--strict", "Fail on validation warnings")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const cli = createCLI({
            outputDir: opts.outputDir,
            skipValidation: opts.skipValidation,
            strict: opts.strict,
          });
          const results = await cli.buildFromFile(path);
          output.success(`Bundled ${results.length} outputs`);
          for (const result of results) {
            if (result.success) {
              output.info(`  ✓ Created: ${result.filePath}`);
            } else {
              output.error(`  ✗ Failed: ${result.filePath} - ${result.error}`);
            }
          }
        } catch (e) {
          output.error("Failed", e);
          if (e instanceof Error) {
            output.error(e.message);
            if (opts.verbose && e.stack) {
              console.error(e.stack);
            }
          }
          process.exit(1);
        }
      }),

  build: (p: Command) =>
    p
      .command("build <config>")
      .description("Build tokens using a build configuration file")
      .option("-v, --verbose", "Verbose output")
      .option("--dry-run", "Show what would be built without creating files")
      .action(async (configPath, opts) => {
        await handleBuildCommand(configPath, opts);
      }),

  info: (p: Command) =>
    p
      .command("info <manifest>")
      .option("--json", "JSON output")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const info = await createCLI({ basePath: dirname(path) }).info(
            (await readJson(path)) as UPFTResolverManifest,
          );
          if (opts.json) {
            output.data(info);
          } else {
            if (info.name) output.info(`Name: ${info.name}`);
            output.section("Sets:");
            output.list(
              info.sets.map(
                (s) => `${s.name || "(unnamed)"}: ${s.fileCount} files`,
              ),
            );
            output.section("Modifiers:");
            output.list(
              info.modifiers.map(
                (m) => `${m.name} (${m.type}): ${m.options.join(", ")}`,
              ),
            );
            output.info(
              `\nPossible permutations: ${info.possiblePermutations}`,
            );
          }
        } catch (e) {
          output.error("Failed", e);
          process.exit(1);
        }
      }),

  lint: (p: Command) =>
    p
      .command("lint <path>")
      .description("Lint token or manifest files for style and best practices")
      .option("-c, --config <path>", "Config file path")
      .option(
        "-f, --format <format>",
        "Output format (stylish|json|compact)",
        "stylish",
      )
      .option("-q, --quiet", "Only show errors")
      .option("--max-warnings <n>", "Number of warnings to trigger exit code 1")
      .option("-m, --manifest", "Lint as manifest file")
      .option("--no-manifest", "Force lint as token file")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const lintOpts = buildLintOptions(opts);
          const result = await createCLI().lint(path, lintOpts);

          handleLintOutput(result, opts.format, output);

          if (shouldExitWithError(result, opts.maxWarnings)) {
            process.exit(1);
          }
        } catch (e) {
          if (e instanceof Error) {
            console.error(e.message);
          }
          output.error("Lint failed", e);
          process.exit(1);
        }
      }),

  perms: (p: Command) =>
    p
      .command("permutations <manifest>")
      .alias("perms")
      .option("--json", "JSON output")
      .option("-v, --verbose", "Verbose output")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const perms = await createCLI().listFromFile(path);
          if (opts.json) {
            output.data(perms);
          } else {
            output.section("Available permutations:");
            for (const p of perms) {
              output.info(`  ${p.id} (${p.files.length} files)`);
            }
          }
        } catch (e) {
          output.error("Failed", e);
          if (e instanceof Error) {
            output.error(e.message);
            if (opts.verbose && e.stack) {
              console.error(e.stack);
            }
          }
          process.exit(1);
        }
      }),
};

for (const cmd of Object.values(commands)) cmd(program);
program.parse();
