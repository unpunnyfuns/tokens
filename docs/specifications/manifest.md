# UPFT Manifest Specification

Declarative configuration for multi-dimensional token composition with explicit file mappings and predictable resolution.

## Overview

The UPFT manifest format provides a declarative way to compose design tokens across multiple dimensions (themes, densities, features, etc.) using explicit file mappings and clear modifier semantics. It follows JSON Schema terminology for maximum clarity and tooling support.

## Schema Reference

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/manifest-upft.json"
}
```

## Complete Example

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/manifest-upft.json",
  "name": "Design System Tokens",
  "description": "Multi-dimensional token system with themes and features",
  
  "sets": [
    { 
      "name": "core",
      "values": ["tokens/core/colors.json", "tokens/core/typography.json"] 
    },
    { 
      "name": "semantic",
      "values": ["tokens/semantic/base.json"] 
    }
  ],
  
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark", "high-contrast"],
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"],
        "high-contrast": ["tokens/themes/high-contrast.json"]
      }
    },
    "density": {
      "oneOf": ["comfortable", "compact"],
      "values": {
        "comfortable": ["tokens/density/comfortable.json"],
        "compact": ["tokens/density/compact.json"]
      }
    },
    "features": {
      "anyOf": ["animations", "gradients", "shadows"],
      "values": {
        "animations": ["tokens/features/animations.json"],
        "gradients": ["tokens/features/gradients.json"],
        "shadows": ["tokens/features/shadows.json"]
      }
    }
  },
  
  "generate": [
    {
      "theme": "light",
      "density": "comfortable",
      "output": "dist/light-comfortable.json"
    },
    {
      "theme": "dark",
      "density": "compact",
      "features": ["animations", "shadows"],
      "output": "dist/dark-compact-animated.json"
    }
  ]
}
```

## Core Concepts

### Sets
Base token files that are always included in every permutation. These typically contain foundational tokens like core colors, type scales, and spacing units.

### Modifiers
Dimensional variations that can be applied to the base sets. Two types are supported:
- **`oneOf`**: Mutually exclusive options (e.g., light OR dark theme)
- **`anyOf`**: Combinatorial options (e.g., any combination of feature flags)

### Generate
Explicit list of permutations to generate, with optional output paths. If omitted, all valid permutations are generated.

## Field Reference

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | `string` | No | Schema URL for validation and IDE support |
| `name` | `string` | No | Human-readable name for the manifest |
| `description` | `string` | No | Description of the manifest's purpose |
| `sets` | `array` | Yes | Base token sets always included |
| `modifiers` | `object` | No | Dimensional modifiers for variations |
| `generate` | `array` | No | Specific permutations to generate |

### Set Object

```typescript
{
  name?: string;        // Optional identifier for the set
  values: string[];     // Array of file paths relative to manifest
  description?: string; // Optional description
}
```

### Modifier Definition

```typescript
{
  [modifierName: string]: {
    oneOf?: string[];   // Mutually exclusive options
    anyOf?: string[];   // Combinatorial options
    values: {
      [option: string]: string[];  // File paths for each option
    };
    default?: string | string[];   // Default selection
    description?: string;           // Optional description
  }
}
```

### Generate Entry

```typescript
{
  [modifierName: string]: string | string[];  // Modifier selections
  output?: string;                            // Output file path
  includeSets?: string[];                     // Filter sets by name
  excludeSets?: string[];                     // Exclude sets by name
}
```

## Resolution Algorithm

1. **Collect Base Files**: All files from `sets` are collected first
2. **Apply Modifiers**: For each modifier in the permutation:
   - `oneOf`: Include files for the single selected value
   - `anyOf`: Include files for all selected values
3. **Merge Tokens**: Files are merged in order with later files overriding earlier ones
4. **Validate Result**: Optional validation ensures type consistency

### Merge Order

Files are merged in this specific order:
1. Set files (in array order)
2. Modifier files (in manifest definition order)

Example with `theme: "dark"` and `density: "compact"`:
1. `tokens/core/colors.json` (from sets)
2. `tokens/semantic/base.json` (from sets)
3. `tokens/themes/dark.json` (from theme modifier)
4. `tokens/density/compact.json` (from density modifier)

## Advanced Features

### Wildcard Generation

Use `"*"` to generate all possible values for a modifier:

```json
{
  "generate": [
    {
      "theme": "*",        // All themes
      "density": "compact" // With compact density
    }
  ]
}
```

### Filtering

Control which sets contribute to specific outputs:

```json
{
  "generate": [
    {
      "theme": "light",
      "includeSets": ["core"],      // Only core tokens
      "output": "dist/core-light.json"
    },
    {
      "theme": "dark",
      "excludeSets": ["semantic"],  // Exclude semantic layer
      "output": "dist/raw-dark.json"
    }
  ]
}
```

### Default Values

Specify defaults for optional modifiers:

```json
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "default": "light",
      "values": { /* ... */ }
    }
  }
}
```

## Best Practices

### File Organization

Structure token files hierarchically for clarity:

```
tokens/
├── core/               # Foundation tokens
│   ├── colors.json
│   ├── typography.json
│   └── spacing.json
├── semantic/           # Semantic aliases
│   └── base.json
├── themes/            # Theme variations
│   ├── light.json
│   └── dark.json
└── features/          # Optional features
    ├── animations.json
    └── gradients.json
```

### Naming Conventions

Use consistent, descriptive names for modifiers and options:
- Modifiers: `theme`, `density`, `contrast`, `features`
- Options: `light`, `dark`, `comfortable`, `compact`
- Avoid abbreviations that reduce clarity

### Performance Considerations

- Keep individual token files focused and small
- Use `includeSets`/`excludeSets` to reduce bundle sizes
- Consider generating only required permutations rather than all possible combinations

## Migration from Legacy Formats

### From Style Dictionary

```javascript
// Style Dictionary config
{
  source: ["tokens/**/*.json"],
  platforms: {
    web: { /* ... */ }
  }
}

// Equivalent UPFT manifest
{
  "sets": [
    { "values": ["tokens/**/*.json"] }
  ]
}
```

### From Tokens Studio

```javascript
// Tokens Studio sets
{
  global: { /* tokens */ },
  light: { /* tokens */ },
  dark: { /* tokens */ }
}

// Equivalent UPFT manifest
{
  "sets": [
    { "values": ["global.json"] }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["light.json"],
        "dark": ["dark.json"]
      }
    }
  }
}
```

## Validation

Manifests are validated at multiple levels:

1. **Schema Validation**: Structure and required fields
2. **File Existence**: All referenced files must exist
3. **Token Validation**: Token documents must be valid DTCG
4. **Type Consistency**: Merged tokens maintain type safety

Use the CLI to validate:

```bash
upft validate -m manifest.json
```

## Future Extensions

Planned enhancements to the specification:

- **Conditional Dependencies**: Modifiers that require other modifiers
- **Transform Pipelines**: Built-in token transformations
- **Remote Files**: Support for HTTP(S) token sources
- **Composition Inheritance**: Extending base manifests
- **Platform Targets**: Platform-specific generation rules