# Storybook Addon

## Overview

A Storybook addon for documenting and interacting with UPFT tokens. Provides visual components for displaying tokens, switching permutations, and validating token usage.

## Package Structure

```
packages/storybook-addon-upft/
├── src/
│   ├── register.tsx       # Addon registration
│   ├── preset.ts          # Storybook preset
│   ├── Panel.tsx          # Main addon panel
│   ├── Tool.tsx           # Toolbar component
│   ├── components/        # Display components
│   ├── hooks/            # React hooks
│   └── utils/            # Utilities
├── package.json
└── tsconfig.json
```

## Core Components

### Token Provider

Props-first with optional context fallback:

```tsx
interface TokenProviderProps {
  tokens?: TokenDocument;
  manifest?: string | UPFTResolverManifest;
  permutation?: Record<string, string>;
  children: React.ReactNode;
}

// Usage - Direct tokens
<TokenProvider tokens={myTokens}>
  <ColorGrid />
</TokenProvider>

// Usage - Manifest
<TokenProvider manifest="./tokens/manifest.json" permutation={{ theme: 'dark' }}>
  <ColorGrid />
</TokenProvider>
```

### Display Components

#### ColorGrid

```tsx
interface ColorGridProps {
  tokens?: Token[];
  columns?: number;
  showValue?: boolean;
  showName?: boolean;
  copyFormat?: 'hex' | 'rgb' | 'hsl' | 'css-var';
}

<ColorGrid 
  tokens={colorTokens}
  columns={4}
  copyFormat="css-var"
/>
```

#### Typography Display

```tsx
interface TypographyDisplayProps {
  tokens?: Token[];
  sampleText?: string;
  groupBy?: 'size' | 'weight' | 'family';
}

<TypographyDisplay 
  tokens={typographyTokens}
  sampleText="The quick brown fox"
  groupBy="size"
/>
```

#### Spacing Scale

```tsx
interface SpacingScaleProps {
  tokens?: Token[];
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
}

<SpacingScale 
  tokens={spacingTokens}
  orientation="horizontal"
  showValues
/>
```

### Interactive Components

#### Permutation Selector

```tsx
interface PermutationSelectorProps {
  manifest: UPFTResolverManifest;
  current?: Record<string, string>;
  onChange: (permutation: Record<string, string>) => void;
}

// Renders dropdowns for each modifier
<PermutationSelector 
  manifest={manifest}
  current={{ theme: 'light', density: 'comfortable' }}
  onChange={(permutation) => console.log('Selected:', permutation)}
/>
```

#### Token Search

```tsx
interface TokenSearchProps {
  tokens: Token[];
  onSelect: (token: Token) => void;
  placeholder?: string;
}

<TokenSearch 
  tokens={allTokens}
  onSelect={(token) => copyToClipboard(token.$value)}
  placeholder="Search tokens..."
/>
```

## Hooks

### useTokensWithFallback

Core hook for the props-first pattern:

```tsx
function useTokensWithFallback<T extends Token>({
  tokens,      // Direct tokens (priority)
  type,        // Filter by type
  filter,      // Custom filter
  transform,   // Transform tokens
  sortBy,      // Sort function
}): {
  tokens: T[];
  loading: boolean;
  error?: Error;
  source: 'props' | 'context' | 'none';
}

// Usage
const MyComponent = ({ tokens: propTokens }) => {
  const { tokens, source } = useTokensWithFallback({
    tokens: propTokens,
    type: 'color',
    filter: (t) => !t.deprecated
  });
  
  return <div>Using tokens from: {source}</div>;
};
```

### useManifest

Load and resolve UPFT manifests:

```tsx
function useManifest(
  manifestPath: string
): {
  manifest?: UPFTResolverManifest;
  permutations: ResolvedPermutation[];
  loading: boolean;
  error?: Error;
}

// Usage
const { manifest, permutations } = useManifest('./tokens/manifest.json');
```

### usePermutation

Manage current permutation state:

```tsx
function usePermutation(
  manifest: UPFTResolverManifest
): {
  current: Record<string, string>;
  tokens: TokenDocument;
  setModifier: (key: string, value: string) => void;
  reset: () => void;
}

// Usage
const { current, tokens, setModifier } = usePermutation(manifest);
```

## Storybook Integration

### Configuration

```javascript
// .storybook/main.js
module.exports = {
  addons: ['@unpunnyfuns/storybook-addon-upft'],
  
  // Optional global configuration
  upft: {
    manifest: './tokens/manifest.json',
    defaultPermutation: { theme: 'light' },
    autoInjectCSS: true
  }
};
```

### Preview Setup

```javascript
// .storybook/preview.js
import { TokenProvider } from '@unpunnyfuns/storybook-addon-upft';

export const decorators = [
  (Story, context) => (
    <TokenProvider 
      manifest={context.parameters.upft?.manifest}
      permutation={context.parameters.upft?.permutation}
    >
      <Story />
    </TokenProvider>
  )
];
```

### Story Parameters

```tsx
// Component.stories.tsx
export default {
  title: 'Components/Button',
  parameters: {
    upft: {
      tokens: ['color.primary', 'spacing.medium'],
      permutation: { theme: 'dark' }
    }
  }
};

export const Default = {
  parameters: {
    upft: {
      highlight: ['color.primary'] // Highlight specific tokens
    }
  }
};
```

## Panel Features

### Token Browser

Browse all tokens in a searchable, filterable interface:

```tsx
interface TokenBrowserProps {
  onTokenSelect?: (token: Token) => void;
  filters?: {
    types?: string[];
    groups?: string[];
    search?: string;
  };
}
```

### Permutation Comparison

Compare tokens across different permutations:

```tsx
interface PermutationDiffProps {
  left: Record<string, string>;
  right: Record<string, string>;
  showOnlyDifferent?: boolean;
}
```

### Token Validation

Real-time validation of tokens in stories:

```tsx
interface TokenValidatorProps {
  tokens: TokenDocument;
  rules?: string[];
  showWarnings?: boolean;
}
```

### Export Tools

Export current tokens in various formats:

```tsx
interface TokenExportProps {
  tokens: TokenDocument;
  formats: Array<'css' | 'scss' | 'json' | 'typescript'>;
  onExport: (format: string, content: string) => void;
}
```

## Toolbar Integration

Add controls to Storybook toolbar:

```tsx
// Permutation switcher in toolbar
export const tool = {
  id: 'upft-permutation',
  title: 'Token Permutation',
  match: ({ viewMode }) => viewMode === 'story',
  render: () => <PermutationTool />
};

// Theme switcher
export const themeTool = {
  id: 'upft-theme',
  title: 'Theme',
  render: () => <ThemeSwitcher />
};
```

## CSS Variable Injection

Automatically inject tokens as CSS variables:

```tsx
function CSSVariableInjector({ tokens }: { tokens: TokenDocument }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = generateCSSVariables(tokens);
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [tokens]);
  
  return null;
}
```

## Testing

```typescript
describe('Storybook Addon', () => {
  it('provides tokens via context', () => {
    const { result } = renderHook(() => useTokens(), {
      wrapper: ({ children }) => (
        <TokenProvider tokens={mockTokens}>{children}</TokenProvider>
      )
    });
    
    expect(result.current).toEqual(mockTokens);
  });

  it('switches permutations', () => {
    const { result } = renderHook(() => usePermutation(manifest));
    
    act(() => {
      result.current.setModifier('theme', 'dark');
    });
    
    expect(result.current.current.theme).toBe('dark');
  });
});
```

## Build Configuration

```json
{
  "name": "@unpunnyfuns/storybook-addon-upft",
  "main": "dist/preset.js",
  "exports": {
    ".": {
      "require": "./dist/preset.js"
    },
    "./register": {
      "require": "./dist/register.js"
    },
    "./preview": {
      "require": "./dist/preview.js"
    }
  },
  "peerDependencies": {
    "@storybook/addon-kit": "^7.0.0",
    "@unpunnyfuns/tokens": "^1.0.0",
    "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
  }
}
```