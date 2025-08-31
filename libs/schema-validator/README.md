# Schema Validator

JSON schema validation for design tokens and manifests ensuring DTCG compliance.

## Structure

| File | Purpose |
|------|---------|
| `index.ts` | Main validation functions and exports |

## Core Functions

### File Type Detection

```typescript
import { detectFileType } from '@upft/schema-validator';

const type = detectFileType(jsonData);
// Returns: 'tokens' | 'manifest' | 'unknown'
```

Automatically detects whether JSON data represents tokens or manifest files.

### Token Validation

```typescript
import { validateTokens } from '@upft/schema-validator';

const result = validateTokens(tokenData);
if (!result.valid) {
  console.error(result.errors);
}
```

Validates token files against DTCG specification schemas.

### Manifest Validation

```typescript
import { validateManifest } from '@upft/schema-validator';

const result = validateManifest(manifestData);
if (!result.valid) {
  console.error(result.errors);
}
```

Validates manifest files against UPFT manifest schemas.

### Comprehensive Validation

```typescript
import { validateFile } from '@upft/schema-validator';

// Auto-detects type and validates appropriately
const result = validateFile(fileData);
```

Automatically detects file type and applies appropriate validation schemas.

## Testing

```bash
pnpm --filter @upft/schema-validator test
```