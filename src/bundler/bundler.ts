/**
 * Token bundler for generating output files from UPFT resolver manifests
 */

import { join } from "node:path";
import type { TokenFileReader } from "../filesystem/file-reader.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import { generateAll as generateAllPermutations } from "../resolver/resolver-core.js";
import type {
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../resolver/upft-types.js";
import type { TokenDocument } from "../types.js";
import type { BundlerOptions, ResolverOptions } from "../types/options.js";

export type TokenTransform = (tokens: TokenDocument) => TokenDocument;

export type TokenBundlerOptions = BundlerOptions & {
  transforms?: TokenTransform[];
};

export interface Bundle {
  id: string;
  tokens: TokenDocument;
  resolvedTokens?: TokenDocument;
  files: string[];
  output?: string;
  format: string;
}

export interface BundleWriteResult {
  filePath: string;
  success: boolean;
  error?: string;
}

export class TokenBundler {
  private fileReader: TokenFileReader | undefined;
  private fileWriter?: TokenFileWriter;
  private outputFormat: string;
  private transforms: TokenTransform[];
  private prettify: boolean;
  private basePath: string;

  constructor(options: TokenBundlerOptions = {}) {
    this.fileReader = options.fileReader;
    this.fileWriter = options.fileWriter ?? new TokenFileWriter();
    this.outputFormat = options.outputFormat || "dtcg";
    this.transforms = options.transforms || [];
    this.prettify = options.prettify ?? true;
    this.basePath = options.basePath ?? process.cwd();
  }

  /**
   * Generate bundles from a resolver manifest
   */
  async bundle(manifest: UPFTResolverManifest): Promise<Bundle[]> {
    const options: ResolverOptions = { basePath: this.basePath };
    if (this.fileReader) {
      options.fileReader = this.fileReader;
    }
    const permutations = await generateAllPermutations(manifest, options);

    return permutations.map((permutation: ResolvedPermutation) =>
      this.createBundle(permutation),
    );
  }

  /**
   * Generate bundles and write to filesystem
   */
  async bundleToFiles(
    manifest: UPFTResolverManifest,
  ): Promise<BundleWriteResult[]> {
    if (!this.fileWriter) {
      throw new Error("FileWriter required for bundleToFiles operation");
    }

    const bundles = await this.bundle(manifest);
    const results: BundleWriteResult[] = [];

    for (const bundle of bundles) {
      const filePath = this.getOutputPath(bundle);
      const fullPath = join(this.basePath, filePath);

      try {
        const content = this.serializeBundle(bundle);
        await this.fileWriter.write(fullPath, content);

        results.push({
          filePath,
          success: true,
        });
      } catch (error) {
        results.push({
          filePath,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Create bundle from resolved permutation
   */
  private createBundle(permutation: ResolvedPermutation): Bundle {
    let tokens = permutation.tokens;

    // Apply transforms
    for (const transform of this.transforms) {
      tokens = transform(tokens);
    }

    return {
      id: permutation.id,
      tokens,
      ...(permutation.resolvedTokens && {
        resolvedTokens: permutation.resolvedTokens,
      }),
      files: permutation.files,
      ...(permutation.output && { output: permutation.output }),
      format: this.outputFormat,
    };
  }

  /**
   * Get output file path for bundle
   */
  private getOutputPath(bundle: Bundle): string {
    if (bundle.output) {
      return bundle.output;
    }

    // Generate default output path
    const extension = this.getFileExtension();
    return `${bundle.id}${extension}`;
  }

  /**
   * Get file extension based on output format
   */
  private getFileExtension(): string {
    switch (this.outputFormat) {
      case "dtcg":
        return ".json";
      default:
        return ".json";
    }
  }

  /**
   * Serialize bundle to string
   */
  private serializeBundle(bundle: Bundle): string {
    const tokens = bundle.resolvedTokens || bundle.tokens;

    switch (this.outputFormat) {
      case "dtcg":
        return this.serializeDTCG(tokens);
      case "custom":
        return this.serializeCustom(tokens);
      default:
        return this.serializeDTCG(tokens);
    }
  }

  /**
   * Serialize as DTCG format
   */
  private serializeDTCG(tokens: TokenDocument): string {
    const content = this.prettify
      ? JSON.stringify(tokens, null, 2)
      : JSON.stringify(tokens);

    return content;
  }

  /**
   * Serialize as custom format (passthrough for now)
   */
  private serializeCustom(tokens: TokenDocument): string {
    return this.serializeDTCG(tokens);
  }
}
