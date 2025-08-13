# UPFT Resolver Specification

Clean, explicit, and predictable token resolution without the confusing parts.

## Overview

The UPFT resolver format provides a way to combine multiple design token files with optional modifiers. It uses JSON Schema terminology and explicit file mappings for maximum clarity.

## Schema

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/resolver/upft.json"
}
```

## Basic Structure

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/resolver/upft.json",
  "name": "Design System Resolver",
  "description": "Main resolver for our design system",

  "sets": [
    { "values": ["tokens/core/colors.json"] },
    { "values": ["tokens/semantic/base.json"] }
  ],

  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark", "high-contrast"],
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"],
        "high-contrast": [
          "tokens/themes/hc.json",
          "tokens/themes/hc-borders.json"
        ]
      }
    },
    "features": {
      "anyOf": ["compact", "animations", "experimental"],
      "values": {
        "compact": ["tokens/features/compact.json"],
        "animations": [
          "tokens/features/animations.json",
          "tokens/features/transitions.json"
        ],
        "experimental": ["tokens/features/experimental.json"]
      }
    }
  },

  "generate": [
    { "theme": "light" },
    { "theme": "dark" },
    { "theme": "dark", "features": ["animations"] },
    {
      "theme": "high-contrast",
      "features": "*",
      "output": "dist/accessible.json"
    }
  ],

  "options": {
    "resolveReferences": false,
    "validation": {
      "mode": "strict"
    }
  }
}
```

## Fields

### `$schema` (optional)

- Schema URL for validation and IDE support
- **Local development**: `"./schemas/resolver-v1.json"`
- **Production**: `"https://tokens.unpunny.fun/schemas/resolver/upft.json"`

### `name` (optional)

Human-readable name for the resolver.

### `description` (optional)

Description of the resolver's purpose.

### `sets` (required)

Array of base token sets that are always included.

```json
{
  "sets": [
    {
      "values": ["tokens/core/colors.json", "tokens/core/spacing.json"],
      "name": "Core tokens"
    },
    {
      "values": ["tokens/semantic/*.json"]
    }
  ]
}
```

Each set has:

- **`values`** (required): Array of file paths or glob patterns
- **`name`** (optional): Human-readable name for documentation

### `modifiers` (required)

Object mapping modifier names to their constraints and file mappings.

#### oneOf Modifiers

Exactly one value must be selected (mutually exclusive choice).

```json
{
  "theme": {
    "oneOf": ["light", "dark", "high-contrast"],
    "values": {
      "light": ["themes/light.json"],
      "dark": ["themes/dark.json"],
      "high-contrast": ["themes/hc.json", "themes/hc-extras.json"]
    }
  }
}
```

- First option is the default if not specified
- Input: `{ "theme": "dark" }`
- Multiple files per option are supported

#### anyOf Modifiers

Zero or more values can be selected (additive features).

```json
{
  "features": {
    "anyOf": ["compact", "animations", "rtl"],
    "values": {
      "compact": ["features/compact.json"],
      "animations": ["features/animations.json", "features/transitions.json"],
      "rtl": ["features/rtl.json"]
    }
  }
}
```

- Input: `{ "features": ["compact", "animations"] }`
- Empty array means no features: `{ "features": [] }`

### `generate` (optional)

Array of specific permutations to generate. If omitted, all possible permutations are generated.

```json
{
  "generate": [
    { "theme": "light", "brand": "product" },
    { "theme": "dark", "brand": "product" },
    { "theme": "dark", "features": "*", "output": "dist/dark-full.json" }
  ]
}
```

Each specification can include:

- Modifier selections
- **`"*"` wildcard**: For anyOf modifiers, includes all options
- **`output`**: Custom output file path

### `options` (optional)

Configuration options.

```json
{
  "options": {
    "resolveReferences": false,
    "validation": {
      "mode": "strict"
    }
  }
}
```

- **`resolveReferences`** (default: false): Whether to resolve `{token.reference}` patterns
- **`validation.mode`** (default: "strict"): Validation strictness

## Resolution Process

1. **Input Validation**: Validate input against modifier constraints
2. **File Collection**: Gather all files (sets + selected modifiers)
3. **DTCG-Aware Merging**: Merge files with type checking and inheritance
4. **Reference Resolution**: Optionally resolve `{token.reference}` patterns
5. **Output Generation**: Create final token document

### Modifier Application Order

Modifiers are applied in the order they appear in the configuration:

```json
{
  "modifiers": {
    "theme": {
      /* applied first */
    },
    "brand": {
      /* applied second */
    },
    "features": {
      /* applied last */
    }
  }
}
```

**Last wins**: If multiple modifiers define the same token, the later modifier overrides the earlier one.

### DTCG-Aware Merging

The resolver performs intelligent merging that understands DTCG token structure:

- **Type inheritance**: `$type` properties are inherited from parent groups
- **Type conflicts**: Error if incompatible types are merged
- **Group vs token conflicts**: Error if trying to merge a group into a token or vice versa
- **Composite type merging**: Deep merge for `shadow`, `typography`, etc.
- **Extension merging**: Deep merge `$extensions` objects

## Input Format

When resolving a specific permutation:

```json
{
  "theme": "dark",
  "brand": "product",
  "features": ["compact", "animations"]
}
```

### Input Validation

- **oneOf**: Must be a single string from the allowed options
- **anyOf**: Must be an array of strings from the allowed options
- **Unknown modifiers**: Rejected
- **Invalid values**: Rejected with clear error messages

## Examples

### Simple Theme Switching

```json
{
  "sets": [{ "values": ["core.json"] }],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["themes/light.json"],
        "dark": ["themes/dark.json"]
      }
    }
  }
}
```

**Usage**:

- `{ "theme": "light" }` → core.json + light.json
- `{ "theme": "dark" }` → core.json + dark.json

### Multi-Dimensional Design System

```json
{
  "sets": [{ "values": ["core/**/*.json"] }],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark", "high-contrast"],
      "values": {
        "light": ["themes/light.json"],
        "dark": ["themes/dark.json"],
        "high-contrast": ["themes/hc.json"]
      }
    },
    "brand": {
      "oneOf": ["consumer", "enterprise"],
      "values": {
        "consumer": ["brands/consumer.json"],
        "enterprise": ["brands/enterprise.json"]
      }
    },
    "features": {
      "anyOf": ["compact", "animations", "mobile"],
      "values": {
        "compact": ["features/compact.json"],
        "animations": ["features/animations.json"],
        "mobile": ["features/mobile.json"]
      }
    }
  },
  "generate": [
    { "theme": "light", "brand": "consumer" },
    { "theme": "dark", "brand": "consumer" },
    { "theme": "light", "brand": "enterprise", "features": ["compact"] },
    { "theme": "dark", "brand": "enterprise", "features": ["compact"] },
    { "theme": "high-contrast", "brand": "consumer", "features": "*" }
  ]
}
```

This generates 5 specific outputs instead of all 3 × 2 × 8 = 48 possible combinations.

## Error Handling

### Validation Errors

```
Invalid input:
  - theme: Invalid value for oneOf modifier (received: "invalid", expected: one of: light, dark)
  - features: anyOf modifier expects an array of strings, got string
```

### Type Conflicts

```
Type conflict: cannot merge token with type "color" and "dimension" at path: button.background
```

### Missing References

```
Reference resolution failed:
  - color.primary: Missing reference {theme.accent}
```

## Migration from V1

The v2 format is backward compatible through format detection:

```typescript
import { isManifestV2, isManifestV1 } from "./types-v2";

if (isManifestV2(config)) {
  // Use v2 resolver
} else if (isManifestV1(config)) {
  // Use v1 resolver
}
```

Key differences:

- **Modifiers**: Object instead of array
- **Terminology**: `oneOf`/`anyOf` instead of "enumerated"/"include"
- **File mapping**: Explicit `values` object
- **No auto-namespacing**: Tokens are exactly as written

## Best Practices

### File Organization

```
tokens/
├── core/
│   ├── colors.json
│   ├── spacing.json
│   └── typography.json
├── themes/
│   ├── light.json
│   ├── dark.json
│   └── high-contrast.json
├── brands/
│   ├── consumer.json
│   └── enterprise.json
└── features/
    ├── compact.json
    ├── animations.json
    └── mobile.json
```

### Token Structure

Keep tokens in logical namespaces within files:

```json
// themes/dark.json
{
  "color": {
    "background": { "$value": "#000000" },
    "foreground": { "$value": "#ffffff" }
  }
}

// Not: automatic namespacing to theme.*
```

### Selective Generation

Use `generate` to avoid creating unused permutations:

```json
{
  "generate": [
    { "theme": "light", "brand": "consumer" },
    { "theme": "dark", "brand": "consumer" },
    // Skip enterprise + dark combination
    { "theme": "light", "brand": "enterprise" }
  ]
}
```

### Wildcard Usage

Use `*` for "all features" scenarios:

```json
{
  "generate": [
    { "theme": "light" }, // No features
    { "theme": "dark", "features": "*" } // All features
  ]
}
```

## Schema Validation

The resolver format includes a JSON Schema for validation:

```bash
# Validate your resolver
npx ajv validate -s resolver-schema.json -d your-resolver.json
```

IDE integration provides:

- Auto-completion for modifier names
- Validation of file paths
- Type checking for options

## Comparison with Official Resolver Spec

| Feature          | Official Spec           | Our V2                    |
| ---------------- | ----------------------- | ------------------------- |
| Terminology      | "enumerated", "include" | `oneOf`, `anyOf`          |
| File mapping     | Arrays with magic       | Explicit `values` object  |
| Auto-namespacing | Yes (confusing)         | No (explicit)             |
| Type checking    | Basic                   | DTCG-aware                |
| Validation       | Loose                   | Strict by default         |
| Generation       | All permutations        | Selective with `generate` |
| Wildcards        | No                      | `*` for anyOf             |

The v2 format prioritizes clarity and predictability over magical convenience.
