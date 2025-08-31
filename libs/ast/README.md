# AST

Abstract syntax tree operations for design tokens without file I/O.

## Structure

| File | Purpose |
|------|---------|
| `ast-builder.ts` | Convert token documents to AST |
| `project-builder.ts` | Project-level AST utilities |
| `ast-traverser.ts` | AST walking and querying |
| `query.ts` | AST query operations |
| `reference-resolver.ts` | Pure reference resolution |
| `types.ts` | AST type definitions |

## Core Functions

### AST Creation

```typescript
import { createAST } from '@upft/ast';

const ast = createAST(tokenDocument);
```

Converts token documents into structured AST representations for manipulation.

### Project AST Operations

```typescript
import { buildDependencyGraph, detectCircularDependencies } from '@upft/ast';

buildDependencyGraph(projectAST);
const cycles = detectCircularDependencies(projectAST);
```

Analyzes project-level relationships and dependencies between token files.

### Reference Resolution

```typescript
import { resolveReferences } from '@upft/ast';

const resolved = resolveReferences(tokenNode, context);
```

Resolves token references within loaded AST structures (no file I/O).

### AST Traversal

```typescript
import { walkAST, findTokens } from '@upft/ast';

walkAST(ast, {
  onToken: (token) => console.log(token.path)
});

const colorTokens = findTokens(ast, { type: 'color' });
```

Walks AST structures and finds tokens matching specific criteria.

### Query Operations

```typescript
import { query, select } from '@upft/ast';

const primary = query(ast, 'colors.primary');
const allColors = select(ast, 'colors.*');
```

Query AST structures using path patterns and selectors.

### AST Modification

```typescript
import { updateToken, addToken } from '@upft/ast';

const updated = updateToken(ast, 'colors.primary', { $value: '#00ff00' });
const withNew = addToken(ast, 'colors.tertiary', { $type: 'color', $value: '#0000ff' });
```

Transform AST structures by updating, adding, or removing tokens (returns new instances).

## Integration

```typescript
import type { TokenDocument } from '@upft/foundation';
import { createAST } from '@upft/ast';

const ast = createAST(tokenDocument);
```

Works with foundation types but performs no file I/O operations.

## Testing

```bash
pnpm --filter @upft/ast test
```