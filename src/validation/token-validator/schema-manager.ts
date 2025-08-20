/**
 * Schema management and AJV instance handling
 */

import Ajv from "ajv/dist/2020.js";
// Import base schemas
import baseSchema from "../../schemas/tokens/base.schema.json" with {
  type: "json",
};
import tokenSchema from "../../schemas/tokens/full.schema.json" with {
  type: "json",
};
// Import type schemas
import borderSchema from "../../schemas/tokens/types/border.schema.json" with {
  type: "json",
};
import colorSchema from "../../schemas/tokens/types/color.schema.json" with {
  type: "json",
};
import cubicBezierSchema from "../../schemas/tokens/types/cubic-bezier.schema.json" with {
  type: "json",
};
import dimensionSchema from "../../schemas/tokens/types/dimension.schema.json" with {
  type: "json",
};
import durationSchema from "../../schemas/tokens/types/duration.schema.json" with {
  type: "json",
};
import fontFamilySchema from "../../schemas/tokens/types/font-family.schema.json" with {
  type: "json",
};
import fontWeightSchema from "../../schemas/tokens/types/font-weight.schema.json" with {
  type: "json",
};
import gradientSchema from "../../schemas/tokens/types/gradient.schema.json" with {
  type: "json",
};
import numberSchema from "../../schemas/tokens/types/number.schema.json" with {
  type: "json",
};
import shadowSchema from "../../schemas/tokens/types/shadow.schema.json" with {
  type: "json",
};
import strokeStyleSchema from "../../schemas/tokens/types/stroke-style.schema.json" with {
  type: "json",
};
import transitionSchema from "../../schemas/tokens/types/transition.schema.json" with {
  type: "json",
};
import typographySchema from "../../schemas/tokens/types/typography.schema.json" with {
  type: "json",
};
import valueTypesSchema from "../../schemas/tokens/value-types.schema.json" with {
  type: "json",
};
import type { ValidationError } from "../../types/validation.js";

// Cache compiled validators
const validatorCache = new Map<string, ReturnType<Ajv.default["compile"]>>();
let ajvInstance: Ajv.default | null = null;

/**
 * Get or create AJV instance
 */
function getAjv(): Ajv.default {
  if (!ajvInstance) {
    ajvInstance = new Ajv.default({
      allErrors: true,
      verbose: true,
      strict: false,
    });

    // Add all schemas
    const schemas = [
      baseSchema,
      valueTypesSchema,
      colorSchema,
      dimensionSchema,
      fontFamilySchema,
      fontWeightSchema,
      durationSchema,
      numberSchema,
      shadowSchema,
      typographySchema,
      cubicBezierSchema,
      strokeStyleSchema,
      borderSchema,
      transitionSchema,
      gradientSchema,
    ];

    for (const schema of schemas) {
      ajvInstance.addSchema(schema);
    }
  }

  return ajvInstance;
}

/**
 * Get compiled validator for a schema
 */
export function getValidator(
  schemaId: string,
): ReturnType<Ajv.default["compile"]> {
  const cached = validatorCache.get(schemaId);
  if (cached) return cached;

  const ajv = getAjv();
  const validator = ajv.compile(
    schemaId === "full" ? tokenSchema : { type: "object" },
  );
  validatorCache.set(schemaId, validator);
  return validator;
}

/**
 * Format AJV errors to our error format
 */
export function formatAjvErrors(
  errors: Ajv.ErrorObject[],
  limit = 100,
): ValidationError[] {
  return errors.slice(0, limit).map((error) => ({
    path: error.instancePath || "/",
    message:
      error.message || `Validation failed at ${error.instancePath || "root"}`,
    severity: "error" as const,
    rule: error.keyword,
    context: error.params,
  }));
}
