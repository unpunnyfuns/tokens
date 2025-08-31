/**
 * Test schemas against example token files
 */

// Import example tokens directly using package exports
import fullExample from "@upft/fixtures/tokens/full-example.json" with {
  type: "json",
};
import primitiveColors from "@upft/fixtures/tokens/primitives/colors.json" with {
  type: "json",
};
import primitiveTypography from "@upft/fixtures/tokens/primitives/typography.json" with {
  type: "json",
};
import semanticColors from "@upft/fixtures/tokens/semantic/colors.json" with {
  type: "json",
};
import lightTheme from "@upft/fixtures/tokens/themes/light.json" with {
  type: "json",
};
import Ajv from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { getSchemaForType, schemas } from "../dist/index.js";

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  loadSchema: false,
});

// Add all schemas to AJV with proper IDs
ajv.addSchema(schemas.tokens.valueTypes);
for (const schema of Object.values(schemas.tokens.types)) {
  ajv.addSchema(schema);
}
ajv.addSchema(schemas.tokens.base);
ajv.addSchema(schemas.tokens.full);

describe("Schema Validation Against Examples", () => {
  it("should validate full-example.json against base schema", () => {
    const tokens = fullExample;
    const validate = ajv.compile(schemas.tokens.base);
    const isValid = validate(tokens);

    if (!isValid) {
      console.log("Validation errors:", validate.errors);
    }
    expect(isValid).toBe(true);
  });

  it("should validate primitive colors against base schema", () => {
    const tokens = primitiveColors;
    const validate = ajv.compile(schemas.tokens.base);
    const isValid = validate(tokens);

    if (!isValid) {
      console.log("Validation errors:", validate.errors);
    }
    expect(isValid).toBe(true);
  });

  it("should validate typography tokens against base schema", () => {
    const tokens = primitiveTypography;
    const validate = ajv.compile(schemas.tokens.base);
    const isValid = validate(tokens);

    if (!isValid) {
      console.log("Validation errors:", validate.errors);
    }
    expect(isValid).toBe(true);
  });

  it("should validate semantic colors against base schema", () => {
    const tokens = semanticColors;
    const validate = ajv.compile(schemas.tokens.base);
    const isValid = validate(tokens);

    if (!isValid) {
      console.log("Validation errors:", validate.errors);
    }
    expect(isValid).toBe(true);
  });

  it("should validate themes against base schema", () => {
    const tokens = lightTheme;
    const validate = ajv.compile(schemas.tokens.base);
    const isValid = validate(tokens);

    if (!isValid) {
      console.log("Validation errors:", validate.errors);
    }
    expect(isValid).toBe(true);
  });

  describe("Schema availability", () => {
    it("should have all required schemas", () => {
      expect(schemas.tokens.base).toBeDefined();
      expect(schemas.tokens.full).toBeDefined();
      expect(schemas.tokens.valueTypes).toBeDefined();
      expect(schemas.tokens.types.color).toBeDefined();
      expect(schemas.tokens.types.dimension).toBeDefined();
      expect(schemas.tokens.types.typography).toBeDefined();
    });

    it("should export getSchemaForType utility", () => {
      expect(getSchemaForType("color")).toBeDefined();
      expect(getSchemaForType("dimension")).toBeDefined();
      expect(getSchemaForType("typography")).toBeDefined();
    });
  });
});
