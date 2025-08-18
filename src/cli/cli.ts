#!/usr/bin/env node

/**
 * UPFT CLI - Lean and mean
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { countTokens } from "../utils/token-helpers.js";
import { createCLI } from "./commands.js";
import { createOutput } from "./output.js";

const packageJson = JSON.parse(
  await fs.readFile(
    join(dirname(fileURLToPath(import.meta.url)), "../../package.json"),
    "utf-8",
  ),
);

const program = new Command()
  .name("upft")
  .description("UPFT - Universal Platform for Tokens")
  .version(packageJson.version);

const parseModifiers = (mods?: string[]) =>
  Object.fromEntries(
    (mods || []).map((m) => m.split("=")).filter(([k, v]) => k && v),
  );

const readJson = async (path: string) =>
  JSON.parse(await fs.readFile(path, "utf-8"));

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
      .action(async (path, opts) => {
        const output = createOutput(opts);
        const cli = createCLI();
        try {
          const result = opts.manifest
            ? await cli.validateManifest(await readJson(path))
            : opts.directory
              ? await cli.validateDirectory(path)
              : await cli.validateTokenFile(path);

          if (!result.valid) {
            output.error("Validation failed");
            process.exit(1);
          }
          output.success("Valid");
        } catch (e) {
          output.error("Failed", e);
          process.exit(1);
        }
      }),

  preview: (p: Command) =>
    p
      .command("preview <manifest>")
      .alias("p")
      .description("Preview merged tokens from manifest with modifiers")
      .option("-m, --modifiers <mods...>", "Modifiers")
      .option("--json", "JSON output")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const cli = createCLI({ basePath: dirname(path) });
          const result = await cli.resolve(
            await readJson(path),
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
                await readJson(left),
                parseModifiers(opts.leftModifiers),
                parseModifiers(opts.rightModifiers),
              )
            : await cli.diffDocuments(
                await readJson(left),
                await readJson(right),
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
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          await createCLI({ basePath: dirname(path) }).build(
            await readJson(path),
          );
          output.success("Done");
        } catch (e) {
          output.error("Failed", e);
          process.exit(1);
        }
      }),

  info: (p: Command) =>
    p
      .command("info <manifest>")
      .option("--json", "JSON output")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const info = await createCLI({ basePath: dirname(path) }).info(
            await readJson(path),
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
    p.command("lint <path>").action(async (path, opts) => {
      const output = createOutput(opts);
      try {
        const result = await createCLI().validateTokenFile(path);
        if (!result.valid) {
          output.error(`${result.errors.length} errors`);
          process.exit(1);
        }
      } catch (e) {
        output.error("Failed", e);
        process.exit(1);
      }
    }),

  perms: (p: Command) =>
    p
      .command("permutations <manifest>")
      .alias("perms")
      .option("--json", "JSON output")
      .action(async (path, opts) => {
        const output = createOutput(opts);
        try {
          const perms = await createCLI({ basePath: dirname(path) }).list(
            await readJson(path),
          );
          if (opts.json) {
            output.data(perms);
          } else {
            for (const p of perms) output.info(p.id);
          }
        } catch (e) {
          output.error("Failed", e);
          process.exit(1);
        }
      }),
};

for (const cmd of Object.values(commands)) cmd(program);
program.parse();
