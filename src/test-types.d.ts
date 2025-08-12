// Test utility types for validation results and mocked objects

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  skipped?: boolean;
  skipReason?: string;
  filePath?: string;
  stats?: {
    totalReferences?: number;
    invalidReferences?: number;
  };
  summary?: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
  };
  results?: ValidationResult[];
  derived?: unknown;
  metadata?: {
    validationErrors?: string[];
    filesLoaded?: number;
    totalTokens?: number;
    hasReferences?: boolean;
    theme?: string | null;
    generated?: string;
  };
  output?: string;
  ast?: unknown;
  tokens?: unknown;
}

export interface MockStat {
  isFile: () => boolean;
  isDirectory: () => boolean;
}

export interface BundleMetadata {
  bundleTime: number;
  manifest: string;
  theme: string | null;
  mode: string | null;
  format: string;
  files: {
    loaded: string[];
    count: number;
  };
  stats: {
    totalTokens: number;
    hasReferences: boolean;
    totalGroups: number;
    tokensByType: Record<string, number>;
    tokensWithReferences: number;
    depth: number;
  };
  resolvedValues: boolean;
}

export interface MockBundleResult {
  tokens: unknown;
  toJSON: () => string;
  getAST: () => unknown;
  validate: () => Promise<{ valid: boolean; errors?: string[] }>;
  metadata: BundleMetadata | null;
}
