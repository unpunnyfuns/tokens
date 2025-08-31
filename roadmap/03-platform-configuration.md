# Platform Configuration

## Overview

Platform configuration allows defining platform-specific build targets with their own transforms, formatters, and output settings.

## Schema

```typescript
interface PlatformConfig {
  transforms?: string[];
  formats: FormatConfig[];
  tokenFilter?: (token: Token) => boolean;
  buildPath?: string;
  options?: Record<string, unknown>;
}

interface FormatConfig {
  format: string;
  destination: string;
  options?: Record<string, unknown>;
}

interface ManifestWithPlatforms extends UPFTResolverManifest {
  platforms?: Record<string, PlatformConfig>;
}
```

## Configuration Examples

### Basic Platform Setup

```json
{
  "platforms": {
    "web": {
      "transforms": ["dimension/px-to-rem", "color/hex"],
      "buildPath": "dist/web/",
      "formats": [
        {
          "format": "css",
          "destination": "tokens.css"
        }
      ]
    },
    "ios": {
      "transforms": ["dimension/px-to-pt", "color/UIColor", "name/pascal"],
      "buildPath": "dist/ios/",
      "formats": [
        {
          "format": "ios-swift",
          "destination": "Tokens.swift",
          "options": {
            "className": "DesignTokens"
          }
        }
      ]
    },
    "android": {
      "transforms": ["dimension/px-to-dp", "color/hex8-android"],
      "buildPath": "dist/android/",
      "formats": [
        {
          "format": "android-resources",
          "destination": "values/"
        }
      ]
    }
  }
}
```

### Token Filtering per Platform

```javascript
{
  "platforms": {
    "web": {
      "tokenFilter": (token) => !token.platform || token.platform.includes('web'),
      "formats": [/* ... */]
    },
    "mobile": {
      "tokenFilter": (token) => token.$type !== 'asset',
      "formats": [/* ... */]
    }
  }
}
```

## Platform Builder

```typescript
class PlatformBuilder {
  constructor(
    private transformRegistry: TransformRegistry,
    private formatterRegistry: FormatterRegistry
  ) {}

  async build(
    tokens: TokenDocument,
    platformConfig: PlatformConfig,
    platformName: string
  ): Promise<BuildResult[]> {
    // 1. Filter tokens
    let processedTokens = platformConfig.tokenFilter 
      ? filterTokens(tokens, platformConfig.tokenFilter)
      : tokens;

    // 2. Apply transforms
    if (platformConfig.transforms) {
      processedTokens = this.transformRegistry.execute(
        processedTokens,
        platformConfig.transforms,
        { platform: platformName, options: platformConfig.options }
      );
    }

    // 3. Generate formats
    const results: BuildResult[] = [];
    for (const formatConfig of platformConfig.formats) {
      const output = this.formatterRegistry.format(
        processedTokens,
        formatConfig.format,
        formatConfig.options
      );

      const destination = path.join(
        platformConfig.buildPath || '',
        formatConfig.destination
      );

      results.push({
        destination,
        content: output,
        platform: platformName,
        format: formatConfig.format
      });
    }

    return results;
  }

  async buildAll(
    tokens: TokenDocument,
    platforms: Record<string, PlatformConfig>
  ): Promise<Map<string, BuildResult[]>> {
    const results = new Map<string, BuildResult[]>();
    
    for (const [name, config] of Object.entries(platforms)) {
      results.set(name, await this.build(tokens, config, name));
    }
    
    return results;
  }
}
```

## Platform-Specific Features

### Web Platform

```typescript
const webPlatform: PlatformConfig = {
  transforms: [
    'attribute/cti',
    'dimension/px-to-rem',
    'color/hex',
    'name/kebab'
  ],
  formats: [
    {
      format: 'css',
      destination: 'tokens.css',
      options: {
        selector: ':root',
        mediaQueries: {
          dark: '@media (prefers-color-scheme: dark)'
        }
      }
    },
    {
      format: 'scss',
      destination: '_tokens.scss',
      options: {
        includeMaps: true
      }
    },
    {
      format: 'javascript',
      destination: 'tokens.js',
      options: {
        format: 'esm'
      }
    }
  ]
};
```

### iOS Platform

```typescript
const iosPlatform: PlatformConfig = {
  transforms: [
    'dimension/px-to-pt',
    'color/UIColor',
    'name/pascal'
  ],
  tokenFilter: (token) => {
    // Exclude web-only tokens
    return !token.platforms || token.platforms.includes('ios');
  },
  formats: [
    {
      format: 'ios-swift',
      destination: 'Tokens.swift',
      options: {
        className: 'Tokens',
        accessibility: 'public',
        imports: ['UIKit', 'SwiftUI']
      }
    },
    {
      format: 'ios-plist',
      destination: 'Tokens.plist'
    }
  ]
};
```

### Android Platform

```typescript
const androidPlatform: PlatformConfig = {
  transforms: [
    'dimension/px-to-dp',
    'color/hex8-android',
    'name/snake'
  ],
  formats: [
    {
      format: 'android-resources',
      destination: 'res/values/',
      options: {
        resourceType: 'split' // Separate colors.xml, dimens.xml
      }
    },
    {
      format: 'kotlin',
      destination: 'Tokens.kt',
      options: {
        package: 'com.example.tokens'
      }
    }
  ]
};
```

## Conditional Platform Builds

```typescript
interface ConditionalPlatform extends PlatformConfig {
  condition?: {
    modifiers?: Record<string, string>;
    environment?: string;
  };
}

// Example: Dark mode specific platform
{
  "platforms": {
    "web-dark": {
      "condition": {
        "modifiers": { "theme": "dark" }
      },
      "transforms": ["color/darken"],
      "formats": [
        {
          "format": "css",
          "destination": "tokens-dark.css",
          "options": {
            "selector": "[data-theme='dark']"
          }
        }
      ]
    }
  }
}
```

## CLI Commands

```bash
# Build specific platform
upft build manifest.json --platform web

# Build all platforms
upft build manifest.json --all-platforms

# Build with override
upft build manifest.json --platform ios --build-path ./custom-output/
```

## Programmatic API

```typescript
import { PlatformBuilder } from '@unpunnyfuns/tokens/platforms';

const builder = new PlatformBuilder(transformRegistry, formatterRegistry);

// Build single platform
const results = await builder.build(tokens, webPlatform, 'web');

// Build all platforms
const allResults = await builder.buildAll(tokens, platforms);

// Write results
for (const result of results) {
  await fs.writeFile(result.destination, result.content);
}
```

## Platform Presets

```typescript
// Built-in platform presets
export const platformPresets = {
  web: { /* ... */ },
  ios: { /* ... */ },
  android: { /* ... */ },
  'react-native': { /* ... */ },
  flutter: { /* ... */ }
};

// Use preset with overrides
const customWeb = {
  ...platformPresets.web,
  buildPath: 'custom/path/',
  formats: [
    ...platformPresets.web.formats,
    { format: 'typescript', destination: 'tokens.ts' }
  ]
};
```

## Testing

```typescript
describe('Platform Configuration', () => {
  it('filters tokens by platform', () => {
    const filtered = applyPlatformFilter(tokens, iosPlatform.tokenFilter);
    expect(filtered).not.toContainTokenWithPlatform('web-only');
  });

  it('applies platform transforms', async () => {
    const result = await builder.build(tokens, webPlatform, 'web');
    expect(result[0].content).toContain('rem');
  });

  it('generates platform-specific outputs', async () => {
    const results = await builder.buildAll(tokens, platforms);
    expect(results.get('ios')?.[0]).toMatchSnapshot();
    expect(results.get('android')?.[0]).toMatchSnapshot();
  });
});
```