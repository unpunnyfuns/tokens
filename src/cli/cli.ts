#!/usr/bin/env node

/**
 * UPFT CLI - Command-line interface for token management
 */

import { promises as fs, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import type { ValidationResult } from "../types.js";
import { TokenCLI } from "./commands.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
const packageJsonPath = join(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

// Create the program
const program = new Command();

program
  .name("upft")
  .description("UPFT - Universal Platform for Tokens")
  .version(packageJson.version);

// Bundle command
program
  .command("bundle")
  .description("Bundle tokens from manifest")
  .argument("<manifest>", "Path to manifest file")
  .option("-o, --output <file>", "Output file path")
  .option("-f, --format <format>", "Output format (json, json5, yaml)", "json")
  .option("-m, --modifiers <modifiers>", "Modifier values as JSON string")
  .option("--minify", "Minify output")
  .option("--watch", "Watch for changes")
  .action(async (manifestPath, _options) => {
    const { dirname } = await import("node:path");
    const basePath = dirname(manifestPath);
    const cli = new TokenCLI({ basePath });

    try {
      // Read and parse the manifest file
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);

      // For now, just build with the manifest
      // TODO: Add support for modifiers in build
      await cli.build(manifest);
    } catch (error) {
      console.error("Bundle failed:", error);
      process.exit(1);
    }
  });

// Validate command
program
  .command("validate")
  .description("Validate tokens or manifest")
  .argument("<path>", "Path to validate")
  .option("-f, --file", "Validate as token file (default)")
  .option("-d, --directory", "Validate all token files in directory")
  .option("-m, --manifest", "Validate as resolver manifest")
  .option("-s, --schema <schema>", "Schema to validate against")
  .option("-v, --verbose", "Verbose output")
  .action(async (path, options) => {
    const cli = new TokenCLI();

    try {
      let result: ValidationResult;

      if (options.manifest) {
        // Validate as manifest
        const manifest = JSON.parse(await fs.readFile(path, "utf-8"));
        result = await cli.validateManifest(manifest);
      } else if (options.directory) {
        // Validate all JSON files in directory
        result = await cli.validateDirectory(path);
      } else {
        // Default: validate as token file
        result = await cli.validateTokenFile(path);
      }

      if (!result.valid) {
        console.error("Validation failed:", result.errors);
        process.exit(1);
      }
      if (options.verbose) {
        console.log("Validation successful");
      }
    } catch (error) {
      console.error("Validation failed:", error);
      process.exit(1);
    }
  });

// Preview command
program
  .command("preview")
  .description("Preview merged tokens for specific modifiers")
  .argument("<manifest>", "Path to manifest file")
  .option(
    "-m, --modifiers <modifiers...>",
    "Modifiers (e.g., theme=light mode=dark)",
  )
  .option("--json", "Output full JSON (default: summary only)")
  .action(async (manifestPath, options) => {
    const { dirname } = await import("node:path");
    const basePath = dirname(manifestPath);
    const cli = new TokenCLI({ basePath });

    try {
      // Read and parse the manifest file
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);

      // Parse modifiers from key=value pairs
      const modifiers: Record<string, string> = {};
      if (options.modifiers) {
        for (const mod of options.modifiers) {
          const [key, value] = mod.split("=");
          if (key && value) {
            modifiers[key] = value;
          }
        }
      }
      const result = await cli.resolve(manifest, modifiers);

      if (options.json) {
        // Output full merged tokens
        console.log(JSON.stringify(result.tokens, null, 2));
      } else {
        // Output summary info
        console.log(`Preview: ${result.id}`);
        console.log(`Files that would be merged:`);
        for (const file of result.files) {
          console.log(`  - ${file}`);
        }
        console.log(`\nModifiers: ${JSON.stringify(result.input)}`);

        // Count tokens
        const tokenCount = countTokens(result.tokens);
        console.log(`\nTotal tokens: ${tokenCount}`);
        console.log("\nUse --json to see full merged output");
      }
    } catch (error) {
      console.error("Preview failed:", error);
      process.exit(1);
    }
  });

// Helper to count tokens in a document
function countTokens(doc: unknown): number {
  let count = 0;
  function traverse(obj: unknown) {
    if (obj && typeof obj === "object" && obj !== null) {
      const record = obj as Record<string, unknown>;
      if ("$value" in record) {
        count++;
      }
      for (const key in record) {
        if (!key.startsWith("$")) {
          traverse(record[key]);
        }
      }
    }
  }
  traverse(doc);
  return count;
}

// List command
program
  .command("list")
  .description("List tokens from file")
  .argument("<file>", "Token file")
  .option("-t, --type <type>", "Filter by token type")
  .option("-g, --group <group>", "Filter by group")
  .option("--json", "Output as JSON")
  .action(async (filePath, options) => {
    const cli = new TokenCLI();

    try {
      // List tokens from the file
      const tokens = await cli.listTokens(filePath, {
        type: options.type,
        group: options.group,
      });

      if (options.json) {
        console.log(JSON.stringify(tokens, null, 2));
      } else {
        // Simple list of token paths and types
        for (const token of tokens) {
          const type = token.type ? `\t${token.type}` : "";
          console.log(`${token.path}${type}`);
        }
      }
    } catch (error) {
      console.error("List failed:", error);
      process.exit(1);
    }
  });

// Permutations command
program
  .command("permutations")
  .description("List all permutations from manifest")
  .argument("<manifest>", "Manifest file")
  .option("--json", "Output as JSON")
  .action(async (manifestPath, options) => {
    const { dirname } = await import("node:path");
    const basePath = dirname(manifestPath);
    const cli = new TokenCLI({ basePath });

    try {
      // Read and parse the manifest file
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);

      const permutations = await cli.list(manifest);
      if (options.json) {
        console.log(JSON.stringify(permutations, null, 2));
      } else {
        for (const p of permutations) {
          console.log(p.id);
        }
      }
    } catch (error) {
      console.error("List permutations failed:", error);
      process.exit(1);
    }
  });

// Info command
program
  .command("info")
  .description("Show information about a manifest")
  .argument("<manifest>", "Manifest file")
  .option("--json", "Output as JSON")
  .action(async (manifestPath, options) => {
    const { dirname } = await import("node:path");
    const basePath = dirname(manifestPath);
    const cli = new TokenCLI({ basePath });

    try {
      // Read and parse the manifest file
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);

      const info = await cli.info(manifest);

      if (options.json) {
        console.log(JSON.stringify(info, null, 2));
      } else {
        // Display info in readable format
        if (info.name) console.log(`Name: ${info.name}`);
        if (info.description) console.log(`Description: ${info.description}`);
        console.log(`\nSets: ${info.sets.length}`);
        for (const set of info.sets) {
          console.log(`  ${set.name || "(unnamed)"}: ${set.fileCount} files`);
        }
        console.log(`\nModifiers: ${info.modifiers.length}`);
        for (const mod of info.modifiers) {
          console.log(`  ${mod.name} (${mod.type}): ${mod.options.join(", ")}`);
        }
        console.log(`\nPossible permutations: ${info.possiblePermutations}`);
        if (info.generateCount !== undefined) {
          console.log(`Generated outputs: ${info.generateCount}`);
        }
      }
    } catch (error) {
      console.error("Info failed:", error);
      process.exit(1);
    }
  });

// Diff command
program
  .command("diff")
  .description("Compare two token files or manifest permutations")
  .argument("<left>", "Left file or manifest (with -m)")
  .argument("[right]", "Right file (if not using -m)")
  .option("-m, --manifest", "Compare manifest permutations")
  .option("-l, --left <modifiers...>", "Left modifiers (with -m)")
  .option("-r, --right <modifiers...>", "Right modifiers (with -m)")
  .option("--json", "Output as JSON")
  .action(async (leftPath, rightPath, options) => {
    try {
      let diff: {
        differences: Array<{
          path: string;
          leftValue: unknown;
          rightValue: unknown;
        }>;
        summary: { added: number; removed: number; changed: number };
      };

      // Check if we're in manifest mode or file comparison mode
      if (options.manifest) {
        // Manifest-based comparison
        const { dirname } = await import("node:path");
        const basePath = dirname(leftPath);
        const cliWithBase = new TokenCLI({ basePath });

        const manifestContent = await fs.readFile(leftPath, "utf-8");
        const manifest = JSON.parse(manifestContent);

        // Parse modifiers from key=value pairs
        const parseModifiers = (modifiers?: string[]) => {
          if (!modifiers) return {};
          const result: Record<string, string> = {};
          for (const mod of modifiers) {
            const [key, value] = mod.split("=");
            if (key && value) {
              result[key] = value;
            }
          }
          return result;
        };

        const leftModifiers = parseModifiers(options.left);
        const rightModifiers = parseModifiers(options.right);

        diff = await cliWithBase.diff(manifest, leftModifiers, rightModifiers);
      } else {
        // Direct file comparison
        if (!rightPath) {
          console.error(
            "Error: Two files required for comparison (or use -m for manifest mode)",
          );
          process.exit(1);
        }
        const leftContent = await fs.readFile(leftPath, "utf-8");
        const rightContent = await fs.readFile(rightPath, "utf-8");
        const leftDoc = JSON.parse(leftContent);
        const rightDoc = JSON.parse(rightContent);

        // Use the comparison function directly
        const { compareTokenDocumentsDetailed } = await import(
          "../analysis/token-comparison.js"
        );
        const comparison = compareTokenDocumentsDetailed(leftDoc, rightDoc);

        diff = {
          differences: comparison.differences,
          summary: comparison.summary,
        };
      }

      if (options.json) {
        console.log(JSON.stringify(diff, null, 2));
      } else {
        // Display differences in readable format
        if (options.manifest) {
          const parseModifiers = (modifiers?: string[]) => {
            if (!modifiers) return {};
            const result: Record<string, string> = {};
            for (const mod of modifiers) {
              const [key, value] = mod.split("=");
              if (key && value) {
                result[key] = value;
              }
            }
            return result;
          };
          const leftModifiers = parseModifiers(options.left);
          const rightModifiers = parseModifiers(options.right);
          console.log(`Comparing permutations from ${leftPath}:`);
          console.log(`  Left:  ${JSON.stringify(leftModifiers)}`);
          console.log(`  Right: ${JSON.stringify(rightModifiers)}`);
        } else {
          console.log(`Comparing files:`);
          console.log(`  Left:  ${leftPath}`);
          console.log(`  Right: ${rightPath}`);
        }

        console.log(`\nSummary:`);
        const total =
          diff.summary.added + diff.summary.removed + diff.summary.changed;
        console.log(`  Changed: ${diff.summary.changed}`);
        console.log(`  Added: ${diff.summary.added}`);
        console.log(`  Removed: ${diff.summary.removed}`);
        if (total === 0) {
          console.log(`  No differences found`);
        }

        if (diff.differences.length > 0) {
          console.log(`\nDifferences:`);
          for (const d of diff.differences) {
            console.log(`  ${d.path}:`);
            console.log(`    Left:  ${JSON.stringify(d.leftValue)}`);
            console.log(`    Right: ${JSON.stringify(d.rightValue)}`);
          }
        }
      }
    } catch (error) {
      console.error("Diff failed:", error);
      process.exit(1);
    }
  });

// Lint command
program
  .command("lint")
  .description("Lint token files")
  .argument("<files...>", "Files to lint")
  .option("-f, --fix", "Auto-fix issues")
  .option("-c, --config <config>", "Lint config file")
  .action(async (files, _options) => {
    const cli = new TokenCLI();

    try {
      // For now, just validate each file
      // TODO: Implement proper linting functionality
      for (const file of files) {
        const result = await cli.validate(file);
        if (!result.valid) {
          console.error(`${file}: ${result.errors.length} errors`);
        }
      }
    } catch (error) {
      console.error("Lint failed:", error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);
