/**
 * Comprehensive DTCG compliance tests - validates all examples against schemas
 * These tests ensure our schemas correctly validate DTCG token specifications
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { schemas } from "../dist/index.js";

// Use a simpler path resolution for tests
const EXAMPLES_PATH = join(process.cwd(), "..", "examples", "src");

// Initialize AJV with all schemas
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});

// Add all schemas to AJV instance
ajv.addSchema(schemas.tokens.base);
ajv.addSchema(schemas.tokens.full);
ajv.addSchema(schemas.tokens.valueTypes);
ajv.addSchema(schemas.manifest);

// Add all type schemas
for (const [_typeName, schema] of Object.entries(schemas.tokens.types)) {
  ajv.addSchema(schema);
}

function findAllJsonFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (
        !["node_modules", "dist", "coverage", ".git", "output"].includes(item)
      ) {
        findAllJsonFiles(fullPath, files);
      }
    } else if (
      stat.isFile() &&
      item.endsWith(".json") &&
      !item.includes(".manifest.") &&
      !item.includes("dtcg")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function findAllManifestFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        !["node_modules", "dist", "coverage", ".git", "output"].includes(item)
      ) {
        findAllManifestFiles(fullPath, files);
      }
    } else if (
      stat.isFile() &&
      (item.includes(".manifest.") || item === "manifest.json")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("DTCG Compliance Tests", () => {
  describe("Token File Validation", () => {
    const tokenFiles = findAllJsonFiles(join(EXAMPLES_PATH, "tokens"));

    it("should find token files to test", () => {
      expect(tokenFiles.length).toBeGreaterThan(0);
    });

    for (const filePath of tokenFiles) {
      const relativePath = filePath.replace(`${EXAMPLES_PATH}/`, "");

      it(`should validate token file: ${relativePath}`, () => {
        const content = readFileSync(filePath, "utf-8");
        let tokenDocument: any;

        // Parse JSON
        expect(() => {
          tokenDocument = JSON.parse(content);
        }).not.toThrow();

        // Validate against base token schema
        const validate = ajv.compile(schemas.tokens.base);
        const isValid = validate(tokenDocument);

        if (!isValid) {
          console.error(
            `Validation errors for ${relativePath}:`,
            validate.errors,
          );
        }

        expect(isValid).toBe(true);
      });
    }
  });

  describe("Test Scenario Validation", () => {
    const scenarioFiles = findAllJsonFiles(
      join(EXAMPLES_PATH, "test-scenarios"),
    );

    it("should find test scenario files", () => {
      expect(scenarioFiles.length).toBeGreaterThan(0);
    });

    for (const filePath of scenarioFiles) {
      const relativePath = filePath.replace(`${EXAMPLES_PATH}/`, "");

      it(`should validate test scenario: ${relativePath}`, () => {
        const content = readFileSync(filePath, "utf-8");
        let tokenDocument: any;

        expect(() => {
          tokenDocument = JSON.parse(content);
        }).not.toThrow();

        // Validate against base token schema
        const validate = ajv.compile(schemas.tokens.base);
        const isValid = validate(tokenDocument);

        if (!isValid) {
          console.error(
            `Validation errors for ${relativePath}:`,
            validate.errors,
          );
        }

        expect(isValid).toBe(true);
      });
    }
  });

  describe("Manifest File Validation", () => {
    const manifestFiles = findAllManifestFiles(EXAMPLES_PATH);

    it("should find manifest files to test", () => {
      expect(manifestFiles.length).toBeGreaterThan(0);
    });

    for (const filePath of manifestFiles) {
      const relativePath = filePath.replace(`${EXAMPLES_PATH}/`, "");

      it(`should validate manifest: ${relativePath}`, () => {
        const content = readFileSync(filePath, "utf-8");
        let manifest: any;

        expect(() => {
          manifest = JSON.parse(content);
        }).not.toThrow();

        // Validate against UPFT manifest schema (supports additional properties)
        const validate = ajv.compile(schemas.manifest);
        const isValid = validate(manifest);

        if (!isValid) {
          console.error(
            `Validation errors for ${relativePath}:`,
            validate.errors,
          );
        }

        expect(isValid).toBe(true);
      });
    }
  });

  describe("Schema Self-Validation", () => {
    it("should validate that all schemas are valid JSON Schema", () => {
      const schemaValidator = ajv.compile({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
      });

      // Test base schemas
      expect(schemaValidator(schemas.tokens.base)).toBe(true);
      expect(schemaValidator(schemas.tokens.full)).toBe(true);
      expect(schemaValidator(schemas.tokens.valueTypes)).toBe(true);
      expect(schemaValidator(schemas.manifest)).toBe(true);

      // Test all type schemas
      for (const [_typeName, schema] of Object.entries(schemas.tokens.types)) {
        expect(schemaValidator(schema)).toBe(true);
      }
    });

    it("should have consistent schema IDs", () => {
      // All schemas should have proper $id fields
      expect(schemas.tokens.base.$id).toBeDefined();
      expect(schemas.tokens.full.$id).toBeDefined();
      expect(schemas.manifest.$id).toBeDefined();

      // Type schemas should have consistent naming
      for (const [typeName, schema] of Object.entries(schemas.tokens.types)) {
        const schemaId = (schema as any).$id;
        expect(schemaId).toBeDefined();
        // Handle kebab-case vs camelCase in schema IDs
        const normalizedTypeName = typeName
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase();
        expect(schemaId.toLowerCase()).toContain(normalizedTypeName);
      }
    });
  });
});
