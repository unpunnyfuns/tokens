# Examples

Collection of sample token files, manifest configurations, and test fixtures demonstrating best practices and patterns. This directory serves as both documentation through working examples and a test suite foundation, providing templates for common use cases.

## Table of Contents

- [Overview](#overview)
- [Structure](#structure)
- [Token File Examples](#token-file-examples)
- [Resolver Manifest Examples](#resolver-manifest-examples)
- [Usage Patterns](#usage-patterns)
- [Testing with Examples](#testing-with-examples)

## Overview

The examples directory serves as a living documentation of the token platform's capabilities. Each example is carefully crafted to demonstrate specific features while remaining practical and applicable to real-world scenarios. These examples are actively used in the test suite, ensuring they remain accurate and functional as the platform evolves.

The collection is organized into logical categories that progress from simple demonstrations to multi-dimensional token systems. This structure allows developers to start with basic concepts and explore features as needed.

## Structure

### Token Files
- **test-fixtures/** - Simple token files for testing
  - basic-tokens.json - Minimal token examples
  - simple-color.json - Color token demonstrations
  - tokens-with-references.json - Reference patterns

### Resolver Manifests
- **test-scenarios/** - Resolver configuration examples
  - simple.manifest.json - Basic theme switching
  - density-variants.manifest.json - Density modifiers
  - group-mode.manifest.json - Complex grouping

### Output Examples
- **output/** - Generated bundle examples
  - bundle.json - Sample bundled output

### Configuration Examples
- **complete-resolver.json** - Complete resolver example
- **selective-resolution-demo.json** - Selective generation patterns
- **error-cases/** - Invalid tokens for testing
  - legacy-color-formats.json - Outdated color syntax

## Purpose

These examples serve multiple purposes:
- Documentation through working examples
- Test fixtures for unit tests
- Templates for new projects
- Validation of schema changes
- Performance benchmarking

## Token File Examples

### Basic Structure
Demonstrates fundamental token structure:
```json
{
  "color": {
    "primary": {
      "$value": "#007acc",
      "$type": "color"
    }
  }
}
```

### Reference Patterns
Shows various reference techniques:
```json
{
  "base": {
    "color": { "$value": "#007acc" }
  },
  "semantic": {
    "primary": { "$value": "{base.color}" }
  }
}
```

### Complex Types
Examples of composite token types:
```json
{
  "typography": {
    "heading": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Inter",
        "fontSize": "24px",
        "fontWeight": 700,
        "lineHeight": 1.5
      }
    }
  }
}
```

## Resolver Manifest Examples

### Simple Theme Switching
Basic light/dark theme setup:
```json
{
  "files": {
    "base": "./base.json",
    "light": "./light.json",
    "dark": "./dark.json"
  },
  "oneOf": {
    "theme": ["light", "dark"]
  }
}
```

### Multi-dimensional Resolution
Complex modifier combinations:
```json
{
  "oneOf": {
    "theme": ["light", "dark"],
    "density": ["compact", "comfortable", "spacious"]
  },
  "anyOf": {
    "features": ["animations", "gradients"]
  }
}
```

### Selective Generation
Build only specific combinations:
```json
{
  "sets": [
    {
      "name": "production",
      "modifiers": { "theme": "light" },
      "generate": true
    },
    {
      "name": "experimental",
      "modifiers": { "theme": "dark" },
      "generate": false
    }
  ]
}
```

## Usage Patterns

### Testing
Examples are used in unit tests:
```typescript
import tokens from './examples/test-fixtures/basic-tokens.json';
// Test validation, parsing, etc.
```

### Documentation
Referenced in documentation:
```markdown
See `examples/complete-resolver.json` for a full example
```

### Templates
Starting points for new projects:
```bash
cp examples/test-scenarios/simple.manifest.json my-resolver.json
```

## Error Cases

The error-cases directory contains intentionally invalid tokens for:
- Testing error handling
- Validating error messages
- Regression testing
- Documentation of common mistakes

Example invalid token:
```json
{
  "color": {
    "invalid": {
      "$value": "not-a-color"
    }
  }
}
```

## Best Practices Demonstrated

### Organization
- Logical grouping of related tokens
- Clear naming hierarchies
- Separation of concerns

### References
- Avoiding circular dependencies
- Meaningful reference paths
- Proper aliasing patterns

### Modifiers
- Orthogonal modifier design
- Clear modifier semantics
- Efficient combination strategies

## Maintenance

Examples are maintained to:
- Stay current with specification changes
- Reflect real-world usage patterns
- Cover edge cases
- Demonstrate new features

## Future Considerations

- **Interactive examples** - Web-based playground
- **Example generator** - Create examples from schemas
- **Example validation** - Automated testing of examples
- **Real-world examples** - Production system samples
- **Migration examples** - Converting from other formats
- **Integration examples** - Framework-specific usage
- **Performance examples** - Large-scale token systems
- **Accessibility examples** - WCAG-compliant tokens
- **Platform examples** - iOS, Android, Web specific
- **Tool examples** - Integration with design tools