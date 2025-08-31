/**
 * Types for token parsing
 */

import type { TokenDocument } from "@upft/foundation";
import type { TokenAST } from "../../ast/dist/types.js";

export interface TokenParseOptions {
  /** File path for AST metadata */
  filePath: string;
  /** Base path for resolving references */
  basePath?: string;
}

export interface TokenParseResult {
  /** Generated TokenAST */
  ast: TokenAST;
  /** Source token document */
  source: TokenDocument;
  /** Any warnings during parsing */
  warnings: string[];
}
