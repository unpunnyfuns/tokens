import { join } from "node:path";
import { resolveRefs, validateRefs } from "./src/validation/ref-resolver.js";
import {
  resolveTokens,
  validateResolverManifest,
} from "./src/validation/resolver-validator.js";
import { getProjectRoot } from "./src/validation/utils.js";

async function testResolver() {
  console.log("=== Testing Resolver System ===\n");

  const manifestPath = join(
    getProjectRoot(),
    "examples/resolver.manifest.json",
  );

  // Test 1: Validate manifest
  console.log("1. Validating resolver manifest...");
  const manifestValid = await validateResolverManifest(manifestPath);
  if (!manifestValid) {
    console.error("❌ Manifest validation failed");
    return;
  }

  // Test 2: Resolve tokens for light theme
  console.log("\n2. Resolving tokens for light theme...");
  const lightTokens = await resolveTokens(manifestPath, {
    theme: "light",
    contrast: "normal",
  });

  if (lightTokens) {
    console.log("✅ Light theme tokens resolved");
    console.log(
      "Sample: background color =",
      lightTokens.semantic?.colors?.background,
    );
  }

  // Test 3: Resolve tokens for dark + high contrast
  console.log("\n3. Resolving tokens for dark + high contrast...");
  const darkHighContrastTokens = await resolveTokens(manifestPath, {
    theme: "dark",
    contrast: "high",
  });

  if (darkHighContrastTokens) {
    console.log("✅ Dark + high contrast tokens resolved");
    console.log(
      "Sample: primary color =",
      darkHighContrastTokens.semantic?.colors?.primary,
    );
  }

  // Test 4: Test $ref resolution
  console.log("\n4. Testing $ref resolution...");
  const basePath = join(getProjectRoot(), "examples/tokens");

  // Load semantic tokens with refs
  const { promises: fs } = await import("node:fs");
  const semanticColorsPath = join(basePath, "semantic/colors.json");
  const semanticColorsContent = await fs.readFile(semanticColorsPath, "utf8");
  const semanticColors = JSON.parse(semanticColorsContent);

  // Validate refs
  const refErrors = await validateRefs(
    semanticColors,
    join(basePath, "semantic"),
  );
  if (refErrors.length > 0) {
    console.error("❌ Reference validation errors:");
    for (const err of refErrors) {
      console.error(`  - ${err.path}: ${err.error}`);
    }
  } else {
    console.log("✅ All $refs are valid");
  }

  // Resolve refs (this would need the full token context)
  console.log("\n5. Resolving $refs in merged tokens...");
  try {
    const resolvedTokens = await resolveRefs(
      lightTokens,
      join(basePath, "themes"),
    );
    console.log("✅ $refs resolved successfully");
    console.log(
      "Sample resolved primary:",
      resolvedTokens.semantic?.colors?.primary,
    );
  } catch (error) {
    console.error("❌ Error resolving refs:", error.message);
  }

  console.log("\n=== Test Complete ===");
}

testResolver().catch(console.error);
