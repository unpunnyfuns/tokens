/**
 * JSON Schema exports for UPFT
 */

import manifestSchema from "./manifest-upft.json" with { type: "json" };
import baseSchema from "./tokens/base.schema.json" with { type: "json" };
import fullSchema from "./tokens/full.schema.json" with { type: "json" };
// Type schemas
import borderSchema from "./tokens/types/border.schema.json" with {
  type: "json",
};
import colorSchema from "./tokens/types/color.schema.json" with {
  type: "json",
};
import cubicBezierSchema from "./tokens/types/cubic-bezier.schema.json" with {
  type: "json",
};
import dimensionSchema from "./tokens/types/dimension.schema.json" with {
  type: "json",
};
import durationSchema from "./tokens/types/duration.schema.json" with {
  type: "json",
};
import fontFamilySchema from "./tokens/types/font-family.schema.json" with {
  type: "json",
};
import fontWeightSchema from "./tokens/types/font-weight.schema.json" with {
  type: "json",
};
import gradientSchema from "./tokens/types/gradient.schema.json" with {
  type: "json",
};
import numberSchema from "./tokens/types/number.schema.json" with {
  type: "json",
};
import shadowSchema from "./tokens/types/shadow.schema.json" with {
  type: "json",
};
import strokeStyleSchema from "./tokens/types/stroke-style.schema.json" with {
  type: "json",
};
import transitionSchema from "./tokens/types/transition.schema.json" with {
  type: "json",
};
import typographySchema from "./tokens/types/typography.schema.json" with {
  type: "json",
};
import valueTypesSchema from "./tokens/value-types.schema.json" with {
  type: "json",
};

export const schemas = {
  manifest: manifestSchema,
  tokens: {
    base: baseSchema,
    full: fullSchema,
    valueTypes: valueTypesSchema,
    types: {
      border: borderSchema,
      color: colorSchema,
      cubicBezier: cubicBezierSchema,
      dimension: dimensionSchema,
      duration: durationSchema,
      fontFamily: fontFamilySchema,
      fontWeight: fontWeightSchema,
      gradient: gradientSchema,
      number: numberSchema,
      shadow: shadowSchema,
      strokeStyle: strokeStyleSchema,
      transition: transitionSchema,
      typography: typographySchema,
    },
  },
};

/**
 * Get JSON schema for a specific token type
 *
 * @param type - Token type (e.g., 'color', 'dimension', 'shadow')
 * @returns JSON schema object or null if type not found
 */
export function getSchemaForType(type: string) {
  return (schemas.tokens.types as Record<string, unknown>)[type] || null;
}
