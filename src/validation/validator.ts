/**
 * Schema-based token validator
 */

import Ajv from "ajv/dist/2020.js";
import type {
  ValidationResult as BaseValidationResult,
  TokenDocument,
  ValidationError,
} from "../types.js";

// Token-specific validation result with reference stats
export interface TokenValidationResult extends BaseValidationResult {
  stats?: {
    totalTokens: number;
    tokensWithReferences: number;
    validReferences: number;
    invalidReferences: number;
  };
}

// For backward compatibility within this module
export type ValidationResult = BaseValidationResult;

import baseSchema from "../schemas/tokens/base.schema.json" with {
  type: "json",
};

// Import schemas directly for bootstrapping
import tokenSchema from "../schemas/tokens/full.schema.json" with {
  type: "json",
};
import borderSchema from "../schemas/tokens/types/border.schema.json" with {
  type: "json",
};
// Import type schemas
import colorSchema from "../schemas/tokens/types/color.schema.json" with {
  type: "json",
};
import cubicBezierSchema from "../schemas/tokens/types/cubic-bezier.schema.json" with {
  type: "json",
};
import dimensionSchema from "../schemas/tokens/types/dimension.schema.json" with {
  type: "json",
};
import durationSchema from "../schemas/tokens/types/duration.schema.json" with {
  type: "json",
};
import fontFamilySchema from "../schemas/tokens/types/font-family.schema.json" with {
  type: "json",
};
import fontWeightSchema from "../schemas/tokens/types/font-weight.schema.json" with {
  type: "json",
};
import gradientSchema from "../schemas/tokens/types/gradient.schema.json" with {
  type: "json",
};
import numberSchema from "../schemas/tokens/types/number.schema.json" with {
  type: "json",
};
import shadowSchema from "../schemas/tokens/types/shadow.schema.json" with {
  type: "json",
};
import strokeStyleSchema from "../schemas/tokens/types/stroke-style.schema.json" with {
  type: "json",
};
import transitionSchema from "../schemas/tokens/types/transition.schema.json" with {
  type: "json",
};
import typographySchema from "../schemas/tokens/types/typography.schema.json" with {
  type: "json",
};
import valueTypesSchema from "../schemas/tokens/value-types.schema.json" with {
  type: "json",
};
import {
  SchemaRegistry,
  type SchemaRegistryOptions,
} from "./schema-registry.js";

export interface ValidatorOptions {
  /**
   * Use strict schema validation (default: true)
   * Set to false for more lenient validation during development
   */
  strict?: boolean;

  /**
   * Schema version to use
   */
  version?: string;

  /**
   * Enable schema registry for loading schemas
   */
  useRegistry?: boolean;

  /**
   * Resolution order for schemas
   */
  resolutionOrder?: Array<"local" | "package" | "url">;
}

/**
 * Token validator using JSON schemas
 */
export class TokenValidator {
  private ajv: Ajv.default;
  private registry: SchemaRegistry;
  private validateTokenDoc: ReturnType<Ajv.default["compile"]> | null = null;
  private strict: boolean;
  private useRegistry: boolean;

  constructor(options: ValidatorOptions = {}) {
    this.strict = options.strict ?? true;
    this.useRegistry = options.useRegistry ?? true; // Default to true for proper schema loading

    // Create schema registry
    const registryOptions: SchemaRegistryOptions = {
      resolutionOrder: options.resolutionOrder ?? ["local", "package", "url"],
      cache: true,
    };
    if (options.version !== undefined) {
      registryOptions.version = options.version;
    }
    this.registry = new SchemaRegistry(registryOptions);

    // Initialize Ajv with loadSchema if using registry
    if (this.useRegistry) {
      this.ajv = new Ajv.default({
        allErrors: true,
        verbose: true,
        strict: false,
        loadSchema: this.registry.createAjvLoader() as (
          uri: string,
        ) => Promise<Record<string, unknown>>,
      });
    } else {
      this.ajv = new Ajv.default({
        allErrors: true,
        verbose: true,
        strict: false,
      });
    }

    // Bootstrap schemas - note this is async but constructor can't await
    // For now, compile synchronously if not using registry
    if (!this.useRegistry) {
      this.initializeSchemasSync();
    }
  }

  /**
   * Create and initialize a validator (async factory method)
   */
  static async create(options: ValidatorOptions = {}): Promise<TokenValidator> {
    const validator = new TokenValidator(options);
    if (validator.useRegistry) {
      await validator.initializeSchemas();
    }
    return validator;
  }

  /**
   * Initialize schemas synchronously (for non-registry mode)
   */
  private initializeSchemasSync(): void {
    if (this.strict && !this.useRegistry) {
      try {
        // Add all schemas by their $id first
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

        // Add each schema - Ajv will use the $id from each schema
        for (const schema of schemas) {
          this.ajv.addSchema(schema);
        }

        // Now compile the main validator
        this.validateTokenDoc = this.ajv.compile(tokenSchema);
      } catch (error) {
        console.warn(
          "Failed to compile schemas, falling back to basic validation:",
          error,
        );
        this.strict = false;
      }
    }
  }

  /**
   * Get all token schemas in order
   */
  private getAllSchemas(): unknown[] {
    return [
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
      tokenSchema,
    ];
  }

  /**
   * Add schema to Ajv if not already present
   */
  private addSchemaIfMissing(schema: unknown): void {
    try {
      const schemaId = (schema as Record<string, unknown>).$id;
      if (schemaId && !this.ajv.getSchema(schemaId as string)) {
        this.ajv.addSchema(schema as Parameters<typeof this.ajv.addSchema>[0]);
      }
    } catch (_e) {
      // Schema might already be added or have other issues
    }
  }

  /**
   * Initialize schemas with registry
   */
  private async initializeWithRegistry(): Promise<void> {
    // Preload all local schemas into the registry
    await this.registry.preloadLocalSchemas();

    // Add the preloaded schemas to Ajv
    const loadedSchemas = this.registry.getLoadedSchemas();
    for (const [, schema] of loadedSchemas) {
      try {
        this.ajv.addSchema(schema);
      } catch (_e) {
        // Schema might already be added
      }
    }

    // Check if we need to add the main schemas
    if (!this.ajv.getSchema(tokenSchema.$id)) {
      const schemas = this.getAllSchemas();
      for (const schema of schemas) {
        this.addSchemaIfMissing(schema);
      }
    }

    // Compile the main validator
    this.validateTokenDoc =
      this.ajv.getSchema(tokenSchema.$id) || this.ajv.compile(tokenSchema);
  }

  /**
   * Initialize schemas without registry
   */
  private initializeWithoutRegistry(): void {
    // Add all schemas except the main token schema
    const schemas = this.getAllSchemas().slice(0, -1);

    for (const schema of schemas) {
      this.ajv.addSchema(schema as Parameters<typeof this.ajv.addSchema>[0]);
    }

    // Compile the main validator
    this.validateTokenDoc = this.ajv.compile(tokenSchema);
  }

  /**
   * Initialize schemas for validation
   */
  private async initializeSchemas(): Promise<void> {
    if (!this.strict) {
      // Fallback to basic validation - just check structure
      // Create a simple schema that validates basic token structure
      const simpleSchema = {
        type: "object",
        additionalProperties: true,
      };
      this.validateTokenDoc = this.ajv.compile(simpleSchema);
      return;
    }

    try {
      if (this.useRegistry) {
        await this.initializeWithRegistry();
      } else {
        this.initializeWithoutRegistry();
      }
    } catch (error) {
      console.warn(
        "Failed to compile schemas, falling back to basic validation:",
        error,
      );
      this.strict = false;
      const simpleSchema = {
        type: "object",
        additionalProperties: true,
      };
      this.validateTokenDoc = this.ajv.compile(simpleSchema);
    }
  }

  /**
   * Validate a token document against DTCG schema
   */
  async validateDocument(document: unknown): Promise<ValidationResult> {
    // Initialize schemas if not already done (for async usage)
    if (this.strict && !this.validateTokenDoc && this.useRegistry) {
      await this.initializeSchemas();
    }

    // Use schema validation if available
    if (this.strict && this.validateTokenDoc) {
      const valid = this.validateTokenDoc(document);

      if (valid) {
        return {
          valid: true,
          errors: [],
          warnings: [],
        };
      }

      return {
        valid: false,
        errors: this.formatAjvErrors(this.validateTokenDoc.errors || []),
        warnings: [],
      };
    }

    // Fallback to basic validation
    return this.basicDocumentValidation(document);
  }

  /**
   * Type guard for valid token document
   */
  isValidDocument(document: unknown): document is TokenDocument {
    const result =
      this.strict && this.validateTokenDoc
        ? this.validateTokenDoc(document)
        : this.basicDocumentValidation(document).valid;

    return Boolean(result);
  }

  /**
   * Basic document validation (fallback)
   */
  private basicDocumentValidation(document: unknown): ValidationResult {
    if (!document || typeof document !== "object") {
      return {
        valid: false,
        errors: [
          {
            path: "",
            message: "Document must be an object",
            severity: "error",
          },
        ],
        warnings: [],
      };
    }

    const errors: ValidationError[] = [];
    this.validateTokenStructure(
      document as Record<string, unknown>,
      "",
      errors,
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate token structure recursively
   */
  private validateTokenStructure(
    obj: Record<string, unknown>,
    path: string,
    errors: ValidationError[],
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Skip metadata fields
      if (key.startsWith("$") && key !== "$value" && key !== "$type") {
        continue;
      }

      if (key === "$value") {
        // This is a token - validate it has a value
        if (value === undefined || value === null) {
          errors.push({
            path,
            message: "Token has invalid $value",
            severity: "error",
          });
        }
      } else if (typeof value === "object" && value !== null) {
        // Recurse into groups
        this.validateTokenStructure(
          value as Record<string, unknown>,
          currentPath,
          errors,
        );
      }
    }
  }

  /**
   * Format Ajv errors into ValidationError objects
   */
  private formatAjvErrors(
    errors: Array<{ instancePath?: string; message?: string }>,
  ): ValidationError[] {
    return errors.map((err) => ({
      path: err.instancePath || "/",
      message: err.message || "Validation error",
      severity: "error" as const,
    }));
  }

  /**
   * Preload schemas using registry
   */
  async preloadSchemas(): Promise<void> {
    if (this.useRegistry) {
      await this.registry.preloadLocalSchemas();
    }
  }

  /**
   * Get schema registry
   */
  getRegistry(): SchemaRegistry {
    return this.registry;
  }
}
