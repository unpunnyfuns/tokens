# DTCG Token Specification

UPFT implements the Design Tokens Community Group (DTCG) specification for portable design system foundations. This document provides comprehensive guidance on token structure, type system, organization patterns, and validation requirements for building maintainable token systems.

## Token Structure

The DTCG specification defines a consistent structure for design tokens that ensures portability across tools and platforms. Each token comprises a set of properties that define its value, type, and associated metadata. The fundamental properties `$value` and `$type` establish the token's content and interpretation, while optional properties provide documentation, custom data, and deprecation notices.

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

The property system follows a clear hierarchy: `$value` contains the token's actual data in a type-specific format, `$type` declares how to interpret that data according to DTCG type definitions, `$description` provides human-readable documentation for designers and developers, and `$extensions` enables custom metadata through namespaced properties. This structure ensures tokens remain self-documenting and tool-agnostic while supporting platform-specific requirements.

## Supported Token Types

### Color Tokens

Color tokens follow the DTCG color module format, which provides precise color representation through explicit color space specification and normalized component values. This approach ensures accurate color reproduction across different rendering environments, from sRGB displays to wide-gamut P3 screens, while maintaining consistency in color transformations and conversions.

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

The `components` array contains normalized values (0-1) representing the color channels in the specified color space, ensuring consistent mathematical operations across different color models. The specification supports multiple color spaces including sRGB for web standards, Display P3 for modern displays, LAB for perceptual uniformity, LCH for intuitive color manipulation, and additional spaces for specialized workflows. The alpha channel, when present, controls transparency with the same 0-1 normalization.

### Dimension Tokens

Dimension tokens encode measurements through a structured object format that separates numeric values from their units. This explicit separation eliminates ambiguity in dimensional values and enables programmatic unit conversion, responsive scaling, and platform-specific transformations. The structure supports both absolute units for fixed measurements and relative units for fluid designs.

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

The DTCG specification defines supported units as `px` for pixel-based measurements and `rem` for relative sizing based on root font size. The separation of numeric value from unit string enables mathematical operations on dimensions, automated unit conversion between px and rem based on root font size, consistent rounding strategies for sub-pixel values, and platform-specific unit transformations for iOS points or Android dp.

### Typography Tokens

Typography tokens encapsulate complete text styles by composing multiple font-related properties into cohesive units. This composite approach ensures consistent typography application across platforms while maintaining the flexibility to override individual properties when needed. Typography tokens serve as the foundation for establishing visual hierarchy, readability, and brand expression through text.

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

The typography token structure maintains consistency with other token types: `fontSize` and `letterSpacing` use the standard dimension object format, `fontWeight` accepts numeric values (100-900) or keyword strings, `lineHeight` can be unitless multipliers or dimension objects, and `fontFamily` supports single fonts or fallback stacks. This uniformity simplifies token processing and ensures predictable behavior across different properties.

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

Token references establish relationships between tokens, enabling systematic design decisions to cascade through the token hierarchy. This referential system reduces duplication, enforces consistency, and creates traceable connections between primitive values and their semantic applications. UPFT implements both the DTCG alias syntax for intuitive token references and JSON Schema `$ref` format for compatibility with existing tooling.

### DTCG Alias Format

The DTCG alias format provides an intuitive syntax for token references using curly braces to denote references and dot notation for path traversal. This format aligns with the official DTCG specification and offers clear visual distinction between literal values and references:

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

The alias resolution process traverses the token tree using the dot-separated path, validates that the target token exists and has a compatible type, resolves nested references recursively with circular reference detection, and maintains the reference chain for debugging and documentation. This approach ensures type safety while providing flexibility in token organization.

### JSON Schema Reference Format

The JSON Schema reference format offers an alternative syntax using the established `$ref` convention with JSON Pointer notation. This format provides compatibility with JSON Schema tooling and follows RFC 6901 for path resolution:

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

JSON Schema references excel in scenarios requiring integration with existing JSON Schema infrastructure, validation against JSON Schema definitions, cross-file references using URIs, and standardized tooling support. The format uses `#` for document-relative references, forward slashes for path segments, and RFC 6901 escaping rules for special characters in property names.

## Token Organization

### Hierarchical Groups

Hierarchical organization structures tokens into logical groups that reflect their purpose and relationships. This nested object approach creates navigable token trees where each level can contain its own metadata, documentation, and type definitions. Groups establish clear boundaries between different aspects of the design system while maintaining flexibility for cross-group references.

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

Successful token systems implement a layered architecture that separates concerns and creates clear abstraction boundaries. This three-tier approach establishes a foundation of reusable primitives, builds semantic meaning through purposeful aliases, and provides component-specific customization while maintaining system coherence.

The **Primitive Layer** contains raw, context-free values that form the foundation of the design system. These tokens represent pure values without semantic meaning: color palettes, type scales, spacing units, and duration values. Primitives remain stable across themes and contexts.

The **Semantic Layer** assigns meaning to primitive values through purposeful references. These tokens communicate intent rather than appearance: action colors, text hierarchies, surface elevations, and interactive states. Semantic tokens adapt to different contexts while maintaining consistent meaning.

The **Component Layer** provides fine-grained control over specific UI elements. These tokens reference semantic values by default but can override them for unique component requirements. This layer balances system consistency with component flexibility.

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

The `$extensions` property provides a standardized mechanism for adding custom metadata to tokens while maintaining specification compliance. This extensibility ensures that platform-specific requirements, tooling integration, and organizational needs can be addressed without fragmenting the core token format. Extensions follow a reverse domain name convention to prevent namespace collisions and ensure clear ownership of custom properties.

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

The extension system supports diverse use cases: accessibility annotations for WCAG compliance levels, platform-specific hints for iOS or Android rendering, deprecation notices with migration paths, design tool metadata for Figma or Sketch integration, and analytics tracking for token usage patterns. Extensions remain intact through the processing pipeline, enabling custom transformations and tool-specific optimizations while preserving the portability of core token data.

## Validation and Error Handling

### Schema Validation

Comprehensive validation ensures token documents conform to DTCG specifications and maintain internal consistency. The validation system employs JSON Schema definitions for structural validation, type checking for value formats, and reference resolution for alias integrity. Each validation error provides actionable feedback including the JSON Path to the problematic token, expected format or type, actual value encountered, and suggested corrections when applicable.

### Reference Resolution

The reference resolution system implements comprehensive error detection to prevent runtime failures and maintain token integrity. The validator identifies multiple categories of reference problems with detailed diagnostics.

**Missing references** occur when tokens reference non-existent paths. The system reports the referencing token, attempted reference path, and nearest valid paths for correction.

**Circular references** create infinite loops during resolution. The validator detects these cycles, reports the complete reference chain, and identifies the token creating the loop.

**Type mismatches** happen when references cross incompatible types. The system validates type compatibility, reports the expected versus actual types, and suggests type-appropriate alternatives.

### Best Practices for Error Prevention

Proactive validation strategies prevent errors from propagating through the token system and improve maintainability.

**Establish naming conventions** early in the project. Consistent patterns like kebab-case for token names, hierarchical paths for organization, and semantic prefixes for token types reduce cognitive load and prevent typos. Document these conventions and enforce them through linting.

**Integrate validation into development workflows** through pre-commit hooks, continuous integration checks, and IDE extensions. Early detection of validation errors prevents broken tokens from entering the codebase and reduces debugging time.

**Design shallow reference hierarchies** that balance reusability with clarity. While deep reference chains provide flexibility, they complicate debugging and increase resolution overhead. Limit reference depth to three levels for optimal maintainability.

**Document token intent and constraints** using `$description` fields. Clear documentation helps designers and developers understand appropriate token usage, prevents misapplication, and facilitates onboarding. Include usage examples and anti-patterns in descriptions.

**Test all permutations and edge cases** when using multi-dimensional resolution. Validate that each generated combination produces valid tokens, maintains type consistency, and preserves semantic meaning across different contexts.

## Working with Multi-dimensional Tokens

Multi-dimensional token systems enable sophisticated design systems that adapt to different themes, densities, platforms, and feature sets. The UPFT resolver manages these dimensions through explicit manifests that define how token sets compose and override each other. Successful multi-dimensional systems require careful organization to ensure predictable composition and maintainable overrides.

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

The resolution process follows a deterministic merge strategy where base sets establish foundations, modifiers apply dimensional variations, and later values override earlier ones in the composition order. This approach enables incremental refinement of token values while preserving the overall structure. The manifest configuration explicitly controls the merge sequence, ensuring reproducible results across different environments and build processes.

## Migration and Compatibility

### Importing Existing Tokens

Migrating tokens from legacy systems requires systematic transformation to align with DTCG specifications. The migration process preserves design decisions while updating format structures to ensure compatibility.

**Dimension transformations** convert string-based dimensions like "8px" or "1.5rem" into structured objects with separate value and unit properties. This transformation enables unit conversion and mathematical operations on dimensional values.

**Color normalization** transforms various color formats (hex, RGB, HSL) into the color module format with explicit color space and normalized components. This ensures color accuracy and enables advanced color operations.

**Reference migration** updates proprietary reference syntaxes to DTCG alias format or JSON Schema references. The migration maintains reference relationships while adopting standard syntax.

### Exporting for Other Tools

The bundler's transformation pipeline enables bidirectional compatibility with various design tools and development platforms. While UPFT maintains DTCG-compliant formats internally, export transformations adapt tokens to platform-specific requirements without losing fidelity.

Transformation capabilities include format conversion for different platforms, value transformation for unit systems, structure flattening for tools requiring single-level tokens, and metadata preservation through appropriate channels. The transformation pipeline maintains a clear separation between internal representation and external formats, ensuring that tokens remain portable while supporting platform-specific optimizations.

## Performance Considerations

Efficient token processing requires understanding the performance characteristics of different operations and organizing tokens accordingly. The system employs multiple optimization strategies to handle large-scale token systems effectively.

**Token parsing and AST generation** provides efficient traversal and transformation of token documents. The AST representation enables rapid lookups, selective updates, and incremental processing. Performance scales linearly with token count, making large systems predictable.

**Reference resolution complexity** increases with reference depth and breadth. Shallow reference hierarchies resolve faster than deeply nested chains. The system implements memoization to cache resolved values and prevent redundant resolution cycles.

**File organization impacts** both build time and runtime performance. Splitting tokens into focused files improves caching efficiency, enables modular processing, and reduces memory footprint. The manifest system orchestrates file composition without requiring monolithic token documents.

**Multi-dimensional permutations** can generate exponential outputs. Each additional dimension multiplies the number of possible combinations. Use explicit generation rules in manifests to produce only required permutations rather than exhaustive combinations.

**Optimization strategies** for production systems include implementing file-based caching for parsed tokens, using incremental builds for changed files only, optimizing permutation generation order, and lazy-loading tokens for runtime applications. These techniques ensure that token systems remain performant as they scale from hundreds to thousands of tokens across multiple dimensions.