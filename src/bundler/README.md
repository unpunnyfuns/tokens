# Bundler

The bundler module transforms and packages design tokens for distribution, supporting multiple output formats, transformation pipelines, and **granular filtering with multi-file generation**.

## Structure

| File | Purpose |
|------|---------|
| `bundler.ts` | Main bundling engine |
| `api.ts` | High-level bundling API |
| `bundler.test.ts` | Core bundler tests |
| `bundler-filtering.test.ts` | Filtering and multi-file generation tests |
| `index.ts` | Public exports |

## Core Class: TokenBundler

### Configuration

```typescript
const bundler = new TokenBundler({
  fileReader?: TokenFileReader,  // Custom file reader (supports memfs for testing)
  fileWriter?: TokenFileWriter,  // Custom file writer
  outputFormat: 'dtcg',          // or 'custom'
  transforms: [/* transforms */], // Token transformation pipeline
  prettify: true,                 // Format output for humans
  basePath: './tokens'            // Base path for relative files
});
```

### Methods

| Method | Purpose |
|--------|---------|
| `bundle(manifest)` | Generate bundles from resolver manifest |
| `bundleToFiles(manifest)` | Bundle and write to filesystem |

## Bundling Process

1. **Resolve permutations** - Use resolver to generate all specified outputs
2. **Apply transforms** - Run transformation pipeline on each bundle
3. **Format output** - Convert to target format (DTCG or custom)
4. **Write files** - Save bundles to specified locations

```typescript
// Bundle from manifest
const bundles = await bundler.bundle(manifest);

// Bundle and write to files
const results = await bundler.bundleToFiles(manifest);
```

## Filtering and Multi-File Generation

The bundler leverages the resolver's filtering capabilities to provide granular control over which tokens are included in each output file.

### Set Filtering

Control which named sets contribute to the output:

```typescript
{
  "sets": [
    { "name": "base", "values": ["base.json"] },
    { "name": "components", "values": ["components.json"] }
  ],
  "generate": [
    {
      "output": "base-only.json",
      "includeSets": ["base"]  // Only include base set
    },
    {
      "output": "no-components.json", 
      "excludeSets": ["components"]  // Exclude components set
    }
  ]
}
```

### Modifier Filtering

Control which modifiers contribute to the output:

```typescript
{
  "modifiers": {
    "theme": { "oneOf": ["light", "dark"], /* ... */ },
    "density": { "oneOf": ["comfortable", "compact"], /* ... */ }
  },
  "generate": [
    {
      "output": "theme-only.json",
      "includeModifiers": ["theme:light"]  // Only light theme
    },
    {
      "output": "all-themes.json",
      "includeModifiers": ["theme"]  // Expands to multiple files!
    }
  ]
}
```

### Automatic Multi-File Generation

When you include a `oneOf` modifier without specifying a value, the bundler automatically generates separate files for each value:

```typescript
// Input:
{
  "output": "tokens.json",
  "includeModifiers": ["theme", "density"]
}

// Output files:
// - tokens-light-comfortable.json
// - tokens-light-compact.json  
// - tokens-dark-comfortable.json
// - tokens-dark-compact.json
```

### File Naming Convention

Generated filenames follow a systematic pattern:
- Base name from `output` field
- Modifier values appended with hyphens
- Order matches declaration order
- Always `.json` extension

## Output Formats

### DTCG Format (Default)
Standard DTCG JSON with full metadata:
```json
{
  "color": {
    "primary": {
      "$value": "#007acc",
      "$type": "color"
    }
  }
}
```

### Custom Format
Allows for custom serialization logic while maintaining DTCG structure.

## Transform Pipeline

Transforms are applied in sequence to each bundle:

```typescript
const bundler = new TokenBundler({
  transforms: [
    (tokens) => flattenTokens(tokens),      // Flatten nested structure
    (tokens) => resolveReferences(tokens),  // Resolve all references
    (tokens) => convertColors(tokens),      // Convert color formats
    (tokens) => addPrefixes(tokens)         // Add platform prefixes
  ]
});
```

Transforms receive and return `TokenDocument` objects and are applied after merging but before serialization.

## Bundle Results

```typescript
interface Bundle {
  id: string;                    // Unique bundle identifier
  tokens: TokenDocument;          // Merged token document
  resolvedTokens?: TokenDocument; // If reference resolution enabled
  files: string[];               // Source files included
  output?: string;               // Output file path
  format: string;                // Output format
}

interface BundleWriteResult {
  filePath: string;    // Output file path
  success: boolean;    // Whether write succeeded
  error?: string;      // Error message if failed
}
```

## Integration with Resolver

The bundler works closely with the `UPFTResolver` to:
1. Process manifest `generate` specifications
2. Apply filtering rules (includeSets, excludeSets, includeModifiers, excludeModifiers)
3. Handle multi-file expansion for modifier combinations
4. Merge token files according to DTCG rules
5. Optionally resolve references

## Testing

The bundler supports dependency injection for testing:

```typescript
import { memfs } from 'memfs';

// Create in-memory filesystem for tests
const { fs } = memfs({
  '/tokens.json': JSON.stringify(tokens)
});

const fileReader = new TokenFileReader({
  fs: { 
    readFile: async (path, encoding) => 
      fs.promises.readFile(path, encoding) 
  }
});

const bundler = new TokenBundler({ fileReader });
```

## Error Handling

```typescript
try {
  const results = await bundler.bundleToFiles(manifest);
  results.forEach(result => {
    if (!result.success) {
      console.error(`Failed to write ${result.filePath}: ${result.error}`);
    }
  });
} catch (error) {
  console.error('Bundling failed:', error);
}
```

## Performance Notes

- File operations are async and parallelizable
- Transforms are applied sequentially per bundle
- Multi-file generation creates bundles in parallel
- File reading is cached by default in the resolver

## Examples

### Basic Bundling
```typescript
const manifest = {
  sets: [{ values: ["core.json"] }],
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: ["light.json"],
        dark: ["dark.json"]
      }
    }
  }
};

const bundles = await bundler.bundle(manifest);
// Creates 2 bundles: theme-light and theme-dark
```

### Filtered Output
```typescript
const manifest = {
  // ... sets and modifiers ...
  generate: [
    {
      output: "base.json",
      includeSets: ["base"],
      excludeModifiers: ["*"]  // No modifiers
    },
    {
      output: "themed.json",
      includeModifiers: ["theme"],
      excludeSets: ["experimental"]
    }
  ]
};

await bundler.bundleToFiles(manifest);
// Creates base.json and themed-{light|dark}.json files
```

## Future Considerations

- Incremental bundling for changed files only
- Parallel transform processing
- Custom format plugins  
- Source maps for token origins
- Bundle splitting for large outputs
- Watch mode with hot reload