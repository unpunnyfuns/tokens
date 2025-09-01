#!/usr/bin/env node

import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Read package.json from current schemas package directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(__dirname); // Go up from scripts/ to package root
const packageJson = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf-8"),
);

// Find the monorepo root directory by looking for pnpm-workspace.yaml
let rootDir = packageRoot;
while (!existsSync(join(rootDir, "pnpm-workspace.yaml")) && rootDir !== "/") {
  rootDir = dirname(rootDir);
}

// Use -dev suffix when not in CI
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const VERSION = isCI ? packageJson.version : `${packageJson.version}-dev`;
const WEB_BASE_URL = "https://tokens.unpunny.fun/schemas";

async function transformSchemaForWeb(schema, version) {
  // Deep clone to avoid mutations
  const transformed = JSON.parse(JSON.stringify(schema));

  // Update $id to use absolute URL with version
  if (transformed.$id) {
    // Replace any existing version pattern or add version
    const idPattern =
      /https:\/\/tokens\.unpunny\.fun\/schemas(?:\/v[\d.]+)?\/(.+)/;
    const relativePattern = /^\.\/(.+)/;

    if (idPattern.test(transformed.$id)) {
      const match = transformed.$id.match(idPattern);
      transformed.$id = `${WEB_BASE_URL}/v${version}/${match[1]}`;
    } else if (relativePattern.test(transformed.$id)) {
      const match = transformed.$id.match(relativePattern);
      transformed.$id = `${WEB_BASE_URL}/v${version}/${match[1]}`;
    }
  }

  // Transform all $ref URLs
  function transformRefs(obj) {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      if (key === "$ref" && typeof value === "string") {
        obj[key] = transformRefUrl(value, version);
      } else if (typeof value === "object") {
        transformRefs(value);
      }
    }
  }

  function transformRefUrl(refValue, version) {
    // Handle relative refs
    if (refValue.startsWith("./")) {
      return `${WEB_BASE_URL}/v${version}/${refValue.slice(2)}`;
    }

    // Handle already absolute refs - update version
    if (refValue.startsWith(WEB_BASE_URL)) {
      const pattern =
        /https:\/\/tokens\.unpunny\.fun\/schemas(?:\/v[\d.]+)?\/(.+)/;
      const match = refValue.match(pattern);
      if (match) {
        return `${WEB_BASE_URL}/v${version}/${match[1]}`;
      }
    }

    return refValue;
  }

  transformRefs(transformed);
  return transformed;
}

async function processSchemaFile(srcPath, destPath, version) {
  const content = await readFile(srcPath, "utf-8");
  let schema;

  try {
    schema = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to parse ${srcPath}:`, error);
    return;
  }

  // Transform for web
  const transformed = await transformSchemaForWeb(schema, version);

  // Ensure destination directory exists
  await mkdir(dirname(destPath), { recursive: true });

  // Write transformed schema
  await writeFile(destPath, `${JSON.stringify(transformed, null, 2)}\n`);
  console.log(`  ✓ ${srcPath.replace(`${packageRoot}/`, "")}`);
}

async function processDirectory(srcDir, destDir, version) {
  const entries = await readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(srcPath, destPath, version);
    } else if (entry.name.endsWith(".json")) {
      await processSchemaFile(srcPath, destPath, version);
    }
  }
}

async function main() {
  const srcDir = join(packageRoot, "src");
  const webDir = join(packageRoot, "dist-web", "schemas");
  const versionDir = join(webDir, `v${VERSION}`);
  const latestDir = join(webDir, "latest");

  console.log(`Building web schemas for version ${VERSION}...`);

  // Process versioned schemas
  console.log(`\nCreating versioned schemas at v${VERSION}/:`);
  await processDirectory(srcDir, versionDir, VERSION);

  // Copy to latest (not symlink for Windows compatibility)
  console.log(`\nCopying to latest/:`);
  if (existsSync(latestDir)) {
    // Remove old latest
    await import("node:fs").then((fs) =>
      fs.promises.rm(latestDir, { recursive: true, force: true }),
    );
  }
  await cp(versionDir, latestDir, { recursive: true });
  console.log(`  ✓ Copied v${VERSION} to latest`);

  console.log("\n✨ Web schemas build complete!");

  if (isCI) {
    console.log("📝 Schemas ready for commit by release workflow");
  } else {
    console.log(`📝 Local build complete - schemas built as v${VERSION}`);
  }
}

main().catch((error) => {
  console.error("Error building web schemas:", error);
  process.exit(1);
});
