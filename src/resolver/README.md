# Resolver

The resolver module implements the UPFT (Unpunny Fun Tokens) resolver specification, enabling multi-dimensional token composition through manifest-based configuration with **granular filtering and multi-file generation**.

## Structure

| File | Purpose |
|------|---------|
| `upft-resolver.ts` | Main resolver implementation |
| `upft-types.ts` | TypeScript definitions |
| `upft-resolver.test.ts` | Core resolver tests |
| `multi-file-generation.test.ts` | Multi-file generation tests |
| `index.ts` | Public API exports |

## UPFT Resolver Concept

The UPFT resolver provides a clean, explicit approach to token resolution using JSON Schema terminology and predictable file mappings.

## Manifest Structure

```json
{
  "$schema": "../schemas/resolver-upft.json",
  "sets": [
    { "name": "base", "values": ["tokens/base.json"] },
    { "name": "components", "values": ["tokens/components.json"] }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/light.json"],
        "dark": ["tokens/dark.json"]
      }
    },
    "density": {
      "oneOf": ["comfortable", "compact"],
      "values": {
        "comfortable": ["tokens/comfortable.json"],
        "compact": ["tokens/compact.json"]
      }
    },
    "features": {
      "anyOf": ["animations", "experimental"],
      "values": {
        "animations": ["tokens/animations.json"],
        "experimental": ["tokens/experimental.json"]
      }
    }
  },
  "generate": [
    {
      "theme": "light",
      "density": "comfortable",
      "output": "light-comfortable.json"
    },
    {
      "output": "all-themes.json",
      "includeModifiers": ["theme"]
    }
  ]
}
```

## Key Concepts

### Sets
Named collections of base token files that are always included unless filtered out:
- Can have optional `name` for filtering
- Unnamed sets are always included (unless filtering is active)

### Modifiers

| Type | Behavior | Example |
|------|----------|---------|
| **oneOf** | Exactly one must be selected | Theme: light OR dark |
| **anyOf** | Zero or more can be selected | Features: animations AND/OR experimental |

### Filtering

Control which sets and modifiers contribute to each output:

```json
{
  "generate": [
    {
      "output": "filtered.json",
      "includeSets": ["base"],           // Only these sets
      "excludeSets": ["experimental"],    // Exclude these sets
      "includeModifiers": ["theme:light"], // Only light theme
      "excludeModifiers": ["density"]     // No density modifiers
    }
  ]
}
```

### Multi-File Generation

Including a modifier without a specific value automatically generates multiple files:

```json
{
  "output": "tokens.json",
  "includeModifiers": ["theme"]  // Generates tokens-light.json, tokens-dark.json
}
```

## Core Class: UPFTResolver

### Methods

| Method | Purpose |
|--------|---------|
| `resolvePermutation(manifest, input, spec?)` | Resolve single combination with optional filtering |
| `generateAll(manifest)` | Generate all specified permutations |
| `validateInput(manifest, input)` | Validate input against manifest |
| `expandGenerateSpec(manifest, spec)` | Expand wildcards in generate spec |
| `expandGenerateSpecWithFiltering(manifest, spec)` | Handle multi-file expansion |

### Configuration

```typescript
const resolver = new UPFTResolver({
  fileReader?: TokenFileReader,  // Custom file reader
  basePath?: string,             // Base path for relative files
  validateManifest?: boolean     // Enable manifest validation
});
```

### Usage Example

```typescript
import { UPFTResolver } from './resolver';

const resolver = new UPFTResolver();

// Resolve specific combination
const result = await resolver.resolvePermutation(manifest, {
  theme: 'dark',
  features: ['animations']
});

// Generate all specified outputs
const results = await resolver.generateAll(manifest);

// Each result contains:
// - id: Unique identifier
// - input: Modifier values used
// - files: Source files included
// - tokens: Merged token document
// - output?: Output file path
// - resolvedTokens?: If reference resolution enabled
```

## Resolution Process

1. **Input Validation** - Validate against modifier constraints
2. **Filtering** - Apply include/exclude rules for sets and modifiers
3. **File Collection** - Gather files from sets and selected modifiers
4. **DTCG Merging** - Merge with type checking and conflict detection
5. **Reference Resolution** - Optionally resolve `{token.reference}` patterns
6. **Multi-File Expansion** - Generate multiple outputs if needed

## Filtering Rules

### Set Filtering
- `excludeSets` takes precedence over `includeSets`
- Wildcard `"*"` supported in both include and exclude lists
- Unnamed sets included by default unless filtering is active

### Modifier Filtering
- `excludeModifiers` takes precedence over `includeModifiers`
- Specific values: `"theme:light"` includes only light theme
- General inclusion: `"theme"` includes all theme values (may trigger expansion)
- Wildcard `"*"` supported

### Filter Examples

```typescript
// Include only base set, no modifiers
{
  "includeSets": ["base"],
  "excludeModifiers": ["*"]
}

// All sets except experimental, only compact density
{
  "excludeSets": ["experimental"],
  "includeModifiers": ["density:compact"]
}

// Specific theme, all densities (generates multiple files)
{
  "theme": "light",
  "includeModifiers": ["density"]
}
```

## File Naming Convention

When multi-file generation occurs:
- Base name from `output` field
- Modifier values joined with hyphens
- Order matches modifier declaration order
- Always `.json` extension

Examples:
- `includeModifiers: ["theme"]` → `output-light.json`, `output-dark.json`
- `includeModifiers: ["theme", "density"]` → `output-light-comfortable.json`, etc.

## DTCG-Aware Merging

The resolver uses intelligent DTCG merging:
- **Type inheritance** - `$type` inherited from parent groups
- **Type checking** - Error on incompatible type merges
- **Deep merging** - Composite types merged properly
- **Conflict detection** - Clear errors for token/group conflicts
- **Extension handling** - `$extensions` objects deep merged

## Comparison with Official Resolver

| Feature | UPFT Resolver | Official Resolver |
|---------|--------------|-------------------|
| **Terminology** | JSON Schema (oneOf/anyOf) | Custom (enumerated/include) |
| **File mapping** | Explicit paths | Auto-namespacing |
| **Filtering** | Granular include/exclude | Not available |
| **Multi-file gen** | Automatic expansion | Not available |
| **Wildcard** | Supported (`*`) | Not supported |
| **Runtime** | Yes | Build-time only |

## Integration Points

- **CLI** - Powers resolve/build/preview commands
- **API** - Provides programmatic resolver access
- **Bundler** - Core resolution engine for bundling

## Performance

| Operation | Complexity |
|-----------|------------|
| Single resolution | O(n) where n = files to merge |
| Multi-file expansion | O(m × k) where m = modifiers, k = values |
| File loading | Cached after first read |
| Token merging | O(t) where t = total tokens |

## Error Handling

```typescript
try {
  await resolver.resolvePermutation(manifest, input);
} catch (error) {
  // Possible errors:
  // - Invalid manifest structure
  // - Invalid modifier values
  // - Missing files
  // - Type conflicts during merge
  // - Circular references
}
```

## Testing

The resolver supports dependency injection for testing:

```typescript
import { memfs } from 'memfs';

const { fs } = memfs({
  '/base.json': JSON.stringify(baseTokens)
});

const fileReader = new TokenFileReader({
  fs: { 
    readFile: async (path, encoding) => 
      fs.promises.readFile(path, encoding) 
  }
});

const resolver = new UPFTResolver({ fileReader });
```

## Future Considerations

- Conditional sets based on modifier values
- Set composition and inheritance
- Provenance tracking for merged tokens
- Parallel file loading optimization
- Incremental resolution caching
- Custom merge strategies
- Transform pipeline integration