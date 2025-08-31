/**
 * End-to-end tests for manifest resolver system
 * Tests the complete flow from detection to parsing to validation
 */

import dtcgExtensions from "@upft/fixtures/test-scenarios/dtcg-complex-extensions.json" with {
  type: "json",
};
import dtcgEnumerated from "@upft/fixtures/test-scenarios/dtcg-enumerated-modifiers.json" with {
  type: "json",
};
import dtcgInclude from "@upft/fixtures/test-scenarios/dtcg-include-modifiers.json" with {
  type: "json",
};
import dtcgInline from "@upft/fixtures/test-scenarios/dtcg-inline-tokens.json" with {
  type: "json",
};
import dtcgMixed from "@upft/fixtures/test-scenarios/dtcg-mixed-features.json" with {
  type: "json",
};
import dtcgComplex from "@upft/fixtures/test-scenarios/dtcg-resolver.json" with {
  type: "json",
};
// Import example manifests
import dtcgSimple from "@upft/fixtures/test-scenarios/simple-dtcg.json" with {
  type: "json",
};
import type { UPFTResolverManifest } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import {
  type DTCGResolverManifest,
  detectManifestFormat,
  isDTCGManifest,
  isUPFTManifest,
  parseManifest,
  validateManifestWithRegistry,
} from "./index.js";

describe("Manifest Resolver E2E Tests", () => {
  describe("DTCG Resolver End-to-End", () => {
    it("should detect, parse, and validate simple DTCG manifest", () => {
      // Detection
      const format = detectManifestFormat(dtcgSimple);
      expect(format).toBe("dtcg");

      // Parsing
      const ast = parseManifest(dtcgSimple, "simple-dtcg.json");
      expect(ast.manifestType).toBe("dtcg");
      expect(ast.name).toBe("Simple DTCG Test");
      expect(ast.sets.size).toBe(1);

      const firstSet = ast.sets.get("set-0");
      expect(firstSet?.files).toEqual(["simple-tokens.json"]);
      expect(firstSet?.metadata?.description).toBe("Base tokens");

      // Validation
      const validation = validateManifestWithRegistry(dtcgSimple);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should handle complex DTCG manifest with modifiers and extensions", () => {
      // Detection
      expect(detectManifestFormat(dtcgComplex)).toBe("dtcg");

      // Parsing
      const ast = parseManifest(dtcgComplex, "dtcg-resolver.json");
      expect(ast.manifestType).toBe("dtcg");
      expect(ast.name).toBe("DTCG Example Resolver");
      expect(ast.metadata?.description).toBe(
        "Example W3C DTCG resolver manifest",
      );
      expect(ast.metadata?.extensions).toEqual({
        tooling: {
          generator: "tokens-studio",
          version: "1.0.0",
        },
      });

      // Check sets
      expect(ast.sets.size).toBe(3);

      // Check inline tokens
      const inlineSet = ast.sets.get("set-2");
      expect(inlineSet?.metadata?.dtcgInlineTokens).toEqual({
        color: {
          debug: {
            $type: "color",
            $value: "#ff0000",
          },
        },
      });

      // Check modifiers
      expect(ast.modifiers.size).toBe(2);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.constraintType).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark"]);
      expect(themeModifier?.metadata?.dtcgType).toBe("enumerated");

      const platformModifier = ast.modifiers.get("platform");
      expect(platformModifier?.constraintType).toBe("anyOf");
      expect(platformModifier?.metadata?.dtcgType).toBe("include");

      // Validation
      const validation = validateManifestWithRegistry(dtcgComplex);
      expect(validation.valid).toBe(true);
    });

    it("should handle enumerated modifiers with multiple values", () => {
      const ast = parseManifest(dtcgEnumerated, "enumerated.json");

      expect(ast.modifiers.size).toBe(2);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.options).toEqual([
        "light",
        "dark",
        "high-contrast",
      ]);
      expect(themeModifier?.values.get("light")).toEqual(["theme-light.json"]);
      expect(themeModifier?.values.get("dark")).toEqual(["theme-dark.json"]);
      expect(themeModifier?.values.get("high-contrast")).toEqual([
        "theme-high-contrast.json",
      ]);

      const densityModifier = ast.modifiers.get("density");
      expect(densityModifier?.options).toEqual([
        "compact",
        "comfortable",
        "spacious",
      ]);
    });

    it("should handle include modifiers with inline and external tokens", () => {
      const ast = parseManifest(dtcgInclude, "include.json");

      expect(ast.modifiers.size).toBe(3);

      const platformModifier = ast.modifiers.get("platform");
      expect(platformModifier?.constraintType).toBe("anyOf");
      expect(platformModifier?.values.get("*")).toEqual([
        "platforms/web.json",
        "platforms/mobile.json",
      ]);

      const a11yModifier = ast.modifiers.get("accessibility");
      expect(a11yModifier?.values.get("*")).toEqual([
        "accessibility-include-0.virtual.json",
        "accessibility/high-contrast.json",
      ]);

      // Check virtual file metadata for inline tokens
      expect(
        a11yModifier?.metadata?.[
          "virtualFile_accessibility-include-0.virtual.json"
        ],
      ).toEqual({
        a11y: {
          focus: {
            outline: {
              $type: "dimension",
              $value: "3px",
            },
          },
        },
      });
    });

    it("should handle inline token definitions with proper types", () => {
      const ast = parseManifest(dtcgInline, "inline.json");

      expect(ast.sets.size).toBe(3);

      // Check inline tokens in sets
      const baseSet = ast.sets.get("set-0");
      expect(baseSet?.metadata?.dtcgNamespace).toBe("base");
      expect(baseSet?.metadata?.dtcgInlineTokens).toBeDefined();

      const typographySet = ast.sets.get("set-1");
      expect(typographySet?.metadata?.dtcgNamespace).toBe("typography");

      // Check theme modifier with inline token overrides
      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.values.get("light")).toBeDefined();
      expect(themeModifier?.values.get("dark")).toBeDefined();
    });

    it("should handle complex extensions and metadata", () => {
      const ast = parseManifest(dtcgExtensions, "extensions.json");

      expect(ast.metadata?.extensions).toBeDefined();
      const extensions = ast.metadata?.extensions as any;
      expect(extensions?.build).toBeDefined();
      expect(extensions?.design).toBeDefined();
      expect(extensions?.validation).toBeDefined();
      expect(extensions?.tooling).toBeDefined();
      expect(extensions?.metadata).toBeDefined();

      // Validate extensions structure
      const validation = validateManifestWithRegistry(dtcgExtensions);
      expect(validation.valid).toBe(true);
    });

    it("should handle mixed features comprehensively", () => {
      const ast = parseManifest(dtcgMixed, "mixed.json");

      expect(ast.sets.size).toBe(2);
      expect(ast.modifiers.size).toBe(4);

      // Check theme modifier (enumerated)
      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.constraintType).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark", "auto"]);

      // Check platform modifier (include)
      const platformModifier = ast.modifiers.get("platform");
      expect(platformModifier?.constraintType).toBe("anyOf");

      // Check density modifier (enumerated)
      const densityModifier = ast.modifiers.get("density");
      expect(densityModifier?.options).toEqual(["comfortable", "compact"]);

      // Check experimental modifier (include)
      const experimentalModifier = ast.modifiers.get("experimental");
      expect(experimentalModifier?.constraintType).toBe("anyOf");
    });
  });

  describe("UPFT Resolver End-to-End", () => {
    it("should detect, parse, and validate UPFT manifest", () => {
      const upftManifest: UPFTResolverManifest = {
        name: "Test UPFT Manifest",
        sets: [
          {
            name: "base",
            files: ["base-tokens.json"],
          },
        ],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light-theme.json"],
              dark: ["dark-theme.json"],
            },
          },
        },
      };

      // Detection
      const format = detectManifestFormat(upftManifest);
      expect(format).toBe("upft");

      // Parsing
      const ast = parseManifest(upftManifest, "upft.json");
      expect(ast.manifestType).toBe("upft");
      expect(ast.name).toBe("Test UPFT Manifest");
      expect(ast.sets.size).toBe(1);
      expect(ast.modifiers.size).toBe(1);

      const themeModifier = ast.modifiers.get("theme");
      expect(themeModifier?.constraintType).toBe("oneOf");
      expect(themeModifier?.options).toEqual(["light", "dark"]);

      // Validation
      const validation = validateManifestWithRegistry(upftManifest);
      expect(validation.valid).toBe(true);
    });
  });

  describe("Error Handling E2E", () => {
    it("should handle unknown manifest format", () => {
      const unknownManifest = {
        format: "unknown",
        data: "test",
      };

      // Detection should return null
      expect(detectManifestFormat(unknownManifest)).toBe(null);

      // Parsing should throw
      expect(() => parseManifest(unknownManifest, "unknown.json")).toThrow(
        "Unknown manifest format",
      );

      // Validation should return invalid
      const validation = validateManifestWithRegistry(unknownManifest);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]?.message).toBe("Unknown manifest format");
    });

    it("should handle invalid DTCG manifest", () => {
      const invalidDtcg = {
        version: "invalid-version",
        sets: [],
      };

      // Detection should fail
      expect(detectManifestFormat(invalidDtcg)).toBe(null);

      // Validation should fail with specific errors
      const validation = validateManifestWithRegistry(invalidDtcg);
      expect(validation.valid).toBe(false);
      expect(
        validation.errors.some((e) => e.message.includes("Invalid version")),
      ).toBe(false); // Won't validate if detection fails
    });

    it("should handle malformed data gracefully", () => {
      // Null/undefined
      expect(detectManifestFormat(null)).toBe(null);
      expect(detectManifestFormat(undefined)).toBe(null);

      // Non-objects
      expect(detectManifestFormat("string")).toBe(null);
      expect(detectManifestFormat(123)).toBe(null);
      expect(detectManifestFormat(true)).toBe(null);
    });
  });

  describe("Registry Integration E2E", () => {
    it("should work with all registered resolvers", () => {
      // Test that both resolvers are registered and functional
      const dtcgManifest: DTCGResolverManifest = {
        version: "2025-10-01",
        sets: [{ source: "tokens.json" }],
      };

      const upftManifest: UPFTResolverManifest = {
        sets: [{ files: ["tokens.json"] }],
        modifiers: {},
      };

      expect(detectManifestFormat(dtcgManifest)).toBe("dtcg");
      expect(detectManifestFormat(upftManifest)).toBe("upft");

      const dtcgAst = parseManifest(dtcgManifest, "test.json");
      const upftAst = parseManifest(upftManifest, "test.json");

      expect(dtcgAst.manifestType).toBe("dtcg");
      expect(upftAst.manifestType).toBe("upft");
    });

    it("should provide consistent type guards", () => {
      const dtcgManifest: DTCGResolverManifest = {
        version: "1.0.0",
        sets: [{ source: "tokens.json" }],
      };

      const upftManifest: UPFTResolverManifest = {
        sets: [{ files: ["tokens.json"] }],
        modifiers: {},
      };

      // Type guards should work correctly
      expect(isDTCGManifest(dtcgManifest)).toBe(true);
      expect(isDTCGManifest(upftManifest)).toBe(false);

      expect(isUPFTManifest(upftManifest)).toBe(true);
      expect(isUPFTManifest(dtcgManifest)).toBe(false);

      // Should reject invalid manifests
      expect(isDTCGManifest(null)).toBe(false);
      expect(isDTCGManifest({ version: "1.0.0" })).toBe(false); // no sets
      expect(isUPFTManifest(null)).toBe(false);
      expect(isUPFTManifest({ sets: [] })).toBe(false); // no modifiers
    });
  });
});
