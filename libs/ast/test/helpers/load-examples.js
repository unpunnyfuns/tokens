import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Load a token file from examples directory
 */
export function loadTokenFile(relativePath) {
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
  return JSON.parse(content);
}

/**
 * Load an error case file from examples directory
 */
export function loadErrorCase(relativePath) {
  const examplesPath = join(
    process.cwd(),
    "..",
    "..",
    "libs",
    "examples",
    "src",
    "error-cases",
  );
  const fullPath = join(examplesPath, relativePath);
  const content = readFileSync(fullPath, "utf8");
  return JSON.parse(content);
}
