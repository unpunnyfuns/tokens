# Token Bundler

The DTCG Schema bundler is a powerful tool for merging multi-file design token systems into single, unified token files. It supports resolver manifests, reference resolution, and conversion between JSON Schema `$ref` and DTCG alias formats.

## Features

- **Multi-file merging**: Combine tokens from multiple source files
- **Resolver manifest support**: Use standardized manifest format for token composition
- **Theme and mode modifiers**: Apply contextual variations to token sets
- **Reference resolution**: Optionally resolve `$ref` references to actual values
- **Format conversion**: Output in JSON Schema format, DTCG alias format, or preserve original
- **Flexible resolution modes**: Resolve all references, external only, or none

## Installation

```bash
npm install @unpunnyfuns/tokens
```

## CLI Usage

### Basic bundling

Bundle tokens from a resolver manifest:

```bash
upft bundle --manifest resolver.manifest.json
```

### Output to file

```bash
upft bundle --manifest resolver.manifest.json --output bundled.json
```

### Apply theme modifiers

```bash
upft bundle --manifest resolver.manifest.json --theme dark --output dark-theme.json
```

### Convert to DTCG format

```bash
# Full conversion to DTCG aliases
upft bundle --manifest resolver.manifest.json --format dtcg --output tokens.dtcg.json

# DTCG with preserved external references
upft bundle --manifest resolver.manifest.json --format dtcg --preserve-external --output mixed.json

# Keep all references as $ref (no conversion)
upft bundle --manifest resolver.manifest.json --format dtcg --no-convert-internal --output refs.json
```

### Resolve references

```bash
# Resolve all references to values
upft bundle --manifest resolver.manifest.json --resolve-refs

# Resolve only external file references
upft bundle --manifest resolver.manifest.json --resolve-refs --resolve-external
```

## Programmatic Usage

### Basic example

```javascript
import { bundle } from '@unpunnyfuns/tokens/bundler';

const tokens = await bundle({
  manifest: './resolver.manifest.json'
});
```

### With options

```javascript
const tokens = await bundle({
  manifest: './resolver.manifest.json',
  theme: 'dark',
  mode: 'compact',
  format: 'dtcg',
  resolveRefs: true
});
```

### Advanced resolution

```javascript
// Resolve only external references
const tokens = await bundle({
  manifest: './resolver.manifest.json',
  resolveRefs: 'external-only'
});
```

## Resolver Manifest Format

The bundler uses resolver manifests to specify which token files to load and how to compose them:

```json
{
  "primitives": [
    "./primitives/colors.json",
    "./primitives/dimensions.json"
  ],
  "tokens": [
    "./semantic/spacing.json",
    "./semantic/colors.json"
  ],
  "components": [
    "./components/button.json"
  ],
  "modifiers": {
    "theme": {
      "dark": [
        "./themes/dark.json"
      ],
      "light": [
        "./themes/light.json"
      ]
    },
    "mode": {
      "compact": [
        "./modes/compact.json"
      ]
    }
  }
}
```

## Output Formats

### JSON Schema format (default)

Preserves `$ref` references using JSON Pointer syntax:

```json
{
  "brand": {
    "primary": {
      "$type": "color",
      "$value": {
        "$ref": "#/colors/blue/600"
      }
    }
  }
}
```

### DTCG format

Converts `$ref` references to DTCG alias syntax where possible:

```json
{
  "brand": {
    "primary": {
      "$type": "color",
      "$value": "{colors.blue.600}"
    }
  }
}
```

### Preserve format

Keeps the original format without any conversion:

```json
{
  "brand": {
    "primary": {
      "$type": "color",
      "$value": "{colors.blue.600}"  // Keeps original alias
    },
    "secondary": {
      "$type": "color",
      "$value": {
        "$ref": "#/colors/gray/600"  // Keeps original $ref
      }
    }
  }
}
```

### Mixed format (Advanced)

With reference strategy options, you can create hybrid outputs:

```json
{
  "internal": {
    "ref": {
      "$type": "color",
      "$value": "{colors.blue.600}"  // Internal ref converted to alias
    }
  },
  "external": {
    "ref": {
      "$type": "color",
      "$value": {
        "$ref": "../colors.json#/blue/600"  // External ref preserved
      }
    }
  }
}
```

**Note**: Conversion from `$ref` to DTCG aliases is one-way only. External file references cannot be converted to DTCG format as DTCG aliases don't support file references.

## Reference Resolution

The bundler can resolve references to their actual values:

### Input (with references)

```json
{
  "spacing": {
    "sm": {
      "$type": "dimension",
      "$value": {
        "$ref": "#/primitives/scale/2"
      }
    }
  },
  "primitives": {
    "scale": {
      "2": {
        "$type": "dimension",
        "$value": "8px"
      }
    }
  }
}
```

### Output (resolved)

```json
{
  "spacing": {
    "sm": {
      "$type": "dimension",
      "$value": "8px"
    }
  },
  "primitives": {
    "scale": {
      "2": {
        "$type": "dimension",
        "$value": "8px"
      }
    }
  }
}
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --manifest <path>` | Path to resolver manifest (required) | - |
| `-o, --output <path>` | Output file path | stdout |
| `-t, --theme <name>` | Theme modifier to apply | - |
| `--mode <name>` | Mode modifier to apply | - |
| `-f, --format <type>` | Output format: `json-schema`, `dtcg`, or `preserve` | `json-schema` |
| `-r, --resolve-refs` | Resolve references to values | false |
| `--resolve-external` | Only resolve external references | false |
| `--preserve-external` | Keep external file references as $ref | true |
| `--no-convert-internal` | Don't convert internal references | false |
| `--quiet` | Suppress conversion warnings | false |

## API Reference

### `bundle(options)`

Bundle tokens from a resolver manifest.

**Parameters:**

- `options.manifest` (string, required): Path to resolver manifest
- `options.theme` (string): Theme modifier to apply
- `options.mode` (string): Mode modifier to apply
- `options.format` (string): Output format (`'json-schema'`, `'dtcg'`, or `'preserve'`)
- `options.referenceStrategy` (object): Advanced reference handling:
  - `preserveExternal` (boolean): Keep external file refs as $ref (default: true)
  - `convertInternal` (boolean): Convert internal refs to aliases (default: true)
  - `warnOnConversion` (boolean): Show warnings for conversion issues (default: true)
- `options.resolveRefs` (boolean|string): Resolution mode:
  - `false`: Don't resolve references (default)
  - `true`: Resolve all references
  - `'external-only'`: Only resolve external file references

**Returns:** Promise resolving to bundled token object

## Limitations

1. **One-way conversion**: Converting from JSON Schema `$ref` to DTCG aliases is possible, but the reverse is not supported due to the string interpolation nature of DTCG aliases.

2. **External references in DTCG**: When converting to DTCG format, external file references (e.g., `"../colors.json#/blue"`) cannot be converted as DTCG doesn't support file references in aliases.

3. **Circular references**: The resolver detects and warns about circular references but doesn't resolve them to prevent infinite loops.

## Examples

### Bundle with dark theme

```bash
upft bundle \
  --manifest design-system.manifest.json \
  --theme dark \
  --format dtcg \
  --output dist/dark-theme.tokens.json
```

### Resolve and minimize for production

```bash
upft bundle \
  --manifest design-system.manifest.json \
  --resolve-refs \
  --output dist/tokens.resolved.json
```

### Create platform-specific bundles

```bash
# Web tokens
upft bundle \
  --manifest web.manifest.json \
  --format dtcg \
  --output dist/web.tokens.json

# iOS tokens  
upft bundle \
  --manifest ios.manifest.json \
  --format dtcg \
  --output dist/ios.tokens.json
```

## Integration with Build Tools

### Webpack

```javascript
// webpack.config.js
const { bundle } = require('@unpunnyfuns/tokens/bundler');

module.exports = {
  // ... other config
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.beforeCompile.tapPromise('BundleTokens', async () => {
          const tokens = await bundle({
            manifest: './tokens/resolver.manifest.json',
            format: 'dtcg'
          });
          // Write tokens to build directory
          await fs.writeFile('./dist/tokens.json', JSON.stringify(tokens, null, 2));
        });
      }
    }
  ]
};
```

### Vite

```javascript
// vite.config.js
import { bundle } from '@unpunnyfuns/tokens/bundler';

export default {
  plugins: [
    {
      name: 'bundle-tokens',
      async buildStart() {
        const tokens = await bundle({
          manifest: './tokens/resolver.manifest.json'
        });
        this.emitFile({
          type: 'asset',
          fileName: 'tokens.json',
          source: JSON.stringify(tokens, null, 2)
        });
      }
    }
  ]
};
```

## See Also

- [Resolver Manifest Specification](./resolver-manifest.md)
- [Validation Documentation](./validation.md)
- [DTCG Specification](https://dtcg.org/)