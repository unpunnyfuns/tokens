/**
 * Lint rules for UPFT tokens
 */

import type { Token } from "@upft/foundation";
import type { LintRule } from "./token-types.js";

/**
 * Check if metadata properties are in expected order
 */
function areMetadataPropertiesOrdered(
  token: Token,
  expectedOrder: string[],
): boolean {
  const tokenKeys = Object.keys(token).filter((key) => key.startsWith("$"));
  const positions = expectedOrder
    .map((prop) => tokenKeys.indexOf(prop))
    .filter((index) => index !== -1);

  for (let i = 1; i < positions.length; i++) {
    const current = positions[i];
    const previous = positions[i - 1];
    if (current !== undefined && previous !== undefined && current < previous) {
      return false;
    }
  }

  return true;
}

/**
 * Parse dimension value to numeric
 */
function parseDimension(value: string): { value: number; unit: string } | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(.*)/);
  if (!match?.[1]) return null;
  return {
    value: parseFloat(match[1]),
    unit: match[2] || "px",
  };
}

/**
 * Extract font size from token
 */
function extractFontSize(token: Token, path: string): string | null {
  if (token.$type === "dimension" && path.toLowerCase().includes("font")) {
    return token.$value as string;
  }

  if (
    token.$type === "typography" &&
    token.$value &&
    typeof token.$value === "object"
  ) {
    const typography = token.$value as Record<string, unknown>;
    return typography.fontSize as string;
  }

  return null;
}

/**
 * Convert dimension to pixels
 */
function toPx(value: number, unit: string): number {
  if (unit === "rem" || unit === "em") {
    return value * 16;
  }
  return value;
}

/**
 * Compare font sizes
 */
function compareFontSizes(size1: string, size2: string): number | null {
  const parsed1 = parseDimension(size1);
  const parsed2 = parseDimension(size2);

  if (!(parsed1 && parsed2)) return null;

  const px1 = toPx(parsed1.value, parsed1.unit);
  const px2 = toPx(parsed2.value, parsed2.unit);

  return px1 - px2;
}

/**
 * All lint rules
 */
export const RULES: Record<string, LintRule> = {
  // Accessibility & UX
  "prefer-rem-over-px": {
    name: "prefer-rem-over-px",
    description: "Prefer rem units over px for better accessibility",
    category: "accessibility",
    check: (token, path, options) => {
      const ignore = (options.ignore as string[]) || ["border", "outline"];

      // Check if path contains ignored patterns
      for (const pattern of ignore) {
        if (path.toLowerCase().includes(pattern)) {
          return null;
        }
      }

      if (token.$type === "dimension" && typeof token.$value === "string") {
        if (token.$value.endsWith("px")) {
          return {
            path,
            rule: "prefer-rem-over-px",
            severity: "warn",
            message:
              "Consider using rem instead of px for better accessibility",
            fix: `Convert ${token.$value} to rem (divide by 16)`,
          };
        }
      }
      return null;
    },
  },

  "min-font-size": {
    name: "min-font-size",
    description: "Ensure font sizes meet minimum accessibility standards",
    category: "accessibility",
    check: (token, path, options) => {
      const minSize = (options.minSize as string) || "12px";
      const fontSize = extractFontSize(token, path);

      if (!fontSize) return null;

      const comparison = compareFontSizes(fontSize, minSize);
      if (comparison && comparison < 0) {
        return {
          path,
          rule: "min-font-size",
          severity: "warn",
          message: `Font size ${fontSize} is below minimum ${minSize}`,
        };
      }

      return null;
    },
  },

  // Naming Conventions
  "naming-convention": {
    name: "naming-convention",
    description: "Enforce consistent naming conventions",
    category: "naming",
    check: (_, path, options) => {
      const style = (options.style as string) || "any";
      const allowLeadingUnderscore = options.allowLeadingUnderscore as boolean;

      if (style === "any") return null;

      const segments = path.split(".");
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment) return null;

      // Remove leading underscore if allowed
      const nameToCheck =
        allowLeadingUnderscore && lastSegment.startsWith("_")
          ? lastSegment.slice(1)
          : lastSegment;

      const patterns = {
        camelCase: /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/,
        "kebab-case": /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
      };

      const pattern = patterns[style as keyof typeof patterns];
      if (pattern && !pattern.test(nameToCheck)) {
        return {
          path,
          rule: "naming-convention",
          severity: "warn",
          message: `Token name should use ${style}`,
        };
      }

      return null;
    },
  },

  "naming-hierarchy": {
    name: "naming-hierarchy",
    description: "Enforce hierarchical naming patterns",
    category: "naming",
    check: (_, path, options) => {
      const separator = (options.separator as string) || ".";
      const minDepth = (options.minDepth as number) || 2;

      const segments = path.split(separator);
      if (segments.length < minDepth) {
        return {
          path,
          rule: "naming-hierarchy",
          severity: "warn",
          message: `Token path should have at least ${minDepth} levels (e.g., category${separator}property)`,
        };
      }
      return null;
    },
  },

  // Documentation
  "description-required": {
    name: "description-required",
    description: "All tokens should have descriptions",
    category: "documentation",
    check: (token, path) => {
      if (!token.$description) {
        return {
          path,
          rule: "description-required",
          severity: "warn",
          message: "Token should have a $description",
        };
      }
      return null;
    },
  },

  "group-description-required": {
    name: "group-description-required",
    description: "Groups should have descriptions",
    category: "documentation",
    check: () => {
      // This rule needs to be handled at the group level, not token level
      // Will be implemented in the linter class
      return null;
    },
  },

  "description-min-length": {
    name: "description-min-length",
    description: "Descriptions should be meaningful",
    category: "documentation",
    check: (token, path, options) => {
      const minLength = (options.minLength as number) || 10;

      if (token.$description && token.$description.length < minLength) {
        return {
          path,
          rule: "description-min-length",
          severity: "warn",
          message: `Description should be at least ${minLength} characters`,
        };
      }
      return null;
    },
  },

  // Organization
  "max-nesting-depth": {
    name: "max-nesting-depth",
    description: "Limit token nesting depth",
    category: "organization",
    check: (_, path, options) => {
      const maxDepth = (options.maxDepth as number) || 4;
      const depth = path.split(".").length;

      if (depth > maxDepth) {
        return {
          path,
          rule: "max-nesting-depth",
          severity: "warn",
          message: `Token is nested ${depth} levels deep (max: ${maxDepth})`,
        };
      }
      return null;
    },
  },

  "consistent-property-order": {
    name: "consistent-property-order",
    description: "Enforce consistent property order in tokens",
    category: "organization",
    check: (token, path, options) => {
      const expectedOrder = (options.order as string[]) || [
        "$type",
        "$value",
        "$description",
      ];

      if (!areMetadataPropertiesOrdered(token, expectedOrder)) {
        return {
          path,
          rule: "consistent-property-order",
          severity: "warn",
          message: `Properties should be ordered: ${expectedOrder.join(", ")}`,
        };
      }

      return null;
    },
  },

  "no-mixed-token-types": {
    name: "no-mixed-token-types",
    description: "Groups shouldn't mix unrelated token types",
    category: "organization",
    check: () => {
      // This rule needs to be handled at the group level
      // Will be implemented in the linter class
      return null;
    },
  },

  // Design System Quality
  "unused-tokens": {
    name: "unused-tokens",
    description: "Find tokens that are not referenced",
    category: "quality",
    check: () => {
      // This rule needs document-level analysis
      // Will be implemented in the linter class
      return null;
    },
  },

  "duplicate-values": {
    name: "duplicate-values",
    description: "Find tokens with identical values",
    category: "quality",
    check: () => {
      // This rule needs document-level analysis
      // Will be implemented in the linter class
      return null;
    },
  },

  "prefer-references": {
    name: "prefer-references",
    description: "Suggest using references for repeated values",
    category: "quality",
    check: () => {
      // This rule needs document-level analysis
      // Will be implemented in the linter class
      return null;
    },
  },
};
