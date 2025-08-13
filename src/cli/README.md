# CLI

The CLI module provides command-line interface for the token platform, enabling validation, resolution, building, and analysis from the terminal.

## Structure

| File | Purpose |
|------|---------|
| `cli.ts` | Main CLI entry point and command router |
| `commands.ts` | Command implementations (TokenCLI class) |
| `index.ts` | Module exports |

## Commands

### validate
Validates resolver manifests or token documents.

```bash
upft validate resolver.json
upft validate tokens.json --strict
```

### resolve
Resolves tokens for specific modifier combinations.

```bash
upft resolve --manifest resolver.json --theme dark --mode compact
upft resolve -m resolver.json --modifiers '{"theme":"dark","density":"tight"}'
```

### build
Generates all token bundles from a manifest.

```bash
upft build --manifest resolver.json --output ./dist
upft build -m resolver.json -o ./dist --format dtcg
```

### list
Lists all available permutations from a manifest.

```bash
upft list --manifest resolver.json
upft list -m resolver.json --json  # Machine-readable output
```

### info
Displays manifest information and statistics.

```bash
upft info --manifest resolver.json
upft info -m resolver.json --verbose
```

### diff
Compares two token permutations.

```bash
upft diff --manifest resolver.json --from "theme:light" --to "theme:dark"
```

## Core Class: TokenCLI

### Methods

| Method | Parameters | Returns |
|--------|------------|---------|
| `validate(manifest)` | Unknown manifest object | `ValidationResult` |
| `resolve(manifest, input)` | Manifest + modifiers | `ResolvedPermutation` |
| `build(manifest)` | Manifest object | `BundleWriteResult[]` |
| `list(manifest)` | Manifest object | `ResolvedPermutation[]` |
| `info(manifest)` | Manifest object | `ManifestInfo` |
| `diff(manifest, options)` | Manifest + comparison options | `TokenDiff` |

### Configuration

```typescript
const cli = new TokenCLI({
  fileReader: customReader,  // Custom file reader
  fileWriter: customWriter,  // Custom file writer
  basePath: './tokens'       // Base path for files
});
```

## Interfaces

### ManifestInfo
```typescript
interface ManifestInfo {
  name?: string;
  description?: string;
  sets: Array<{
    name?: string;
    fileCount: number;
  }>;
  modifiers: Array<{
    name: string;
    type: "oneOf" | "anyOf";
    options: string[];
  }>;
  possiblePermutations: number;
  generateCount?: number;
}
```

### TokenDiff
```typescript
interface TokenDiff {
  differences: Array<{
    path: string;
    leftValue: unknown;
    rightValue: unknown;
    type: "added" | "removed" | "changed";
  }>;
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
}
```

## Output Formats

Commands support multiple output formats:

| Flag | Format | Use Case |
|------|--------|----------|
| (default) | Human-readable | Terminal use |
| `--json` | JSON | Machine processing |
| `--quiet` | Minimal | Scripts |
| `--verbose` | Detailed | Debugging |

## Error Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Validation error |
| 3 | File not found |
| 4 | Invalid configuration |
| 5 | Resolution error |

## Usage Examples

### Validate and Build Pipeline
```bash
# Validate first
upft validate resolver.json --strict

# If valid, build all permutations
upft build --manifest resolver.json --output ./dist

# Check what was generated
ls ./dist/
```

### Compare Themes
```bash
# See differences between light and dark themes
upft diff --manifest resolver.json \
  --from "theme:light" \
  --to "theme:dark" \
  --verbose
```

### CI/CD Integration
```bash
# Machine-readable validation for CI
upft validate resolver.json --json --exit-code

# Generate for specific environment
upft resolve --manifest resolver.json \
  --theme production \
  --format json > tokens.json
```

## Global Options

Available on most commands:

| Option | Description |
|--------|-------------|
| `--help, -h` | Show command help |
| `--version, -v` | Show version |
| `--verbose` | Detailed output |
| `--quiet` | Minimal output |
| `--json` | JSON output format |

## Integration Points

- **API** - Commands use high-level API functions
- **Bundler** - Build command orchestrates bundling
- **Resolver** - Resolution commands use resolver
- **Validator** - Validation commands use validators

## Future Considerations

- Interactive mode for guided operations
- Shell completion (bash/zsh)
- Plugin system for custom commands
- Configuration file support
- Watch mode for continuous operations
- Progress bars for long operations