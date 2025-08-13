# Bundling Strategies for Token Management

## The Problem: Duplicate Base Sets

When generating multiple permutations (e.g., light/dark × comfortable/compact = 4 outputs), each output file contains the complete token set including:
- Base tokens (colors, typography, spacing primitives)
- Semantic tokens (references to base tokens)
- Modifier-specific tokens (theme overrides)

This leads to duplication of base tokens across all output files.

## Strategy Options

### 1. Full Bundle (Current Implementation)
Each output contains all tokens needed for that permutation.

**Pros:**
- Self-contained files - each output works independently
- Simple to consume - import one file and get everything
- No runtime resolution needed
- Works with any build tool

**Cons:**
- Duplicated data across files
- Larger total file size
- Updates to base tokens require rebuilding all permutations

**Use when:** Simplicity and independence are priorities

### 2. Layered Output
Separate base tokens from permutation-specific tokens.

```
output/
  base.tokens.json        # Shared primitives
  semantic.tokens.json    # Shared semantic layer
  theme-light.json        # Only theme-specific overrides
  theme-dark.json         # Only theme-specific overrides
```

**Pros:**
- No duplication of base tokens
- Smaller total file size
- Can update layers independently

**Cons:**
- Requires multiple imports
- Consumer needs to merge tokens
- More complex consumption pattern

**Use when:** File size and deduplication are priorities

### 3. Reference-Only Permutations
Permutation files only contain references to base files.

```json
// light-comfortable.json
{
  "$extends": ["./base.json", "./semantic.json"],
  "color": {
    "background": {
      "primary": {
        "$value": "{color.neutral.100}"
      }
    }
  }
}
```

**Pros:**
- Minimal duplication
- Clear dependency chain
- Easy to see what changes per permutation

**Cons:**
- Requires tooling support for `$extends`
- Not standard DTCG (yet)
- Runtime or build-time resolution needed

**Use when:** Using tools that support token extension

### 4. Build-Time Optimization
Generate both full bundles and optimized layers.

```
output/
  bundles/
    light-comfortable.json  # Full bundle
    dark-compact.json      # Full bundle
  layers/
    base.json              # Shared base
    light.json             # Light-specific
    dark.json              # Dark-specific
```

**Pros:**
- Flexibility for consumers
- Can choose based on use case
- Supports gradual migration

**Cons:**
- More files to manage
- Increased build complexity
- Storage overhead

**Use when:** Supporting multiple consumption patterns

## Implementation Recommendations

### For UPFT

1. **Default to Full Bundles** (current)
   - Simplest for consumers
   - Most compatible

2. **Add Layering Option** (future)
   ```json
   {
     "options": {
       "outputMode": "layered",
       "layers": {
         "base": ["colors", "typography", "spacing"],
         "semantic": ["semantic/*"],
         "theme": ["theme/*"]
       }
     }
   }
   ```

3. **Support Deduplication Analysis**
   - Report on token duplication
   - Suggest optimization strategies
   - Calculate size savings

### For Consumers

1. **Development**: Use full bundles for simplicity
2. **Production**: Consider layered approach if:
   - Multiple themes/modes are used
   - File size is a concern
   - Dynamic theme switching is needed

3. **Build Pipeline**: 
   - Use full bundles during development
   - Optimize to layers for production
   - Cache base layers aggressively

## Example: Optimized Manifest

```json
{
  "sets": [
    {
      "name": "base",
      "values": ["colors.json", "typography.json"],
      "output": "base.tokens.json"  // Shared output
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["theme-light.json"],
        "dark": ["theme-dark.json"]
      }
    }
  },
  "generate": [
    {
      "theme": "light",
      "output": "theme-light.json",
      "includeBase": false  // Only theme-specific tokens
    },
    {
      "theme": "dark", 
      "output": "theme-dark.json",
      "includeBase": false
    }
  ]
}
```

This would generate:
- `base.tokens.json` - Shared primitives (generated once)
- `theme-light.json` - Only light theme overrides
- `theme-dark.json` - Only dark theme overrides

Consumers would then:
```javascript
import baseTokens from './base.tokens.json';
import themeTokens from './theme-light.json';

const tokens = merge(baseTokens, themeTokens);
```