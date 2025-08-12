# Design Token Schemas

This directory contains JSON Schema definitions for validating DTCG-style design tokens. These schemas follow the Design Tokens Community Group proposals and discussions, providing a practical implementation while the official specification is still in development.

## Schema Types

### 1. Strict Type Validation: `tokens/full.schema.json`
**Use this for:** Production systems that need to ensure tokens conform to specific types.

- ✅ Validates token structure (must have `$value` or `$ref`)
- ✅ Validates type-specific constraints (e.g., colors must be objects with colorSpace)
- ✅ Only allows known token types (color, dimension, typography, etc.)
- ❌ Rejects unknown token types

Example: A color token with `$value: "#ff0000"` will **fail** because colors must be objects with `colorSpace` and `components`.

### 2. Structure Validation: `tokens/base.schema.json`
**Use this for:** Systems that need to validate token structure but support custom/experimental token types.

- ✅ Validates token structure (must have `$value` or `$ref`)
- ✅ Accepts any value type for `$value`
- ✅ Allows any `$type` value
- ❌ Does not validate type-specific constraints

Example: A color token with `$value: "#ff0000"` will **pass** because it has valid token structure.

### 3. Custom Validation: Compose Your Own
**Use this for:** Systems with specific validation needs.

The schemas are modular. You can create your own `full.schema.json` by:
1. Starting with the structure from `full.schema.json`
2. Including only the type schemas you need from `types/`
3. Adding your own custom type definitions

Example custom schema:
```json
{
  "$defs": {
    "groupOrToken": {
      "anyOf": [
        { "$ref": "./types/color.schema.json" },
        { "$ref": "./types/dimension.schema.json" },
        { "$ref": "./my-custom-type.schema.json" },
        { "$ref": "#/$defs/group" }
      ]
    }
  }
}
```

## Individual Type Schemas

The `types/` directory contains strict validation schemas for each token type:
- `color.schema.json` - Color tokens with color space definitions
- `dimension.schema.json` - Size/spacing tokens with units
- `typography.schema.json` - Typography composite tokens
- And more...

Each type schema can be used independently or composed into a full schema.

## Resolver Schema

`resolver.schema.json` defines the structure for resolver manifests, which specify how to compose tokens across themes and modes.

## Usage

### With the CLI
```bash
# Strict validation (default)
upft validate ./tokens

# Structure validation only
# (modify your token files to reference base.schema.json)
```

### In Your Token Files
```json
{
  "$schema": "../schemas/tokens/full.schema.json",
  "colors": {
    "primary": {
      "$type": "color",
      "$value": {
        "colorSpace": "srgb",
        "components": [0, 0.5, 1],
        "alpha": 1
      }
    }
  }
}
```

## Migration Guide

If you were using the previous schema that included `genericToken`:
1. For strict validation: Update to use `full.schema.json` (now strict by default)
2. For permissive validation: Switch to `base.schema.json`
3. For mixed needs: Create a custom schema composition