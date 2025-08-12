#!/usr/bin/env node --experimental-strip-types
/**
 * Example: Validate token files using the API
 */

import { readFile } from "node:fs/promises";
import { buildEnhancedAST, validateReferences } from "../../src/api/index.ts";

async function main() {
  try {
    // Load tokens from a file
    const tokensPath = "../common/tree.json";
    console.log(`Loading tokens from ${tokensPath}...\n`);

    const content = await readFile(tokensPath, "utf-8");
    const tokens = JSON.parse(content);

    // Validate references
    console.log("Validating references...");
    const validation = await validateReferences(tokens, {
      strict: false, // Don't treat warnings as errors
      warnDepth: 3, // Warn about reference chains deeper than 3
    });

    console.log(
      `Validation result: ${validation.valid ? "✅ VALID" : "❌ INVALID"}`,
    );
    console.log(`  Total references: ${validation.stats.totalReferences}`);
    console.log(`  Valid references: ${validation.stats.validReferences}`);
    console.log(`  Invalid references: ${validation.stats.invalidReferences}`);

    if (validation.errors.length > 0) {
      console.log("\nErrors:");
      for (const error of validation.errors) {
        console.log(`  ❌ ${error}`);
      }
    }

    if (validation.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const warning of validation.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
    }

    // Build AST for deeper analysis
    console.log("\nBuilding AST for analysis...");
    const ast = buildEnhancedAST(tokens);

    console.log("Token Structure:");
    console.log(`  Total tokens: ${ast.stats.totalTokens}`);
    console.log(`  Total groups: ${ast.stats.totalGroups}`);
    console.log(`  Max depth: ${ast.stats.maxDepth}`);
    console.log(`  Total references: ${ast.stats.totalReferences}`);

    // Check for circular references
    if (ast.circularReferences.length > 0) {
      console.log("\n⚠️  Circular references detected:");
      for (const circular of ast.circularReferences) {
        console.log(`  - ${circular.chain.join(" → ")}`);
      }
    }

    // Find invalid tokens
    const invalidTokens = ast.tokens.filter((t) => !t.isValid);
    if (invalidTokens.length > 0) {
      console.log("\nInvalid tokens:");
      for (const token of invalidTokens) {
        console.log(`  - ${token.path}: ${token.errors?.join(", ")}`);
      }
    }

    // Find tokens with deep reference chains
    const deepTokens = ast.tokens.filter((t) => t.referenceDepth > 3);
    if (deepTokens.length > 0) {
      console.log("\nTokens with deep reference chains:");
      for (const token of deepTokens) {
        console.log(`  - ${token.path}: depth ${token.referenceDepth}`);
      }
    }

    console.log("\n✅ Validation complete!");
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }
}

main();
