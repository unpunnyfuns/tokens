# AST (Abstract Syntax Tree)

The AST module provides a tree-based representation of design token documents, enabling efficient traversal, querying, and manipulation of token hierarchies.

## Structure

| File | Purpose |
|------|---------|
| `ast-builder.ts` | Constructs AST from token documents |
| `ast-traverser.ts` | Tree traversal patterns |
| `ast-query.ts` | Query interface for finding nodes |
| `reference-resolver.ts` | Resolves token references and detects cycles |
| `types.ts` | TypeScript type definitions |

## Key Components

### ASTBuilder

Builds an AST from a token document. Each node represents either:
- A **token** (has `$value` property)
- A **group** (container for tokens/groups)
- **Metadata** (`$description`, `$type`, `$extensions`)

```typescript
import { buildASTFromDocument } from './ast/ast-builder';

const ast = buildASTFromDocument(tokenDocument);
```

### ASTTraverser

Provides traversal patterns for visiting nodes in the tree.

| Method | Purpose |
|--------|---------|
| `traverse(callback)` | Visit all nodes with a callback |
| `traverseTokens(callback)` | Visit only token nodes |
| `traverseGroups(callback)` | Visit only group nodes |

```typescript
const traverser = new ASTTraverser(ast);
traverser.traverseTokens((token) => {
  console.log(`Token: ${token.path} = ${token.value}`);
});
```

### ASTQuery

Query interface for finding specific nodes or patterns.

| Method | Returns | Description |
|--------|---------|-------------|
| `getNodeByPath(path)` | `Node \| null` | Find node by dot-notation path |
| `getAllTokens()` | `TokenNode[]` | Get all token nodes |
| `getTokensByType(type)` | `TokenNode[]` | Get tokens of specific type |
| `getStatistics()` | `ASTStatistics` | Compute tree statistics |
| `getCircularReferences()` | `TokenNode[]` | Find circular reference chains |

### ReferenceResolver

Resolves `{token.path}` references and detects issues.

```typescript
const resolver = new ReferenceResolver(ast);
const errors = resolver.resolve();

errors.forEach(error => {
  console.log(`${error.type}: ${error.path} - ${error.message}`);
});
```

**Error Types:**
- `missing` - Reference to non-existent token
- `circular` - Circular reference chain detected
- `invalid` - Malformed reference syntax

## Node Structure

The AST uses TypeScript interfaces defined in `types.ts`:

- **TokenNode** - Represents individual tokens with `$value` properties
- **GroupNode** - Represents containers for tokens and other groups  
- **ASTNode** - Base interface for all node types

See `src/ast/types.ts` for complete type definitions including metadata, reference tracking, and resolution state.

## Usage Patterns

### Finding Tokens
```typescript
const query = new ASTQuery(ast);
const colorTokens = query.getTokensByType('color');
const primaryColor = query.getNodeByPath('color.primary');
```

### Analyzing Structure
```typescript
const stats = query.getStatistics();
console.log(`Total tokens: ${stats.totalTokens}`);
console.log(`Max depth: ${stats.maxDepth}`);
console.log(`Tokens with references: ${stats.tokensWithReferences}`);
```

### Detecting Issues
```typescript
const circularRefs = query.getCircularReferences();
if (circularRefs.length > 0) {
  console.warn('Circular references detected:', circularRefs);
}
```

## Integration Points

- **Bundler** - Uses AST for merging and transforming
- **Validator** - Traverses AST to validate each token
- **Analysis** - Leverages AST for statistics
- **API** - Exposes AST building and querying

## Performance Notes

| Operation | Complexity |
|-----------|------------|
| Build AST | O(n) where n = number of tokens |
| Query by path | O(log n) average case |
| Full traversal | O(n) |
| Reference resolution | O(m) where m = reference depth |

The AST maintains bidirectional references (parent-child) for efficient traversal in both directions. Reference resolution results are cached to avoid repeated computation.

## Design Decisions

1. **Bidirectional references** - Enables both top-down and bottom-up traversal
2. **Lazy reference resolution** - Only resolves when needed, results cached
3. **Cycle detection** - Built-in detection prevents infinite loops
4. **Path-based addressing** - Uses dot notation for consistent node identification

## Future Considerations

- Incremental AST updates instead of full rebuilds
- Virtual nodes for computed tokens
- Parallel traversal for read-only operations
- AST diffing for change detection
- Query DSL for complex searches