import { existsSync } from "node:fs";
import { copyFile, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import type {
  TokenFileWriter as ITokenFileWriter,
  TokenDocument,
} from "@upft/foundation";
import { isValidTokenDocument } from "@upft/foundation";
import JSON5 from "json5";
import YAML from "yaml";

/**
 * Format options for writing files
 */
export interface FormatOptions {
  type?: "json" | "json5" | "yaml";
  indent?: number | string;
  sortKeys?: boolean;
}

/**
 * Options for writing token files
 */
export interface WriteOptions {
  format?: FormatOptions;
  backup?: boolean;
  backupSuffix?: string;
  atomic?: boolean;
  validate?: boolean;
}

/**
 * Result of a write operation
 */
export interface WriteResult {
  path: string;
  success: boolean;
  error?: Error;
}

/**
 * Token file writer with support for multiple formats
 */
export class TokenFileWriter implements ITokenFileWriter {
  /**
   * Write raw string content to a file (for bundler compatibility)
   */
  async write(filePath: string, content: string): Promise<void> {
    await this.ensureDirectory(filePath);
    await writeFile(filePath, content, "utf-8");
  }

  /**
   * Write a single token file
   */
  async writeFile(
    filePath: string,
    content: TokenDocument,
    options: WriteOptions = {},
  ): Promise<void> {
    // Validate if requested
    if (options.validate) {
      this.validateContent(content);
    }

    // Create backup if requested
    if (options.backup && existsSync(filePath)) {
      await this.createBackup(filePath, options.backupSuffix);
    }

    // Ensure directory exists
    await this.ensureDirectory(filePath);

    // Format content
    const formatted = this.formatContent(filePath, content, options.format);

    // Write file
    if (options.atomic) {
      await this.writeAtomic(filePath, formatted);
    } else {
      await writeFile(filePath, formatted, "utf-8");
    }
  }

  /**
   * Write multiple files
   */
  async writeMultiple(
    files: Array<{ path: string; content: TokenDocument }>,
    options: WriteOptions & { stopOnError?: boolean } = {},
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    if (options.stopOnError) {
      // Write sequentially and stop on first error
      for (const { path, content } of files) {
        await this.writeFile(path, content, options);
        results.push({ path, success: true });
      }
    } else {
      // Write in parallel
      const writePromises = files.map(async ({ path, content }) => {
        try {
          await this.writeFile(path, content, options);
          return { path, success: true };
        } catch (error) {
          return {
            path,
            success: false,
            error: error as Error,
          };
        }
      });

      const parallelResults = await Promise.allSettled(writePromises);
      for (const result of parallelResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            path: "",
            success: false,
            error: result.reason,
          });
        }
      }
    }

    return results;
  }

  /**
   * Validate token content
   */
  private validateContent(content: TokenDocument): void {
    if (!isValidTokenDocument(content)) {
      throw new Error("Invalid token document: validation failed");
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(
    filePath: string,
    suffix = ".backup",
  ): Promise<void> {
    const backupPath = filePath + suffix;
    await copyFile(filePath, backupPath);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Format content based on file type
   */
  private formatContent(
    filePath: string,
    content: TokenDocument,
    options: FormatOptions = {},
  ): string {
    const ext = extname(filePath).toLowerCase();
    const type = options.type ?? this.inferType(ext);

    // Sort keys if requested
    const data = options.sortKeys ? this.sortKeys(content) : content;

    switch (type) {
      case "json":
        return JSON.stringify(data, null, options.indent ?? 2);

      case "json5":
        return JSON5.stringify(data, null, options.indent ?? 2);

      case "yaml":
        return YAML.stringify(data, {
          indent: typeof options.indent === "number" ? options.indent : 2,
        });

      default:
        throw new Error(`Unsupported format: ${type}`);
    }
  }

  /**
   * Infer format type from extension
   */
  private inferType(ext: string): "json" | "json5" | "yaml" {
    switch (ext) {
      case ".json":
        return "json";
      case ".json5":
        return "json5";
      case ".yaml":
      case ".yml":
        return "yaml";
      default:
        return "json";
    }
  }

  /**
   * Sort object keys recursively
   */
  private sortKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortKeys(item));
    }

    if (obj && typeof obj === "object") {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort();

      for (const key of keys) {
        sorted[key] = this.sortKeys((obj as Record<string, unknown>)[key]);
      }

      return sorted;
    }

    return obj;
  }

  /**
   * Write file atomically using temp file and rename
   */
  private async writeAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.${Date.now()}.tmp`;

    try {
      // Write to temp file
      await writeFile(tempPath, content, "utf-8");

      // Atomic rename
      await rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}
