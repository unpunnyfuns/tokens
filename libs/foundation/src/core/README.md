# Core

Core token operations and utilities for DTCG-style token manipulation. Provides type-safe merging, path operations, type guards, and indexing for efficient token document processing.

## Structure

| File | Purpose |
|------|---------|
| `merge/index.ts` | DTCG-compliant token merging with conflict detection |
| `merge/conflict-detector.ts` | Merge conflict detection and error reporting |
| `merge/merge-documents.ts` | Document merging implementation |
| `merge/merge-values.ts` | Token value merging for composite types |
| `merge/merge-groups.ts` | Token group merging operations |
| `merge/guards.ts` | Type guards for merge operations |
| `merge/types.ts` | Merge-related types and error classes |
| `path-index.ts` | O(1) token lookups using path indexing |
| `token/guards.ts` | Type predicates for token validation |
| `token/operations.ts` | Token cloning and reference extraction |
| `token/path.ts` | Path utilities and token navigation |
| `token/index.ts` | Re-exports all token utilities |

## Usage

### Token Merging

```typescript
import { merge, DTCGMergeError } from '@upft/foundation';

const baseTokens = {
  colors: {
    primary: { $value: '#007bff', $type: 'color' }
  }
};

const themeTokens = {
  colors: {
    primary: { $value: '#28a745', $type: 'color' }
  }
};

try {
  const merged = merge(baseTokens, themeTokens);
  console.log('Merged successfully:', merged);
} catch (error) {
  if (error instanceof DTCGMergeError) {
    console.log('Merge conflict:', error.message);
  }
}
```

### Type Guards

```typescript
import { isToken, isTokenGroup, isDTCGReference } from '@upft/foundation';

if (isToken(value)) {
  // TypeScript knows value has $value property
  console.log(value.$value);
}

if (isTokenGroup(value)) {
  // TypeScript knows value is a container
  Object.keys(value).forEach(key => {
    if (!key.startsWith('$')) {
      console.log('Child:', key);
    }
  });
}

if (isDTCGReference('{color.primary}')) {
  console.log('Valid DTCG reference format');
}
```

### Path Operations

```typescript
import { 
  parsePath, 
  joinPath, 
  getTokenAtPath, 
  setTokenAtPath 
} from '@upft/foundation';

const tokens = {
  colors: {
    primary: { $value: '#007bff', $type: 'color' }
  }
};

// Parse and build paths
const segments = parsePath('colors.primary'); // ['colors', 'primary']
const path = joinPath(['colors', 'primary']); // 'colors.primary'

// Get tokens by path
const token = getTokenAtPath(tokens, 'colors.primary');
console.log(token?.$value); // '#007bff'

// Set tokens at path (returns new object)
const updated = setTokenAtPath(tokens, 'colors.secondary', {
  $value: '#6c757d',
  $type: 'color'
});
```

### Path Indexing

```typescript
import { buildPathIndex, getTokenFromIndex } from '@upft/foundation';

// Build index for O(1) lookups
const index = buildPathIndex(tokens);

// Fast token retrieval
const token = getTokenFromIndex(index, 'colors.primary');
console.log(token?.$value);
```

## API Reference

### Type Guards

| Function | Type | Description |
|----------|------|-------------|
| `isToken` | `(value: unknown) => value is Token` | Check if value is a token with `$value` |
| `isTokenGroup` | `(value: unknown) => value is TokenGroup` | Check if value is a token group |
| `isTokenDocument` | `(value: unknown) => value is TokenDocument` | Check if value is a valid token document |
| `isDTCGReference` | `(value: string) => boolean` | Check for DTCG reference format `{path}` |
| `hasValue` | `(token: unknown) => token is Token` | Check if token has `$value` property |

### Merging

| Function | Type | Description |
|----------|------|-------------|
| `merge` | `(a: TokenDocument, b: TokenDocument) => TokenDocument` | Merge documents with conflict detection |
| `detectConflicts` | `(a: TokenDocument, b: TokenDocument) => MergeConflict[]` | Detect merge conflicts |

### Path Operations

| Function | Type | Description |
|----------|------|-------------|
| `parsePath` | `(path: string) => string[]` | Parse dot-notation path into segments |
| `joinPath` | `(segments: string[]) => string` | Join path segments with dots |
| `getTokenAtPath` | `(doc: TokenDocument, path: string) => TokenOrGroup \| undefined` | Get token at path |
| `setTokenAtPath` | `(doc: TokenDocument, path: string, token: TokenOrGroup) => TokenDocument` | Set token at path |

### Indexing

| Function | Type | Description |
|----------|------|-------------|
| `buildPathIndex` | `(document: TokenDocument) => PathIndex` | Build index for O(1) lookups |
| `getTokenFromIndex` | `(index: PathIndex, path: string) => Token \| undefined` | Get token from index |
| `hasPath` | `(index: PathIndex, path: string) => boolean` | Check if path exists |

### Token Operations

| Function | Type | Description |
|----------|------|-------------|
| `cloneToken` | `<T>(token: T) => T` | Deep clone a token or group |
| `extractReferences` | `(token: TokenOrGroup) => string[]` | Extract reference paths from token |

## Performance Notes

| Operation | Complexity | Description |
|-----------|------------|-------------|
| Type guards | O(1) | Simple property checks |
| Path lookup | O(d) | Where d = path depth |
| Token merge | O(n) | Where n = total tokens |
| Index lookup | O(1) | Hash-based retrieval |
| Index build | O(n) | Where n = total tokens |

## Testing

```bash
pnpm --filter @upft/foundation test
```