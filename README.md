# @unpunnyfuns/tokens

Design token schema validator and bundler with DTCG support and enhanced JSON Schema `$ref` references.

A comprehensive token management toolkit that validates design tokens against DTCG-inspired schemas and provides powerful bundling capabilities with support for both JSON Schema `$ref` and DTCG `{alias}` formats.

## Key Features

- 🔍 **Token Validation** - Validate your design tokens against DTCG schemas
- 📦 **Token Bundling** - Bundle multi-file tokens with resolver manifests
- 🔗 **Dual Reference Support** - Both JSON Schema `$ref` and DTCG `{alias}` formats
- 🎨 **15+ Token Types** - Colors, dimensions, shadows, borders, gradients, and more
- 🔄 **Format Conversion** - Convert between `$ref` and DTCG alias formats
- ⚡ **CLI Tool** - Simple command-line interface for validation and bundling

## Installation

```bash
npm install @unpunnyfuns/tokens
```

## CLI Usage

The package provides the `upft` command-line tool:

### Validate Token Files

```bash
# Validate a directory of token files
upft validate ./tokens

# Validate a specific file
upft validate ./design-tokens.json

# Show detailed validation output
upft validate ./tokens --verbose
```

### Bundle Tokens

```bash
# Bundle tokens from a resolver manifest
upft bundle -m resolver.manifest.json

# Bundle with theme modifier
upft bundle -m manifest.json --theme dark

# Convert to DTCG alias format
upft bundle -m manifest.json --format dtcg

# Output to file instead of stdout
upft bundle -m manifest.json -o bundled-tokens.json

# Bundle with resolved references
upft bundle -m manifest.json --resolve-refs
```

### Generate AST

```bash
# Generate AST representation from tokens
upft ast -m manifest.json

# Generate AST with theme applied
upft ast -m manifest.json --theme dark

# Output AST to file
upft ast -m manifest.json -o tokens.ast.json
```

### Bundle Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --manifest <path>` | Path to resolver manifest (required) | - |
| `-o, --output <path>` | Output file path | stdout |
| `-t, --theme <name>` | Theme modifier to apply | - |
| `--mode <name>` | Mode modifier to apply | - |
| `-f, --format <type>` | Output format: `json-schema`, `dtcg`, or `preserve` | `json-schema` |
| `-r, --resolve-refs` | Resolve references to values | false |
| `--preserve-external` | Keep external file references as $ref | true |
| `--quiet` | Suppress warnings | false |

## Programmatic API

### Validation

```javascript
import { validateFiles } from '@unpunnyfuns/tokens/validators';

const isValid = await validateFiles('./my-tokens');
if (!isValid) {
  console.error('Token validation failed');
}
```

### Bundling with Metadata

```javascript
import { bundleWithMetadata } from '@unpunnyfuns/tokens/bundler/api';

// Bundle with enhanced metadata and methods
const result = await bundleWithMetadata({
  manifest: './resolver.manifest.json',
  theme: 'dark',
  format: 'dtcg',
  includeMetadata: true
});

// Access bundled tokens
console.log(result.tokens);

// Get metadata about the bundle
console.log(result.metadata.stats);

// Generate AST representation
const ast = result.getAST();

// Validate references
const validation = await result.validate();

// Export as JSON string
const json = result.toJSON();
```

### Creating Plugins

```javascript
import { createBundlerPlugin } from '@unpunnyfuns/tokens/bundler/api';

// Create a plugin for build tools like Terrazzo
const plugin = createBundlerPlugin({
  manifest: './tokens/manifest.json',
  format: 'dtcg'
});

// Use the plugin
const { tokens, ast, metadata } = await plugin.parse({
  theme: 'dark'
});
```

## Reference Formats

This toolkit supports two reference formats:

### JSON Schema `$ref` Format

Standard JSON Pointer references that can be validated:

```json
{
  "button-bg": {
    "$type": "color",
    "$value": { "$ref": "#/colors/primary/$value" }
  },
  "external-ref": {
    "$type": "color",
    "$value": { "$ref": "../primitives/colors.json#/blue/500" }
  }
}
```

### DTCG Alias Format

DTCG's string interpolation syntax:

```json
{
  "button-bg": {
    "$type": "color",
    "$value": "{colors.primary}"
  },
  "composite": {
    "$type": "dimension",
    "$value": "{spacing.sm} {spacing.lg}"
  }
}
```

### Format Conversion

The bundler can convert between formats:

```bash
# Convert $ref to DTCG aliases (internal refs only)
upft bundle -m manifest.json --format dtcg

# Preserve original format without any conversion
upft bundle -m manifest.json --format preserve

# Mixed format: DTCG aliases for internal, $ref for external
upft bundle -m manifest.json --format dtcg --preserve-external
```

#### Why Mixed Format?

The `--preserve-external` option creates a hybrid output because:
- DTCG aliases like `{colors.primary}` can only reference tokens within the same file
- External file references like `../primitives/colors.json#/blue` cannot be expressed as DTCG aliases
- This allows you to use DTCG format while maintaining multi-file token architectures

Example output with `--format dtcg --preserve-external`:

```json
{
  "internal-ref": {
    "$type": "color",
    "$value": "{colors.primary}"  // Internal → DTCG alias
  },
  "external-ref": {
    "$type": "color",
    "$value": {
      "$ref": "../primitives/colors.json#/blue/500"  // External → kept as $ref
    }
  }
}
```

## Token Structure

### Basic Token

```json
{
  "$schema": "https://tokens.unpunny.fun/schema/latest/full",
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc"
    }
  }
}
```

### Token with Reference

```json
{
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc"
    },
    "button": {
      "$type": "color",
      "$value": { "$ref": "#/colors/primary/$value" }
    }
  }
}
```

### Resolver Manifest

```json
{
  "$schema": "https://tokens.unpunny.fun/schema/latest/resolver",
  "sets": [
    {
      "name": "primitives",
      "values": ["./primitives/*.json"]
    },
    {
      "name": "semantic",
      "values": ["./semantic/*.json"]
    }
  ],
  "modifiers": [
    {
      "name": "theme",
      "values": [
        {
          "name": "light",
          "values": ["./themes/light/*.json"]
        },
        {
          "name": "dark",
          "values": ["./themes/dark/*.json"]
        }
      ]
    }
  ]
}
```

## Supported Token Types

All DTCG token types plus extensions:

- **Primitive**: color, dimension, number, fontFamily, fontWeight, duration, cubicBezier
- **Composite**: typography, shadow, border, gradient, transition, strokeStyle
- **Extended**: fontStyle, textCase, textDecoration, textTransform

## Schema Validation

Token files can be validated against schemas:

```json
{
  "$schema": "https://tokens.unpunny.fun/schema/latest/full",
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc"
    }
  }
}
```

Available schemas:
- `/full` - Complete schema with all token types
- `/base` - Basic structure for scaffolding
- `/resolver` - Resolver manifest schema

## Development

For contributors and maintainers, see [Development Guide](./docs/development.md).

### Quick Start for Contributors

```bash
# Clone the repository
git clone https://github.com/unpunnyfuns/tokens.git
cd tokens

# Install dependencies
npm install

# Run tests (validates schemas and examples)
npm test

# Watch mode for development
npm run watch
```

## Integration Examples

### With Style Dictionary

```javascript
// style-dictionary.config.js
import { bundle } from '@unpunnyfuns/tokens/bundler';

export default {
  source: async () => {
    // Bundle and resolve tokens
    const tokens = await bundle({
      manifest: './tokens/resolver.manifest.json',
      resolveRefs: true
    });
    return tokens;
  },
  platforms: {
    css: {
      transformGroup: 'css',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    }
  }
};
```

### With Build Tools

```javascript
// vite.config.js
import { bundle } from '@unpunnyfuns/tokens/bundler';

export default {
  plugins: [{
    name: 'bundle-tokens',
    async buildStart() {
      const tokens = await bundle({
        manifest: './tokens/manifest.json',
        format: 'dtcg'
      });
      
      this.emitFile({
        type: 'asset',
        fileName: 'tokens.json',
        source: JSON.stringify(tokens, null, 2)
      });
    }
  }]
};
```

## License

MIT

## Contributing

Contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md).

## Links

- [Documentation](https://tokens.unpunny.fun)
- [GitHub Repository](https://github.com/unpunnyfuns/tokens)
- [DTCG Specification](https://tr.designtokens.org/)
- [JSON Schema](https://json-schema.org/)