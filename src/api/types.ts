/**
 * Shared types for API module
 */

import type { GroupNode, TokenNode } from "../ast/types.js";
import type { TokenDocument, ValidationResult } from "../types.js";

export interface ApiBundleOptions {
  manifest?: string;
  files?: string[];
  modifiers?: Record<string, string>;
  theme?: string;
  mode?: string;
  includeMetadata?: boolean;
  resolveValues?: boolean;
  format?: "json" | "json5" | "yaml";
}

export interface BundleResult {
  tokens: TokenDocument;
  metadata?: BundleMetadata;
  validate: () => Promise<ValidationResult>;
  getAST: () => TokenAST;
  write: (path: string) => Promise<void>;
}

export interface BundleMetadata {
  files: {
    count: number;
    paths: string[];
  };
  stats: {
    totalTokens: number;
    totalGroups: number;
    hasReferences: boolean;
  };
  bundleTime: number;
}

export interface TokenAST {
  tokens: TokenNode[];
  groups: GroupNode[];
  references?: string[];
}
