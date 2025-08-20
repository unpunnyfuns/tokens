# Module Overview

Complete module reference for the UnPunny Fun Tokens (UPFT) platform.

## Core Modules

### `@unpunnyfuns/tokens/core`
Core token operations and utilities.

**Key Functions:**
- `mergeTokens()` - Merge token documents
- `createPathIndex()` - Build path index for fast lookups
- `getToken()` - Get token by path
- `cloneToken()` - Deep clone tokens

### `@unpunnyfuns/tokens/validation`
Token and manifest validation against DTCG schemas.

**Key Functions:**
- `validateTokenDocument()` - Validate token document
- `validateManifest()` - Validate manifest structure
- `validateTokensWithManifest()` - Validate tokens against manifest

### `@unpunnyfuns/tokens/ast`
Abstract Syntax Tree operations for token documents.

**Key Functions:**
- `createASTFromDocument()` - Build AST from document
- `loadASTFromFileSystem()` - Load AST from files
- `findTokensByType()` - Query tokens by type
- `findTokensByPath()` - Query tokens by path pattern

### `@unpunnyfuns/tokens/bundler`
Token bundling and output generation.

**Key Functions:**
- `bundle()` - Bundle tokens according to manifest
- `writeBundles()` - Write bundles to filesystem
- `generatePermutations()` - Generate all permutations

### `@unpunnyfuns/tokens/manifest`
Multi-dimensional token manifest operations.

**Key Functions:**
- `readManifest()` - Read manifest from file
- `processManifest()` - Process manifest with modifiers
- `generateManifestPermutations()` - Generate permutations
- `validateManifest()` - Validate manifest structure

### `@unpunnyfuns/tokens/references`
Reference resolution and cycle detection.

**Key Functions:**
- `resolveReferences()` - Resolve token references
- `detectCycles()` - Detect circular references
- `createReferenceGraph()` - Build reference graph
- `topologicalSort()` - Sort tokens by dependencies

### `@unpunnyfuns/tokens/io`
File system operations for tokens.

**Key Functions:**
- `readTokenFile()` - Read token file
- `writeTokenFile()` - Write token file
- `watchTokenFiles()` - Watch for changes
- `createFileCache()` - Create file cache

### `@unpunnyfuns/tokens/api`
High-level convenience APIs.

**Key Functions:**
- `bundleWithMetadata()` - Bundle with metadata
- `validateManifestWithPermutations()` - Full validation
- `processTokenWorkflow()` - Complete workflow

### `@unpunnyfuns/tokens/linter`
Token and manifest linting.

**Key Functions:**
- `lintTokens()` - Lint token documents
- `lintManifest()` - Lint manifest files
- `loadLinterConfig()` - Load configuration
- `applyPreset()` - Apply rule presets

## CLI Module

### `@unpunnyfuns/tokens/cli`
Command-line interface (not typically imported).

**Commands:**
- `upft validate` - Validate tokens/manifests
- `upft bundle` - Bundle tokens
- `upft lint` - Lint tokens/manifests
- `upft preview` - Preview permutations
- `upft diff` - Compare token files
- `upft list` - List tokens

## Analysis Module

### `@unpunnyfuns/tokens/analysis`
Token analysis and comparison utilities.

**Key Functions:**
- `analyzeTokenDocument()` - Analyze document structure
- `compareTokenDocuments()` - Compare two documents
- `calculateStatistics()` - Calculate token statistics

## Type Definitions

### `@unpunnyfuns/tokens/types`
TypeScript type definitions (typically imported for types only).

**Key Types:**
- `Token` - Base token interface
- `TokenDocument` - Token document structure
- `UPFTResolverManifest` - Manifest structure
- `ValidationResult` - Validation results
- `BundleOptions` - Bundle configuration

## Usage Examples

### Basic Token Operations
```typescript
import { mergeTokens, validateTokenDocument } from '@unpunnyfuns/tokens';

const merged = mergeTokens(baseTokens, themeTokens);
const validation = validateTokenDocument(merged);
```

### Working with Manifests
```typescript
import { bundle } from '@unpunnyfuns/tokens/bundler';
import { readManifest } from '@unpunnyfuns/tokens/manifest';

const manifest = await readManifest('manifest.json');
const results = await bundle(manifest);
```

### Linting Tokens
```typescript
import { lintTokens } from '@unpunnyfuns/tokens/linter';

const result = await lintTokens('tokens.json', {
  preset: 'recommended'
});
```