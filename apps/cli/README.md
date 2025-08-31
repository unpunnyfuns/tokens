# @upft/cli

Command-line interface for DTCG-style design token operations.

## Installation

```bash
npm install -g @upft/cli
# or
pnpm add -g @upft/cli
```

## Commands

| Command | Purpose |
|---------|---------|
| `validate` | Validate token files or manifests |
| `bundle` | Generate token bundles from manifests |
| `preview` | Preview token resolution with modifiers |
| `list` | List tokens with filtering options |
| `diff` | Compare token files or permutations |
| `lint` | Check tokens for style and conventions |
| `info` | Show manifest information |
| `permutations` | List available permutations |

## Usage Examples

### Validation

```bash
# Validate a token file
upft validate tokens.json -f

# Validate directory of token files
upft validate ./tokens -d

# Validate manifest
upft validate manifest.json -m
```

### Bundling

```bash
# Bundle from manifest
upft bundle manifest.json

# Bundle with custom output
upft bundle manifest.json --output dist/

# Bundle specific permutation
upft bundle manifest.json --modifiers theme=dark,density=compact
```

### Preview & Analysis

```bash
# Preview token resolution
upft preview manifest.json --modifiers theme=light

# Preview with JSON output
upft preview manifest.json --json

# List all tokens
upft list tokens.json

# List specific type
upft list tokens.json --type color

# Show manifest info
upft info manifest.json
```

### Comparison

```bash
# Compare two token files
upft diff tokens-v1.json tokens-v2.json

# Compare manifest permutations
upft diff manifest.json -m --left-modifiers theme=light --right-modifiers theme=dark
```

### Linting

```bash
# Lint token files
upft lint tokens.json

# Lint manifest
upft lint manifest.json -m

# Lint with specific rules
upft lint tokens/ --rules naming,structure
```

## Command Options

### Global Options

| Option | Description |
|--------|-------------|
| `--help` | Show command help |
| `--version` | Show version |
| `--verbose` | Verbose output |
| `--quiet` | Suppress output |

### Validation Options

| Option | Description |
|--------|-------------|
| `-f, --file` | Validate single file |
| `-d, --directory` | Validate directory |
| `-m, --manifest` | Validate manifest |
| `--schema` | Custom schema URL |

### Bundle Options

| Option | Description |
|--------|-------------|
| `--output <dir>` | Output directory |
| `--modifiers <mod>` | Modifier values (key=value,key=value) |
| `--resolve-refs` | Resolve token references |
| `--minify` | Minify output |

### Preview Options

| Option | Description |
|--------|-------------|
| `--modifiers <mod>` | Preview with modifiers |
| `--json` | JSON output format |
| `--format <fmt>` | Output format (json, yaml, css) |

## Configuration

Create `.upftrc.json` for project configuration:

```json
{
  "validation": {
    "strict": true,
    "schemas": {
      "tokens": "https://tokens.unpunny.fun/schemas/latest/tokens/base.schema.json"
    }
  },
  "bundling": {
    "resolveReferences": true,
    "outputFormat": "json",
    "minify": false
  },
  "linting": {
    "rules": ["naming", "structure", "consistency"]
  }
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation errors |
| 2 | File not found |
| 3 | Invalid arguments |
| 4 | Build/bundle errors |

## Examples

### Basic Workflow

```bash
# 1. Validate your tokens
upft validate tokens/ -d

# 2. Preview resolution
upft preview manifest.json --modifiers theme=light

# 3. Generate bundles
upft bundle manifest.json

# 4. Lint for consistency
upft lint tokens/ -d
```

### CI/CD Integration

```bash
#!/bin/bash
set -e

# Validate all tokens
upft validate tokens/ -d

# Lint for style
upft lint tokens/ -d

# Generate production bundles
upft bundle manifest.json --output dist/ --minify

echo "✅ Token build successful"
```

### Advanced Usage

```bash
# Compare design system versions
upft diff v1/tokens.json v2/tokens.json > changes.diff

# Generate all permutations
upft permutations manifest.json --json > permutations.json

# Validate with custom schema
upft validate tokens.json --schema ./custom.schema.json
```

## Integration

Works seamlessly with:
- **@upft/foundation**: Core token types and operations
- **@upft/loader**: Multi-pass loading and resolution
- **@upft/bundler**: Token bundling
- **@upft/validator**: Schema validation
- **@upft/analysis**: Token analysis and comparison
- **@upft/ast**: Token AST operations
- **@upft/linter**: Style checking
- **@upft/schemas**: DTCG schemas
- **Design tools**: Figma, Sketch token plugins
- **Build systems**: Webpack, Vite, Rollup