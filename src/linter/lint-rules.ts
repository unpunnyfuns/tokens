/**
 * Validation rules for DTCG token types
 */

/**
 * Validate color value
 */
export function validateColor(value: unknown): boolean {
  if (typeof value !== "string") return false;

  // Hex colors
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    return true;
  }

  // RGB/RGBA
  if (/^rgba?\(/.test(value)) {
    return validateRgbColor(value);
  }

  // HSL/HSLA
  if (/^hsla?\(/.test(value)) {
    return validateHslColor(value);
  }

  // Named colors
  return isNamedColor(value);
}

/**
 * Validate dimension value
 */
export function validateDimension(value: unknown): boolean {
  if (typeof value !== "string") return false;

  // Number with unit
  return /^-?\d+(\.\d+)?(px|rem|em|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/.test(
    value,
  );
}

/**
 * Validate duration value
 */
export function validateDuration(value: unknown): boolean {
  if (typeof value !== "string") return false;

  // Number with time unit
  return /^\d+(\.\d+)?(ms|s)$/.test(value);
}

/**
 * Validate font weight value
 */
export function validateFontWeight(value: unknown): boolean {
  // Numeric weights (100-900)
  if (typeof value === "number") {
    return value >= 100 && value <= 900 && value % 100 === 0;
  }

  // Keyword weights
  if (typeof value === "string") {
    return ["normal", "bold", "lighter", "bolder"].includes(value);
  }

  return false;
}

/**
 * Validate font family value
 */
export function validateFontFamily(value: unknown): boolean {
  if (typeof value === "string" && value.length > 0) {
    return true;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value.every((f) => typeof f === "string" && f.length > 0);
  }

  return false;
}

/**
 * Validate cubic bezier value
 */
export function validateCubicBezier(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== 4) {
    return false;
  }

  return value.every((v) => typeof v === "number");
}

/**
 * Validate number value
 */
export function validateNumber(value: unknown): boolean {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Validate shadow value
 */
export function validateShadow(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.every((v) => validateSingleShadow(v));
  }

  return validateSingleShadow(value);
}

/**
 * Validate border value
 */
export function validateBorder(value: unknown): boolean {
  if (!isObject(value)) return false;

  const border = value as Record<string, unknown>;

  // Required fields
  if (!("width" in border && "style" in border && "color" in border)) {
    return false;
  }

  // Validate width
  if (!validateDimension(border.width)) {
    return false;
  }

  // Validate style
  const validStyles = [
    "solid",
    "dashed",
    "dotted",
    "double",
    "groove",
    "ridge",
    "inset",
    "outset",
    "none",
    "hidden",
  ];
  if (!validStyles.includes(border.style as string)) {
    return false;
  }

  // Validate color
  if (!validateColor(border.color)) {
    return false;
  }

  return true;
}

/**
 * Validate typography value
 */
export function validateTypography(value: unknown): boolean {
  if (!isObject(value)) return false;

  const typography = value as Record<string, unknown>;

  // Check required fields
  if (!validateTypographyRequired(typography)) {
    return false;
  }

  // Check optional fields
  return validateTypographyOptional(typography);
}

/**
 * Validate required typography fields
 */
function validateTypographyRequired(
  typography: Record<string, unknown>,
): boolean {
  if (!("fontFamily" in typography && "fontSize" in typography)) {
    return false;
  }

  if (!validateFontFamily(typography.fontFamily)) {
    return false;
  }

  if (!validateDimension(typography.fontSize)) {
    return false;
  }

  return true;
}

/**
 * Validate optional typography fields
 */
function validateTypographyOptional(
  typography: Record<string, unknown>,
): boolean {
  const validators: Record<string, (value: unknown) => boolean> = {
    fontWeight: validateFontWeight,
    lineHeight: (v) => typeof v === "number" || validateDimension(v),
    letterSpacing: validateDimension,
    fontStyle: (v) => ["normal", "italic", "oblique"].includes(v as string),
    textTransform: (v) =>
      ["none", "uppercase", "lowercase", "capitalize"].includes(v as string),
    textDecoration: (v) =>
      ["none", "underline", "overline", "line-through"].includes(v as string),
  };

  for (const [field, validator] of Object.entries(validators)) {
    if (field in typography && !validator(typography[field])) {
      return false;
    }
  }

  return true;
}

/**
 * Validate stroke style value
 */
export function validateStrokeStyle(value: unknown): boolean {
  if (!isObject(value)) return false;

  const stroke = value as Record<string, unknown>;

  if ("dashArray" in stroke) {
    if (!Array.isArray(stroke.dashArray)) {
      return false;
    }
    if (!stroke.dashArray.every((v) => validateDimension(v))) {
      return false;
    }
  }

  if ("lineCap" in stroke) {
    const validCaps = ["butt", "round", "square"];
    if (!validCaps.includes(stroke.lineCap as string)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate transition value
 */
export function validateTransition(value: unknown): boolean {
  if (!isObject(value)) return false;

  const transition = value as Record<string, unknown>;

  // Duration is required
  if (!("duration" in transition)) {
    return false;
  }

  if (!validateDuration(transition.duration)) {
    return false;
  }

  // Validate optional delay
  if ("delay" in transition && !validateDuration(transition.delay)) {
    return false;
  }

  // Validate timing function
  if ("timingFunction" in transition) {
    const timing = transition.timingFunction;
    if (typeof timing === "string") {
      const validFunctions = [
        "linear",
        "ease",
        "ease-in",
        "ease-out",
        "ease-in-out",
      ];
      if (!validFunctions.includes(timing)) {
        return false;
      }
    } else if (!validateCubicBezier(timing)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate gradient value
 */
export function validateGradient(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }

  return value.every((stop) => {
    if (!isObject(stop)) return false;

    const gradientStop = stop as Record<string, unknown>;

    // Required fields
    if (!("color" in gradientStop && "position" in gradientStop)) {
      return false;
    }

    // Validate color
    if (!validateColor(gradientStop.color)) {
      return false;
    }

    // Validate position (0-1)
    if (typeof gradientStop.position !== "number") {
      return false;
    }

    if (gradientStop.position < 0 || gradientStop.position > 1) {
      return false;
    }

    return true;
  });
}

// Helper functions

function isObject(value: unknown): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateSingleShadow(value: unknown): boolean {
  if (!isObject(value)) return false;

  const shadow = value as Record<string, unknown>;

  // Required fields
  if (
    !(
      "offsetX" in shadow &&
      "offsetY" in shadow &&
      "blur" in shadow &&
      "color" in shadow
    )
  ) {
    return false;
  }

  // Validate dimensions
  if (!validateDimension(shadow.offsetX)) return false;
  if (!validateDimension(shadow.offsetY)) return false;
  if (!validateDimension(shadow.blur)) return false;

  // Validate optional spread
  if ("spread" in shadow && !validateDimension(shadow.spread)) {
    return false;
  }

  // Validate color
  if (!validateColor(shadow.color)) return false;

  return true;
}

function validateRgbColor(value: string): boolean {
  const rgbRegex =
    /^rgba?\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*(?:,\s*([01]?\.?\d*))?\s*\)$/;
  const match = value.match(rgbRegex);

  if (!match) return false;

  // Check RGB values
  if (!validateRgbValues(match)) {
    return false;
  }

  // Check alpha if present
  return validateAlphaValue(match[4]);
}

/**
 * Validate RGB color values
 */
function validateRgbValues(match: RegExpMatchArray): boolean {
  for (let i = 1; i <= 3; i++) {
    const val = match[i];
    if (!val) return false;

    if (val.endsWith("%")) {
      const num = parseInt(val);
      if (num < 0 || num > 100) return false;
    } else {
      const num = parseInt(val);
      if (num < 0 || num > 255) return false;
    }
  }
  return true;
}

/**
 * Validate alpha value
 */
function validateAlphaValue(alpha: string | undefined): boolean {
  if (alpha === undefined) return true;
  const alphaNum = parseFloat(alpha);
  return alphaNum >= 0 && alphaNum <= 1;
}

function validateHslColor(value: string): boolean {
  const hslRegex =
    /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([01]?\.?\d*))?\s*\)$/;
  const match = value.match(hslRegex);

  if (!match) return false;

  // Check hue (0-360)
  if (!match[1]) return false;
  const hue = parseInt(match[1]);
  if (hue < 0 || hue > 360) return false;

  // Check saturation and lightness (0-100%)
  for (let i = 2; i <= 3; i++) {
    if (!match[i]) return false;
    const val = parseInt(match[i] ?? "0");
    if (val < 0 || val > 100) return false;
  }

  // Check alpha if present
  if (match[4] !== undefined) {
    const alpha = parseFloat(match[4]);
    if (alpha < 0 || alpha > 1) return false;
  }

  return true;
}

function isNamedColor(value: string): boolean {
  // CSS named colors (subset of most common)
  const namedColors = [
    "black",
    "white",
    "red",
    "green",
    "blue",
    "yellow",
    "cyan",
    "magenta",
    "gray",
    "grey",
    "silver",
    "maroon",
    "olive",
    "lime",
    "aqua",
    "teal",
    "navy",
    "fuchsia",
    "purple",
    "transparent",
    "currentColor",
  ];

  return namedColors.includes(value.toLowerCase());
}
