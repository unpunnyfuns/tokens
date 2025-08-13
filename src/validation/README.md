# Validation

The validation module provides JSON Schema-based validation for design tokens and resolver manifests, ensuring conformance to DTCG specifications.

## Structure

| File | Purpose |
|------|---------|
| `validator.ts` | Main validation engine using AJV |
| `schema-registry.ts` | Manages and resolves JSON schemas |
| `manifest-validator.ts` | Validates UPFT resolver manifests |
| `index.ts` | Public API exports |

## Key Components

### TokenValidator

Main validator for token documents using AJV (Another JSON Schema Validator).

```typescript
const validator = await TokenValidator.create({
  strict: true,              // Reject unknown properties
  validateReferences: true   // Check reference targets exist
});

const result = await validator.validateDocument(tokenDocument);
if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`);
  });
}
```

### Validation Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Strict** | Full DTCG compliance, rejects unknowns | Production systems |
| **Lenient** | Core validation, allows extensions | Development/migration |
| **Structure** | Basic structure only | Custom token types |

### SchemaRegistry

Manages schema loading and composition.

```typescript
const registry = new SchemaRegistry();

// Register custom schema
registry.addSchema({
  $id: 'custom-type',
  type: 'object',
  properties: { /* ... */ }
});

// Get compiled validator
const validator = registry.getValidator('tokens/full.schema.json');
```

### ManifestValidator

Validates UPFT resolver manifest structure.

```typescript
const validator = new ManifestValidator();
const result = validator.validateManifest(manifest);

// Checks:
// - Valid modifier definitions (oneOf/anyOf)
// - File paths exist
// - Set configurations are valid
// - No conflicting modifiers
```

## Validation Levels

### 1. Structural Validation
```typescript
// Must have $value or be a group
{
  "$value": "required for tokens",
  "$type": "optional but recommended"
}
```

### 2. Type Validation
```typescript
// Color tokens must match color schema
{
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [0, 0.5, 1],
    "alpha": 1
  }
}
```

### 3. Reference Validation
```typescript
// References must use correct syntax
{
  "$value": "{base.color.primary}"  // Must exist
}
```

## Error Format

```typescript
interface ValidationError {
  path: string;       // e.g., "/color/primary/$value"
  message: string;    // Human-readable error
  rule: string;       // Schema rule that failed
  severity: 'error' | 'warning';
  context?: any;      // Additional error context
}
```

## Schema Architecture

The validator uses modular schemas:

| Schema | Purpose |
|--------|---------|
| `tokens/base.schema.json` | Basic token structure |
| `tokens/full.schema.json` | Complete DTCG validation |
| `tokens/types/*.schema.json` | Individual type validators |
| `resolver.schema.json` | Resolver manifest schema |

## Usage Patterns

### Basic Validation
```typescript
const validator = await TokenValidator.create();
const result = await validator.validateDocument(tokens);
console.log(`Valid: ${result.valid}`);
```

### Custom Rules
```typescript
const validator = await TokenValidator.create({
  customSchemas: [{
    $id: 'my-rule',
    // Custom JSON Schema
  }]
});
```

### Validate with Context
```typescript
const result = await validator.validateDocument(tokens, {
  filePath: './tokens.json',  // For better error messages
  allowEmpty: false           // Reject empty documents
});
```

## Performance

| Operation | Performance |
|-----------|-------------|
| Schema compilation | ~50ms initial, then cached |
| Document validation | <1ms for small, <10ms for large |
| Reference checking | O(n) where n = number of refs |

Schemas are compiled once and cached. Subsequent validations are very fast.

## Integration Points

- **CLI** - Powers the `validate` command
- **Bundler** - Pre-validates before bundling
- **API** - Validation middleware
- **Resolver** - Validates manifests and results

## Configuration Options

```typescript
interface ValidationOptions {
  strict?: boolean;              // Strict mode (default: false)
  validateReferences?: boolean;  // Check refs exist (default: false)
  allowEmptyGroups?: boolean;    // Allow empty groups (default: true)
  customSchemas?: Schema[];      // Additional schemas
  errorLimit?: number;           // Max errors to collect (default: 100)
}
```

## Error Recovery

The validator collects all errors rather than failing fast:

```typescript
const result = await validator.validateDocument(tokens);
// result.errors contains ALL validation errors
// Useful for showing all issues at once in editors
```

## Future Considerations

- Custom rule engine without JSON Schema
- Async validation for remote schemas
- Partial document validation for live editing
- Auto-fix suggestions for common errors
- Schema versioning for multiple DTCG versions
- Validation plugins for extensibility
- IDE integration exports
- Streaming validation for large documents