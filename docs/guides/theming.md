# Theming Guide

Build multi-dimensional design systems with themes, modes, and feature variations using UPFT's manifest system.

## Overview

Theming in UPFT goes beyond simple light/dark modes. The manifest system supports multiple orthogonal dimensions that can be combined to create sophisticated design systems. This guide covers common theming patterns and best practices for organizing multi-dimensional token systems.

## Basic Theme Setup

### Light and Dark Themes

The most common theming pattern involves light and dark color schemes:

```json
{
  "sets": [
    { 
      "name": "core",
      "values": ["tokens/core/colors.json", "tokens/core/spacing.json"] 
    }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "default": "light",
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"]
      }
    }
  },
  "generate": [
    { "theme": "light", "output": "dist/light.json" },
    { "theme": "dark", "output": "dist/dark.json" }
  ]
}
```

### Token Structure

Organize theme tokens to override semantic values:

**tokens/core/colors.json** (primitive colors):
```json
{
  "color": {
    "blue": {
      "500": { "$value": "#3b82f6", "$type": "color" },
      "600": { "$value": "#2563eb", "$type": "color" },
      "700": { "$value": "#1d4ed8", "$type": "color" }
    },
    "neutral": {
      "100": { "$value": "#f3f4f6", "$type": "color" },
      "800": { "$value": "#1f2937", "$type": "color" },
      "900": { "$value": "#111827", "$type": "color" }
    }
  }
}
```

**tokens/themes/light.json** (light theme overrides):
```json
{
  "semantic": {
    "background": {
      "primary": { "$value": "{color.neutral.100}", "$type": "color" },
      "secondary": { "$value": "#ffffff", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "{color.neutral.900}", "$type": "color" },
      "secondary": { "$value": "{color.neutral.700}", "$type": "color" }
    }
  }
}
```

**tokens/themes/dark.json** (dark theme overrides):
```json
{
  "semantic": {
    "background": {
      "primary": { "$value": "{color.neutral.900}", "$type": "color" },
      "secondary": { "$value": "{color.neutral.800}", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "{color.neutral.100}", "$type": "color" },
      "secondary": { "$value": "{color.neutral.300}", "$type": "color" }
    }
  }
}
```

## Multi-Dimensional Theming

### Combining Theme and Density

Create compact and comfortable variants for each theme:

```json
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"]
      }
    },
    "density": {
      "oneOf": ["comfortable", "compact"],
      "default": "comfortable",
      "values": {
        "comfortable": ["tokens/density/comfortable.json"],
        "compact": ["tokens/density/compact.json"]
      }
    }
  },
  "generate": [
    { "theme": "light", "density": "comfortable", "output": "dist/light-comfortable.json" },
    { "theme": "light", "density": "compact", "output": "dist/light-compact.json" },
    { "theme": "dark", "density": "comfortable", "output": "dist/dark-comfortable.json" },
    { "theme": "dark", "density": "compact", "output": "dist/dark-compact.json" }
  ]
}
```

**tokens/density/comfortable.json**:
```json
{
  "spacing": {
    "component": {
      "padding": { "$value": "16px", "$type": "dimension" },
      "gap": { "$value": "12px", "$type": "dimension" }
    }
  },
  "size": {
    "button": {
      "height": { "$value": "48px", "$type": "dimension" }
    }
  }
}
```

**tokens/density/compact.json**:
```json
{
  "spacing": {
    "component": {
      "padding": { "$value": "8px", "$type": "dimension" },
      "gap": { "$value": "6px", "$type": "dimension" }
    }
  },
  "size": {
    "button": {
      "height": { "$value": "32px", "$type": "dimension" }
    }
  }
}
```

### Feature Flags

Add optional features that can be combined with any theme:

```json
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": { /* ... */ }
    },
    "features": {
      "anyOf": ["animations", "gradients", "shadows", "rounded"],
      "values": {
        "animations": ["tokens/features/animations.json"],
        "gradients": ["tokens/features/gradients.json"],
        "shadows": ["tokens/features/shadows.json"],
        "rounded": ["tokens/features/rounded.json"]
      }
    }
  },
  "generate": [
    {
      "theme": "light",
      "features": ["shadows", "rounded"],
      "output": "dist/light-modern.json"
    },
    {
      "theme": "dark",
      "features": ["animations", "gradients", "shadows", "rounded"],
      "output": "dist/dark-premium.json"
    }
  ]
}
```

## Advanced Theming Patterns

### Brand Variations

Support multiple brands with shared structure:

```json
{
  "sets": [
    { "name": "structure", "values": ["tokens/structure.json"] }
  ],
  "modifiers": {
    "brand": {
      "oneOf": ["product-a", "product-b", "enterprise"],
      "values": {
        "product-a": ["tokens/brands/product-a.json"],
        "product-b": ["tokens/brands/product-b.json"],
        "enterprise": ["tokens/brands/enterprise.json"]
      }
    },
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"]
      }
    }
  }
}
```

### Contextual Themes

Different themes for different contexts:

```json
{
  "modifiers": {
    "context": {
      "oneOf": ["app", "marketing", "documentation"],
      "values": {
        "app": ["tokens/contexts/app.json"],
        "marketing": ["tokens/contexts/marketing.json"],
        "documentation": ["tokens/contexts/documentation.json"]
      }
    },
    "colorScheme": {
      "oneOf": ["light", "dark", "auto"],
      "values": {
        "light": ["tokens/schemes/light.json"],
        "dark": ["tokens/schemes/dark.json"],
        "auto": ["tokens/schemes/auto.json"]
      }
    }
  }
}
```

### Accessibility Modes

High contrast and reduced motion variants:

```json
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark", "high-contrast-light", "high-contrast-dark"],
      "values": {
        "light": ["tokens/themes/light.json"],
        "dark": ["tokens/themes/dark.json"],
        "high-contrast-light": [
          "tokens/themes/light.json",
          "tokens/accessibility/high-contrast.json"
        ],
        "high-contrast-dark": [
          "tokens/themes/dark.json",
          "tokens/accessibility/high-contrast.json"
        ]
      }
    },
    "motion": {
      "oneOf": ["full", "reduced"],
      "default": "full",
      "values": {
        "full": ["tokens/motion/full.json"],
        "reduced": ["tokens/motion/reduced.json"]
      }
    }
  }
}
```

## Token Organization Strategies

### Layered Architecture

Organize tokens in semantic layers:

```
tokens/
├── 00-primitives/      # Raw values
│   ├── colors.json
│   ├── dimensions.json
│   └── typography.json
├── 01-semantic/        # Semantic aliases
│   ├── colors.json
│   ├── spacing.json
│   └── typography.json
├── 02-components/      # Component tokens
│   ├── button.json
│   ├── card.json
│   └── input.json
└── themes/            # Theme overrides
    ├── light.json
    └── dark.json
```

### Atomic Design Structure

Follow atomic design principles:

```
tokens/
├── atoms/              # Basic building blocks
│   ├── colors.json
│   └── spacing.json
├── molecules/          # Simple components
│   ├── buttons.json
│   └── inputs.json
├── organisms/          # Complex components
│   ├── headers.json
│   └── forms.json
└── templates/          # Page-level tokens
    ├── landing.json
    └── dashboard.json
```

### Platform-Specific Tokens

Separate platform concerns:

```
tokens/
├── core/              # Platform-agnostic
│   └── primitives.json
├── platforms/
│   ├── web/
│   │   ├── typography.json
│   │   └── spacing.json
│   ├── ios/
│   │   ├── typography.json
│   │   └── spacing.json
│   └── android/
│       ├── typography.json
│       └── spacing.json
```

## Theme Switching Implementation

### CSS Custom Properties

Generate CSS variables for runtime switching:

```json
// Transform function in bundler
{
  "transforms": [
    {
      "name": "css-variables",
      "type": "value",
      "transform": (token) => `var(--${token.path.join('-')})`
    }
  ]
}
```

Output:
```css
:root {
  --color-primary: #3b82f6;
  --spacing-small: 8px;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
}
```

### JavaScript Objects

Generate theme objects for JS frameworks:

```javascript
// Generated from light theme
export const lightTheme = {
  colors: {
    primary: '#3b82f6',
    background: '#ffffff'
  },
  spacing: {
    small: '8px',
    medium: '16px'
  }
};

// Generated from dark theme
export const darkTheme = {
  colors: {
    primary: '#60a5fa',
    background: '#111827'
  },
  spacing: {
    small: '8px',
    medium: '16px'
  }
};
```

## Best Practices

### 1. Semantic Naming

Use semantic names that work across themes:

```json
// ✅ Good
{
  "background": {
    "primary": { "$value": "#ffffff" },
    "elevated": { "$value": "#f9fafb" }
  }
}

// ❌ Bad
{
  "colors": {
    "white": { "$value": "#ffffff" },
    "lightGray": { "$value": "#f9fafb" }
  }
}
```

### 2. Theme Token Scope

Only override what changes between themes:

```json
// Core tokens (shared)
{
  "spacing": { /* same for all themes */ },
  "typography": { /* same for all themes */ }
}

// Theme tokens (only colors)
{
  "semantic": {
    "colors": { /* theme-specific */ }
  }
}
```

### 3. Reference Consistency

Maintain reference chains across themes:

```json
// Both themes reference the same semantic structure
// Light theme
{ "text": { "primary": { "$value": "{color.neutral.900}" } } }

// Dark theme  
{ "text": { "primary": { "$value": "{color.neutral.100}" } } }
```

### 4. Progressive Enhancement

Start with base theme, add features progressively:

```json
{
  "generate": [
    { "output": "dist/base.json" },
    { "features": ["shadows"], "output": "dist/enhanced.json" },
    { "features": ["shadows", "animations"], "output": "dist/full.json" }
  ]
}
```

## Testing Themes

### Visual Regression Testing

Compare theme outputs visually:

```bash
# Generate all theme permutations
upft bundle manifest.json

# Compare themes
upft diff dist/light.json dist/dark.json

# Validate contrast ratios
upft validate dist/dark.json --check-contrast
```

### Automated Testing

Test theme completeness:

```javascript
import { lightTheme, darkTheme } from './themes';

test('themes have same structure', () => {
  expect(Object.keys(lightTheme)).toEqual(Object.keys(darkTheme));
});

test('themes have required tokens', () => {
  const required = ['background.primary', 'text.primary'];
  required.forEach(path => {
    expect(getToken(lightTheme, path)).toBeDefined();
    expect(getToken(darkTheme, path)).toBeDefined();
  });
});
```

## Migration Strategies

### From CSS Variables

```css
/* Before */
:root {
  --primary-color: #3b82f6;
}

.dark {
  --primary-color: #60a5fa;
}
```

```json
/* After */
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/light.json"],
        "dark": ["tokens/dark.json"]
      }
    }
  }
}
```

### From Theme Objects

```javascript
// Before
const themes = {
  light: { primaryColor: '#3b82f6' },
  dark: { primaryColor: '#60a5fa' }
};
```

```json
// After - manifest.json
{
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["themes/light.json"],
        "dark": ["themes/dark.json"]
      }
    }
  }
}
```

## Performance Optimization

### Lazy Loading Themes

Load themes on demand:

```javascript
async function loadTheme(themeName) {
  const response = await fetch(`/tokens/${themeName}.json`);
  const tokens = await response.json();
  applyTheme(tokens);
}
```

### Theme Bundling

Create optimized bundles per theme:

```json
{
  "generate": [
    {
      "theme": "light",
      "includeSets": ["core"],
      "output": "dist/light-core.json"
    },
    {
      "theme": "light",
      "includeSets": ["core", "components"],
      "output": "dist/light-full.json"
    }
  ]
}
```

### Caching Strategies

Cache generated themes:

```javascript
const themeCache = new Map();

function getTheme(name) {
  if (!themeCache.has(name)) {
    themeCache.set(name, loadTheme(name));
  }
  return themeCache.get(name);
}
```