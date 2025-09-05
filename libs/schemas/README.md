# @upft/schemas

JSON schemas for DTCG design tokens - the validation foundation for type-safe token definitions.

## Structure

| File | Purpose |
|------|---------|
| `src/index.ts` | TypeScript exports and schema utilities |
| `src/manifest-upft.json` | UPFT manifest schema for token composition |
| `src/tokens/base.schema.json` | Base DTCG token schema |
| `src/tokens/full.schema.json` | Full token schema with extensions |
| `src/tokens/value-types.schema.json` | Value type definitions |
| `src/tokens/types/*.json` | Type-specific schemas (color, dimension, etc.) |

## Usage

### TypeScript Import

```typescript
import { schemas, baseTokenSchema, typeSchemas } from "@upft/schemas";

// Validate a token document
import Ajv from "ajv/dist/2020.js";
const ajv = new Ajv();
ajv.addSchema(schemas.tokens.base);

const validate = ajv.compile(schemas.tokens.base);
const isValid = validate(tokenDocument);
```

### Direct Schema Access

```typescript
import { 
  baseTokenSchema,
  fullTokenSchema, 
  manifestUpft,
  typeSchemas 
} from "@upft/schemas";

// Access specific type schema
const colorSchema = typeSchemas.color;
```

### Schema Utilities

```typescript
import { getSchemaForType, getAllTypeSchemas } from "@upft/schemas";

// Get schema for token type
const dimensionSchema = getSchemaForType("dimension");

// Get all type schemas
const allTypes = getAllTypeSchemas();
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `schemas` | Object | Complete schema collection |
| `baseTokenSchema` | Object | DTCG base token schema |
| `fullTokenSchema` | Object | Extended token schema |
| `manifestUpft` | Object | UPFT manifest schema |
| `typeSchemas` | Object | All type-specific schemas |
| `getSchemaForType(type)` | Function | Get schema by token type |
| `getAllTypeSchemas()` | Function | Get array of all type schemas |

## Schema Validation

All schemas follow JSON Schema Draft 2020-12 and validate:

✅ **Token Files**: Against DTCG specification  
✅ **Manifest Files**: Against UPFT manifest format  
✅ **Type Safety**: Token value validation by type  
✅ **Reference Resolution**: Token reference patterns  

## Web Access

Schemas are also available via CDN:

**Base Token Schema:**
```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/base.schema.json"
}
```

**Full Token Schema:**
```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json"
}
```

**Versioned URLs:**
- Base: `https://tokens.unpunny.fun/schemas/v0.0.6/tokens/base.schema.json`
- Full: `https://tokens.unpunny.fun/schemas/v0.0.6/tokens/full.schema.json`

**Latest URLs:**
- Base: `https://tokens.unpunny.fun/schemas/latest/tokens/base.schema.json`
- Full: `https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json`

## Design Principles

- **DTCG Compliance**: Strict adherence to DTCG specification
- **Type Safety**: Comprehensive validation for all token types
- **Extensibility**: Support for custom token types and properties
- **Performance**: Optimized schemas for fast validation