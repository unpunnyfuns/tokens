import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Get the project root directory
export const getProjectRoot = (): string => {
  return new URL("../../", import.meta.url).pathname;
};

// Read the package.json to get the version
export const getVersion = async (): Promise<string> => {
  const packageJsonPath = join(getProjectRoot(), "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  return packageJson.version;
};

// Find all JSON files recursively in a directory
export async function findJsonFiles(directory: string): Promise<string[]> {
  const files: string[] = [];

  // Helper function to traverse directories recursively
  async function traverse(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    }
  }

  await traverse(directory);
  return files;
}

// Resolve a schema path relative to a base file
export function resolveSchemaPath(
  schemaPath: string,
  basePath?: string,
): string {
  // If schema path is absolute, return as-is
  if (schemaPath.startsWith("/")) {
    return schemaPath;
  }

  // If we have a base path, resolve relative to its directory
  if (basePath) {
    const baseDir = dirname(basePath);
    return resolve(baseDir, schemaPath);
  }

  // Otherwise resolve relative to current working directory
  return resolve(process.cwd(), schemaPath);
}
