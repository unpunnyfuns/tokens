# Core

The core module provides fundamental operations and utilities for working with design tokens according to the DTCG specification.

## Structure

| Directory/File | Purpose |
|----------------|---------|
| `token/` | Low-level token utilities |
| `token/guards.ts` | Type predicates for validation |
| `token/operations.ts` | Token transformations |
| `token/path.ts` | Path utilities for navigation |
| `dtcg-merge.ts` | DTCG-compliant token merging |

## Key Functions

### Type Guards (`token/guards.ts`)

| Function | Purpose | Returns |
|----------|---------|---------|
| `isToken(value)` | Check if value has `$value` property | `boolean` |
| `isTokenGroup(value)` | Check if value is a group (container) | `boolean` |
| `isTokenDocument(value)` | Check if value can be a token document | `boolean` |

### Token Operations (`token/operations.ts`)

Functions for transforming and manipulating tokens while maintaining DTCG compliance. All operations are immutable, returning new objects rather than modifying inputs.

### Path Utilities (`token/path.ts`)

Handles dot-notation paths (e.g., `color.primary.500`) for navigating token hierarchies and resolving references with the `{token.path}` syntax.

### DTCG Merge (`dtcg-merge.ts`)

Implements specification-compliant merging with:
- Type compatibility checking
- Conflict detection and resolution
- Proper `$extensions` merging
- Type inheritance from parent groups

## Usage Example

```typescript
import { isToken, isTokenGroup } from './core/token/guards';
import { dtcgMerge } from './core/dtcg-merge';

// Type-safe token checking
if (isToken(value)) {
  console.log(`Token value: ${value.$value}`);
}

// Merge token documents
const merged = dtcgMerge(baseTokens, themeTokens);
```

## Design Principles

1. **Pure functions** - No side effects, predictable behavior
2. **Immutability** - Operations return new objects, never modify inputs
3. **Type safety** - TypeScript guards provide compile-time and runtime safety
4. **Spec compliance** - Follows DTCG specification rules strictly

## Integration Points

The core module is foundational and has no dependencies. It's used by:
- **AST** - Uses guards for node validation
- **Validator** - Relies on guards for structural checks
- **Bundler** - Uses merge for combining token files
- **Resolver** - Uses merge for permutation resolution

## Performance Notes

- Type guards are O(1) operations
- Merge operations clone objects (consider optimization for large sets)
- Path operations are O(n) where n is path depth

## Future Considerations

- Structural sharing for immutable operations (like Immutable.js)
- Streaming support for very large token files
- Custom conflict resolution strategies for merging
- Extended type support as DTCG spec evolves