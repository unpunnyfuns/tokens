import { readFile as defaultReadFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join } from "node:path";
import { glob } from "glob";
import JSON5 from "json5";
import YAML from "yaml";
import { extractReferences, traverseTokens } from "../core/token/operations.js";
import type { TokenDocument } from "../types.js";
import { FileCache } from "./cache.js";
import type { TokenFile } from "./types.js";

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
export class TokenFileReader {
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
   * Parse file based on extension
   */
  private async parseFile(filePath: string): Promise<TokenDocument> {
    const fullPath = isAbsolute(filePath)
      ? filePath
      : join(this.basePath, filePath);
    const content = await this.fs.readFile(fullPath, "utf-8");
    const ext = extname(filePath).toLowerCase();

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
      target[key] = {
        ...(target[key] as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      };
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
   * Extract all references from a document
   */
  private extractFileReferences(document: TokenDocument): Set<string> {
    const references = new Set<string>();

    traverseTokens(document, (_path, token) => {
      const refs = extractReferences(token);
      for (const ref of refs) {
        // Normalize reference
        const normalized = ref
          .replace(/^\{|\}$/g, "")
          .replace(/^#\//, "")
          .replace(/\//g, ".");
        references.add(normalized);
      }
      return true;
    });

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
