# Layered Output with Bundling Modes

UPFT supports different bundling strategies to optimize token distribution and reduce duplication across multiple themes and variations.

## Bundling Modes

The `generate` specification in your manifest now supports a `mode` field that controls how tokens are bundled:

### Full Mode (Default)
Includes all tokens - both base and modifier-specific tokens - in a single self-contained file.

```json
{
  "generate": [
    {
      "theme": "light",
      "output": "light-full.json",
      "mode": "full"
    }
  ]
}
```

**Use when:**
- You want self-contained token files
- Simplicity is more important than file size
- Each theme is loaded independently

### Overlay Mode
Includes only modifier-specific tokens, excluding base tokens. Requires separate loading of base tokens.

```json
{
  "generate": [
    {
      "theme": "light",
      "output": "light-overlay.json",
      "mode": "overlay"
    }
  ]
}
```

**Use when:**
- You want to minimize duplication
- Base tokens are shared across themes
- You can manage multiple file imports

### Base-Only Mode
Includes only base tokens from non-modifier sets.

```json
{
  "generate": [
    {
      "output": "base.json",
      "mode": "base-only"
    }
  ]
}
```

**Use when:**
- You want to separate shared primitives
- Base tokens are loaded once and cached
- You're building a layered architecture

## Complete Example

Here's a manifest that generates both full bundles and layered outputs:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/resolver-upft.json",
  "name": "My Design System",
  "sets": [
    {
      "name": "base",
      "values": ["colors.json", "typography.json", "spacing.json"]
    },
    {
      "name": "theme",
      "values": ["light.json", "dark.json"]
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["light.json"],
        "dark": ["dark.json"]
      }
    }
  },
  "generate": [
    {
      "output": "dist/base.json",
      "mode": "base-only"
    },
    {
      "theme": "light",
      "output": "dist/overlays/light.json",
      "mode": "overlay"
    },
    {
      "theme": "dark",
      "output": "dist/overlays/dark.json",
      "mode": "overlay"
    },
    {
      "theme": "light",
      "output": "dist/full/light.json",
      "mode": "full"
    },
    {
      "theme": "dark",
      "output": "dist/full/dark.json",
      "mode": "full"
    }
  ]
}
```

This generates:
- `dist/base.json` - Shared base tokens only
- `dist/overlays/light.json` - Light theme overrides only
- `dist/overlays/dark.json` - Dark theme overrides only
- `dist/full/light.json` - Complete light theme (base + overrides)
- `dist/full/dark.json` - Complete dark theme (base + overrides)

## Consumption Patterns

### Using Full Bundles (Simplest)
```javascript
import lightTokens from './dist/full/light.json';
// All tokens are available
```

### Using Layered Approach (Optimized)
```javascript
import baseTokens from './dist/base.json';
import lightOverlay from './dist/overlays/light.json';

// Merge tokens (you'll need a merge utility)
const tokens = mergeTokens(baseTokens, lightOverlay);
```

### Dynamic Theme Switching
```javascript
// Load base once
const baseTokens = await fetch('/tokens/base.json').then(r => r.json());

// Load theme on demand
async function switchTheme(theme) {
  const overlay = await fetch(`/tokens/overlays/${theme}.json`).then(r => r.json());
  return mergeTokens(baseTokens, overlay);
}
```

## Benefits

### Full Mode
- ✅ Self-contained files
- ✅ No runtime merging needed
- ✅ Simple to implement
- ❌ Larger file sizes
- ❌ Duplication across themes

### Layered Mode (Base + Overlays)
- ✅ Smaller total file size
- ✅ No duplication of base tokens
- ✅ Efficient caching of base layer
- ✅ Fast theme switching
- ❌ Requires token merging
- ❌ Multiple file loads

## Size Comparison Example

For a typical design system with 2 themes and 2 density modes:

**Full Mode:**
- 4 files × ~50KB each = 200KB total
- Each file contains all tokens

**Layered Mode:**
- 1 base file (30KB)
- 2 theme overlays (5KB each)
- 2 density overlays (3KB each)
- Total: 46KB (77% reduction)

## Implementation Notes

Currently, the mode-based filtering is a simplified implementation. Full tracking of token sources (which tokens come from base vs modifier sets) will be implemented in a future update. For now:

- `base-only` mode includes all tokens when no modifiers are specified
- `overlay` mode includes all tokens when modifiers are specified
- `full` mode always includes all tokens (default behavior)

## Future Enhancements

Planned improvements include:
- Proper token source tracking during resolution
- Automatic detection of overlapping tokens
- Deduplication analysis and reporting
- Smart bundling based on usage patterns
- Support for `$extends` syntax for token inheritance