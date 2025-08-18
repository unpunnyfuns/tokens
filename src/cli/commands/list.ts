/**
 * List command implementation
 */

import { promises as fs } from "node:fs";
import { createAST, findAllTokens, findTokensByType } from "../../ast/index.js";
import { resolveASTReferences } from "../../ast/resolver.js";
import type { TokenNode } from "../../ast/types.js";

export interface ListOptions {
  type?: string;
  group?: string;
}

export interface TokenListItem {
  path: string;
  type?: string;
  value?: unknown;
  resolvedValue?: unknown;
  hasReference?: boolean;
}

/**
 * List tokens from a token file
 */
export async function listTokens(
  filePath: string,
  options?: ListOptions,
): Promise<TokenListItem[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const doc = JSON.parse(content);

    // Build AST from the document
    const ast = createAST(doc);

    // Query tokens based on options
    let tokens: TokenNode[];
    if (options?.type) {
      tokens = findTokensByType(ast, options.type);
    } else if (options?.group) {
      // For group filtering, get tokens at that path
      tokens = findAllTokens(ast).filter((t: TokenNode) =>
        t.path.startsWith(`${options.group}.`),
      );
    } else {
      tokens = findAllTokens(ast);
    }

    // Resolve references
    resolveASTReferences(ast);

    // Map tokens to the expected format
    return tokens.map((token) => {
      // After resolving, the token should have resolved values
      const tokenValue = token.value;
      const isObject = tokenValue && typeof tokenValue === "object";
      const hasReference = !!(isObject && "$ref" in tokenValue);

      return {
        path: token.path,
        ...(token.tokenType && { type: token.tokenType }), // Only include type if it exists
        value:
          isObject && "$value" in tokenValue ? tokenValue.$value : token.value,
        resolvedValue: token.value, // After resolution, token.value contains resolved value
        hasReference,
      };
    });
  } catch (error) {
    throw new Error(
      `Failed to list tokens: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
