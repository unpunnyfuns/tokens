# Tokens

Token document parsing and manipulation operations for DTCG token files.

## Structure

| File | Purpose |
|------|---------|
| `parser.ts` | Token document parsing |
| `operations/` | Token manipulation utilities |
| `operations/merge/` | Token merging logic |
| `operations/path.ts` | Token path utilities |
| `index.ts` | Public exports |

## Core Functions

### Token Parsing

```typescript
import { parseTokenDocument } from '@upft/tokens';

const ast = parseTokenDocument(tokenData);
```

Converts token documents into structured AST representations.

### Path Operations

```typescript
import { getTokenAtPath, setTokenAtPath } from '@upft/tokens';

const token = getTokenAtPath(document, 'colors.primary');
const updated = setTokenAtPath(document, 'colors.secondary', newToken);
```

Navigate and manipulate tokens using dot-notation paths.

### Merging Operations

```typescript
import { mergeTokenDocuments } from '@upft/tokens';

const merged = mergeTokenDocuments([base, overrides], {
  strategy: 'last-wins'
});
```

Merge multiple token documents with configurable conflict resolution.

### Index Operations

```typescript
import { createPathIndex } from '@upft/tokens';

const index = createPathIndex(document);
const token = index.get('colors.primary');
```

Create searchable indexes for efficient token lookup operations.

## Testing

```bash
pnpm --filter @upft/tokens test
```