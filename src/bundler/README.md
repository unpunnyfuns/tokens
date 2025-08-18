# Bundler

Functional API for transforming and packaging design tokens for distribution.

## Structure

| File | Purpose |
|------|---------|
| `bundler-functional.ts` | Core bundling functions |
| `index.ts` | Public exports |

## Key Functions

### bundle

Bundles tokens from a manifest into structured output.

```typescript
import { bundle } from '@unpunnyfuns/tokens/bundler';

const bundles = await bundle(manifest, {
  fileReader?: TokenFileReader,
  fileWriter?: TokenFileWriter,
  basePath?: './tokens',
  outputFormat?: 'dtcg',
  prettify?: true,
  transforms?: [/* transform functions */]
});
```

### writeBundles

Bundles tokens and writes them to the filesystem.

```typescript
import { writeBundles } from '@unpunnyfuns/tokens/bundler';

const results = await writeBundles(manifest, {
  basePath: './tokens',
  prettify: true
});

// Check results
results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.filePath}`);
  } else {
    console.error(`✗ ${result.filePath}: ${result.error}`);
  }
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `fileReader` | `TokenFileReader` | Custom file reader instance |
| `fileWriter` | `TokenFileWriter` | Custom file writer instance |
| `basePath` | `string` | Base path for relative file resolution |
| `outputFormat` | `'json' \| 'yaml' \| 'json5'` | Output format (default: 'json') |
| `prettify` | `boolean` | Format output for readability |
| `transforms` | `TokenTransform[]` | Transform pipeline functions |
| `validate` | `boolean` | Validate tokens before writing |
| `backup` | `boolean` | Create backup of existing files |
| `atomic` | `boolean` | Use atomic writes for safety |

## Transform Pipeline

Transforms are functions that modify token documents before output:

```typescript
type TokenTransform = (tokens: TokenDocument) => TokenDocument;

const transforms = [
  flattenTokens,      // Flatten nested structure
  resolveReferences,  // Resolve all references
  convertColors,      // Convert color formats
  addPrefixes        // Add platform prefixes
];

const bundles = await bundle(manifest, { transforms });
```

## Bundle Results

```typescript
interface Bundle {
  id: string;                    // Unique identifier
  tokens: TokenDocument;          // Merged tokens
  resolvedTokens?: TokenDocument; // If references resolved
  files: string[];               // Source files included
  output?: string;               // Output path
  format: string;                // Output format
}

interface BundleWriteResult {
  filePath: string;    // Output file path
  success: boolean;    // Write succeeded
  error?: string;      // Error if failed
}
```

## Manifest Integration

The bundler processes manifest specifications:

```typescript
const manifest = {
  sets: [
    { name: "core", values: ["core.json"] },
    { name: "theme", values: ["theme.json"] }
  ],
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: ["light.json"],
        dark: ["dark.json"]
      }
    }
  },
  generate: [
    {
      output: "bundle.json",
      includeSets: ["core"],
      includeModifiers: ["theme:light"]
    }
  ]
};

await bundleToFiles(manifest);
```

## Filtering

Control which tokens are included in bundles:

### Set Filtering

```typescript
{
  generate: [
    {
      output: "core-only.json",
      includeSets: ["core"]        // Only core tokens
    },
    {
      output: "no-experimental.json",
      excludeSets: ["experimental"] // Exclude experimental
    }
  ]
}
```

### Modifier Filtering

```typescript
{
  generate: [
    {
      output: "light-theme.json",
      includeModifiers: ["theme:light"] // Only light theme
    },
    {
      output: "all-themes.json",
      includeModifiers: ["theme"]       // Expands to all theme values
    }
  ]
}
```

## Multi-File Generation

When including modifiers without specific values, the bundler generates multiple files:

```typescript
// Input
{
  output: "tokens.json",
  includeModifiers: ["theme", "density"]
}

// Output files
// - tokens-light-comfortable.json
// - tokens-light-compact.json
// - tokens-dark-comfortable.json
// - tokens-dark-compact.json
```

## Testing

Use dependency injection for testing:

```typescript
import { createMemoryFileSystem } from '../test/helpers';

const { fileReader, fileWriter } = createMemoryFileSystem({
  '/tokens.json': tokens,
  '/manifest.json': manifest
});

const bundles = await bundle(manifest, { 
  fileReader, 
  fileWriter 
});
```

## Error Handling

```typescript
try {
  const results = await bundleToFiles(manifest);
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.error('Failed bundles:', failed);
  }
} catch (error) {
  console.error('Bundling failed:', error);
}
```

## Performance

| Operation | Complexity |
|-----------|------------|
| Bundle creation | O(n) where n = number of files |
| Token merging | O(m) where m = total tokens |
| Transform pipeline | O(t × m) where t = transforms |
| File writing | O(b) where b = bundles |

## Design Principles

1. **Functional composition** - Transforms are composable functions
2. **Dependency injection** - File I/O is injectable for testing
3. **Efficient processing** - Optimized bundle generation
4. **Type safety** - Full TypeScript support
5. **Error recovery** - Partial failures don't stop all bundles

## Module Dependencies

- `manifest` - For processing manifest specifications
- `core/merge` - For DTCG-aware token merging
- `io` - For file reading and writing
- `references` - For optional reference resolution