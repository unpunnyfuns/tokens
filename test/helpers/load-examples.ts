import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../..");

export const EXAMPLES_DIR = join(PROJECT_ROOT, "src", "examples");
export const TOKENS_DIR = join(EXAMPLES_DIR, "tokens");
export const SCENARIOS_DIR = join(EXAMPLES_DIR, "test-scenarios");
export const ERROR_CASES_DIR = join(EXAMPLES_DIR, "error-cases");
export const SCHEMAS_DIR = join(PROJECT_ROOT, "src", "schemas");

/**
 * Load a JSON file from the examples directory
 */
export async function loadExample<T = unknown>(
  relativePath: string,
): Promise<T> {
  const fullPath = join(EXAMPLES_DIR, relativePath);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load a token file from examples/tokens
 */
export async function loadTokenFile<T = unknown>(filename: string): Promise<T> {
  const fullPath = join(TOKENS_DIR, filename);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load a test scenario manifest
 */
export async function loadScenario<T = unknown>(filename: string): Promise<T> {
  const fullPath = join(SCENARIOS_DIR, filename);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load an error case for testing validation
 */
export async function loadErrorCase<T = unknown>(filename: string): Promise<T> {
  const fullPath = join(ERROR_CASES_DIR, filename);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load a schema file
 */
export async function loadSchema<T = unknown>(
  relativePath: string,
): Promise<T> {
  const fullPath = join(SCHEMAS_DIR, relativePath);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Get the full path to an example file
 */
export function getExamplePath(relativePath: string): string {
  return join(EXAMPLES_DIR, relativePath);
}

/**
 * Get the full path to a token file
 */
export function getTokenPath(filename: string): string {
  return join(TOKENS_DIR, filename);
}

/**
 * Get the full path to a scenario file
 */
export function getScenarioPath(filename: string): string {
  return join(SCENARIOS_DIR, filename);
}
