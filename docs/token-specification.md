# Token Specification

UPFT implements design tokens informed by the Design Tokens Community Group (DTCG) specification. This document describes the token structure, supported types, and best practices for organizing your design token system.

## Token Structure

Every token in UPFT consists of a set of properties that define its value, type, and metadata. The most fundamental properties are `$value` and `$type`, which together specify what the token represents and how it should be interpreted.

```json
{
  "color": {
    "primary": {
      "$value": "#007acc",
      "$type": "color",
      "$description": "Primary brand color"
    }
  }
}
```

The `$value` property contains the actual token data, while `$type` indicates how that data should be interpreted. Optional properties like `$description` provide human-readable documentation, and `$extensions` allows for custom metadata specific to your design system needs.

## Supported Token Types

### Color Tokens

Colors in UPFT use a color module format that explicitly specifies the color space and component values. This approach provides precise color representation across different rendering environments.

```json
{
  "brand": {
    "$value": {
      "colorSpace": "srgb",
      "components": [0, 0.478, 0.8],
      "alpha": 1
    },
    "$type": "color"
  }
}
```

The `components` array contains normalized values (0-1) for the color channels in the specified color space. Multiple color spaces are supported including sRGB, Display P3, LAB, and others.

### Dimension Tokens

Dimensions represent measurements and must use an object format with explicit `value` and `unit` properties. This structure ensures unambiguous interpretation of dimensional values.

```json
{
  "spacing": {
    "small": {
      "$value": {
        "value": 8,
        "unit": "px"
      },
      "$type": "dimension"
    }
  }
}
```

Supported units are `px` and `rem` as specified in the DTCG documentation. The numeric value is kept separate from the unit to facilitate programmatic manipulation and conversion.

### Typography Tokens

Typography tokens compose multiple font-related properties into a single token. This allows you to define complete text styles that can be applied consistently across your design system.

```json
{
  "heading": {
    "$value": {
      "fontFamily": "Inter",
      "fontSize": {
        "value": 24,
        "unit": "px"
      },
      "fontWeight": 700,
      "lineHeight": 1.5,
      "letterSpacing": {
        "value": -0.02,
        "unit": "rem"
      }
    },
    "$type": "typography"
  }
}
```

Note that `fontSize` and `letterSpacing` within typography tokens also use the dimension object format with value and unit properties.

### Additional Token Types

UPFT supports the full range of DTCG token types:

| Type | Purpose | Value Format |
|------|---------|--------------|
| `shadow` | Box shadows and drop shadows | Object with offset, blur, spread, and color |
| `border` | Border definitions | Object with width, style, and color |
| `duration` | Animation and transition timing | String with time unit (ms, s) |
| `cubicBezier` | Easing functions | Array of four numbers [x1, y1, x2, y2] |
| `number` | Unitless numeric values | Number |
| `fontFamily` | Font stack definitions | String or array of strings |
| `fontWeight` | Font weight values | Number (100-900) or keyword string |
| `strokeStyle` | Line style for borders | String (solid, dashed, dotted, etc.) |
| `gradient` | Color gradients | Object with type, angle/position, and stops |
| `transition` | CSS transitions | Object with property, duration, timing, and delay |

## Token References

References allow tokens to derive their values from other tokens, creating relationships and reducing duplication in your token system. UPFT supports both DTCG alias format and JSON Schema reference format.

### DTCG Alias Format

The DTCG format uses curly braces with dot notation to reference other tokens:

```json
{
  "color": {
    "primary": {
      "$value": "#007acc",
      "$type": "color"
    },
    "button": {
      "$value": "{color.primary}",
      "$type": "color"
    }
  }
}
```

This format is intuitive and aligns with the DTCG specification. The reference path uses dots to navigate through the token hierarchy.

### JSON Schema Reference Format

Alternatively, you can use JSON Schema's `$ref` syntax with JSON Pointer notation:

```json
{
  "color": {
    "primary": {
      "$value": "#007acc",
      "$type": "color"
    },
    "button": {
      "$ref": "#/color/primary"
    }
  }
}
```

This format is useful when integrating with systems that already use JSON Schema references. The path uses forward slashes and starts with `#` to indicate a local reference.

## Token Organization

### Hierarchical Groups

Tokens can be organized into hierarchical groups using nested objects. Groups help organize related tokens and can include their own metadata through the `$description` property.

```json
{
  "color": {
    "$description": "All color tokens for the design system",
    "brand": {
      "$description": "Brand-specific colors",
      "primary": {
        "$value": "#007acc",
        "$type": "color"
      }
    },
    "semantic": {
      "$description": "Colors with semantic meaning",
      "error": {
        "$value": "#dc3545",
        "$type": "color"
      }
    }
  }
}
```

### Layered Architecture

A well-organized token system typically follows a three-layer architecture:

1. **Primitive Layer** - Raw, context-free values that form the foundation
2. **Semantic Layer** - Purpose-driven tokens that reference primitives
3. **Component Layer** - Component-specific tokens that reference semantic tokens

This layered approach creates a maintainable hierarchy where changes cascade predictably through the system:

```json
{
  "primitive": {
    "blue-500": { 
      "$value": "#007acc", 
      "$type": "color" 
    }
  },
  "semantic": {
    "action-primary": { 
      "$value": "{primitive.blue-500}", 
      "$type": "color" 
    }
  },
  "component": {
    "button-primary": { 
      "$value": "{semantic.action-primary}", 
      "$type": "color" 
    }
  }
}
```

## Extensions and Custom Metadata

The `$extensions` property allows you to add custom metadata to tokens without conflicting with the standard specification. Extensions must use a reverse domain name format to prevent namespace collisions.

```json
{
  "color": {
    "primary": {
      "$value": "#007acc",
      "$type": "color",
      "$extensions": {
        "com.example.metadata": {
          "category": "brand",
          "wcag": "AA",
          "deprecated": false,
          "createdDate": "2024-01-15",
          "owner": "design-system-team"
        }
      }
    }
  }
}
```

Extensions are preserved through the token processing pipeline and can be used by custom tools and transformations.

## Validation and Error Handling

### Schema Validation

All token documents are validated against JSON Schema definitions that enforce the DTCG structure. Validation errors include the JSON Path to the problematic token and a description of what was expected.

### Reference Resolution

The system detects and reports several types of reference errors:

- **Missing references** - When a token references a non-existent path
- **Circular references** - When tokens create a reference loop
- **Type mismatches** - When a reference points to an incompatible token type

### Best Practices for Error Prevention

To minimize validation and reference errors:

1. **Use consistent naming conventions** - Adopt kebab-case or another standard consistently
2. **Validate early and often** - Run validation as part of your development workflow
3. **Keep references shallow** - Deep reference chains are harder to debug
4. **Document token purposes** - Use `$description` to clarify token intent
5. **Test permutations** - When using the resolver, validate each generated permutation

## Working with Multi-dimensional Tokens

When using the UPFT resolver for multi-dimensional token systems, organize your tokens to support clean composition:

```json
{
  "base": {
    "spacing": {
      "small": { "$value": {"value": 8, "unit": "px"}, "$type": "dimension" }
    }
  },
  "density-compact": {
    "spacing": {
      "small": { "$value": {"value": 6, "unit": "px"}, "$type": "dimension" }
    }
  }
}
```

The resolver will merge these token sets according to your manifest configuration, with later sets overriding earlier ones. This allows you to define base tokens once and create variations through selective overrides.

## Migration and Compatibility

### Importing Existing Tokens

When importing tokens from other systems, you may need to transform them to match UPFT's expected format. Common transformations include:

- Converting string dimensions ("8px") to object format ({"value": 8, "unit": "px"})
- Normalizing color values to the color module format
- Converting legacy reference formats to DTCG aliases

### Exporting for Other Tools

The bundler module can transform tokens for compatibility with other tools. While UPFT uses DTCG-informed formats internally, the bundler's transformation pipeline can convert tokens to match the requirements of your target platforms.

## Performance Considerations

Token documents are parsed into an AST for efficient processing. Keep these performance characteristics in mind:

- **Token count** - Performance scales linearly with the number of tokens
- **Reference depth** - Deeply nested references take longer to resolve
- **File size** - Large token files benefit from the caching layer
- **Permutation count** - Multi-dimensional resolution generates files exponentially

For large token systems, consider splitting tokens across multiple files and using the resolver's manifest system to compose them as needed.