# Granular Filtering and Multi-File Generation

UPFT supports granular control over which sets and modifiers are included in each generated output file, with automatic multi-file generation for modifier expansion.

## Basic Filtering Concepts

### Set Filtering
Control which named sets contribute to the output:
```json
{
  "generate": [
    {
      "output": "base-only.json",
      "includeSets": ["base"]
    },
    {
      "output": "without-components.json", 
      "excludeSets": ["components"]
    }
  ]
}
```

### Modifier Filtering
Control which modifiers contribute to the output:
```json
{
  "generate": [
    {
      "output": "theme-only.json",
      "includeModifiers": ["theme:light"],
      "excludeModifiers": ["density"]
    }
  ]
}
```

## Multi-File Generation

When you include a modifier without specifying a value, UPFT automatically generates separate files for each value:

```json
{
  "sets": [
    { "name": "base", "values": ["base.json"] }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["theme-light.json"],
        "dark": ["theme-dark.json"]
      }
    }
  },
  "generate": [
    {
      "output": "tokens.json",
      "includeModifiers": ["theme"]
    }
  ]
}
```

This generates:
- `tokens-light.json` (base + light theme)
- `tokens-dark.json` (base + dark theme)

## File Naming Convention

Generated filenames follow a systematic pattern:
- **oneOf modifiers**: Use specific value name (e.g., "light", "compact")  
- **anyOf modifiers**: Use modifier group name (e.g., "features")
- **Order**: Modifier values appear in the order declared in the generate spec
- **Extension**: Always `.json` regardless of original output filename

### Examples

**Single dimension:**
```json
"includeModifiers": ["theme"]
// → tokens-light.json, tokens-dark.json
```

**Multiple dimensions:**
```json  
"includeModifiers": ["theme", "density"]
// → tokens-light-comfortable.json, tokens-light-compact.json,
//   tokens-dark-comfortable.json, tokens-dark-compact.json
```

**Mixed specific and general:**
```json
"includeModifiers": ["theme", "density:compact"]  
// → tokens-light.json, tokens-dark.json (both with compact density)
```

**anyOf modifiers:**
```json
// All values included
"includeModifiers": ["features"]
// → tokens-features.json

// Some values included  
"includeModifiers": ["features:highcontrast", "features:animations"]
// → tokens-highcontrast-animations.json
```

## Complete Example

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/resolver-upft.json",
  "name": "Design System with Granular Filtering",
  "sets": [
    {
      "name": "base",
      "values": ["tokens/base.json", "tokens/primitives.json"]
    },
    {
      "name": "components", 
      "values": ["tokens/components.json"]
    },
    {
      "name": "patterns",
      "values": ["tokens/patterns.json"]
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/theme-light.json"],
        "dark": ["tokens/theme-dark.json"]
      }
    },
    "density": {
      "oneOf": ["comfortable", "compact"],
      "values": {
        "comfortable": ["tokens/density-comfortable.json"],
        "compact": ["tokens/density-compact.json"]
      }
    },
    "features": {
      "anyOf": ["animations", "reduced-motion", "high-contrast"],
      "values": {
        "animations": ["tokens/animations.json"],
        "reduced-motion": ["tokens/reduced-motion.json"],
        "high-contrast": ["tokens/high-contrast.json"]
      }
    }
  },
  "generate": [
    {
      "output": "dist/base.json",
      "includeSets": ["base"]
    },
    {
      "output": "dist/components.json",
      "includeSets": ["components"]
    },
    {
      "output": "dist/themes.json",
      "includeSets": ["base"],
      "includeModifiers": ["theme"]
    },
    {
      "output": "dist/full.json",
      "includeSets": ["base", "components"],
      "includeModifiers": ["theme", "density"]
    },
    {
      "output": "dist/light-only.json",
      "includeSets": ["*"],
      "includeModifiers": ["theme:light"],
      "excludeModifiers": ["density"]
    },
    {
      "output": "dist/accessible.json",
      "includeSets": ["base"],
      "includeModifiers": ["theme:light", "features:high-contrast"]
    }
  ]
}
```

This configuration generates:

**Single files:**
- `dist/base.json` - Only base sets
- `dist/components.json` - Only components set
- `dist/light-only.json` - All sets + light theme only
- `dist/accessible.json` - Base + light theme + high contrast

**Multi-file expansions:**
- `dist/themes-light.json`, `dist/themes-dark.json` - Base + each theme
- `dist/full-light-comfortable.json`, `dist/full-light-compact.json`, `dist/full-dark-comfortable.json`, `dist/full-dark-compact.json` - All combinations

## Filtering Rules

### Precedence
1. **Exclude takes precedence over include** - If something is in both lists, it's excluded
2. **Specific values override general** - `"theme:light"` is more specific than `"theme"`

### Wildcards
Use `"*"` to include/exclude all items:
```json
{
  "includeSets": ["*"],        // Include all sets
  "excludeModifiers": ["*"]    // Exclude all modifiers
}
```

### Set Requirements
- Sets must have a `name` field to be filterable
- Unnamed sets are included only when no filtering is specified

### Modifier Syntax
- `"modifierName"` - Include all values of this modifier (triggers expansion)
- `"modifierName:value"` - Include only this specific value
- Works with both `oneOf` and `anyOf` modifiers

## Use Cases

### Development vs Production
```json
{
  "generate": [
    {
      "output": "dev/all.json",
      "includeSets": ["*"],
      "includeModifiers": ["*"]
    },
    {
      "output": "prod/base.json", 
      "includeSets": ["base"]
    },
    {
      "output": "prod/themes.json",
      "includeModifiers": ["theme"]
    }
  ]
}
```

### Component Library Distribution
```json
{
  "generate": [
    {
      "output": "dist/foundation.json",
      "includeSets": ["base", "primitives"]
    },
    {
      "output": "dist/components.json", 
      "includeSets": ["components"],
      "includeModifiers": ["theme"]
    }
  ]
}
```

### A/B Testing
```json
{
  "generate": [
    {
      "output": "experiments/variant-a.json",
      "includeSets": ["base"],
      "includeModifiers": ["theme:light", "experiment:variant-a"]
    },
    {
      "output": "experiments/variant-b.json",
      "includeSets": ["base"], 
      "includeModifiers": ["theme:light", "experiment:variant-b"]
    }
  ]
}
```

This granular filtering system provides precise control over token composition while maintaining the simplicity of the existing UPFT workflow.