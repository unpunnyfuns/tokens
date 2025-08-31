import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TokenDocument } from "@upft/foundation";

/**
 * Load a token file from fixtures package
 */
export function loadTokenFile<T = TokenDocument>(relativePath: string): T {
  // Get the fixtures package path using workspace structure
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const fixturesPath = join(currentDir, "..", "..", "..", "fixtures", "src");
  const fullPath = join(fixturesPath, relativePath);
  const content = readFileSync(fullPath, "utf8");
  return JSON.parse(content) as T;
}
