# Analysis

The analysis module provides tools for inspecting and understanding design token systems through statistical analysis and structural examination.

## Structure

| File | Purpose |
|------|---------|
| `token-analyzer.ts` | Main analyzer class with analysis methods |
| `index.ts` | Module exports |

## Core Class: TokenAnalyzer

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(document)` | `TokenAnalysis` | Full analysis with statistics and reference information |
| `countTokens(doc)` | `number` | Quick token count without building AST |
| `countGroups(doc)` | `number` | Quick group count without building AST |
| `findTokensByType(document, type)` | `Array<{path, value}>` | Find all tokens of a specific type |
| `getTokenTypes(document)` | `string[]` | List all unique token types in document |
| `compare(doc1, doc2)` | `{added, removed, changed}` | Compare two token documents |

### TokenAnalysis Interface

```typescript
interface TokenAnalysis {
  tokenCount: number;           // Total number of tokens
  groupCount: number;           // Total number of groups
  tokensByType: Record<string, number>;  // Breakdown by type
  depth: number;                // Maximum nesting depth
  hasReferences: boolean;       // Whether document uses references
  referenceCount: number;       // Number of tokens with references
  unresolvedReferences: string[];  // References to non-existent tokens
  circularReferences: string[];     // Circular reference chains
}
```

## Purpose

The analyzer helps developers understand their token systems by providing metrics and detecting potential issues. It operates at two levels:
- **Quick operations** that traverse the document directly (`countTokens`, `countGroups`)
- **Full analysis** that builds an AST for detailed inspection

## Usage Example

```typescript
import { TokenAnalyzer } from './analysis';

const analyzer = new TokenAnalyzer();
const results = analyzer.analyze(tokenDocument);

console.log(`${results.tokenCount} tokens in ${results.groupCount} groups`);
console.log(`Max depth: ${results.depth}`);

// Compare versions
const changes = analyzer.compare(oldTokens, newTokens);
console.log(`Added: ${changes.added.length} tokens`);
```

## Integration Points

- **CLI** - Powers the `info` command with token statistics
- **API** - Provides analysis capabilities to higher-level functions
- **Bundler** - Uses analyzer for metadata generation

## Performance Notes

- Simple counting: O(n) without AST construction
- Full analysis: O(n) for AST build, then efficient queries
- Comparison: O(n+m) where n and m are document sizes

## Future Considerations

- Visual analysis and token relationship graphs
- Historical tracking of token system evolution
- Pattern detection for naming and organization improvements
- Semantic similarity detection for consolidation opportunities