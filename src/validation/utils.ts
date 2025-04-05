import { promises as fs } from "node:fs";
import { join } from "node:path";

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
