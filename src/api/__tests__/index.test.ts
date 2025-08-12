import { describe, expect, test } from "vitest";
import * as API from "../index.ts";

describe("API exports", () => {
  test("exports core functionality", () => {
    // AST functions
    expect(typeof API.buildEnhancedAST).toBe("function");
    expect(typeof API.getEnhancedAST).toBe("function");
    expect(typeof API.validateWithAST).toBe("function");

    // Resolver functions
    expect(typeof API.resolveReferences).toBe("function");
    expect(typeof API.ReferenceResolver).toBe("function");
    expect(typeof API.parseReference).toBe("function");
    expect(typeof API.isValidReferenceFormat).toBe("function");

    // Validation functions
    expect(typeof API.validateReferences).toBe("function");
  });

  test("exports bundler API", () => {
    expect(typeof API.bundleWithMetadata).toBe("function");
    expect(typeof API.createBundlerPlugin).toBe("function");
    expect(typeof API.bundle).toBe("function");
    expect(typeof API.convertToDTCG).toBe("function");
    expect(typeof API.convertRefToAlias).toBe("function");
    // convertAliasToRef removed - no use case for reverse conversion
  });

  test("exports external resolver functions", () => {
    expect(typeof API.resolveExternalReferences).toBe("function");
    expect(typeof API.checkForExternalReferences).toBe("function");
    expect(typeof API.loadExternalFile).toBe("function");
  });

  test("exports validation API", () => {
    expect(typeof API.validateFiles).toBe("function");
    expect(typeof API.validateResolverManifest).toBe("function");
    expect(typeof API.resolveTokens).toBe("function");
    expect(typeof API.validateTokenFile).toBe("function");
    // validateTokenStructure doesn't exist in the module
  });

  test("exports CLI commands API", () => {
    expect(typeof API.executeValidate).toBe("function");
    expect(typeof API.executeBundle).toBe("function");
    expect(typeof API.executeAST).toBe("function");
    expect(typeof API.formatError).toBe("function");
    expect(typeof API.getExitCode).toBe("function");
  });

  test("exports utility functions", () => {
    expect(typeof API.getTokenStats).toBe("function");
    expect(typeof API.getProjectRoot).toBe("function");
  });

  test("API functions are properly bound", async () => {
    // Test that we can call a function without errors
    const tokens = {
      color: {
        $type: "color",
        $value: {
          colorSpace: "srgb",
          components: [1, 0, 0],
          alpha: 1,
          hex: "#ff0000",
        },
      },
    };

    // Should not throw
    const ast = API.buildEnhancedAST(tokens);
    expect(ast).toBeDefined();
    expect(ast.tokens).toBeDefined();
    expect(ast.stats).toBeDefined();

    // Test validation
    const validation = API.validateReferences(tokens);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    // Test token stats
    const stats = API.getTokenStats(tokens);
    expect(stats.totalTokens).toBeGreaterThan(0);
  });

  test("can use exported types", () => {
    // This test mainly verifies that the types are exported correctly
    // TypeScript compilation will fail if types are not properly exported

    const validationResult: API.ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        totalReferences: 0,
        validReferences: 0,
        invalidReferences: 0,
      },
    };
    expect(validationResult.valid).toBe(true);

    const bundleOptions: API.BundleOptions = {
      manifest: "/test/manifest.json",
    };
    expect(bundleOptions.manifest).toBeDefined();

    const validateOptions: API.ValidateCommandOptions = {
      path: "/test/path",
    };
    expect(validateOptions.path).toBeDefined();
  });
});
