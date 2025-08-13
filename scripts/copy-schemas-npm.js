#!/usr/bin/env node

import { cp } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const srcDir = join(process.cwd(), "src", "schemas");
  const destDir = join(process.cwd(), "dist", "schemas");

  console.log("Copying schemas for npm distribution...");

  // Copy schemas as-is (with relative refs) for npm
  await cp(srcDir, destDir, { recursive: true });

  console.log("✓ Schemas copied to dist/schemas/");
}

main().catch((error) => {
  console.error("Error copying schemas:", error);
  process.exit(1);
});
