/**
 * Tests for schema exports and utilities
 */

import { describe, expect, it } from "vitest";
import { getSchemaForType, schemas } from "./index.js";

describe("Schema Exports", () => {
  describe("schemas object", () => {
    it("should export manifest schema", () => {
      expect(schemas.manifest).toBeDefined();
      expect(schemas.manifest.$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
      expect(schemas.manifest.title).toContain("UPFT");
    });

    it("should export base token schema", () => {
      expect(schemas.tokens.base).toBeDefined();
      expect(schemas.tokens.base.$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    });

    it("should export full token schema", () => {
      expect(schemas.tokens.full).toBeDefined();
      expect(schemas.tokens.full.$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    });

    it("should export value types schema", () => {
      expect(schemas.tokens.valueTypes).toBeDefined();
      expect(schemas.tokens.valueTypes.$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    });

    it("should export all type schemas", () => {
      const expectedTypes = [
        "border",
        "color",
        "cubicBezier",
        "dimension",
        "duration",
        "fontFamily",
        "fontWeight",
        "gradient",
        "number",
        "shadow",
        "strokeStyle",
        "transition",
        "typography",
      ];

      for (const type of expectedTypes) {
        expect(schemas.tokens.types[type]).toBeDefined();
        expect(schemas.tokens.types[type].$schema).toBe(
          "https://json-schema.org/draft/2020-12/schema",
        );
      }
    });
  });

  describe("getSchemaForType", () => {
    it("should return correct schema for valid types", () => {
      const colorSchema = getSchemaForType("color");
      expect(colorSchema).toBe(schemas.tokens.types.color);

      const dimensionSchema = getSchemaForType("dimension");
      expect(dimensionSchema).toBe(schemas.tokens.types.dimension);

      const shadowSchema = getSchemaForType("shadow");
      expect(shadowSchema).toBe(schemas.tokens.types.shadow);
    });

    it("should return null for invalid types", () => {
      expect(getSchemaForType("invalid")).toBeNull();
      expect(getSchemaForType("")).toBeNull();
      expect(getSchemaForType("notAType")).toBeNull();
    });

    it("should handle edge cases", () => {
      expect(getSchemaForType("Color")).toBeNull(); // case sensitive
      expect(getSchemaForType("DIMENSION")).toBeNull(); // case sensitive
      expect(getSchemaForType("font-family")).toBeNull(); // wrong format (should be fontFamily)
    });

    it("should return expected schema properties", () => {
      const colorSchema = getSchemaForType("color") as any;
      expect(colorSchema).toHaveProperty("$schema");
      expect(colorSchema).toHaveProperty("title");
      expect(colorSchema.title).toContain("Color");
    });
  });

  describe("schema structure validation", () => {
    it("should have valid JSON schema structure for all schemas", () => {
      const allSchemas = [
        schemas.manifest,
        schemas.tokens.base,
        schemas.tokens.full,
        schemas.tokens.valueTypes,
        ...Object.values(schemas.tokens.types),
      ];

      for (const schema of allSchemas) {
        expect(schema).toHaveProperty("$schema");
        expect(schema).toHaveProperty("title");
        expect(schema.$schema).toBe(
          "https://json-schema.org/draft/2020-12/schema",
        );
      }
    });

    it("should have consistent type schema naming", () => {
      const typeSchemas = schemas.tokens.types;

      // Check that camelCase keys match schema titles appropriately
      expect(typeSchemas.fontFamily.title).toContain("Font Family");
      expect(typeSchemas.fontWeight.title).toContain("Font Weight");
      expect(typeSchemas.cubicBezier.title).toContain("Cubic Bezier");
      expect(typeSchemas.strokeStyle.title).toContain("Stroke Style");
    });
  });
});
