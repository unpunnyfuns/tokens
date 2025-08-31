/**
 * Filesystem-specific types
 */

import type { TokenDocument } from "@upft/foundation";

// File system types
export interface TokenFile {
  filePath: string;
  tokens: TokenDocument;
  format: "json" | "json5" | "yaml";
  metadata: {
    lastModified?: Date;
    size?: number;
    references?: Set<string>;
  };
}

// Cache types
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}
