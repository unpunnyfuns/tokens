# API Design Specification

## Overview

The UPFT API follows a functional programming paradigm with clear naming conventions and type safety. This document outlines the design principles, naming conventions, and module structure.

## Design Principles

1. **Functional First**: Pure functions over classes
2. **Predictable Naming**: Consistent prefixes with clear semantics
3. **Type Safety**: Leverage TypeScript fully
4. **No Surprises**: Functions do what their names suggest
5. **Progressive Disclosure**: Simple API for common tasks, core API for advanced use

## Naming Conventions

### Function Prefixes

| Prefix | Usage | Return Type | Example |
|--------|-------|-------------|---------|
| `get*` | Single item lookups | `T \| undefined` | `getToken(path)` |
| `find*` | Searches/filters | `T[]` | `findTokensByType(type)` |
| `create*` | Object instantiation | `T` | `createASTFromDocument(doc)` |
| `generate*` | Producing output/permutations | `T[]` | `generatePermutations(manifest)` |
| `load*` | Reading and parsing from filesystem | `Promise<T>` | `loadASTFromFileSystem(path)` |
| `read*` | Raw I/O operations | `Promise<string>` | `readFile(path)` |
| `validate*` | Validation operations | `ValidationResult` | `validateTokenDocument(doc)` |
| `merge*` | Combining data | `T` | `mergeTokens(a, b)` |
| `resolve*` | Reference resolution | `T` | `resolveReferences(doc)` |

## Module Structure

### Main Entry Point (`@unpunnyfuns/tokens`)

High-level API for common token operations:

```typescript
import { 
  bundleWithMetadata,
  validateManifestWithPermutations,
  resolveReferences,
  mergeTokens 
} from '@unpunnyfuns/tokens';
```

### Submodule Exports

| Module | Import Path | Purpose |
|--------|------------|---------|
| **core** | `@unpunnyfuns/tokens/core` | Core token operations and utilities |
| **validation** | `@unpunnyfuns/tokens/validation` | Token and manifest validation |
| **ast** | `@unpunnyfuns/tokens/ast` | Abstract Syntax Tree operations |
| **bundler** | `@unpunnyfuns/tokens/bundler` | Token bundling and output generation |
| **manifest** | `@unpunnyfuns/tokens/manifest` | Multi-dimensional token manifests |
| **references** | `@unpunnyfuns/tokens/references` | Reference resolution and cycle detection |
| **io** | `@unpunnyfuns/tokens/io` | File system operations |
| **api** | `@unpunnyfuns/tokens/api` | High-level convenience APIs |
| **linter** | `@unpunnyfuns/tokens/linter` | Token and manifest linting |

## Type Organization

### Validation Types Hierarchy

```typescript
ValidationResult
  ├── ValidationResultWithStats
  │     └── TokenValidationResult
  └── ManifestValidationResult
```

### Options Types

- `MergeTokensOptions` - Controls merge behavior
- `BundlerOptions` - Bundler configuration (bundler module)
- `ApiBundleOptions` - High-level API options (api module)
- `LinterOptions` - Linting configuration

## Async Pattern Rules

Functions are only async when performing actual I/O operations:

- ✅ `async loadTokenFile(path)` - Reads from filesystem
- ✅ `async writeBundle(bundle, path)` - Writes to filesystem
- ❌ `validateTokenDocument(doc)` - Pure computation, synchronous
- ❌ `mergeTokens(a, b)` - Pure computation, synchronous

## Error Handling

All errors use the standard `Error` class with descriptive messages:

```typescript
throw new Error(`Invalid manifest: missing required 'sets' property in ${filePath}`);
```

## API Stability

The API follows semantic versioning:
- Major version: Breaking changes
- Minor version: New features, backwards compatible
- Patch version: Bug fixes

## Module Documentation

Each module contains:
- `README.md` - Module overview and usage examples
- `API.md` - Complete API reference
- `index.ts` - Public exports
- Type definitions in module root or `types.ts`