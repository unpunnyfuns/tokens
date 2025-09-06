import { readFile as defaultReadFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join } from "node:path";
import type {
  TokenFileReader as ITokenFileReader,
  TokenDocument,
} from "@upft/foundation";
// Import external dependencies
import { glob } from "glob";
import JSON5 from "json5";
import YAML from "yaml";
import { FileCache } from "./cache.js";
import type { TokenFile } from "./types.js";
import { deepMerge } from "./utils/deep-merge.js";

/**
 * Options for reading token files
 */
export interface ReadOptions {
  resolveImports?: boolean;
  cache?: boolean;
  validate?: boolean;
}

/**
 * Options for reading directories
 */
export interface DirectoryOptions {
  pattern?: string;
  recursive?: boolean;
  ignore?: string[];
}

/**
 * Filesystem interface for dependency injection
 */
export interface FileSystem {
  readFile: (path: string, encoding: string) => Promise<string>;
}

/**
 * Token file reader with support for multiple formats
 */
export class TokenFileReader implements ITokenFileReader {
  private cache: FileCache;
  private importStack = new Set<string>();
  private basePath: string;
  private fs: FileSystem;

  constructor(
    private options: {
      basePath?: string;
      enableCache?: boolean;
      cacheSize?: number;
      fs?: FileSystem;
    } = {},
  ) {
    this.cache = new FileCache({
      maxSize: options.cacheSize ?? 100,
    });
    this.basePath = options.basePath ?? process.cwd();
    this.fs = options.fs ?? {
      readFile: async (path: string, encoding: string) =>
        defaultReadFile(path, encoding as BufferEncoding),
    };
  }

  /**
   * Read a single token file
   *
   * @param filePath - Path to token file
   * @param options - Reading options
   * @returns Promise resolving to parsed token file
   */
  async readFile(
    filePath: string,
    options: ReadOptions = {},
  ): Promise<TokenFile> {
    // Check cache
    if (options.cache !== false && this.options.enableCache !== false) {
      const cached = this.cache.get(filePath);
      if (cached) return cached;
    }

    // Read and parse file
    const content = await this.parseFile(filePath);

    // Resolve imports if requested
    const resolved = options.resolveImports
      ? await this.resolveImports(content, filePath)
      : content;

    // Extract references
    const references = this.extractFileReferences(resolved);

    // Determine format from file extension
    const format = this.getFileFormat(filePath);

    // Create token file
    const tokenFile: TokenFile = {
      filePath,
      tokens: resolved,
      format,
      metadata: {
        references,
      },
    };

    // Cache the result
    if (options.cache !== false && this.options.enableCache !== false) {
      this.cache.set(filePath, tokenFile);
    }

    return tokenFile;
  }

  /**
   * Read all token files in a directory
   */
  async readDirectory(
    dirPath: string,
    options: DirectoryOptions = {},
  ): Promise<TokenFile[]> {
    const pattern = options.pattern ?? "**/*.{json,json5,yaml,yml}";
    const ignore = options.ignore ?? ["**/node_modules/**", "**/.git/**"];

    // Resolve directory path relative to basePath
    const absoluteDirPath = isAbsolute(dirPath)
      ? dirPath
      : join(this.basePath, dirPath);

    const files = await glob(pattern, {
      cwd: absoluteDirPath,
      absolute: false,
      ignore,
    });

    const tokenFiles = await Promise.all(
      files.map((file) => {
        // Create relative path from basePath
        const relativePath = join(dirPath, file);
        return this.readFile(relativePath).catch(() => null);
      }),
    );

    return tokenFiles.filter((f): f is TokenFile => f !== null);
  }

  /**
   * Parse file based on extension - supports both local files and HTTP URLs
   */
  private async parseFile(filePath: string): Promise<TokenDocument> {
    let content: string;
    let ext: string;

    // Handle HTTP/HTTPS URLs
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      content = await this.fetchHttpFile(filePath);
      ext = extname(new URL(filePath).pathname).toLowerCase();
    }
    // Handle file:// URIs
    else if (filePath.startsWith("file://")) {
      const fileUrl = new URL(filePath);
      const localPath = fileUrl.pathname;
      content = await this.fs.readFile(localPath, "utf-8");
      ext = extname(localPath).toLowerCase();
    } else {
      // Handle local files
      const fullPath = isAbsolute(filePath)
        ? filePath
        : join(this.basePath, filePath);
      content = await this.fs.readFile(fullPath, "utf-8");
      ext = extname(filePath).toLowerCase();
    }

    switch (ext) {
      case ".json":
        return JSON.parse(content);
      case ".json5":
        return JSON5.parse(content);
      case ".yaml":
      case ".yml":
        return YAML.parse(content);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Fetch file content from HTTP/HTTPS URL
   */
  private async fetchHttpFile(url: string): Promise<string> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${url}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (
        contentType &&
        !contentType.includes("application/json") &&
        !contentType.includes("text/") &&
        !contentType.includes("application/x-yaml")
      ) {
        console.warn(`Unexpected content-type "${contentType}" for ${url}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(`Network error fetching ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if both values are mergeable objects
   */
  private isMergeableObject(value: unknown): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Merge a single entry into the target
   */
  private mergeEntry(target: TokenDocument, key: string, value: unknown): void {
    if (this.isMergeableObject(value) && this.isMergeableObject(target[key])) {
      // Deep merge groups; replace leaves and arrays
      target[key] = deepMerge(
        target[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      ) as TokenDocument[string];
    } else {
      target[key] = value as TokenDocument[string];
    }
  }

  /**
   * Load a single import file
   */
  private async loadImport(
    importPath: unknown,
    basePath: string,
  ): Promise<TokenDocument> {
    if (typeof importPath !== "string") return {};

    const absolutePath = join(dirname(basePath), importPath);
    const file = await this.readFile(absolutePath, {
      resolveImports: true,
    });

    return file.tokens;
  }

  /**
   * Merge multiple documents together
   */
  private mergeDocuments(documents: TokenDocument[]): TokenDocument {
    const merged: TokenDocument = {};

    for (const doc of documents) {
      for (const [key, value] of Object.entries(doc)) {
        this.mergeEntry(merged, key, value);
      }
    }

    return merged;
  }

  /**
   * Extract imports from document
   */
  private extractImports(document: TokenDocument): unknown[] {
    if (!("$import" in document)) return [];

    return Array.isArray(document.$import)
      ? document.$import
      : [document.$import];
  }

  /**
   * Resolve $import statements
   */
  private async resolveImports(
    document: TokenDocument,
    filePath: string,
  ): Promise<TokenDocument> {
    // Check for circular imports
    if (this.importStack.has(filePath)) {
      throw new Error(`Circular import detected: ${filePath}`);
    }

    this.importStack.add(filePath);

    try {
      const imports = this.extractImports(document);
      if (imports.length === 0) return document;

      // Load all imported documents
      const importedDocs = await Promise.all(
        imports.map((importPath) => this.loadImport(importPath, filePath)),
      );

      // Merge imports first, then overlay current document
      const merged = this.mergeDocuments(importedDocs);

      // Overlay current document (excluding $import)
      for (const [key, value] of Object.entries(document)) {
        if (key !== "$import") {
          this.mergeEntry(merged, key, value);
        }
      }

      return merged;
    } finally {
      this.importStack.delete(filePath);
    }
  }

  /**
   * Extract all references from a document using simple traversal
   * Note: This is a basic implementation. Use @upft/ast for more sophisticated reference detection.
   */
  private extractFileReferences(document: TokenDocument): Set<string> {
    const references = new Set<string>();

    const extractFromString = (str: string): void => {
      const matches = str.match(/\{([^}]+)\}/g);
      if (matches) {
        for (const match of matches) {
          references.add(match.slice(1, -1)); // Remove { }
        }
      }
    };

    const traverse = (obj: unknown): void => {
      if (typeof obj === "string" && obj.includes("{") && obj.includes("}")) {
        extractFromString(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (obj && typeof obj === "object") {
        const record = obj as Record<string, unknown>;
        // Handle JSON Schema $ref format
        if ("$ref" in record && typeof record.$ref === "string") {
          references.add(record.$ref);
        }
        // Continue traversing all values
        Object.values(record).forEach(traverse);
      }
    };

    traverse(document);
    return references;
  }

  /**
   * Determine file format from extension
   */
  private getFileFormat(filePath: string): "json" | "json5" | "yaml" {
    const ext = extname(filePath).toLowerCase();
    if (ext === ".json5") return "json5";
    if (ext === ".yaml" || ext === ".yml") return "yaml";
    return "json";
  }

  /**
   * Invalidate cache for a file
   */
  invalidateCache(filePath: string): void {
    this.cache.invalidate(filePath);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
