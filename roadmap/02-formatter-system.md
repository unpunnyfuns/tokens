# Formatter System

## Overview

Formatters convert tokens into platform-specific output formats. Each formatter handles a specific output format (CSS, Swift, Kotlin, etc.) and can be configured with platform-specific options.

## Architecture

```typescript
interface Formatter {
  name: string;
  format: (tokens: TokenDocument, config: FormatterConfig) => string;
  extension: string;
}

interface FormatterConfig {
  outputPath?: string;
  header?: string;
  footer?: string;
  options?: Record<string, unknown>;
}
```

## Web Formatters

### CSS Formatter

Generates CSS custom properties.

```typescript
// Input tokens
{
  "color": {
    "primary": { "$value": "#007bff", "$type": "color" },
    "secondary": { "$value": "#6c757d", "$type": "color" }
  }
}

// Output CSS
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
}
```

Configuration options:
- `selector`: CSS selector (default: `:root`)
- `prefix`: Variable prefix
- `mediaQueries`: Media query wrapping

### SCSS Formatter

Generates SCSS variables and maps.

```typescript
// Output SCSS
$color-primary: #007bff;
$color-secondary: #6c757d;

$colors: (
  "primary": #007bff,
  "secondary": #6c757d
);
```

Configuration options:
- `mapName`: Name for the SCSS map
- `includeVariables`: Generate individual variables
- `includeMaps`: Generate maps

### JavaScript/TypeScript Formatter

Generates ES modules or CommonJS.

```typescript
// Output ES Module
export const colors = {
  primary: "#007bff",
  secondary: "#6c757d"
};

// Output TypeScript
export const colors = {
  primary: "#007bff",
  secondary: "#6c757d"
} as const;

export type ColorToken = keyof typeof colors;
```

Configuration options:
- `format`: 'esm' | 'cjs' | 'typescript'
- `constAssertion`: Add `as const` for TypeScript
- `exportType`: Generate type exports

## Native Formatters

### iOS Swift Formatter

Generates Swift code for iOS applications.

```typescript
// Output Swift
import UIKit

public enum Tokens {
    public enum Color {
        public static let primary = UIColor(hex: "#007bff")
        public static let secondary = UIColor(hex: "#6c757d")
    }
    
    public enum Spacing {
        public static let small: CGFloat = 8
        public static let medium: CGFloat = 16
    }
}
```

Configuration options:
- `className`: Root class/enum name
- `accessibility`: Public/internal access level
- `colorFormat`: 'UIColor' | 'SwiftUI.Color'

### Android Formatter

Generates Android resource files.

```xml
<!-- colors.xml -->
<resources>
    <color name="color_primary">#007bff</color>
    <color name="color_secondary">#6c757d</color>
</resources>

<!-- dimens.xml -->
<resources>
    <dimen name="spacing_small">8dp</dimen>
    <dimen name="spacing_medium">16dp</dimen>
</resources>
```

Kotlin output option:
```kotlin
object Tokens {
    object Color {
        const val primary = 0xFF007BFF
        const val secondary = 0xFF6C757D
    }
    
    object Spacing {
        const val small = 8
        const val medium = 16
    }
}
```

### React Native Formatter

Generates StyleSheet-compatible objects.

```typescript
// Output
import { StyleSheet } from 'react-native';

export const tokens = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d'
  },
  spacing: {
    small: 8,
    medium: 16
  }
};

export const styles = StyleSheet.create({
  // Generated styles
});
```

## Formatter Registry

```typescript
class FormatterRegistry {
  private formatters = new Map<string, Formatter>();

  register(formatter: Formatter): void {
    this.formatters.set(formatter.name, formatter);
  }

  format(
    tokens: TokenDocument,
    formatterName: string,
    config: FormatterConfig = {}
  ): string {
    const formatter = this.formatters.get(formatterName);
    if (!formatter) {
      throw new Error(`Formatter '${formatterName}' not found`);
    }
    
    return formatter.format(tokens, config);
  }

  getFormatter(name: string): Formatter | undefined {
    return this.formatters.get(name);
  }
}
```

## Format Templates

Templates for consistent output structure:

```typescript
interface FormatTemplate {
  fileHeader?: (config: FormatterConfig) => string;
  tokenFormat: (token: Token, path: string) => string;
  groupWrapper?: (content: string, groupName: string) => string;
  fileFooter?: (config: FormatterConfig) => string;
}

// CSS template example
const cssTemplate: FormatTemplate = {
  fileHeader: (config) => `/* Generated tokens - do not edit */\n${config.selector || ':root'} {`,
  tokenFormat: (token, path) => `  --${path.replace(/\./g, '-')}: ${token.$value};`,
  fileFooter: () => '}'
};
```

## Composite Formatting

Generate multiple outputs from single configuration:

```typescript
interface CompositeFormat {
  formats: Array<{
    formatter: string;
    destination: string;
    config?: FormatterConfig;
  }>;
}

// Example configuration
{
  "formats": [
    {
      "formatter": "css",
      "destination": "tokens.css",
      "config": { "selector": ":root" }
    },
    {
      "formatter": "scss",
      "destination": "_tokens.scss",
      "config": { "includeMaps": true }
    },
    {
      "formatter": "typescript",
      "destination": "tokens.ts",
      "config": { "constAssertion": true }
    }
  ]
}
```

## Format Utilities

Helper functions for formatters:

```typescript
// Name formatting
function formatTokenName(path: string, style: 'kebab' | 'camel' | 'pascal'): string;

// Value formatting
function formatColorValue(value: string, format: 'hex' | 'rgb' | 'hsl'): string;
function formatDimensionValue(value: string | number, unit?: string): string;

// File generation
function generateFileHeader(comment: string, style: 'line' | 'block'): string;
function wrapInNamespace(content: string, namespace: string, lang: string): string;
```

## CLI Integration

```bash
# Single format
upft format tokens.json --format css -o tokens.css

# Multiple formats
upft format tokens.json --format css,scss,typescript -o dist/

# With configuration
upft format tokens.json --format css --config '{"selector":".theme-dark"}'
```

## Testing

```typescript
describe('Formatters', () => {
  const tokens = loadFixture('tokens.json');

  it('generates valid CSS', () => {
    const output = cssFormatter.format(tokens, {});
    expect(output).toMatchSnapshot();
    expect(validateCSS(output)).toBe(true);
  });

  it('generates valid Swift', () => {
    const output = swiftFormatter.format(tokens, {});
    expect(output).toMatchSnapshot();
    expect(compileSwift(output)).toBe(true);
  });
});
```

## Implementation Notes

1. Formatters should be stateless
2. Output must be deterministic
3. Generated code should be readable
4. Comments should indicate source token paths
5. Platform conventions should be followed