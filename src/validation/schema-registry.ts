/**
 * Schema Registry for managing local, package, and remote schemas
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Ajv from "ajv/dist/2020.js";
import { glob } from "glob";
import { createLogger, LogLevel } from "../utils/logger.js";

type JSONSchema = Parameters<Ajv.default["compile"]>[0];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface SchemaSource {
  type: "local" | "package" | "url";
  basePath?: string;
  baseUrl?: string;
}

export interface SchemaRegistryOptions {
  /**
   * Current package version (for URL resolution)
   */
  version?: string;

  /**
   * Resolution order (first match wins)
   * Default: ['local', 'package', 'url']
   */
  resolutionOrder?: Array<"local" | "package" | "url">;

  /**
   * Base path for local schemas
   */
  localBasePath?: string;

  /**
   * Enable schema caching
   */
  cache?: boolean;
}

/**
 * Registry for managing schema loading across different sources
 */
export class SchemaRegistry {
  private schemas = new Map<string, JSONSchema>();
  private resolutionOrder: Array<"local" | "package" | "url">;
  private localBasePath: string;
  private packageBasePath: string;
  private baseUrl = "https://tokens.unpunny.fun/schemas";
  private cache: boolean;
  private logger: ReturnType<typeof createLogger>;

  constructor(options: SchemaRegistryOptions = {}) {
    // Get version from package.json or use provided
    // Version currently not used but kept for future use
    this.resolutionOrder = options.resolutionOrder ?? [
      "local",
      "package",
      "url",
    ];
    this.cache = options.cache ?? true;
    this.logger = createLogger({
      level: LogLevel.WARN,
      prefix: "schema-registry",
    });

    // Set base paths
    this.localBasePath = options.localBasePath ?? join(__dirname, "../schemas");
    this.packageBasePath = join(__dirname, "../../dist/schemas");
  }

  /**
   * Load schema by URI, trying each source in order
   */
  async loadSchema(uri: string): Promise<JSONSchema | undefined> {
    // Check cache first
    if (this.cache && this.schemas.has(uri)) {
      return this.schemas.get(uri);
    }

    // Try each source in order
    for (const source of this.resolutionOrder) {
      try {
        const schema = await this.loadFromSource(uri, source);
        if (schema) {
          if (this.cache) {
            this.schemas.set(uri, schema);
          }
          return schema;
        }
      } catch {
        // Schema not found in this source, try next
      }
    }

    return undefined;
  }

  /**
   * Load schema from a specific source
   */
  private async loadFromSource(
    uri: string,
    source: "local" | "package" | "url",
  ): Promise<JSONSchema | undefined> {
    switch (source) {
      case "local":
        return this.loadLocalSchema(uri);
      case "package":
        return this.loadPackageSchema(uri);
      case "url":
        return this.loadRemoteSchema(uri);
    }
  }

  /**
   * Load schema from local development files
   */
  private async loadLocalSchema(uri: string): Promise<JSONSchema | undefined> {
    // Only handle our schemas
    if (!uri.startsWith(this.baseUrl)) {
      return undefined;
    }

    // Convert URL to local path
    const relativePath = uri
      .replace(this.baseUrl, "")
      .replace(/^\/v[\d.]+\//, "/") // Strip version
      .replace(/^\//, "");

    const localPath = join(this.localBasePath, relativePath);

    try {
      const content = await readFile(localPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  /**
   * Load schema from packaged distribution
   */
  private async loadPackageSchema(
    uri: string,
  ): Promise<JSONSchema | undefined> {
    // Only handle our schemas
    if (!uri.startsWith(this.baseUrl)) {
      return undefined;
    }

    // Convert URL to package path
    const relativePath = uri
      .replace(this.baseUrl, "")
      .replace(/^\/v[\d.]+\//, "/") // Strip version
      .replace(/^\//, "");

    const packagePath = join(this.packageBasePath, relativePath);

    try {
      const content = await readFile(packagePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  /**
   * Load schema from remote URL
   */
  private async loadRemoteSchema(uri: string): Promise<JSONSchema | undefined> {
    // Only handle our schemas
    if (!uri.startsWith(this.baseUrl)) {
      return undefined;
    }

    try {
      const response = await fetch(uri);
      if (!response.ok) {
        return undefined;
      }
      return (await response.json()) as JSONSchema;
    } catch {
      return undefined;
    }
  }

  /**
   * Preload all local schemas
   */
  async preloadLocalSchemas(): Promise<void> {
    const schemaFiles = await glob("**/*.schema.json", {
      cwd: this.localBasePath,
      absolute: true,
    });

    for (const file of schemaFiles) {
      try {
        const content = await readFile(file, "utf-8");
        const schema = JSON.parse(content) as JSONSchema;

        if (
          typeof schema === "object" &&
          schema !== null &&
          "$id" in schema &&
          typeof schema.$id === "string"
        ) {
          this.schemas.set(schema.$id, schema);
        }
      } catch (error) {
        this.logger.warn(`Failed to preload schema ${file}`, error);
      }
    }
  }

  /**
   * Get all loaded schemas
   */
  getLoadedSchemas(): Map<string, JSONSchema> {
    return new Map(this.schemas);
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemas.clear();
  }

  /**
   * Create a schema loader function for Ajv
   */
  createAjvLoader(): (uri: string) => Promise<JSONSchema> {
    return async (uri: string) => {
      // Only handle our schemas
      if (!uri.startsWith(this.baseUrl)) {
        // Return empty schema to indicate we don't handle this
        throw new Error(`Schema not handled: ${uri}`);
      }

      const schema = await this.loadSchema(uri);
      if (!schema) {
        throw new Error(`Schema not found: ${uri}`);
      }
      return schema;
    };
  }

  /**
   * Migrate schema URI from one version to another
   */
  migrateSchemaUri(
    uri: string,
    fromVersion: string,
    toVersion: string,
  ): string {
    return uri.replace(`/v${fromVersion}/`, `/v${toVersion}/`);
  }

  /**
   * Check if a schema URI is for our schemas
   */
  isOurSchema(uri: string): boolean {
    return uri.startsWith(this.baseUrl);
  }

  /**
   * Extract version from schema URI
   */
  extractVersion(uri: string): string | null {
    const match = uri.match(/\/v([\d.]+)\//);
    return match?.[1] ?? null;
  }
}
