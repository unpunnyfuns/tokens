# CLI Reference

## Usage

```bash
upft <command>
```

For development from source:
```bash
npx tsx src/cli/cli.ts <command>
```

## Commands

### validate

Validate token files or resolver manifests.

```bash
upft validate <path>
```

**Options:**
- `-f, --file` - Validate as token file (default)
- `-d, --directory` - Validate all token files in directory
- `-m, --manifest` - Validate as resolver manifest
- `-v, --verbose` - Verbose output

**Examples:**
```bash
# Validate a token file
upft validate -f tokens.json

# Validate all token files in a directory
upft validate -d ./tokens

# Validate a resolver manifest
upft validate -m resolver.manifest.json
```

### bundle

Bundle tokens from a resolver manifest.

```bash
upft bundle <manifest>
```

**Options:**
- `-o, --output <file>` - Output file path
- `-f, --format <format>` - Output format (json, json5, yaml)
- `--minify` - Minify output
- `--watch` - Watch for changes

**Examples:**
```bash
# Bundle from manifest
upft bundle resolver.manifest.json

# Bundle with custom output
upft bundle resolver.manifest.json -o dist/tokens.json
```

### resolve

Resolve a specific permutation from a manifest.

```bash
upft resolve <manifest>
```

**Options:**
- `-m, --modifiers <json>` - JSON object of modifier values

**Examples:**
```bash
# Resolve with specific modifiers
upft resolve manifest.json -m '{"theme":"dark"}'
```

### list

List token information from files.

```bash
upft list <file>
```

**Options:**
- `-t, --type <type>` - Filter by token type
- `-g, --group <group>` - Filter by group
- `--json` - Output as JSON

**Examples:**
```bash
# List all tokens
upft list tokens.json

# List only color tokens
upft list tokens.json -t color

# Output as JSON
upft list tokens.json --json
```

### lint

Lint token files for issues.

```bash
upft lint <files...>
```

**Options:**
- `-c, --config <file>` - Lint configuration file
- `--fix` - Auto-fix issues where possible
- `--quiet` - Only show errors

**Examples:**
```bash
# Lint single file
upft lint tokens.json

# Lint multiple files
upft lint tokens/*.json

# Auto-fix issues
upft lint tokens.json --fix
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Validation error
- `3` - File not found