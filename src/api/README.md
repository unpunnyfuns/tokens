# API

High-level programmatic interfaces providing streamlined access to token operations through convenient abstractions. This module serves as the primary integration point for applications, offering bundling, validation, and transformation capabilities while maintaining flexibility for advanced use cases through access to lower-level operations.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance Notes](#performance-notes)
- [Integration Points](#integration-points)

## Overview

The API module provides high-level convenience functions for common token operations. It abstracts the complexity of loading, validating, and bundling tokens while providing access to lower-level operations when needed. The module serves as the primary integration point for applications that need to work with design tokens programmatically.

The module handles file operations, caching, and provides both synchronous and asynchronous interfaces. It includes specialized utilities for manifest handling, token validation, and virtual file system operations that enable working with tokens entirely in memory.

## Usage

### Basic Bundling

Bundle tokens with metadata and validation:

```typescript
import { bundleWithMetadata } from '@unpunnyfuns/tokens';

const result = await bundleWithMetadata({
  manifest: './tokens.manifest.json',
  theme: 'dark',
  includeMetadata: true,
  format: 'json'
});

// Access the bundled tokens
console.log(result.tokens);

// Validate the bundle
const validation = await result.validate();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Get AST representation
const ast = result.getAST();
console.log(`Token count: ${ast.statistics.totalTokens}`);

// Write to file
await result.write('./dist/tokens.json');
```

### Manifest Validation

Comprehensive validation for manifests and all their permutations:

```typescript
import { validateManifestWithPermutations } from '@unpunnyfuns/tokens';

// Basic validation
const result = await validateManifestWithPermutations('./manifest.json');
if (!result.valid) {
  console.error(result.errors);
}

// Test all possible combinations
const fullResult = await validateManifestWithPermutations('./manifest.json', {
  allPermutations: true,
  crossPermutation: true
});

if (fullResult.permutationResults) {
  for (const perm of fullResult.permutationResults) {
    console.log(`${perm.permutation}: ${perm.valid ? '✓' : '✗'}`);
  }
}
```

### Token File System

Work with token documents and manifests:

```typescript
import { TokenFileSystem } from '@unpunnyfuns/tokens';

const tfs = new TokenFileSystem();

// Add token documents
await tfs.addDocument('./core.json');
await tfs.addDocument('./theme.json');

// Add manifest with modifiers
await tfs.addManifest('./tokens.manifest.json', { theme: 'dark' });

// Get all documents
const documents = tfs.getDocuments();

// Get statistics
const stats = tfs.getStats();
console.log(`Loaded ${stats.documentCount} documents, ${stats.manifestCount} manifests`);
```

### Workflows and Comparison

Use pre-built workflows for common operations:

```typescript
import { workflows, loadASTFromFileSystem, compare, TokenFileSystem } from '@unpunnyfuns/tokens';

// Build AST from file system
const tfs = new TokenFileSystem();
await tfs.addDocument('./tokens/core.json');
const astWithMetadata = await loadASTFromFileSystem(tfs);

// Compare two permutations
const comparison = await compare(
  './tokens.manifest.json',
  { theme: 'light' },
  { theme: 'dark' }
);

console.log(`Changes: ${comparison.stats.differentTokens} different, ${comparison.stats.addedTokens} added`);

// Extract tokens by type
const colorTokens = workflows.extractByType(tokens, 'color');

// Find tokens with specific value
const matches = workflows.findByValue(tokens, '#ff0000');
```

## API Reference

### Core Functions

| Function | Type | Description |
|----------|------|-------------|
| `bundleWithMetadata` | `(options: BundleOptions) => Promise<BundleResult>` | Bundle tokens with metadata and utility methods |
| `validateManifestWithPermutations` | `(path: string, options?) => Promise<ValidationResult>` | Validate manifest and all permutations |
| `formatError` | `(error: unknown, verbose?: boolean) => string` | Format errors for consistent display |

### Workflow Functions

| Function | Type | Description |
|----------|------|-------------|
| `loadASTFromFileSystem` | `(fs: TokenFileSystem) => Promise<ASTWithMetadata>` | Load AST from token file system |
| `compare` | `(manifestPath: string, modifiers1: Record<string, string>, modifiers2: Record<string, string>) => Promise<ComparisonResult>` | Compare two permutations |
| `validateTokens` | `(document: TokenDocument) => ValidationResult` | Validate token document |

### Helper Functions

| Function | Type | Description |
|----------|------|-------------|
| `parseManifest` | `(manifest: unknown) => Promise<ParsedManifest>` | Parse and validate manifest |

### Classes

| Class | Description |
|-------|-------------|
| `TokenFileSystem` | Virtual file system for token operations |

#### TokenFileSystem Methods

| Method | Type | Description |
|--------|------|-------------|
| `addDocument` | `(path: string) => Promise<void>` | Add a token document from file |
| `addDocuments` | `(paths: string[]) => Promise<void>` | Add multiple token documents |
| `addManifest` | `(path: string, modifiers?: Record<string, string>) => Promise<void>` | Add a manifest and optionally resolve it |
| `getDocuments` | `() => TokenDocument[]` | Get all loaded documents |
| `getDocument` | `(path: string) => TokenDocument \| undefined` | Get specific document by path |
| `getManifests` | `() => UPFTResolverManifest[]` | Get all loaded manifests |
| `getManifest` | `(path: string) => UPFTResolverManifest \| undefined` | Get specific manifest by path |
| `getStats` | `() => FileSystemStats` | Get statistics about loaded files |
| `clear` | `() => void` | Clear all loaded documents and manifests |

### Types

| Type | Description |
|------|-------------|
| `BundleOptions` | Configuration options for bundling |
| `BundleResult` | Bundle result with tokens and utility methods |
| `BundleMetadata` | Metadata about the bundling process |
| `TokenAST` | AST representation with tokens and groups |
| `ASTWithMetadata` | AST with resolver metadata |
| `ParsedManifest` | Result of manifest parsing with validation |

#### BundleOptions

```typescript
interface BundleOptions {
  manifest?: string;
  files?: string[];
  modifiers?: Record<string, string>;
  theme?: string;
  mode?: string;
  includeMetadata?: boolean;
  format?: 'json' | 'json5' | 'yaml';
}
```

#### BundleResult

```typescript
interface BundleResult {
  tokens: TokenDocument;
  metadata?: BundleMetadata;
  validate(): Promise<TokenValidationResult>;
  getAST(): TokenAST;
  write(path: string): Promise<void>;
}
```

#### BundleMetadata

```typescript
interface BundleMetadata {
  files: { count: number; paths: string[] };
  stats: {
    totalTokens: number;
    totalGroups: number;
    hasReferences: boolean;
  };
  bundleTime: number;
}
```

## Structure

| File | Purpose |
|------|---------|
| `index.ts` | Main API exports and bundle functions |
| `bundle-helpers.ts` | Bundle utility functions |
| `manifest-helpers.ts` | Manifest utility functions |
| `token-file-system.ts` | TokenFileSystem implementation |
| `types.ts` | TypeScript type definitions |
| `workflows.ts` | Workflow utilities |

## Performance Notes

- File operations are cached to avoid redundant reads
- AST construction is lazy (only when `getAST()` is called)  
- Validation is lazy (only when `validate()` is called)
- Multiple caching layers for manifest and resolution results
- Virtual file system operations are entirely in-memory

## Integration Points

### React Hook Integration

```typescript
function useTokens(modifiers) {
  const [tokens, setTokens] = useState(null);
  
  useEffect(() => {
    bundleWithMetadata({ manifest: './tokens.manifest.json', ...modifiers })
      .then(result => setTokens(result.tokens));
  }, [modifiers]);
  
  return tokens;
}
```

### Build Tool Plugin

```typescript
class TokenPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync('TokenPlugin', async (params, callback) => {
      const result = await bundleWithMetadata(this.options);
      await result.write('./dist/tokens.json');
      callback();
    });
  }
}
```

### Error Handling

```typescript
try {
  await bundleWithMetadata(options);
} catch (error) {
  console.error(formatError(error, verbose));
}
```