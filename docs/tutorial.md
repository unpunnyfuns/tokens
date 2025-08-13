# UPFT Tutorial

This tutorial will walk you through creating a design token system from scratch using UPFT.

## What We'll Build

We'll create a simple design system with:
- Color tokens for light and dark themes
- Spacing tokens
- Typography tokens
- Multi-dimensional resolution for themes

## Step 1: Create Your First Token File

Create a file called `base.json` with your foundation tokens:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "color": {
    "neutral": {
      "100": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.961, 0.961, 0.961],
          "alpha": 1
        },
        "$type": "color"
      },
      "200": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.878, 0.878, 0.878],
          "alpha": 1
        },
        "$type": "color"
      },
      "800": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.259, 0.259, 0.259],
          "alpha": 1
        },
        "$type": "color"
      },
      "900": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.129, 0.129, 0.129],
          "alpha": 1
        },
        "$type": "color"
      }
    }
  },
  "spacing": {
    "xs": {
      "$value": {
        "value": 4,
        "unit": "px"
      },
      "$type": "dimension"
    },
    "sm": {
      "$value": {
        "value": 8,
        "unit": "px"
      },
      "$type": "dimension"
    },
    "md": {
      "$value": {
        "value": 16,
        "unit": "px"
      },
      "$type": "dimension"
    },
    "lg": {
      "$value": {
        "value": 24,
        "unit": "px"
      },
      "$type": "dimension"
    },
    "xl": {
      "$value": {
        "value": 32,
        "unit": "px"
      },
      "$type": "dimension"
    }
  }
}
```

## Step 2: Validate Your Tokens

Make sure your tokens are valid:

```bash
upft validate -f base.json
```

If valid, the command completes without output. Use `-v` for verbose output.

## Step 3: Add Theme Variations

Create `light.json` for light theme overrides:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "color": {
    "background": {
      "$value": "{color.neutral.100}",
      "$type": "color"
    },
    "text": {
      "$value": "{color.neutral.900}",
      "$type": "color"
    },
    "border": {
      "$value": "{color.neutral.200}",
      "$type": "color"
    }
  }
}
```

Create `dark.json` for dark theme overrides:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "color": {
    "background": {
      "$value": "{color.neutral.900}",
      "$type": "color"
    },
    "text": {
      "$value": "{color.neutral.100}",
      "$type": "color"
    },
    "border": {
      "$value": "{color.neutral.800}",
      "$type": "color"
    }
  }
}
```

## Step 4: Create a Resolver Manifest

Create `resolver.manifest.json` to define how tokens are composed:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/resolver-upft.json",
  "name": "My Design System",
  "description": "A simple design system with themes",
  "sets": [
    {
      "name": "base",
      "values": ["base.json"]
    },
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
      "file": "dist/{theme}.json",
      "groups": ["theme"]
    }
  ]
}
```

## Step 5: Build Your Token Bundles

First, validate the manifest:

```bash
upft validate -m resolver.manifest.json
```

Then generate the final token files:

```bash
upft bundle resolver.manifest.json
```

This creates:
- `dist/light.json` - Complete tokens for light theme
- `dist/dark.json` - Complete tokens for dark theme

## Step 6: Explore the Results

Look at `dist/light.json`:

```json
{
  "color": {
    "neutral": {
      "100": {
        "$value": {
          "colorSpace": "srgb",
          "channels": [0.961, 0.961, 0.961],
          "alpha": 1
        },
        "$type": "color"
      },
      "200": {
        "$value": {
          "colorSpace": "srgb",
          "channels": [0.878, 0.878, 0.878],
          "alpha": 1
        },
        "$type": "color"
      },
      "800": {
        "$value": {
          "colorSpace": "srgb",
          "channels": [0.259, 0.259, 0.259],
          "alpha": 1
        },
        "$type": "color"
      },
      "900": {
        "$value": {
          "colorSpace": "srgb",
          "channels": [0.129, 0.129, 0.129],
          "alpha": 1
        },
        "$type": "color"
      }
    },
    "background": {
      "$value": {
        "colorSpace": "srgb",
        "channels": [0.961, 0.961, 0.961],
        "alpha": 1
      },
      "$type": "color"
    },
    "text": {
      "$value": {
        "colorSpace": "srgb",
        "channels": [0.129, 0.129, 0.129],
        "alpha": 1
      },
      "$type": "color"
    },
    "border": {
      "$value": {
        "colorSpace": "srgb",
        "channels": [0.878, 0.878, 0.878],
        "alpha": 1
      },
      "$type": "color"
    }
  },
  "spacing": {
    "xs": { "$value": "4px", "$type": "dimension" },
    "sm": { "$value": "8px", "$type": "dimension" },
    "md": { "$value": "16px", "$type": "dimension" },
    "lg": { "$value": "24px", "$type": "dimension" },
    "xl": { "$value": "32px", "$type": "dimension" }
  }
}
```

Notice how:
- References are resolved to actual values
- Base tokens are merged with theme overrides
- The output is a complete, self-contained token set

## Step 7: Add Component Tokens

Create `components/button.json`:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "component": {
    "button": {
      "padding-x": {
        "$value": "{spacing.md}",
        "$type": "dimension"
      },
      "padding-y": {
        "$value": "{spacing.sm}",
        "$type": "dimension"
      },
      "background": {
        "$value": "{color.text}",
        "$type": "color"
      },
      "text": {
        "$value": "{color.background}",
        "$type": "color"
      },
      "border-radius": {
        "$value": "4px",
        "$type": "dimension"
      }
    }
  }
}
```

Update your manifest to include components:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/resolver-upft.json",
  "name": "My Design System",
  "sets": [
    {
      "name": "base",
      "values": ["base.json", "components/button.json"]
    },
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
      "file": "dist/{theme}.json",
      "groups": ["theme"]
    }
  ]
}
```

## Step 8: Add Multiple Dimensions

Let's add density variants. Create `density/comfortable.json`:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "density": {
    "multiplier": {
      "$value": 1,
      "$type": "number"
    }
  }
}
```

Create `density/compact.json`:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json",
  "density": {
    "multiplier": {
      "$value": 0.8,
      "$type": "number"
    }
  },
  "spacing": {
    "xs": { "$value": "3px", "$type": "dimension" },
    "sm": { "$value": "6px", "$type": "dimension" },
    "md": { "$value": "12px", "$type": "dimension" },
    "lg": { "$value": "18px", "$type": "dimension" },
    "xl": { "$value": "24px", "$type": "dimension" }
  }
}
```

Update manifest for two dimensions:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/resolver-upft.json",
  "name": "My Design System",
  "sets": [
    {
      "name": "base",
      "values": ["base.json", "components/button.json"]
    },
    {
      "name": "theme",
      "values": ["light.json", "dark.json"]
    },
    {
      "name": "density",
      "values": ["density/comfortable.json", "density/compact.json"]
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"]
    },
    "density": {
      "oneOf": ["comfortable", "compact"]
    }
  },
  "generate": [
    {
      "file": "dist/{theme}-{density}.json",
      "groups": ["theme", "density"]
    }
  ]
}
```

Now build generates four files:
- `dist/light-comfortable.json`
- `dist/light-compact.json`
- `dist/dark-comfortable.json`
- `dist/dark-compact.json`

## Step 9: Using the API

Create a script `build-tokens.js`:

```javascript
import { loadManifest, bundleTokens } from 'upft';

async function buildTokens() {
  // Load and validate manifest
  const manifest = await loadManifest('resolver.manifest.json');
  
  // Bundle tokens
  const bundles = await bundleTokens(manifest);
  
  // Process results
  bundles.forEach(bundle => {
    console.log(`Generated: ${bundle.filePath}`);
  });
}

buildTokens().catch(console.error);
```

## Step 10: Compare Variations

Use the diff command to see what changes between themes:

```bash
# Note: diff command is not currently implemented in CLI
# You can use the API to compare permutations:
# const diff = await cli.diff(manifest, leftModifiers, rightModifiers);
```

This shows you exactly which tokens differ between variations.

## Next Steps

Now that you understand the basics:

1. **Explore token types** - Try typography, shadows, borders
2. **Add more dimensions** - Brand variants, platform-specific tokens
3. **Use references** - Build semantic layers referencing primitives
4. **Validate continuously** - Add validation to your CI/CD pipeline

## Tips

### Organizing Token Files

```
tokens/
├── primitives/
│   ├── colors.json
│   ├── typography.json
│   └── spacing.json
├── semantic/
│   ├── light.json
│   └── dark.json
├── components/
│   ├── button.json
│   ├── card.json
│   └── input.json
└── resolver.manifest.json
```

### Naming Conventions

- Use kebab-case for token names
- Group related tokens
- Use semantic names over color names
- Be consistent across your system

### Reference Strategy

1. **Primitives** - Raw values (color-blue-500)
2. **Semantic** - Purpose-based (color-primary)
3. **Component** - Component-specific (button-background)

Each layer references the previous one, creating a maintainable hierarchy.