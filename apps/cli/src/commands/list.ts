/**
 * List command implementation using high-level APIs
 */

import { promises as fs } from "node:fs";
import {
  listTokens as analyzeListTokens,
  type ListTokensOptions,
  type TokenListItem,
} from "@upft/analysis";

export interface ListOptions {
  type?: string;
  group?: string;
  resolve?: boolean;
}

export type { TokenListItem };

/**
 * List tokens from a token file
 */
export async function listTokens(
  filePath: string,
  options: ListOptions = {},
): Promise<TokenListItem[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const doc = JSON.parse(content);

    // Convert CLI options to analysis options
    const analysisOptions: ListTokensOptions = {
      resolveReferences: options.resolve ?? true, // Default to resolving references
    };

    // Only add optional properties if they have values
    if (options.type) {
      analysisOptions.type = options.type;
    }
    if (options.group) {
      analysisOptions.group = options.group;
    }

    // Use high-level analysis API
    return analyzeListTokens(doc, analysisOptions);
  } catch (error) {
    throw new Error(
      `Failed to list tokens: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
