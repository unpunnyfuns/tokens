/**
 * Token-type-aware discriminated unions for AST nodes
 * Hand-crafted based on DTCG schemas for maximum type safety
 */

// Base token reference type with template literal pattern
export type TokenReference = `{${string}}`;

// Color token types based on color.schema.json
export interface ColorValue {
  colorSpace:
    | "srgb"
    | "srgb-linear"
    | "hsl"
    | "hwb"
    | "lab"
    | "lch"
    | "oklab"
    | "oklch"
    | "display-p3"
    | "a98-rgb"
    | "prophoto-rgb"
    | "rec2020"
    | "xyz-d65"
    | "xyz-d50";
  components: [number, number, number];
  alpha?: number;
  hex?: string;
}

export interface ColorToken {
  $type: "color";
  $value: TokenReference | ColorValue;
}

// Dimension token types
export interface DimensionValue {
  value: number;
  unit: "px" | "rem";
}

export interface DimensionToken {
  $type: "dimension";
  $value: TokenReference | DimensionValue;
}

// Duration token types
export interface DurationValue {
  value: number;
  unit: "ms" | "s";
}

export interface DurationToken {
  $type: "duration";
  $value: TokenReference | DurationValue | string; // supports "100ms" format
}

// Number token type
export interface NumberToken {
  $type: "number";
  $value: TokenReference | number;
}

// Font Family token type
export interface FontFamilyToken {
  $type: "fontFamily";
  $value: TokenReference | string | string[]; // single font or stack
}

// Font Weight token type
export type FontWeightKeyword =
  | "thin"
  | "hairline"
  | "extra-light"
  | "ultra-light"
  | "light"
  | "normal"
  | "regular"
  | "medium"
  | "semi-bold"
  | "demi-bold"
  | "bold"
  | "extra-bold"
  | "ultra-bold"
  | "black"
  | "heavy"
  | "extra-black"
  | "ultra-black";

export interface FontWeightToken {
  $type: "fontWeight";
  $value: TokenReference | number | FontWeightKeyword; // 1-1000 or keyword
}

// Cubic Bezier token type
export interface CubicBezierToken {
  $type: "cubicBezier";
  $value: TokenReference | [number, number, number, number];
}

// Stroke Style token type
export type StrokeStyleKeyword =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "groove"
  | "ridge"
  | "outset"
  | "inset";

export interface StrokeStyleObject {
  dashArray: DimensionValue[];
  lineCap?: "round" | "butt" | "square";
}

export interface StrokeStyleToken {
  $type: "strokeStyle";
  $value: TokenReference | StrokeStyleKeyword | StrokeStyleObject;
}

// Border token type
export interface BorderValue {
  color: TokenReference | ColorValue;
  width: TokenReference | DimensionValue;
  style: TokenReference | StrokeStyleKeyword | StrokeStyleObject;
}

export interface BorderToken {
  $type: "border";
  $value: TokenReference | BorderValue;
}

// Transition token type
export interface TransitionValue {
  duration: TokenReference | DurationValue | string;
  delay?: TokenReference | DurationValue | string;
  timingFunction: TokenReference | [number, number, number, number]; // cubic-bezier
}

export interface TransitionToken {
  $type: "transition";
  $value: TokenReference | TransitionValue;
}

// Shadow token type
export interface ShadowValue {
  color: TokenReference | ColorValue;
  offsetX: TokenReference | DimensionValue;
  offsetY: TokenReference | DimensionValue;
  blur: TokenReference | DimensionValue;
  spread: TokenReference | DimensionValue;
  inset?: boolean;
}

export interface ShadowToken {
  $type: "shadow";
  $value: TokenReference | ShadowValue | ShadowValue[]; // single or multiple shadows
}

// Gradient token type
export interface GradientStop {
  color: TokenReference | ColorValue;
  position: TokenReference | number; // 0-1
}

export interface LinearGradient {
  type: "linear";
  angle: TokenReference | number; // degrees
  stops: GradientStop[];
}

export interface RadialGradient {
  type: "radial";
  shape?: "circle" | "ellipse";
  stops: GradientStop[];
}

export interface ConicGradient {
  type: "conic";
  angle?: TokenReference | number;
  stops: GradientStop[];
}

export type GradientValue = LinearGradient | RadialGradient | ConicGradient;

export interface GradientToken {
  $type: "gradient";
  $value: TokenReference | GradientValue;
}

// Typography token type
export interface TypographyValue {
  fontFamily: TokenReference | string | string[];
  fontSize: TokenReference | DimensionValue;
  fontWeight: TokenReference | number | FontWeightKeyword;
  letterSpacing?: TokenReference | DimensionValue;
  lineHeight?: TokenReference | number; // multiplier
}

export interface TypographyToken {
  $type: "typography";
  $value: TokenReference | TypographyValue;
}

// Discriminated union of all token types
export type TypedToken =
  | ColorToken
  | DimensionToken
  | DurationToken
  | NumberToken
  | FontFamilyToken
  | FontWeightToken
  | CubicBezierToken
  | StrokeStyleToken
  | BorderToken
  | TransitionToken
  | ShadowToken
  | GradientToken
  | TypographyToken;

// Extract token type from discriminated union
export type TokenType = TypedToken["$type"];

// Extract value type for a given token type
export type TokenValueForType<T extends TokenType> = Extract<
  TypedToken,
  { $type: T }
>["$value"];

// Type guards for discriminating token types
export function isColorToken(token: TypedToken): token is ColorToken {
  return token.$type === "color";
}

export function isDimensionToken(token: TypedToken): token is DimensionToken {
  return token.$type === "dimension";
}

export function isDurationToken(token: TypedToken): token is DurationToken {
  return token.$type === "duration";
}

export function isNumberToken(token: TypedToken): token is NumberToken {
  return token.$type === "number";
}

export function isFontFamilyToken(token: TypedToken): token is FontFamilyToken {
  return token.$type === "fontFamily";
}

export function isFontWeightToken(token: TypedToken): token is FontWeightToken {
  return token.$type === "fontWeight";
}

export function isCubicBezierToken(
  token: TypedToken,
): token is CubicBezierToken {
  return token.$type === "cubicBezier";
}

export function isStrokeStyleToken(
  token: TypedToken,
): token is StrokeStyleToken {
  return token.$type === "strokeStyle";
}

export function isBorderToken(token: TypedToken): token is BorderToken {
  return token.$type === "border";
}

export function isTransitionToken(token: TypedToken): token is TransitionToken {
  return token.$type === "transition";
}

export function isShadowToken(token: TypedToken): token is ShadowToken {
  return token.$type === "shadow";
}

export function isGradientToken(token: TypedToken): token is GradientToken {
  return token.$type === "gradient";
}

export function isTypographyToken(token: TypedToken): token is TypographyToken {
  return token.$type === "typography";
}

// Utility to check if a value is a token reference
export function isTokenReference(value: unknown): value is TokenReference {
  return typeof value === "string" && /^\{[^{}]+\}$/.test(value);
}
