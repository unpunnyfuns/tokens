# Core

Foundation module providing zero-dependency, pure functions for essential token operations and type-safe document manipulation. This module establishes the fundamental primitives used throughout the system, including immutable merging strategies, path-based navigation, type guards with TypeScript narrowing, and efficient indexing structures for performant token access.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance Notes](#performance-notes)
- [Integration Points](#integration-points)

## Overview

The core module serves as the foundation for all token operations, providing essential utilities for merging, validation, path manipulation, and type safety. It implements zero-dependency, pure functions that form the basis for higher-level modules throughout the system.

The module focuses on immutable operations and type safety, ensuring predictable behavior across all token operations. It includes comprehensive type guards, deep merging with conflict detection, efficient path-based navigation, and specialized operations for token documents. All functions are designed to be composable and side-effect free.

## Usage

### Token Type Guards

Validate token structures with TypeScript type narrowing:

```typescript
import { isToken, isTokenGroup, isTokenDocument, isDTCGReference } from '@unpunnyfuns/tokens';

// Type-safe token checking
if (isToken(value)) {
  // TypeScript knows value has $value property
  console.log(value.$value);
  console.log(value.$type);
}

if (isTokenGroup(value)) {
  // TypeScript knows value is a container without $value
  Object.keys(value).forEach(key => {
    if (!key.startsWith('$')) {
      // Process child tokens/groups
    }
  });
}

// Validate complete document structure
if (isTokenDocument(document)) {
  console.log('Valid DTCG document');
}

// Check for DTCG reference format
if (isDTCGReference('{color.primary}')) {
  console.log('Valid reference format');
}
```

### Token Merging

Merge token documents with type safety and conflict detection:

```typescript
import { mergeTokens, merge } from '@unpunnyfuns/tokens';

const baseTokens = {
  colors: {
    primary: { $value: '#007bff', $type: 'color' },
    secondary: { $value: '#6c757d', $type: 'color' }
  }
};

const themeTokens = {
  colors: {
    primary: { $value: '#28a745', $type: 'color' },
    tertiary: { $value: '#ffc107', $type: 'color' }
  }
};

// Simple merge - may throw DTCGMergeError on conflicts
const merged = mergeTokens(baseTokens, themeTokens);

// Advanced merge with options
const result = merge(baseTokens, themeTokens, {
  strict: true,
  allowConflicts: false
});

if (!result.success) {
  console.log('Merge conflicts:', result.conflicts);
} else {
  console.log('Merged successfully:', result.tokens);
}
```

### Path Operations

Navigate and manipulate tokens using dot-notation paths:

```typescript
import { parsePath, joinPath, getTokenAtPath, setTokenAtPath } from '@unpunnyfuns/tokens';

const tokens = {
  colors: {
    primary: {
      500: { $value: '#007bff', $type: 'color' },
      600: { $value: '#0056b3', $type: 'color' }
    }
  }
};

// Parse and build paths
const segments = parsePath('colors.primary.500'); // ['colors', 'primary', '500']
const path = joinPath(['colors', 'primary', '500']); // 'colors.primary.500'

// Get tokens by path
const token = getTokenAtPath(tokens, 'colors.primary.500');
if (token) {
  console.log(token.$value); // '#007bff'
}

// Set tokens at path (returns new object)
const updated = setTokenAtPath(tokens, 'colors.primary.700', {
  $value: '#004085',
  $type: 'color'
});
```

### Token Operations

Basic token manipulation:

```typescript
import { cloneToken } from '@unpunnyfuns/tokens';

// Deep clone tokens
const original = { $value: '#ff0000', $type: 'color', $description: 'Primary red' };
const copy = cloneToken(original);

// Modify copy without affecting original
copy.$value = '#00ff00';
console.log(original.$value); // Still '#ff0000'
```

### Path Indexing

Use optimized indexing for frequent lookups:

```typescript
import { 
  buildPathIndex, 
  getTokenFromIndex, 
  getTokensByType,
  getPathsWithPrefix
} from '@unpunnyfuns/tokens';

// Build index for O(1) lookups
const index = buildPathIndex(tokens);

// Fast token retrieval
const token = getTokenFromIndex(index, 'colors.primary.500');

// Get tokens by type
const colorTokens = getTokensByType(index, 'color');
colorTokens.forEach((token, path) => {
  console.log(`Color token at ${path}:`, token.$value);
});

// Find tokens with path prefix
const primaryTokens = getPathsWithPrefix(index, 'colors.primary');
// Returns all paths starting with 'colors.primary'
```

## API Reference

### Type Guards

| Function | Type | Description |
|----------|------|-------------|
| `isToken` | `(value: unknown) => value is Token` | Check if value is a token with `$value` |
| `isTokenGroup` | `(value: unknown) => value is TokenGroup` | Check if value is a token group container |

### Token Merging

| Function | Type | Description |
|----------|------|-------------|
| `mergeTokens` | `(base: TokenDocument, override: TokenDocument) => TokenDocument` | Simple merge (throws on conflicts) |
| `merge` | `(base: TokenDocument, override: TokenDocument, options?: MergeTokensOptions) => MergeResult` | Advanced merge with options |

### Path Operations  

| Function | Type | Description |
|----------|------|-------------|
| `parsePath` | `(path: string) => string[]` | Parse dot-notation path into segments |
| `joinPath` | `(segments: string[]) => string` | Join path segments with dots |
| `getTokenAtPath` | `(doc: TokenDocument, path: string) => TokenOrGroup \| undefined` | Get token at specific path |
| `setTokenAtPath` | `(doc: TokenDocument, path: string, token: TokenOrGroup) => TokenDocument` | Set token at path (immutable) |

### Token Operations

| Function | Type | Description |
|----------|------|-------------|
| `cloneToken` | `(token: TokenOrGroup) => TokenOrGroup` | Deep clone a token or group |

### Path Indexing

| Function | Type | Description |
|----------|------|-------------|
| `buildPathIndex` | `(document: TokenDocument) => PathIndex` | Build index for O(1) lookups |
| `getTokenFromIndex` | `(index: PathIndex, path: string) => Token \| undefined` | Get token from index |
| `hasPath` | `(index: PathIndex, path: string) => boolean` | Check if path exists in index |
| `getPathsWithPrefix` | `(index: PathIndex, prefix: string) => string[]` | Get paths with prefix |
| `getTokensByType` | `(index: PathIndex, type: string) => Map<string, Token>` | Get all tokens of specific type |
| `updateIndex` | `(index: PathIndex, path: string, token: Token) => void` | Update token in index |
| `removeFromIndex` | `(index: PathIndex, path: string) => boolean` | Remove token from index |

### Types

#### MergePartialOptions

```typescript
interface MergePartialOptions {
  include?: string[];  // Paths to include
  exclude?: string[];  // Paths to exclude  
  types?: string[];    // Token types to include
}
```

#### MergeResult

```typescript
interface MergeResult {
  success: boolean;
  tokens: TokenDocument;
  conflicts: MergeConflict[];
}
```

#### MergeConflict

```typescript
interface MergeConflict {
  path: string;
  reason: string;
  baseValue: unknown;
  overrideValue: unknown;
}
```

#### TokenCallback

```typescript
type TokenCallback = (path: string, token: Token) => boolean | void;
```

## Structure

| File | Purpose |
|------|---------|
| `merge.ts` | Type-safe token merging with conflict detection |
| `path-index.ts` | O(1) token lookups using path indexing |
| `token/guards.ts` | Type predicates for token validation |
| `token/operations.ts` | Token manipulation and traversal operations |
| `token/path.ts` | Token path utilities and navigation |
| `token/index.ts` | Re-exports all token utilities |

## Performance Notes

| Operation | Complexity | Description |
|-----------|------------|-------------|
| Type guards | O(1) | Simple property checks |
| Path lookup | O(n) | Where n = path depth |
| Token merge | O(n) | Where n = total tokens |
| Deep clone | O(n) | Where n = object size |
| Token traverse | O(n) | Where n = total tokens |
| Index lookup | O(1) | Hash-based retrieval |
| Index build | O(n) | Where n = total tokens |

- Path indexing provides O(1) lookups for frequent access patterns
- All operations are immutable, returning new objects
- Type guards enable efficient TypeScript type narrowing
- Deep cloning uses optimized recursive traversal

## Integration Points

### Module Dependencies

The core module has zero dependencies and can be imported by any module:

```typescript
// ✅ Valid imports
import { mergeTokens } from '@unpunnyfuns/tokens';        // From any module
import { isToken } from '@unpunnyfuns/tokens/token';      // Specific utilities

// ❌ Invalid imports (core cannot import from higher-level modules)
// import { bundle } from '@unpunnyfuns/tokens';           // Higher-level
// import { validateTokens } from '@unpunnyfuns/tokens'; // Sibling
```

### Foundation for Higher-Level Operations

```typescript
// Other modules build on core utilities
import { mergeTokens } from '@unpunnyfuns/tokens';

// Used in bundler for combining token documents
const bundled = mergeTokens(baseTokens, themeTokens);

// Used in validation for type checking
if (isToken(value) && hasValue(value)) {
  // Validate token structure
}
```

### Testing Support

```typescript
// Core utilities enable comprehensive testing
import { cloneToken, isToken } from '@unpunnyfuns/tokens';
import { createAST, visitTokens } from '@unpunnyfuns/tokens';

// Create test data without side effects
const testToken = cloneToken(originalToken);

// Verify token structures in tests using AST
const ast = createAST(result);
visitTokens(ast, (tokenNode) => {
  expect(tokenNode.value).toBeDefined();
  return true;
});
```