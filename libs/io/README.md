# IO

Low-level file system operations for the UPFT ecosystem - primitive file reading, writing, and caching utilities.

## Structure

| File | Purpose |
|------|---------|
| `file-reader.ts` | File reading operations |
| `file-writer.ts` | File writing operations |
| `cache.ts` | File system caching |
| `file-watcher.ts` | File change monitoring |
| `types.ts` | IO type definitions |

## File Reading

### Basic File Operations

```typescript
import { TokenFileReader } from '@upft/io';

// Create reader with options
const reader = new TokenFileReader({
  basePath: '/path/to/tokens',
  encoding: 'utf-8',
  cache: true
});

// Read single file
const content = await reader.readFile('colors.json');
console.log(JSON.parse(content));

// Read multiple files
const files = await reader.readFiles(['colors.json', 'spacing.json']);
for (const [path, content] of files) {
  console.log(`${path}:`, JSON.parse(content));
}
```

### Advanced Reading Options

```typescript
interface FileReadOptions {
  encoding?: BufferEncoding;
  cache?: boolean;
  maxSize?: number;
  timeout?: number;
  retries?: number;
}

// Read with specific options
const content = await reader.readFile('large-tokens.json', {
  encoding: 'utf-8',
  cache: false,
  maxSize: 10 * 1024 * 1024, // 10MB limit
  timeout: 5000, // 5 second timeout
  retries: 3
});
```

## File Writing

### Basic Write Operations

```typescript
import { TokenFileWriter } from '@upft/io';

const writer = new TokenFileWriter({
  basePath: '/output/path',
  createDirectories: true,
  backup: true
});

// Write single file
await writer.writeFile('bundle.json', JSON.stringify(bundle, null, 2));

// Write multiple files
const files = new Map([
  ['theme-light.json', JSON.stringify(lightBundle, null, 2)],
  ['theme-dark.json', JSON.stringify(darkBundle, null, 2)]
]);

await writer.writeFiles(files);
```

### Write Options

```typescript
interface FileWriteOptions {
  encoding?: BufferEncoding;
  createDirectories?: boolean;
  backup?: boolean;
  atomic?: boolean;
  mode?: number;
}

// Atomic write with backup
await writer.writeFile('critical.json', content, {
  atomic: true,    // Write to temp file first, then rename
  backup: true,    // Create .bak file before overwriting
  mode: 0o644      // Set file permissions
});
```

## Caching System

### File Cache

```typescript
import { FileCache } from '@upft/io';

// Create cache with options
const cache = new FileCache({
  maxSize: 100,           // Max 100 files in cache
  maxAge: 5 * 60 * 1000,  // 5 minutes TTL
  checkMtime: true        // Check modification time
});

// Cache operations
await cache.set('tokens.json', content);
const cached = await cache.get('tokens.json');

if (await cache.has('tokens.json')) {
  console.log('File is cached');
}

// Clear cache
cache.clear();
```

### Cache Strategies

```typescript
// Memory cache for frequently accessed files
const memoryCache = new FileCache({
  strategy: 'memory',
  maxSize: 50
});

// Persistent cache with disk storage
const diskCache = new FileCache({
  strategy: 'disk',
  cacheDir: '.cache/tokens',
  maxSize: 1000
});
```

## File Watching

### Change Detection

```typescript
import { FileWatcher } from '@upft/io';

// Watch for file changes
const watcher = new FileWatcher({
  patterns: ['**/*.json'],
  ignorePattern: '**/node_modules/**',
  debounce: 100 // 100ms debounce
});

// Handle change events
watcher.on('change', (filePath) => {
  console.log(`File changed: ${filePath}`);
});

watcher.on('add', (filePath) => {
  console.log(`File added: ${filePath}`);
});

watcher.on('unlink', (filePath) => {
  console.log(`File deleted: ${filePath}`);
});

// Start watching
await watcher.start('/path/to/watch');

// Stop watching
await watcher.stop();
```

### Batch Change Processing

```typescript
// Collect changes for batch processing
const batchWatcher = new FileWatcher({
  batchInterval: 1000, // Process changes every 1 second
  batchSize: 10        // Max 10 changes per batch
});

batchWatcher.on('batch', (changes) => {
  console.log(`Processing ${changes.length} changes:`);
  for (const change of changes) {
    console.log(`${change.type}: ${change.path}`);
  }
});
```

## Error Handling

### File Operation Errors

```typescript
import { FileError, isFileError } from '@upft/io';

try {
  const content = await reader.readFile('missing.json');
} catch (error) {
  if (isFileError(error)) {
    switch (error.code) {
      case 'ENOENT':
        console.error('File not found:', error.path);
        break;
      case 'EACCES':
        console.error('Permission denied:', error.path);
        break;
      case 'EMFILE':
        console.error('Too many open files');
        break;
      default:
        console.error('File operation failed:', error);
    }
  } else {
    throw error;
  }
}
```

### Retry Logic

```typescript
// Automatic retry with exponential backoff
const reader = new TokenFileReader({
  retries: 3,
  retryDelay: 1000,    // Start with 1 second
  retryMultiplier: 2   // Double delay each retry
});

// Manual retry for specific operations
import { withRetry } from '@upft/io';

const content = await withRetry(
  () => reader.readFile('unreliable.json'),
  {
    retries: 5,
    delay: 500,
    backoff: 'exponential'
  }
);
```

## Performance Optimizations

### Concurrent Operations

```typescript
// Read files concurrently
const files = ['colors.json', 'spacing.json', 'typography.json'];
const contents = await Promise.all(
  files.map(file => reader.readFile(file))
);

// Limit concurrency to avoid overwhelming file system
import { pLimit } from 'p-limit';
const limit = pLimit(10); // Max 10 concurrent reads

const limitedReads = files.map(file => 
  limit(() => reader.readFile(file))
);
const results = await Promise.all(limitedReads);
```

### Memory Management

```typescript
// Stream large files to avoid memory issues
import { createReadStream } from '@upft/io';

const stream = createReadStream('huge-tokens.json', {
  highWaterMark: 16 * 1024, // 16KB chunks
  encoding: 'utf-8'
});

let content = '';
stream.on('data', (chunk) => {
  content += chunk;
});

stream.on('end', () => {
  const tokens = JSON.parse(content);
  // Process tokens
});
```

## Integration Examples

### With Loader Package

```typescript
import { TokenFileReader } from '@upft/io';
import { createLoader } from '@upft/loader';

// Loader uses IO package for file operations
const reader = new TokenFileReader({ basePath: '/tokens' });
const loader = createLoader({ fileReader: reader });
```

### With CLI Operations

```typescript
import { TokenFileWriter } from '@upft/io';

// CLI uses IO for output operations
const writer = new TokenFileWriter({
  basePath: process.cwd(),
  createDirectories: true
});

await writer.writeFile('output.json', bundleResult);
```

## Configuration

### Global IO Config

```typescript
import { setGlobalIOConfig } from '@upft/io';

// Set global defaults
setGlobalIOConfig({
  defaultEncoding: 'utf-8',
  cacheEnabled: true,
  maxConcurrency: 10,
  defaultTimeout: 30000
});
```

## Performance Metrics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| File Reading | O(s) where s = file size | Limited by disk I/O |
| Cache Lookup | O(1) | Memory cache |
| File Watching | O(1) | Event-driven |
| Concurrent Reads | O(f/c) where f = files, c = concurrency | Parallelizable |

## Design Principles

1. **Primitive Focus** - Low-level file system operations only
2. **Performance** - Optimized for speed and memory usage
3. **Reliability** - Robust error handling and retry logic  
4. **Caching** - Intelligent caching to reduce disk I/O
5. **Streaming** - Support for large files via streaming

## Module Boundaries

- ✅ Read files from disk
- ✅ Write files to disk
- ✅ Cache file contents
- ✅ Watch file changes
- ✅ Handle file system errors
- ❌ Parse file contents (use specific parsers)
- ❌ Process token data (use @upft/tokens)
- ❌ Orchestrate operations (use @upft/loader)

## Testing

```bash
pnpm --filter @upft/io test
```