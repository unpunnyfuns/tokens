import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TokenDocument } from "../../src/types.js";

/**
 * Load a token file from examples directory
 */
export function loadTokenFile<T = TokenDocument>(relativePath: string): T {
  const examplesPath = join(
    process.cwd(),
    "..",
    "..",
    "libs",
    "examples",
    "src",
  );
  const fullPath = join(examplesPath, relativePath);
  const content = readFileSync(fullPath, "utf8");
  return JSON.parse(content) as T;
}
