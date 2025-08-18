# Schemas

JSON Schema definitions providing the validation foundation for DTCG-compliant tokens and UPFT manifest specifications. This directory contains modular, composable schemas that enable both strict type validation for production systems and flexible validation for experimental token types, supporting the evolution of design token standards while maintaining backward compatibility.

## Table of Contents

- [Overview](#overview)
- [Schema Types](#schema-types)
- [Individual Type Schemas](#individual-type-schemas)
- [Resolver Schema](#resolver-schema)
- [Usage](#usage)
- [Design Decisions](#design-decisions)
- [Migration Guide](#migration-guide)

## Overview

The schemas directory represents a carefully designed validation architecture that balances strictness with flexibility. The modular approach allows teams to choose their validation strategy based on their maturity and requirements, from experimental prototyping to production systems requiring strict type safety.

The schema architecture reflects a key design principle: validation should be composable. Rather than providing a monolithic schema that tries to handle all cases, the system provides building blocks that can be assembled to meet specific needs. This approach supports both the standardization goals of the DTCG specification and the innovation needs of teams pushing the boundaries of design tokens.

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

`manifest.schema.json` defines the structure for resolver manifests, which specify how to compose tokens across themes and modes.

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

## Design Decisions

### Modular Schema Architecture

The decision to split schemas into modular components rather than maintaining a single monolithic schema was driven by several factors. First, it allows teams to compose exactly the validation they need without being forced into an all-or-nothing approach. Second, it enables the community to extend the schemas with custom token types while still benefiting from the standard type definitions. Third, it makes the schemas themselves more maintainable, with each type definition isolated and testable independently.

### Strict vs Permissive Validation

The platform provides both strict (`full.schema.json`) and permissive (`base.schema.json`) validation modes to support different use cases. Strict validation ensures complete DTCG compliance, which is essential for interoperability and tooling compatibility. Permissive validation allows experimentation with new token types and gradual migration from legacy formats. This dual approach recognizes that design token adoption is a journey, not a destination.

### Type-Specific Constraints

Each token type has its own schema file with specific validation rules. For example, color tokens must specify a color space and components array rather than a simple hex string. While this adds complexity, it ensures that tokens contain sufficient information for accurate transformation across different platforms and color spaces. This decision prioritizes correctness and portability over simplicity.

### Reference Validation

The schemas validate reference syntax but not reference resolution. This separation of concerns keeps the schemas focused on structural validation while allowing the references module to handle the complex logic of resolving and validating reference targets. This architectural boundary ensures that schema validation remains fast and predictable.

## Migration Guide

If you were using the previous schema that included `genericToken`:
1. For strict validation: Update to use `full.schema.json` (now strict by default)
2. For permissive validation: Switch to `base.schema.json`
3. For mixed needs: Create a custom schema composition