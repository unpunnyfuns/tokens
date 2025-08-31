/**
 * Example demonstrating project-level AST functionality
 */

import { resolveCrossFileReferences } from "../src/cross-file-resolver.js";
import { parseManifestAST } from "../src/manifest-parser.js";
import {
  createProjectAST,
  detectCircularDependencies,
  getResolutionOrder,
} from "../src/project-builder.js";

async function demonstrateProjectAST() {
  console.log("🌳 Project AST Example\n");

  try {
    // Example 1: Create a project AST from multiple files
    console.log("1. Creating project AST from token files...");
    const projectAST = await createProjectAST(
      "/path/to/project", // base path
      ["tokens/colors.json", "tokens/spacing.json", "tokens/typography.json"], // file paths
    );

    console.log(`   ✅ Created project with ${projectAST.files.size} files`);
    console.log(
      `   📊 Found ${projectAST.crossFileReferences.size} cross-file reference sets`,
    );

    // Example 2: Get resolution order for files
    console.log("\n2. Determining file resolution order...");
    const resolutionOrder = getResolutionOrder(projectAST);
    console.log(`   📋 Resolution order: ${resolutionOrder.join(" → ")}`);

    // Example 3: Check for circular dependencies
    console.log("\n3. Checking for circular dependencies...");
    const cycles = detectCircularDependencies(projectAST);
    if (cycles.length === 0) {
      console.log("   ✅ No circular dependencies found");
    } else {
      console.log(`   ⚠️  Found ${cycles.length} circular dependencies:`);
      cycles.forEach((cycle, i) => {
        console.log(`      ${i + 1}. ${cycle.join(" → ")}`);
      });
    }

    // Example 4: Parse a manifest into AST
    console.log("\n4. Parsing manifest into AST...");
    const manifestAST = await parseManifestAST(
      "/path/to/project",
      "upft.manifest.json",
    );

    if (manifestAST) {
      console.log(`   ✅ Parsed ${manifestAST.manifestType} manifest`);
      console.log(`   📦 Found ${manifestAST.sets.size} token sets`);
      console.log(`   ⚙️  Found ${manifestAST.modifiers.size} modifiers`);
      console.log(`   🎯 Found ${manifestAST.permutations.size} permutations`);
    }

    // Example 5: Resolve cross-file references
    console.log("\n5. Resolving cross-file references...");
    const resolutionResult = resolveCrossFileReferences(projectAST);
    console.log(
      `   ✅ Resolved ${resolutionResult.resolvedReferences} references`,
    );
    if (resolutionResult.errors.length > 0) {
      console.log(`   ❌ ${resolutionResult.errors.length} resolution errors`);
      for (const error of resolutionResult.errors.slice(0, 3)) {
        console.log(`      - ${error.path}: ${error.message}`);
      }
    }

    // Example 6: Access AST data structures
    console.log("\n6. Exploring AST structure...");
    for (const [fileName, fileAST] of projectAST.files) {
      console.log(`   📄 ${fileName}:`);
      console.log(`      Tokens: ${fileAST.tokens.size}`);
      console.log(`      Groups: ${fileAST.groups.size}`);
      console.log(`      Cross-refs: ${fileAST.crossFileReferences.size}`);
    }
  } catch (error) {
    console.error("❌ Example failed:", error);
  }
}

// Note: This example shows the API but won't run without actual files
console.log("This example demonstrates the Project AST API");
console.log(
  "To run with real files, provide actual file paths and ensure files exist",
);
console.log("\nKey capabilities demonstrated:");
console.log("• Multi-file AST creation and management");
console.log("• Cross-file reference tracking and resolution");
console.log("• Dependency graph analysis");
console.log("• Manifest parsing and permutation modeling");
console.log("• Holistic project-level token intelligence");

export { demonstrateProjectAST };
