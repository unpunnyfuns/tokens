# API

The API module provides high-level programmatic interfaces for token operations, serving as the primary integration point for applications.

## Structure

| File | Purpose |
|------|---------|
| `index.ts` | Main API exports and bundle functions |
| `workflows.ts` | Workflow utilities and TokenFileSystem class |
| `token-file-system.ts` | Enhanced TokenFileSystem implementation |

## Core Functions

### bundleWithMetadata

The main bundling function that combines loading, validation, and output generation.

```typescript
const result = await bundleWithMetadata({
  manifest: './resolver.json',
  theme: 'dark',
  includeMetadata: true
});

// Result object methods
await result.validate();  // Validate tokens
result.getAST();          // Get AST representation
await result.write('./output.json');  // Write to file
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `manifest` | `string` | Path to resolver manifest |
| `files` | `string[]` | Individual token files to bundle |
| `modifiers` | `Record<string, string>` | Resolver modifiers |
| `theme` | `string` | Shorthand for theme modifier |
| `mode` | `string` | Shorthand for mode modifier |
| `includeMetadata` | `boolean` | Include bundle metadata |
| `format` | `'json' \| 'json5' \| 'yaml'` | Output format |

### createResolverAPI

Creates a specialized API for working with resolver manifests.

```typescript
const api = createResolverAPI();

// Bundle from manifest
const tokens = await api.bundleFromManifest('./manifest.json', {
  modifiers: { theme: 'dark' }
});

// Load and work with resolver
const resolver = await api.loadAndResolve('./manifest.json');
const validated = await resolver.validate();
const newTheme = await resolver.switchTo({ theme: 'light' });
```

### validateResolver

Comprehensive validation for resolver manifests.

```typescript
const result = await validateResolver('./manifest.json', {
  allPermutations: true  // Test all possible combinations
});

if (!result.valid) {
  console.error(result.errors);
}
```

## TokenFileSystem Class

Manages multiple token sources in memory without disk operations.

```typescript
const fs = new TokenFileSystem();
await fs.addDocument('./base.json');
await fs.addManifest('./resolver.json', { theme: 'dark' });
```

## Interfaces

### BundleResult

```typescript
interface BundleResult {
  tokens: TokenDocument;
  metadata?: BundleMetadata;
  validate(): Promise<TokenValidationResult>;
  getAST(): TokenAST;
  write(path: string): Promise<void>;
}
```

### BundleMetadata

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

## Error Handling

The `formatError` utility provides consistent error formatting:

```typescript
try {
  await bundleWithMetadata(options);
} catch (error) {
  console.error(formatError(error, verbose));
}
```

## Integration Examples

### React Hook
```typescript
function useTokens(modifiers) {
  const [tokens, setTokens] = useState(null);
  
  useEffect(() => {
    bundleWithMetadata({ manifest, ...modifiers })
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

## Performance Notes

- File operations are cached to avoid redundant reads
- AST construction is lazy (only when `getAST()` is called)
- Validation is lazy (only when `validate()` is called)
- Multiple caching layers for manifest and resolution results

## Exports

The module re-exports key classes for convenience:
- `TokenValidator`, `UPFTResolver`, `TokenBundler`
- `TokenFileReader`, `TokenFileWriter`
- `buildASTFromDocument`, `ASTQuery`, `ReferenceResolver`
- `TokenAnalyzer`, `ManifestValidator`, `ManifestReader`