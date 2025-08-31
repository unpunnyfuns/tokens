# Token Examples

This directory contains example token files demonstrating various features and patterns of the UPFT token system.

## File Structure

### Core Examples

- **full-example.json** - Simple, complete example using the full schema with basic token types
- **reference-patterns.json** - Demonstrates both DTCG alias `{ref}` and JSON Schema `$ref` reference patterns

### Color Examples  

- **color-spaces.json** - Comprehensive examples of all supported color spaces (sRGB, Display-P3, LAB, etc.)
- **advanced-colors.json** - Advanced color spaces like sRGB-linear and CIE XYZ with D65/D50 illuminants

### Composite Token Types

- **composite-tokens.json** - Examples of composite types: transitions, animations, borders, gradients, stroke styles
- **shadows.json** - Comprehensive shadow examples including single shadows and multi-layer shadow effects

### Token Architecture Layers

Demonstrates the three-layer token architecture pattern:

- **primitives/** - Raw, context-free design values
  - colors.json - Base color palette
  - dimensions.json - Spacing and sizing scale
  - typography.json - Font stacks and type scales
  - borders.json - Border definitions

- **semantic/** - Purpose-driven tokens that reference primitives
  - colors.json - Semantic color roles (primary, error, etc.)
  - spacing.json - Semantic spacing (page-margin, card-padding, etc.)
  - typography.json - Semantic type roles (heading, body, caption)

- **components/** - Component-specific tokens referencing semantic layer
  - button.json - Button component tokens
  - card.json - Card component tokens

### Theme Variations

- **themes/** - Theme-specific overrides
  - light.json - Light theme tokens
  - dark.json - Dark theme tokens

- **modes/** - Mode-specific variations
  - high-contrast.json - High contrast mode overrides

## Reference Patterns

The examples demonstrate two ways to reference other tokens:

1. **DTCG Alias Format**: `"$value": "{primitives.colors.blue}"`
2. **JSON Schema Format**: `"$value": { "$ref": "../primitives/colors.json#/blue/500" }`

## Validation

All examples can be validated using:

```bash
upft validate -d src/examples/tokens
```

Individual files can be validated with:

```bash
upft validate -f src/examples/tokens/full-example.json
```