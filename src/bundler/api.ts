/**
 * Bundler API - High-level bundling operations
 */

import { TokenFileReader } from "../filesystem/file-reader.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import type { TokenDocument } from "../types.js";

export interface BundlerConfig {
  /**
   * Input files or directories
   */
  inputs: string[];

  /**
   * Output path
   */
  output?: string;

  /**
   * Output format
   */
  format?: "json" | "json5" | "yaml";

  /**
   * Whether to resolve references
   */

  /**
   * Whether to validate tokens
   */
  validate?: boolean;

  /**
   * Whether to minify output
   */
  minify?: boolean;

  /**
   * Sort keys in output
   */
  sortKeys?: boolean;
}

export class BundlerAPI {
  private fileReader: TokenFileReader;
  private fileWriter: TokenFileWriter;

  constructor() {
    this.fileReader = new TokenFileReader();
    this.fileWriter = new TokenFileWriter();
  }

  /**
   * Bundle multiple token files
   */
  async bundle(config: BundlerConfig): Promise<TokenDocument> {
    const documents: TokenDocument[] = [];

    // Read all input files
    for (const input of config.inputs) {
      const fileData = await this.fileReader.readFile(input);
      const doc = fileData.tokens;
      documents.push(doc);
    }

    // Bundle documents using dtcgMerge
    let bundled: TokenDocument = {};
    for (const doc of documents) {
      const { dtcgMerge } = await import("../core/dtcg-merge.js");
      bundled = dtcgMerge(bundled, doc);
    }

    // Write output if path provided
    if (config.output) {
      await this.fileWriter.writeFile(config.output, bundled, {
        format: {
          type: config.format || "json",
          sortKeys: config.sortKeys ?? false,
        },
      });
    }

    return bundled;
  }

  /**
   * Stream bundle for large files
   */
  async *streamBundle(config: BundlerConfig): AsyncGenerator<TokenDocument> {
    for (const input of config.inputs) {
      const fileData = await this.fileReader.readFile(input);
      const doc = fileData.tokens;
      yield doc;
    }
  }
}

// Export singleton instance
export const bundlerAPI = new BundlerAPI();

// Export types
export type { TokenDocument } from "../types.js";
