# Quick Start

Get up and running with UPFT tokens in 5 minutes.

## Step 1: Install

```bash
npm install --save-dev @unpunnyfuns/tokens
```

## Step 2: Create Token Files

Create a basic token file `tokens.json`:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "color": {
    "primary": {
      "$value": {
        "colorSpace": "srgb",
        "components": [0, 0.478, 0.8],
        "alpha": 1
      },
      "$type": "color"
    },
    "secondary": {
      "$value": {
        "colorSpace": "srgb",
        "components": [0.424, 0.451, 0.49],
        "alpha": 1
      },
      "$type": "color"
    }
  },
  "spacing": {
    "small": {
      "$value": {
        "value": 8,
        "unit": "px"
      },
      "$type": "dimension"
    },
    "medium": {
      "$value": {
        "value": 16,
        "unit": "px"
      },
      "$type": "dimension"
    }
  }
}
```

## Step 3: Validate Tokens

```bash
upft validate -f tokens.json
```

## Step 4: Create a Resolver Manifest (Optional)

For multi-dimensional tokens, create `resolver.manifest.json`:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/resolver-upft.json",
  "name": "My Design System",
  "sets": [
    {
      "name": "base",
      "values": ["tokens.json"]
    }
  ],
  "modifiers": {},
  "generate": [
    {
      "file": "output/tokens.json"
    }
  ]
}
```

## Step 5: Validate and Bundle

Validate the manifest:
```bash
upft validate -m resolver.manifest.json
```

Bundle tokens:
```bash
upft bundle resolver.manifest.json
```

## Using the API

```typescript
import { TokenValidator, UPFTResolver } from '@unpunnyfuns/tokens';

// Validate tokens
const validator = new TokenValidator();
const result = await validator.validateDocument(tokenDocument);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Resolve with manifest
const resolver = new UPFTResolver();
const permutation = await resolver.resolvePermutation(manifest, {});
```

## Working with Themes

Create theme variations by adding modifier-specific token files:

`light.json`:
```json
{
  "color": {
    "background": {
      "$value": "{color.neutral.100}",
      "$type": "color"
    },
    "text": {
      "$value": "{color.neutral.900}",
      "$type": "color"
    }
  }
}
```

Update manifest with theme modifiers:

```json
{
  "sets": [
    { "values": ["base.json"] },
    {
      "name": "theme",
      "values": ["light.json", "dark.json"]
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"]
    }
  },
  "generate": [
    {
      "file": "output/{theme}.json",
      "groups": ["theme"]
    }
  ]
}
```

## Next Steps

- Read the [Tutorial](./tutorial.md) for a complete walkthrough
- Learn about [Token Types](./token-specification.md)
- Explore the [UPFT Resolver](./upft-resolver-spec.md)