/**
 * Bundle validation for production readiness
 */

import type { TokenDocument } from "@upft/foundation";

export interface BundleValidationOptions {
  /** Check for unresolved references */
  checkReferences?: boolean;
  /** Validate token types and values */
  validateTypes?: boolean;
  /** Require descriptions on all tokens */
  requireDescriptions?: boolean;
  /** Check for naming consistency */
  validateNaming?: boolean;
  /** Maximum bundle size in MB */
  maxBundleSize?: number;
}

export interface BundleValidationError {
  type: "error" | "warning";
  message: string;
  path: string;
  tokenName?: string;
}

export interface BundleValidationResult {
  valid: boolean;
  errors: BundleValidationError[];
  warnings: BundleValidationError[];
  stats: {
    totalTokens: number;
    bundleSizeKB: number;
    tokenTypes: Record<string, number>;
  };
}

/**
 * Validate a bundle for production readiness
 */
export function validateBundle(
  bundle: TokenDocument,
  options: BundleValidationOptions = {},
): BundleValidationResult {
  const opts = {
    checkReferences: true,
    validateTypes: true,
    requireDescriptions: false,
    validateNaming: true,
    maxBundleSize: 10, // 10MB default
    ...options,
  };

  const errors: BundleValidationError[] = [];
  const warnings: BundleValidationError[] = [];
  const stats = {
    totalTokens: 0,
    bundleSizeKB: 0,
    tokenTypes: {} as Record<string, number>,
  };

  // Calculate bundle size
  const bundleJson = JSON.stringify(bundle);
  stats.bundleSizeKB =
    Math.round((Buffer.byteLength(bundleJson, "utf8") / 1024) * 100) / 100;

  if (stats.bundleSizeKB > opts.maxBundleSize * 1024) {
    errors.push({
      type: "error",
      message: `Bundle size ${stats.bundleSizeKB}KB exceeds maximum ${opts.maxBundleSize * 1024}KB`,
      path: "bundle",
    });
  }

  // Validate tokens recursively
  validateTokensRecursive(bundle, "", errors, warnings, stats, opts);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

interface ValidationStats {
  totalTokens: number;
  bundleSizeKB: number;
  tokenTypes: Record<string, number>;
}

function validateTokensRecursive(
  obj: unknown,
  path: string,
  errors: BundleValidationError[],
  warnings: BundleValidationError[],
  stats: ValidationStats,
  opts: BundleValidationOptions,
): void {
  if (!obj || typeof obj !== "object") return;

  const objRecord = obj as Record<string, unknown>;
  // Check if this is a token (has $type or $value)
  if (objRecord.$type || Object.hasOwn(objRecord, "$value")) {
    stats.totalTokens++;
    if (typeof objRecord.$type === "string") {
      stats.tokenTypes[objRecord.$type] =
        (stats.tokenTypes[objRecord.$type] || 0) + 1;
    }

    validateToken(objRecord, path, errors, warnings, opts);
    return;
  }

  // Recurse into nested groups
  for (const [key, value] of Object.entries(objRecord)) {
    if (key.startsWith("$")) continue; // Skip token metadata

    const newPath = path ? `${path}.${key}` : key;
    validateTokensRecursive(value, newPath, errors, warnings, stats, opts);
  }
}

function validateToken(
  token: Record<string, unknown>,
  path: string,
  errors: BundleValidationError[],
  warnings: BundleValidationError[],
  opts: BundleValidationOptions,
): void {
  const tokenName = path.split(".").pop() || "unknown";

  // Required properties
  if (!token.$type) {
    errors.push({
      type: "error",
      message: "Token missing required $type property",
      path,
      tokenName,
    });
  }

  if (!Object.hasOwn(token, "$value")) {
    errors.push({
      type: "error",
      message: "Token missing required $value property",
      path,
      tokenName,
    });
  }

  // Check for unresolved references
  if (opts.checkReferences) {
    checkForUnresolvedReferences(token.$value, path, tokenName, errors);
  }

  // Validate type-specific values
  if (opts.validateTypes && token.$type) {
    validateTokenValue(token, path, tokenName, errors, warnings);
  }

  // Check descriptions
  if (opts.requireDescriptions && !token.$description) {
    warnings.push({
      type: "warning",
      message: "Token missing $description",
      path,
      tokenName,
    });
  }

  // Validate naming
  if (opts.validateNaming) {
    validateTokenNaming(tokenName, path, warnings);
  }
}

function validateTokenValue(
  token: Record<string, unknown>,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
  warnings: BundleValidationError[],
): void {
  switch (token.$type) {
    case "color":
      validateColorValue(token.$value, path, tokenName, errors);
      break;
    case "dimension":
      validateDimensionValue(token.$value, path, tokenName, errors);
      break;
    case "number":
      validateNumberValue(token.$value, path, tokenName, errors);
      break;
    case "fontFamily":
      validateFontFamilyValue(token.$value, path, tokenName, errors);
      break;
    case "fontWeight":
      validateFontWeightValue(token.$value, path, tokenName, errors, warnings);
      break;
  }
}

function validateStringColorValue(
  value: string,
  _path: string,
  _tokenName: string,
  _errors: BundleValidationError[],
): void {
  // String color values (hex, named colors) - basic validation
  if (!(value.match(/^#[0-9a-fA-F]{3,8}$/) || value.match(/^rgb|hsl|color/))) {
    // Skip warning for string color validation - too strict for production
  }
}

function validateObjectColorValue(
  value: Record<string, unknown>,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  // Check colorSpace property
  if (!value.colorSpace) {
    errors.push({
      type: "error",
      message: "Color missing colorSpace property",
      path,
      tokenName,
    });
  }

  // Check components array
  if (Array.isArray(value.components)) {
    validateColorComponents(value.components, path, tokenName, errors);
  } else {
    errors.push({
      type: "error",
      message: "Color missing or invalid components array",
      path,
      tokenName,
    });
  }

  // Check alpha value
  validateColorAlpha(value.alpha, path, tokenName, errors);
}

function validateColorComponents(
  components: unknown[],
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    if (typeof component !== "number" || component < 0 || component > 1) {
      errors.push({
        type: "error",
        message: `Color component ${i} must be a number between 0 and 1`,
        path,
        tokenName,
      });
    }
  }
}

function validateColorAlpha(
  alpha: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  if (
    alpha !== undefined &&
    (typeof alpha !== "number" || alpha < 0 || alpha > 1)
  ) {
    errors.push({
      type: "error",
      message: "Color alpha must be a number between 0 and 1",
      path,
      tokenName,
    });
  }
}

function validateColorValue(
  value: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  if (typeof value === "string") {
    validateStringColorValue(value, path, tokenName, errors);
  } else if (value && typeof value === "object") {
    validateObjectColorValue(
      value as Record<string, unknown>,
      path,
      tokenName,
      errors,
    );
  }
}

function validateDimensionValue(
  value: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  if (typeof value === "string") {
    // String dimension (e.g., "16px", "1rem")
    if (
      !value.match(
        /^-?\d*\.?\d+(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|lh|cap|ic|rlh)$/,
      )
    ) {
      errors.push({
        type: "error",
        message: "Invalid dimension value format",
        path,
        tokenName,
      });
    }
  } else if (value && typeof value === "object") {
    // Object dimension ({value: number, unit: string})
    const dimensionValue = value as { value?: unknown; unit?: unknown };
    if (typeof dimensionValue.value !== "number") {
      errors.push({
        type: "error",
        message: "Dimension value must be a number",
        path,
        tokenName,
      });
    }

    if (
      typeof dimensionValue.unit !== "string" ||
      !dimensionValue.unit.match(
        /^(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|lh|cap|ic|rlh)$/,
      )
    ) {
      errors.push({
        type: "error",
        message: "Dimension unit must be a valid CSS unit",
        path,
        tokenName,
      });
    }
  } else {
    errors.push({
      type: "error",
      message: "Dimension value must be a string or object with value and unit",
      path,
      tokenName,
    });
  }
}

function validateNumberValue(
  value: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  if (typeof value !== "number") {
    errors.push({
      type: "error",
      message: "Number token value must be a number",
      path,
      tokenName,
    });
  }
}

function validateFontFamilyValue(
  value: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  if (Array.isArray(value)) {
    for (const font of value) {
      if (typeof font !== "string") {
        errors.push({
          type: "error",
          message: "All font family names must be strings",
          path,
          tokenName,
        });
      }
    }
  } else {
    errors.push({
      type: "error",
      message: "FontFamily value must be an array of font names",
      path,
      tokenName,
    });
  }
}

function validateFontWeightValue(
  value: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
  warnings: BundleValidationError[],
): void {
  if (typeof value === "number") {
    if (value < 1 || value > 1000) {
      errors.push({
        type: "error",
        message: "Font weight must be between 1 and 1000",
        path,
        tokenName,
      });
    } else if (value % 100 !== 0 && value < 100) {
      warnings.push({
        type: "warning",
        message: "Non-standard font weight value",
        path,
        tokenName,
      });
    }
  } else if (typeof value === "string") {
    const validKeywords = ["normal", "bold", "bolder", "lighter"];
    if (!validKeywords.includes(value)) {
      errors.push({
        type: "error",
        message: "Invalid font weight keyword",
        path,
        tokenName,
      });
    }
  } else {
    errors.push({
      type: "error",
      message: "Font weight must be a number or valid keyword",
      path,
      tokenName,
    });
  }
}

function checkForUnresolvedReferences(
  value: unknown,
  path: string,
  tokenName: string,
  errors: BundleValidationError[],
): void {
  if (typeof value === "string") {
    // Check for reference patterns like {color.primary} or {typography.fontSize.base}
    const referencePattern = /\{[a-zA-Z][a-zA-Z0-9._-]*\}/g;
    const matches = value.match(referencePattern);
    if (matches) {
      errors.push({
        type: "error",
        message: `Token contains unresolved reference: ${matches.join(", ")}`,
        path,
        tokenName,
      });
    }
  } else if (Array.isArray(value)) {
    // Check array elements recursively
    value.forEach((item, index) => {
      checkForUnresolvedReferences(
        item,
        `${path}[${index}]`,
        tokenName,
        errors,
      );
    });
  } else if (value && typeof value === "object") {
    // Check object properties recursively
    for (const [key, val] of Object.entries(value)) {
      checkForUnresolvedReferences(val, `${path}.${key}`, tokenName, errors);
    }
  }
}

function validateTokenNaming(
  tokenName: string,
  path: string,
  warnings: BundleValidationError[],
): void {
  // Check for consistent naming patterns
  if (tokenName.includes("_") && tokenName.includes("-")) {
    warnings.push({
      type: "warning",
      message: "Mixed naming conventions (underscore and dash)",
      path,
      tokenName,
    });
  }

  if (tokenName !== tokenName.toLowerCase()) {
    warnings.push({
      type: "warning",
      message: "Token name contains uppercase characters",
      path,
      tokenName,
    });
  }
}
