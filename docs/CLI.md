# UPFT CLI Documentation

Universal Platform for Tokens - Command Line Interface

## Installation

### Global Installation (Recommended for CLI usage)

```bash
npm install -g @unpunnyfuns/tokens

# After global install, use directly:
upft <command> [options]
```

### Local Installation

```bash
npm install @unpunnyfuns/tokens

# For local installation, use with npx:
npx upft <command> [options]

# Or add to package.json scripts:
"scripts": {
  "tokens:validate": "upft validate tokens/ --directory",
  "tokens:bundle": "upft bundle tokens.manifest.json"
}
```

### Direct Execution (Development)

```bash
# Run directly from source without installation
npx tsx src/cli/cli.ts <command> [options]

# Or with node (after building)
node dist/cli/cli.js <command> [options]
```

## Usage

```bash
# With global installation
upft <command> [options]

# With local installation
npx upft <command> [options]

# Direct execution (development)
npx tsx src/cli/cli.ts <command> [options]
```

## Commands

### `bundle`

Bundle tokens from a manifest file into consolidated output files.

**Usage:**
```bash
upft bundle <manifest> [options]
```

**Arguments:**
- `<manifest>` - Path to the manifest file (required)

**Options:**
- `-o, --output <file>` - Output file path
- `-f, --format <format>` - Output format: `json` (default), `json5`, or `yaml`
- `-m, --modifiers <modifiers>` - Modifier values as JSON string
- `--minify` - Minify the output
- `--watch` - Watch for changes and rebuild automatically

**Example:**
```bash
# Bundle tokens from a manifest
upft bundle tokens.manifest.json

# Bundle with specific output format
upft bundle tokens.manifest.json --format yaml

# Bundle with minified output
upft bundle tokens.manifest.json --minify
```

---

### `validate`

Validate token files, directories, or manifest files against DTCG schemas.

**Usage:**
```bash
upft validate <path> [options]
```

**Arguments:**
- `<path>` - Path to file or directory to validate (required)

**Options:**
- `-f, --file` - Validate as a token file (default behavior)
- `-d, --directory` - Validate all token files in directory
- `-m, --manifest` - Validate as a resolver manifest
- `-s, --schema <schema>` - Schema to validate against
- `-v, --verbose` - Verbose output

**Examples:**
```bash
# Validate a single token file
upft validate tokens/colors.json

# Validate all token files in a directory
upft validate tokens/ --directory

# Validate a manifest file
upft validate tokens.manifest.json --manifest

# Validate with verbose output
upft validate tokens/colors.json --verbose
```

---

### `preview`

Preview merged tokens for specific modifier combinations without generating files.

**Usage:**
```bash
upft preview <manifest> [options]
```

**Arguments:**
- `<manifest>` - Path to manifest file (required)

**Options:**
- `-m, --modifiers <modifiers...>` - Modifiers as key=value pairs
- `--json` - Output full merged JSON (default: summary only)

**Examples:**
```bash
# Preview default merge (no modifiers)
upft preview tokens.manifest.json

# Preview with specific modifiers
upft preview tokens.manifest.json --modifiers theme=light mode=compact

# Output full merged JSON
upft preview tokens.manifest.json --modifiers theme=dark --json
```

---

### `list`

List tokens from a token file with optional filtering.

**Usage:**
```bash
upft list <file> [options]
```

**Arguments:**
- `<file>` - Path to token file (required)

**Options:**
- `-t, --type <type>` - Filter by token type (e.g., color, dimension, typography)
- `-g, --group <group>` - Filter by token group
- `--json` - Output as JSON array

**Examples:**
```bash
# List all tokens in a file
upft list tokens/colors.json

# List only color tokens
upft list tokens/all.json --type color

# List tokens from a specific group
upft list tokens/all.json --group spacing

# Output as JSON
upft list tokens/colors.json --json
```

---

### `permutations`

List all possible permutations from a manifest file.

**Usage:**
```bash
upft permutations <manifest> [options]
```

**Arguments:**
- `<manifest>` - Path to manifest file (required)

**Options:**
- `--json` - Output as JSON array

**Examples:**
```bash
# List all permutation IDs
upft permutations tokens.manifest.json

# Output full permutation details as JSON
upft permutations tokens.manifest.json --json
```

---

### `info`

Display detailed information about a manifest file.

**Usage:**
```bash
upft info <manifest> [options]
```

**Arguments:**
- `<manifest>` - Path to manifest file (required)

**Options:**
- `--json` - Output as JSON object

**Examples:**
```bash
# Show manifest information
upft info tokens.manifest.json

# Output as JSON for programmatic use
upft info tokens.manifest.json --json
```

**Output includes:**
- Manifest name and description
- Number of sets and their file counts
- Available modifiers and their options
- Total possible permutations
- Generated output count (if applicable)

---

### `diff`

Compare two token files or manifest permutations to find differences.

**Usage:**
```bash
# Compare two files directly
upft diff <left-file> <right-file> [options]

# Compare manifest permutations
upft diff <manifest> --manifest [options]
```

**Arguments:**
- `<left>` - Left file path or manifest path (with `-m`)
- `[right]` - Right file path (not used with `-m`)

**Options:**
- `-m, --manifest` - Compare manifest permutations instead of files
- `-l, --left <modifiers...>` - Left modifiers for manifest comparison (e.g., theme=light)
- `-r, --right <modifiers...>` - Right modifiers for manifest comparison (e.g., theme=dark)
- `--json` - Output differences as JSON

**Examples:**
```bash
# Compare two token files
upft diff tokens/light.json tokens/dark.json

# Compare manifest permutations
upft diff tokens.manifest.json -m \
  --left theme=light mode=compact \
  --right theme=dark mode=comfortable

# Output differences as JSON
upft diff tokens/v1.json tokens/v2.json --json
```

---

### `lint`

Lint token files for common issues and best practices.

**Usage:**
```bash
upft lint <files...> [options]
```

**Arguments:**
- `<files...>` - One or more files to lint (required)

**Options:**
- `-f, --fix` - Auto-fix correctable issues
- `-c, --config <config>` - Path to lint configuration file

**Examples:**
```bash
# Lint a single file
upft lint tokens/colors.json

# Lint multiple files
upft lint tokens/*.json

# Auto-fix issues
upft lint tokens/colors.json --fix

# Use custom lint configuration
upft lint tokens/*.json --config .upftlintrc.json
```

---

## Exit Codes

The CLI uses standard exit codes:
- `0` - Success
- `1` - General error or validation failure

## Environment Variables

- `NO_COLOR` - Disable colored output
- `DEBUG` - Enable debug output

## Configuration Files

### Manifest File Structure

A manifest file defines how tokens should be bundled and resolved:

```json
{
  "name": "My Design System",
  "description": "Token manifest for our design system",
  "sets": [
    {
      "name": "base",
      "values": ["tokens/base/*.json"]
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"]
      }
    },
    "mode": {
      "oneOf": ["compact", "comfortable", "spacious"],
      "values": {
        "compact": ["tokens/modes/compact.json"],
        "comfortable": ["tokens/modes/comfortable.json"],
        "spacious": ["tokens/modes/spacious.json"]
      }
    }
  },
  "generate": [
    {
      "modifiers": { "theme": "light", "mode": "comfortable" },
      "output": "dist/light-comfortable.json"
    },
    {
      "modifiers": { "theme": "dark", "mode": "comfortable" },
      "output": "dist/dark-comfortable.json"
    }
  ]
}
```

### Token File Structure

Token files follow the DTCG (Design Token Community Group) format:

```json
{
  "$schema": "https://schemas.tokens.design/v1/tokens.json",
  "colors": {
    "primary": {
      "$type": "color",
      "$value": {
        "colorSpace": "srgb",
        "components": [0, 0.4, 0.8],
        "alpha": 1
      },
      "$description": "Primary brand color"
    }
  },
  "spacing": {
    "small": {
      "$type": "dimension",
      "$value": {
        "value": 4,
        "unit": "px"
      }
    }
  }
}
```

## Common Workflows

### Building a Design System

1. Create token files for your primitives:
```bash
upft validate tokens/primitives/ --directory
```

2. Create a manifest file to define variants:
```bash
upft validate design-system.manifest.json --manifest
```

3. Preview different combinations:
```bash
upft preview design-system.manifest.json --modifiers theme=dark
```

4. Bundle tokens for distribution:
```bash
upft bundle design-system.manifest.json
```

### Migrating Token Formats

1. Validate existing tokens:
```bash
upft validate old-tokens.json
```

2. Check differences after migration:
```bash
upft diff old-tokens.json new-tokens.json
```

3. Lint for best practices:
```bash
upft lint new-tokens.json
```

### CI/CD Integration

```bash
#!/bin/bash
# Validate all tokens
upft validate tokens/ --directory || exit 1

# Validate manifest
upft validate tokens.manifest.json --manifest || exit 1

# Bundle for production
upft bundle tokens.manifest.json --minify

# Check for unexpected changes
upft diff previous-release.json current-build.json
```

## Troubleshooting

### Common Issues

**"Validation failed" errors:**
- Ensure token files follow DTCG format
- Check that all required fields ($type, $value) are present
- Validate JSON syntax is correct

**"File not found" errors:**
- Check that file paths in manifest are relative to manifest location
- Ensure all referenced files exist
- Use forward slashes (/) in paths, even on Windows

**"Invalid modifier" errors:**
- Verify modifier names match those defined in manifest
- Check that modifier values are from allowed options
- Ensure modifier syntax is correct (key=value)

### Debug Mode

Enable debug output for troubleshooting:
```bash
DEBUG=* upft validate tokens.json
```

## See Also

- [DTCG Format Specification](https://design-tokens.github.io/community-group/format/)
- [Token File Examples](./examples/)
- [API Documentation](./API.md)