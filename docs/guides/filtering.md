# Token Filtering Guide

Control which tokens are included in generated bundles through set-based and modifier-based filtering.

## Overview

Filtering allows you to create targeted token bundles that include only the tokens needed for specific use cases. This reduces bundle sizes and improves performance by shipping only relevant tokens to each platform or component.

## Set-Based Filtering

Control which base token sets contribute to the output using `includeSets` and `excludeSets`:

### Include Specific Sets

```json
{
  "sets": [
    { "name": "core", "values": ["tokens/core.json"] },
    { "name": "semantic", "values": ["tokens/semantic.json"] },
    { "name": "components", "values": ["tokens/components.json"] }
  ],
  "generate": [
    {
      "theme": "light",
      "includeSets": ["core", "semantic"],  // Only core and semantic
      "output": "dist/foundation-light.json"
    }
  ]
}
```

### Exclude Specific Sets

```json
{
  "generate": [
    {
      "theme": "dark",
      "excludeSets": ["components"],  // Everything except components
      "output": "dist/no-components-dark.json"
    }
  ]
}
```

## Modifier-Based Generation

### Generate All Values

Use wildcards to generate all possible values for a modifier:

```json
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark", "high-contrast"],
      "values": { /* ... */ }
    }
  },
  "generate": [
    {
      "theme": "*",  // Generates light, dark, and high-contrast
      "output": "dist/all-themes.json"
    }
  ]
}
```

### Partial Modifier Selection

For `anyOf` modifiers, specify which features to include:

```json
{
  "modifiers": {
    "features": {
      "anyOf": ["animations", "gradients", "shadows"],
      "values": { /* ... */ }
    }
  },
  "generate": [
    {
      "theme": "light",
      "features": ["animations", "shadows"],  // Only these features
      "output": "dist/light-animated-shadows.json"
    }
  ]
}
```

## Advanced Filtering Patterns

### Platform-Specific Bundles

Create different bundles for different platforms:

```json
{
  "sets": [
    { "name": "core", "values": ["tokens/core.json"] },
    { "name": "web", "values": ["tokens/platforms/web.json"] },
    { "name": "mobile", "values": ["tokens/platforms/mobile.json"] }
  ],
  "generate": [
    {
      "theme": "light",
      "includeSets": ["core", "web"],
      "output": "dist/web-light.json"
    },
    {
      "theme": "light", 
      "includeSets": ["core", "mobile"],
      "output": "dist/mobile-light.json"
    }
  ]
}
```

### Component-Specific Tokens

Extract tokens for individual components:

```json
{
  "sets": [
    { "name": "button", "values": ["tokens/components/button.json"] },
    { "name": "card", "values": ["tokens/components/card.json"] },
    { "name": "modal", "values": ["tokens/components/modal.json"] }
  ],
  "generate": [
    {
      "theme": "light",
      "includeSets": ["button"],
      "output": "dist/button-light.json"
    }
  ]
}
```

### Layered Token Architecture

Build layered outputs that progressively add tokens:

```json
{
  "sets": [
    { "name": "primitives", "values": ["tokens/00-primitives.json"] },
    { "name": "semantic", "values": ["tokens/01-semantic.json"] },
    { "name": "components", "values": ["tokens/02-components.json"] }
  ],
  "generate": [
    {
      "includeSets": ["primitives"],
      "output": "dist/layer-0-primitives.json"
    },
    {
      "includeSets": ["primitives", "semantic"],
      "output": "dist/layer-1-semantic.json"
    },
    {
      "includeSets": ["primitives", "semantic", "components"],
      "output": "dist/layer-2-complete.json"
    }
  ]
}
```

## Multi-File Generation

When modifiers are included without specific values, multiple files are generated:

### Automatic File Naming

```json
{
  "generate": [
    {
      "theme": "*",
      "density": "*",
      "output": "dist/tokens.json"
    }
  ]
}
```

This generates:
- `dist/tokens-light-comfortable.json`
- `dist/tokens-light-compact.json`
- `dist/tokens-dark-comfortable.json`
- `dist/tokens-dark-compact.json`

### Mixed Specific and Wildcard

```json
{
  "generate": [
    {
      "theme": "dark",      // Specific theme
      "density": "*",        // All densities
      "features": ["animations"],  // Specific feature
      "output": "dist/dark-animated.json"
    }
  ]
}
```

This generates:
- `dist/dark-animated-comfortable.json`
- `dist/dark-animated-compact.json`

## Filtering Best Practices

### 1. Start Broad, Then Narrow

Begin with all tokens and progressively filter down:

```json
{
  "generate": [
    // Everything
    { "output": "dist/all.json" },
    
    // Without experimental
    { "excludeSets": ["experimental"], "output": "dist/stable.json" },
    
    // Only core
    { "includeSets": ["core"], "output": "dist/core.json" }
  ]
}
```

### 2. Use Semantic Set Names

Name sets based on their purpose, not their content:

```json
{
  "sets": [
    { "name": "foundation", "values": ["tokens/colors.json", "tokens/spacing.json"] },
    { "name": "interaction", "values": ["tokens/states.json", "tokens/motion.json"] },
    { "name": "content", "values": ["tokens/typography.json", "tokens/icons.json"] }
  ]
}
```

### 3. Document Filter Rationale

Add descriptions to explain filtering decisions:

```json
{
  "generate": [
    {
      "description": "Minimal bundle for email templates",
      "includeSets": ["core", "typography"],
      "excludeSets": ["animations", "interactions"],
      "output": "dist/email.json"
    }
  ]
}
```

### 4. Test Filter Combinations

Validate that filtered outputs contain expected tokens:

```bash
# Generate filtered bundles
upft bundle manifest.json

# Verify token counts
upft info dist/filtered.json

# Compare bundles
upft diff dist/full.json dist/filtered.json
```

## Common Filtering Scenarios

### White-Label Products

```json
{
  "sets": [
    { "name": "structure", "values": ["tokens/structure.json"] },
    { "name": "brand-a", "values": ["tokens/brands/a.json"] },
    { "name": "brand-b", "values": ["tokens/brands/b.json"] }
  ],
  "generate": [
    {
      "includeSets": ["structure", "brand-a"],
      "output": "dist/brand-a.json"
    },
    {
      "includeSets": ["structure", "brand-b"],
      "output": "dist/brand-b.json"
    }
  ]
}
```

### Progressive Enhancement

```json
{
  "modifiers": {
    "capability": {
      "anyOf": ["base", "enhanced", "premium"],
      "values": {
        "base": ["tokens/capabilities/base.json"],
        "enhanced": ["tokens/capabilities/enhanced.json"],
        "premium": ["tokens/capabilities/premium.json"]
      }
    }
  },
  "generate": [
    { "capability": ["base"], "output": "dist/basic.json" },
    { "capability": ["base", "enhanced"], "output": "dist/standard.json" },
    { "capability": ["base", "enhanced", "premium"], "output": "dist/full.json" }
  ]
}
```

### A/B Testing

```json
{
  "modifiers": {
    "experiment": {
      "oneOf": ["control", "variant-a", "variant-b"],
      "values": {
        "control": ["tokens/experiments/control.json"],
        "variant-a": ["tokens/experiments/variant-a.json"],
        "variant-b": ["tokens/experiments/variant-b.json"]
      }
    }
  },
  "generate": [
    { "experiment": "*", "output": "dist/experiment.json" }
  ]
}
```

## Performance Considerations

### Bundle Size Impact

Filtering directly impacts bundle sizes:

| Strategy | Typical Size Reduction |
|----------|----------------------|
| Exclude component tokens | 40-60% |
| Include only core tokens | 70-80% |
| Platform-specific bundles | 30-50% |
| Feature flag filtering | 20-40% |

### Build Time Optimization

- Generate only required permutations
- Use `includeSets` for faster processing
- Cache filtered results during development
- Optimize generation order for efficiency

### Runtime Performance

Smaller bundles mean:
- Faster network transfers
- Reduced parsing time
- Lower memory usage
- Improved cache efficiency

## Debugging Filters

### Verify Filter Results

```bash
# List tokens in filtered bundle
upft list dist/filtered.json

# Compare with unfiltered
upft diff dist/full.json dist/filtered.json

# Check specific token presence
upft list dist/filtered.json --type color | grep primary
```

### Common Issues

**Missing Tokens**: Check that required sets are included and not accidentally excluded.

**Unexpected Tokens**: Verify exclude filters are correctly specified and modifier values are accurate.

**Empty Bundles**: Ensure at least one set or modifier contributes tokens to the output.

**Wrong Merge Order**: Remember that later files override earlier ones in the merge sequence.