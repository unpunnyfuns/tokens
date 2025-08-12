/**
 * @module core/file-loader
 * @description External file loading and caching utilities
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Load an external file and return its tokens
 */
export async function loadExternalFile(
  filePath: string,
  basePath: string,
  cache: Map<string, unknown>,
): Promise<unknown> {
  const absolutePath = resolve(basePath, filePath);

  if (cache.has(absolutePath)) {
    return cache.get(absolutePath);
  }

  try {
    const content = await readFile(absolutePath, "utf-8");
    const data = JSON.parse(content);

    // Remove $schema from loaded data
    const { $schema, ...tokens } = data;

    cache.set(absolutePath, tokens);
    return tokens;
  } catch (error) {
    throw new Error(
      `Failed to load external file ${filePath}: ${(error as Error).message}`,
    );
  }
}

/**
 * Create a new file cache
 */
export function createFileCache(): Map<string, unknown> {
  return new Map<string, unknown>();
}

/**
 * Clear a file cache
 */
export function clearFileCache(cache: Map<string, unknown>): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(cache: Map<string, unknown>): {
  size: number;
  files: string[];
} {
  return {
    size: cache.size,
    files: Array.from(cache.keys()),
  };
}
