# DTCG Resolver Examples

W3C DTCG (Design Tokens Community Group) resolver format examples demonstrating various features and capabilities.

## Structure

| File | Purpose |
|------|---------|
| `simple-dtcg.json` | Minimal DTCG resolver with single token set |
| `dtcg-resolver.json` | Basic example with sets, modifiers, and extensions |
| `dtcg-enumerated-modifiers.json` | Enumerated modifiers with theme and density variations |
| `dtcg-include-modifiers.json` | Include modifiers for conditional token sets |
| `dtcg-inline-tokens.json` | Inline token definitions with type specifications |
| `dtcg-complex-extensions.json` | Advanced extensions and metadata usage |
| `dtcg-mixed-features.json` | Comprehensive example combining all features |

## Features Demonstrated

### Basic Structure
- Required `version` field (user-defined version, not specification version)
- Required `sets` array with token references
- Optional `name` and `description` fields
- Optional `$extensions` for arbitrary metadata

### Token Sets
```json
{
  "sets": [
    {
      "source": "path/to/tokens.json",
      "description": "External token file"
    },
    {
      "tokens": {
        "color": {
          "primary": {
            "$type": "color",
            "$value": "#0066cc"
          }
        }
      },
      "namespace": "inline",
      "description": "Inline token definitions"
    }
  ]
}
```

### Enumerated Modifiers
Choose exactly one value from predefined options:
```json
{
  "name": "theme",
  "type": "enumerated",
  "values": ["light", "dark"],
  "sets": {
    "light": [{"source": "light.json"}],
    "dark": [{"source": "dark.json"}]
  }
}
```

### Include Modifiers  
Conditionally include additional token sets:
```json
{
  "name": "platform",
  "type": "include",
  "include": [
    {"source": "web.json"},
    {"source": "mobile.json"}
  ]
}
```

### Extensions
Arbitrary metadata for tooling and documentation:
```json
{
  "$extensions": {
    "build": {
      "targets": ["css", "js"],
      "prefix": "dt"
    },
    "design": {
      "figmaFileId": "abc123"
    }
  }
}
```

## Usage Examples

### Simple Resolution
```typescript
import { parseManifest } from "@upft/manifest";
import simpleDtcg from "./simple-dtcg.json";

const ast = parseManifest(simpleDtcg, "simple-dtcg.json");
console.log(ast.manifestType); // "dtcg"
console.log(ast.sets.size); // 1
```

### Complex Resolution
```typescript
import mixedFeatures from "./dtcg-mixed-features.json";

const ast = parseManifest(mixedFeatures);
console.log(ast.modifiers.size); // 4 modifiers
console.log(ast.modifiers.get("theme")?.constraintType); // "oneOf"  
console.log(ast.modifiers.get("platform")?.constraintType); // "anyOf"
```

## Validation

All examples pass DTCG resolver validation:
```typescript
import { validateManifestWithRegistry } from "@upft/manifest";

const result = validateManifestWithRegistry(manifest);
console.log(result.valid); // true
```

## Integration Testing

Test resolver detection and parsing:
```bash
cd libs/manifest
npm test -- --grep "DTCG"
```

Run specific example validation:
```bash
node -e "
import fs from 'fs';
import { validateManifestWithRegistry } from './dist/registry.js';
const manifest = JSON.parse(fs.readFileSync('examples/dtcg-mixed-features.json'));
console.log(validateManifestWithRegistry(manifest));
"
```

## Design Principles

- **Specification Compliance**: Examples follow W3C DTCG resolver proposal syntax
- **Progressive Complexity**: From simple to advanced feature usage
- **Real-world Patterns**: Practical examples for common use cases
- **Type Safety**: Proper token type definitions where applicable
- **Extensibility**: Demonstrates extension patterns for tooling integration