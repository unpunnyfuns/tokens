/**
 * @module core/resolver-core
 * @description Core reference resolution logic and ReferenceResolver class
 */

import { loadExternalFile } from "./file-loader.ts";
import {
  buildReferenceMap,
  getPathFromPointer,
  getValueByPath,
  type TokenValue,
} from "./reference-map.ts";
import { parseReference } from "./reference-parser.ts";

/**
 * Options for reference resolution
 */
export interface ResolverOptions {
  basePath?: string;
  mode?: boolean | "external-only";
  strict?: boolean;
  maxDepth?: number;
}

/**
 * Reference resolver class for design tokens
 */
export class ReferenceResolver {
  private refMap: Map<string, TokenValue>;
  private fileCache: Map<string, unknown>;
  private resolving: Set<string>;
  private options: ResolverOptions;

  constructor(tokens: Record<string, unknown>, options: ResolverOptions = {}) {
    this.options = options;
    this.refMap = buildReferenceMap(tokens);
    this.fileCache = new Map();
    this.resolving = new Set();

    // Set defaults
    this.options = {
      basePath: options.basePath || process.cwd(),
      mode: options.mode ?? true,
      strict: options.strict ?? true,
      maxDepth: options.maxDepth ?? 10,
    };
  }

  /**
   * Resolve all references in a token tree
   */
  async resolveTree(
    obj: unknown,
    currentPath: string[] = [],
  ): Promise<unknown> {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item, index) =>
          this.resolveTree(item, [...currentPath, index.toString()]),
        ),
      );
    }

    const record = obj as Record<string, unknown>;
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const keyPath = [...currentPath, key];

      // Handle $ref at root level
      if (key === "$ref" && typeof value === "string") {
        const resolvedValue = await this.resolveReference(value, currentPath);

        // If we're in external-only mode and this is internal, keep the ref
        const parsed = parseReference(value);
        if (
          this.options.mode === "external-only" &&
          parsed.type === "internal"
        ) {
          resolved.$ref = value;
        } else {
          // Replace the entire object with the resolved value
          if (
            typeof resolvedValue === "object" &&
            !Array.isArray(resolvedValue)
          ) {
            return { ...resolved, ...resolvedValue };
          }
          return resolvedValue;
        }
      }
      // Handle $value with embedded $ref
      else if (
        key === "$value" &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        const valueObj = value as Record<string, unknown>;
        if (valueObj.$ref && typeof valueObj.$ref === "string") {
          resolved[key] = await this.resolveReference(
            valueObj.$ref,
            currentPath,
          );
        } else {
          resolved[key] = await this.resolveTree(value, keyPath);
        }
      }
      // Recursively resolve nested objects
      else {
        resolved[key] = await this.resolveTree(value, keyPath);
      }
    }

    return resolved;
  }

  /**
   * Resolve a single reference
   */
  private async resolveReference(
    ref: string,
    currentPath: string[],
  ): Promise<unknown> {
    // Check for circular references
    const refId = `${currentPath.join(".")}->${ref}`;
    if (this.resolving.has(refId)) {
      throw new Error(`Circular reference detected: ${refId}`);
    }

    // Check depth limit
    const maxDepth = this.options.maxDepth ?? 10;
    if (this.resolving.size >= maxDepth) {
      throw new Error(`Maximum reference depth (${maxDepth}) exceeded`);
    }

    this.resolving.add(refId);

    try {
      const parsed = parseReference(ref);

      if (parsed.type === "internal") {
        // Internal reference
        const fragment = parsed.fragment ?? "";
        const value = this.refMap.get(fragment);

        if (value === undefined) {
          if (this.options.strict) {
            throw new Error(`Reference not found: ${ref}`);
          }
          return { $ref: ref };
        }

        // Check if the resolved value itself contains a reference
        if (typeof value === "object" && value !== null) {
          const valueRecord = value as Record<string, unknown>;
          if (valueRecord.$ref) {
            return this.resolveReference(
              valueRecord.$ref as string,
              currentPath,
            );
          }
        }

        return value;
      }

      // External reference
      if (!parsed.filePath) {
        throw new Error(`Invalid external reference: ${ref}`);
      }

      const externalTokens = await loadExternalFile(
        parsed.filePath,
        this.options.basePath ?? process.cwd(),
        this.fileCache,
      );

      if (parsed.fragment) {
        // Get specific path in external file
        const path = getPathFromPointer(parsed.fragment);
        return getValueByPath(externalTokens, path);
      }

      // Return the whole file
      return externalTokens;
    } finally {
      this.resolving.delete(refId);
    }
  }

  /**
   * Get the reference map for debugging/inspection
   */
  getReferenceMap(): Map<string, TokenValue> {
    return new Map(this.refMap);
  }

  /**
   * Get file cache statistics
   */
  getCacheStats(): { filesLoaded: number; filePaths: string[] } {
    return {
      filesLoaded: this.fileCache.size,
      filePaths: Array.from(this.fileCache.keys()),
    };
  }

  /**
   * Clear the file cache
   */
  clearCache(): void {
    this.fileCache.clear();
  }
}
