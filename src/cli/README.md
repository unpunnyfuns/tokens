# CLI

Command-line interface providing comprehensive access to token operations through an intuitive terminal experience. This module exposes validation, bundling, resolution, and analysis capabilities with support for both human-readable output and machine-parseable formats, enabling seamless integration into development workflows and CI/CD pipelines.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance Notes](#performance-notes)
- [Integration Points](#integration-points)

## Overview

The CLI module provides a comprehensive command-line interface for working with design tokens. It offers commands for validation, bundling, resolution, comparison, and analysis operations. The CLI is built with Commander.js and provides both human-readable and machine-readable output formats.

The module includes command implementations that orchestrate operations across other modules, output formatting utilities for consistent display, and configuration management for customizable behavior. Commands support various output formats including JSON for automation and integration into CI/CD pipelines.

## Usage

### Basic Commands

Validate tokens and manifests:

```bash
# Validate individual files
upft validate tokens.json
upft validate tokens.json --strict

# Validate directories
upft validate ./tokens --recursive

# Validate manifests with all permutations
upft validate manifest.json --all-permutations
```

Build and bundle tokens:

```bash
# Build from manifest
upft bundle manifest.json
upft bundle manifest.json --output ./dist

# Build with specific format
upft bundle manifest.json --output ./dist --format dtcg --prettify
```

Resolve tokens for specific configurations:

```bash
# Resolve with modifiers
upft preview manifest.json --theme dark --mode compact

# Output as JSON
upft preview manifest.json --theme light --json > tokens.json

# Resolve with complex modifiers
upft preview manifest.json --modifiers '{"theme":"dark","density":"tight"}'
```

### Information and Analysis

List available permutations:

```bash
# Show all possible permutations
upft permutations manifest.json

# Filter permutations
upft permutations manifest.json --filter "theme:*"

# JSON output for automation
upft permutations manifest.json --json
```

Get manifest information:

```bash
# Basic info
upft info manifest.json

# Detailed information
upft info manifest.json --verbose

# Machine-readable format
upft info manifest.json --json
```

Compare token configurations:

```bash
# Compare files directly
upft diff old.json new.json

# Compare manifest permutations
upft diff --manifest manifest.json --from "theme:light" --to "theme:dark"

# Detailed comparison
upft diff old.json new.json --detailed
```

### Linting and Analysis

Lint token files:

```bash
# Lint directory
upft lint ./tokens

# Lint with auto-fix
upft lint ./tokens --fix

# Apply specific rules
upft lint tokens.json --rules no-missing-type,consistent-naming
```

List and analyze tokens:

```bash
# List all tokens
upft list tokens.json

# Filter by type
upft list tokens.json --type color

# Tree format
upft list tokens.json --format tree
```

## API Reference

### Main CLI Functions

| Function | Type | Description |
|----------|------|-------------|
| `createCLI` | `() => Command` | Create Commander.js instance |

### Available Types

| Type | Description |
|------|-------------|
| `CommandOptions` | Base command options |
| `ManifestInfo` | Manifest information structure |
| `TokenDiff` | Token comparison result |
| `ValidationResult` | Validation result structure |

## CLI Commands

The CLI provides the following commands accessible via `upft`:

- `validate` - Validate token files and manifests
- `bundle` - Bundle tokens from manifest
- `resolve` - Resolve tokens with specific modifiers
- `diff` - Compare token documents
- `list` - List tokens in documents
- `info` - Show manifest information

Use `upft --help` or `upft <command> --help` for detailed usage information.

### Type Definitions

#### ManifestInfo

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

#### TokenDiff

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

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | File not found |
| 4 | Validation failed |
| 5 | Bundle operation failed |

## Structure

| File | Purpose |
|------|---------|
| `cli.ts` | Main CLI entry point and command router |
| `commands.ts` | Command factory and setup functions |
| `commands/bundle.ts` | Bundle command implementation |
| `commands/validate.ts` | Validate command implementation |
| `commands/diff.ts` | Diff command implementation |
| `commands/info.ts` | Info command implementation |
| `commands/list.ts` | List command implementation |
| `commands/resolve.ts` | Resolve command implementation |
| `utils/output.ts` | Output formatting utilities |
| `utils/config.ts` | CLI configuration management |
| `index.ts` | Module exports |

## Performance Notes

- Commands use streaming output for large datasets to avoid memory issues
- File operations are cached where appropriate to improve repeated command performance
- JSON output mode bypasses formatting overhead for better automation performance
- Watch mode uses efficient file system monitoring for continuous operations

## Integration Points

### CI/CD Integration

Use JSON output for automation and scripting:

```bash
# Validate in CI pipeline
upft validate manifest.json --json --exit-code

# Generate tokens for deployment
upft bundle manifest.json --output ./dist --json

# Compare versions for change detection
upft diff old-tokens.json new-tokens.json --json
```

### API Module Integration

Commands leverage high-level API functions:

```typescript
// CLI commands use API module for core operations
import { bundleWithMetadata, validateManifest } from '@unpunnyfuns/tokens';

// Bundle command implementation
await bundleWithMetadata({ manifest: manifestPath });

// Validate command implementation  
await validateManifest(manifestPath, options);
```

### Configuration Integration

```typescript
// Load and use configuration
const config = await loadConfig();

const cli = new TokenCLI({
  fileReader: config.fileReader,
  fileWriter: config.fileWriter,
  basePath: config.basePath
});
```

### Programmatic Usage

Use CLI functions in other applications:

```typescript
import { validateCommand, bundleCommand } from '@unpunnyfuns/tokens';

// Use commands programmatically
await validateCommand({
  file: 'tokens.json',
  strict: true,
  references: true
});

await bundleCommand('manifest.json', {
  output: './dist',
  prettify: true
});
```