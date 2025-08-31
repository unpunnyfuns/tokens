# IO

File system operations for token files with caching, format support, and file watching.

## Usage

### Reading Token Files

Read and parse token files with automatic format detection:

```typescript
import { TokenFileReader } from '@upft/io';

const reader = new TokenFileReader({
  basePath: './tokens',
  cache: true,
  encoding: 'utf8'
});

// Read single file
const file = await reader.readFile('colors.json');
console.log(file.path);         // "/absolute/path/tokens/colors.json"
console.log(file.tokens);       // Parsed token document
console.log(file.metadata);     // File metadata (size, mtime, etc.)

// Read directory recursively
const files = await reader.readDirectory('.', {
  recursive: true,
  extensions: ['.json', '.yaml', '.json5'],
  ignore: ['**/node_modules/**', '**/dist/**']
});

console.log(`Found ${files.length} token files`);

// Read multiple specific files
const selected = await reader.readFiles([
  'core/colors.json',
  'themes/light.yaml',
  'components/button.json5'
]);
```

### Import Resolution

Automatically resolve `$import` directives in token files:

```typescript
// base.json
{
  "colors": {
    "gray": {
      "50": { "$value": "#f9fafb", "$type": "color" },
      "900": { "$value": "#111827", "$type": "color" }
    }
  }
}

// theme.json
{
  "$import": ["./base.json"],
  "colors": {
    "primary": { "$value": "{colors.gray.900}", "$type": "color" },
    "background": { "$value": "{colors.gray.50}", "$type": "color" }
  }
}

// Reading theme.json automatically merges base.json
const file = await reader.readFile('theme.json');
// file.tokens now contains merged result
// file.dependencies contains ['./base.json']
```

### Writing Token Files

Write token documents with format-specific serialization:

```typescript
import { TokenFileWriter } from '@upft/io';

const writer = new TokenFileWriter();

const tokens = {
  colors: {
    primary: { $value: '#007bff', $type: 'color' },
    secondary: { $value: '#6c757d', $type: 'color' }
  }
};

// Write JSON file with formatting
const result = await writer.writeFile('output.json', tokens, {
  format: {
    type: 'json',
    indent: 2,
    sortKeys: true
  },
  createDirectories: true
});

if (result.success) {
  console.log(`Written to ${result.path}`);
  console.log(`File size: ${result.metadata.size} bytes`);
} else {
  console.error(`Write failed: ${result.error}`);
}

// Write YAML file
await writer.writeFile('output.yaml', tokens, {
  format: {
    type: 'yaml',
    indent: 2,
    lineWidth: 120
  }
});

// Write multiple files
const results = await writer.writeFiles([
  { path: 'dist/light-theme.json', tokens: lightTokens },
  { path: 'dist/dark-theme.json', tokens: darkTokens },
  { path: 'dist/mobile-theme.json', tokens: mobileTokens }
]);

const failed = results.filter(r => !r.success);
if (failed.length > 0) {
  console.error('Failed writes:', failed);
}
```

### File Watching

Monitor token files for changes during development:

```typescript
import { TokenFileWatcher } from '@upft/io';

const watcher = new TokenFileWatcher();

// Set up event listeners
watcher.on('change', (event) => {
  console.log(`File ${event.type}: ${event.path}`);
  
  if (event.tokens) {
    console.log('Updated tokens:', Object.keys(event.tokens));
  }
  
  if (event.error) {
    console.error('Parse error:', event.error);
  }
});

watcher.on('error', (error) => {
  console.error('Watch error:', error);
});

// Start watching
watcher.watch('./tokens', {
  recursive: true,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 10
  }
});

// Watch specific patterns
watcher.watch('./tokens/**/*.{json,yaml}');

// Stop watching
await watcher.close();
```

### Caching

Use caching for improved performance:

```typescript
import { FileCache, LRUCache } from '@upft/io';

// Simple file content cache
const fileCache = new FileCache<string>({
  maxSize: 50,
  ttl: 5 * 60 * 1000  // 5 minutes
});

fileCache.set('/path/to/file.json', 'file content');
const cached = fileCache.get('/path/to/file.json');

// LRU cache for parsed tokens
const tokenCache = new LRUCache<string, TokenDocument>({
  maxSize: 100,
  ttl: 10 * 60 * 1000  // 10 minutes
});

tokenCache.set('colors.json', colorTokens);
const tokens = tokenCache.get('colors.json');

// Cache statistics
console.log('Cache stats:', {
  size: tokenCache.size,
  hitRate: tokenCache.hitRate,
  memoryUsage: tokenCache.memoryUsage
});

// Clear cache when needed
fileCache.clear();
tokenCache.clear();
```

## API Reference

### TokenFileReader

| Method | Type | Description |
|--------|------|-------------|
| `readFile` | `(filePath: string) => Promise<TokenFile>` | Read and parse single token file |
| `readDirectory` | `(dirPath: string, options?: DirectoryOptions) => Promise<TokenFile[]>` | Read all token files in directory |
| `readFiles` | `(filePaths: string[]) => Promise<TokenFile[]>` | Read multiple specific files |
| `clearCache` | `() => void` | Clear internal file cache |

### TokenFileWriter

| Method | Type | Description |
|--------|------|-------------|
| `write` | `(filePath: string, content: string) => Promise<void>` | Write raw string content to file |
| `writeFile` | `(filePath: string, tokens: TokenDocument, options?: WriteOptions) => Promise<WriteResult>` | Write token document to file |
| `writeFiles` | `(files: Array<{ path: string; tokens: TokenDocument }>) => Promise<WriteResult[]>` | Write multiple token files |

### TokenFileWatcher

| Method | Type | Description |
|--------|------|-------------|
| `watch` | `(path: string, options?: WatchOptions) => void` | Start watching path for changes |
| `unwatch` | `(path: string) => void` | Stop watching specific path |
| `close` | `() => Promise<void>` | Stop all watchers and cleanup |
| `on` | `(event: string, handler: Function) => void` | Add event listener |
| `off` | `(event: string, handler: Function) => void` | Remove event listener |

### FileCache

| Method | Type | Description |
|--------|------|-------------|
| `get` | `(key: string) => T \| undefined` | Get cached value by key |
| `set` | `(key: string, value: T) => void` | Set value in cache |
| `has` | `(key: string) => boolean` | Check if key exists in cache |
| `delete` | `(key: string) => boolean` | Delete specific cache entry |
| `clear` | `() => void` | Clear entire cache |

### LRUCache

| Method | Type | Description |
|--------|------|-------------|
| `get` | `(key: K) => V \| undefined` | Get cached value (updates LRU) |
| `set` | `(key: K, value: V) => void` | Set value in cache |
| `has` | `(key: K) => boolean` | Check if key exists |
| `delete` | `(key: K) => boolean` | Delete cache entry |
| `clear` | `() => void` | Clear all entries |

### Configuration Types

#### ReadOptions

```typescript
interface ReadOptions {
  basePath?: string;      // Base directory for relative paths
  cache?: boolean;        // Enable file caching (default: true)
  encoding?: string;      // File encoding (default: 'utf8')
  resolveImports?: boolean; // Resolve $import directives (default: true)
}
```

#### DirectoryOptions

```typescript
interface DirectoryOptions {
  recursive?: boolean;    // Include subdirectories (default: true)
  extensions?: string[];  // File extensions to include
  ignore?: string[];      // Glob patterns to ignore
  maxDepth?: number;      // Maximum directory depth
}
```

#### WriteOptions

```typescript
interface WriteOptions {
  format?: FormatOptions;
  createDirectories?: boolean; // Create parent directories
  backup?: boolean;           // Create .bak file before overwriting
}
```

#### FormatOptions

```typescript
interface FormatOptions {
  type: 'json' | 'yaml' | 'json5';
  indent?: number;        // Indentation size
  sortKeys?: boolean;     // Sort object keys
  lineWidth?: number;     // Max line width (YAML only)
}
```

#### WatchOptions

```typescript
interface WatchOptions {
  recursive?: boolean;    // Watch subdirectories
  persistent?: boolean;   // Keep process alive
  ignoreInitial?: boolean; // Ignore initial file events
  awaitWriteFinish?: {    // Wait for writes to complete
    stabilityThreshold: number;
    pollInterval: number;
  };
  interval?: number;      // Polling interval for fallback
}
```

### Result Types

#### TokenFile

```typescript
interface TokenFile {
  path: string;           // Absolute file path
  tokens: TokenDocument;  // Parsed token content
  metadata: FileMetadata; // File system metadata
  dependencies: string[]; // Files imported by this file
}
```

#### WriteResult

```typescript
interface WriteResult {
  success: boolean;
  path: string;
  metadata?: FileMetadata;
  error?: string;
}
```

#### FileChangeEvent

```typescript
interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  tokens?: TokenDocument;
  error?: Error;
}
```

## Structure

| File | Purpose |
|------|---------|
| `file-reader.ts` | Reads and parses token files with import resolution |
| `file-writer.ts` | Writes token files with format-specific serialization |
| `file-watcher.ts` | Monitors file changes for development workflows |
| `cache.ts` | LRU cache implementation with TTL support |
| `types.ts` | TypeScript type definitions |

## Performance Notes

| Operation | Performance | Description |
|-----------|-------------|-------------|
| Cache hit | O(1) | Hash table lookup |
| Cache miss | O(n) | File read + parse time |
| Import resolution | O(m) | Where m = import depth |
| File watching | Event-driven | Minimal CPU overhead |
| Directory scan | O(f) | Where f = number of files |
| LRU eviction | O(1) | Constant time removal |

- Caching dramatically improves performance for repeated reads
- Import resolution uses dependency tracking to avoid redundant work
- File watching uses native OS events for efficiency
- LRU cache prevents unbounded memory growth

## Integration Points

## Testing

```bash
pnpm --filter @upft/io test
```