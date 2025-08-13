# FileSystem

The filesystem module provides abstractions for file operations, caching, and dependency tracking for token files.

## Structure

| File | Purpose |
|------|---------|
| `file-reader.ts` | Reads and parses token files with import resolution |
| `file-writer.ts` | Writes token files with format detection |
| `file-watcher.ts` | Monitors file changes for development |
| `cache.ts` | LRU cache implementation |
| `manifest-reader.ts` | Specialized reader for resolver manifests |
| `types.ts` | TypeScript definitions |

## Key Components

### FileReader

Reads token files with automatic format detection and import resolution.

**Supported Formats:**
- JSON (`.json`)
- JSON5 (`.json5`)
- YAML (`.yml`, `.yaml`)

**Features:**
- Automatic `$import` resolution
- Circular import detection
- Dependency tracking
- Result caching

```typescript
const reader = new TokenFileReader();
const result = await reader.readFile('./tokens.json');

// Result includes:
result.tokens     // Parsed and merged tokens
result.filePath   // Absolute path to file
result.dependencies // Files this depends on
```

### Import Resolution

The reader automatically resolves and merges imported files:

```json
{
  "$import": ["./base-tokens.json", "./theme-tokens.json"],
  "color": {
    "primary": { "$value": "#007acc" }
  }
}
```

Imports are processed in order with later files overriding earlier ones.

### FileWriter

Writes token files with format-specific serialization.

```typescript
const writer = new TokenFileWriter();

await writer.writeFile('./output.json', tokens, {
  format: {
    type: 'json',    // or 'json5', 'yaml'
    indent: 2,
    sortKeys: true
  }
});
```

### FileWatcher

Monitors files for changes in development mode.

```typescript
const watcher = new TokenFileWatcher();

watcher.watch('./tokens/**/*.json', (event) => {
  console.log(`File ${event.type}: ${event.path}`);
  // event.type: 'add' | 'change' | 'unlink'
});

// Clean up
watcher.stop();
```

### Cache

LRU cache with configurable size and TTL.

```typescript
const cache = new FileCache<TokenDocument>({
  maxSize: 100,
  ttl: 5 * 60 * 1000  // 5 minutes
});

cache.set(filePath, tokens);
const cached = cache.get(filePath);
```

**Cache Invalidation:**
- File modification time changes
- Manual `cache.clear()`
- TTL expiration
- LRU eviction when full

### ManifestReader

Specialized reader for UPFT resolver manifests.

```typescript
const reader = new ManifestReader();
const manifest = await reader.readManifest('./resolver.json');

// Validates manifest structure
// Resolves file paths
// Returns typed manifest object
```

## Error Handling

The module provides detailed error messages:

| Error Type | Description |
|------------|-------------|
| `FileNotFoundError` | File doesn't exist |
| `ParseError` | JSON/YAML syntax error with line/column |
| `CircularImportError` | Circular import chain detected |
| `FormatError` | Unsupported file format |
| `PermissionError` | No read/write access |

```typescript
try {
  await reader.readFile('./tokens.json');
} catch (error) {
  if (error instanceof ParseError) {
    console.error(`Parse error at line ${error.line}: ${error.message}`);
  }
}
```

## Performance Notes

| Operation | Performance |
|-----------|-------------|
| Cache hit | O(1) lookup |
| Cache miss | O(n) file read + parse |
| Import resolution | O(m) where m = import depth |
| File watching | Event-driven, minimal overhead |

## Integration Points

- **Bundler** - Uses file reader for loading sources
- **CLI** - File watcher enables watch mode
- **Resolver** - Manifest reader loads configurations
- **API** - Builds on filesystem primitives

## Configuration

### Reader Options
```typescript
interface FileReaderOptions {
  cache?: boolean;          // Enable caching (default: true)
  resolveImports?: boolean; // Resolve $import (default: true)
  basePath?: string;        // Base path for relative imports
}
```

### Writer Options
```typescript
interface FileWriterOptions {
  format?: {
    type: 'json' | 'json5' | 'yaml';
    indent?: number;
    sortKeys?: boolean;
  };
  backup?: boolean;  // Create .bak file before writing
}
```

## Future Considerations

- Virtual file system for in-memory operations
- Compression support (`.json.gz`)
- Remote file support (HTTP/HTTPS URLs)
- Parallel file reading for independent imports
- Write batching for multiple files
- File locking for concurrent access
- Incremental parsing for large files