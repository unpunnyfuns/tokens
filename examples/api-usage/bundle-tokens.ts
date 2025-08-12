#!/usr/bin/env node --experimental-strip-types
/**
 * Example: Bundle tokens from a manifest using the API
 */

import { bundleWithMetadata, formatError } from "../../src/api/index.ts";

async function main() {
  try {
    console.log("Bundling tokens...\n");

    // Bundle tokens with metadata
    const result = await bundleWithMetadata({
      manifest: "../manifest.json",
      theme: "dark",
      mode: "compact",
      includeMetadata: true,
      resolveValues: false, // Keep references intact
    });

    // Display metadata
    if (result.metadata) {
      console.log("Bundle Metadata:");
      console.log(`  Files loaded: ${result.metadata.files.count}`);
      console.log(`  Total tokens: ${result.metadata.stats.totalTokens}`);
      console.log(`  Token groups: ${result.metadata.stats.totalGroups}`);
      console.log(`  Has references: ${result.metadata.stats.hasReferences}`);
      console.log(`  Bundle time: ${result.metadata.bundleTime}ms`);
      console.log();
    }

    // Validate references
    console.log("Validating references...");
    const validation = await result.validate();

    if (validation.valid) {
      console.log("✅ All references are valid!");
      console.log(`  Total references: ${validation.stats.totalReferences}`);
      console.log(`  Valid references: ${validation.stats.validReferences}`);
    } else {
      console.log("❌ Reference validation failed:");
      for (const error of validation.errors) {
        console.log(`  - ${error}`);
      }
      if (validation.warnings.length > 0) {
        console.log("\n⚠️  Warnings:");
        for (const warning of validation.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    }

    // Get AST for analysis
    console.log("\nGenerating AST...");
    const ast = result.getAST();
    console.log("AST Analysis:");
    console.log(`  Token nodes: ${ast.tokens?.length || 0}`);
    console.log(`  Group nodes: ${ast.groups?.length || 0}`);

    // Output the bundled tokens
    console.log("\n📦 Bundle complete!");
    console.log(
      "First few tokens:",
      `${JSON.stringify(result.tokens, null, 2).slice(0, 500)}...`,
    );
  } catch (error) {
    console.error("❌ Bundle failed:", formatError(error, true));
    process.exit(1);
  }
}

main();
