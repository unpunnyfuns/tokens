/**
 * Diff command implementation
 */

import { compareTokenDocumentsDetailed } from "../../analysis/token-comparison.js";
import type { TokenFileReader } from "../../filesystem/file-reader.js";
import { UPFTResolver } from "../../resolver/upft-resolver.js";
import type {
  ResolutionInput,
  UPFTResolverManifest,
} from "../../resolver/upft-types.js";
import type { TokenDocument } from "../../types.js";

export interface TokenDiff {
  differences: Array<{
    path: string;
    leftValue: unknown;
    rightValue: unknown;
    type: "added" | "removed" | "changed";
  }>;
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
}

export interface DiffCommandOptions {
  fileReader?: TokenFileReader;
  basePath?: string;
}

export class DiffCommand {
  private resolver: UPFTResolver;

  constructor(options: DiffCommandOptions = {}) {
    this.resolver = new UPFTResolver(
      options.fileReader || options.basePath
        ? {
            ...(options.fileReader && { fileReader: options.fileReader }),
            ...(options.basePath && { basePath: options.basePath }),
          }
        : {},
    );
  }

  /**
   * Compare two token documents directly
   */
  async diffDocuments(
    leftDoc: TokenDocument,
    rightDoc: TokenDocument,
  ): Promise<TokenDiff> {
    const comparison = compareTokenDocumentsDetailed(leftDoc, rightDoc);
    return {
      differences: comparison.differences,
      summary: comparison.summary,
    };
  }

  /**
   * Compare two permutations from a manifest
   */
  async diff(
    manifest: UPFTResolverManifest,
    leftModifiers: ResolutionInput = {},
    rightModifiers: ResolutionInput = {},
  ): Promise<TokenDiff> {
    const leftResolved = await this.resolver.resolvePermutation(
      manifest,
      leftModifiers,
    );
    const rightResolved = await this.resolver.resolvePermutation(
      manifest,
      rightModifiers,
    );

    const comparison = compareTokenDocumentsDetailed(
      leftResolved.tokens,
      rightResolved.tokens,
    );

    return {
      differences: comparison.differences,
      summary: comparison.summary,
    };
  }
}
