/**
 * List command implementation
 */

import { promises as fs } from "node:fs";
import { buildASTFromDocument } from "../../ast/ast-builder.js";
import { ASTQuery } from "../../ast/ast-query.js";
import { ReferenceResolver } from "../../ast/reference-resolver.js";
import type { TokenNode } from "../../ast/types.js";

export class ListCommand {
  /**
   * List tokens from a token file
   */
  async listTokens(
    filePath: string,
    options?: { type?: string; group?: string },
  ): Promise<
    Array<{
      path: string;
      type?: string;
      value?: unknown;
      resolvedValue?: unknown;
      hasReference?: boolean;
    }>
  > {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const doc = JSON.parse(content);

      // Build AST from the document
      const ast = buildASTFromDocument(doc);

      // Create query instance
      const query = new ASTQuery(ast);

      // Query tokens based on options
      let tokens: TokenNode[];
      if (options?.type) {
        tokens = query.getTokensByType(options.type);
      } else if (options?.group) {
        // For group filtering, get tokens at that path
        tokens = query
          .getAllTokens()
          .filter((t) => t.path.startsWith(`${options.group}.`));
      } else {
        tokens = query.getAllTokens();
      }

      // Create resolver for reference checking
      const resolver = new ReferenceResolver(ast);
      resolver.resolve();

      // Map tokens to the expected format
      return tokens.map((token) => {
        // After resolving, the token should have resolved values
        const tokenValue = token.value as Record<string, unknown>;
        const hasReference = "$ref" in (tokenValue || {});

        return {
          path: token.path,
          ...(token.tokenType && { type: token.tokenType }), // Only include type if it exists
          value: tokenValue?.$value ?? token.value,
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
}
