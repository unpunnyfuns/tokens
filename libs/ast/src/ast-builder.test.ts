import type { TokenDocument } from "@upft/foundation";
import { describe, expect, it } from "vitest";
import { createAST } from "./ast-builder.js";
import type { GroupNode, TokenNode } from "./types.js";

describe("AST Builder", () => {
  // Note: loadAST function moved to @upft/tokens package (loadTokenFile)
  // AST package now only handles pure AST operations without file I/O

  describe("createAST", () => {
    it("should build AST from token document", async () => {
      const doc = (
        await import("@upft/fixtures/tokens/full-example.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const ast = createAST(doc);

      expect(ast.type).toBe("group");
      expect(ast.groups.size).toBeGreaterThan(0);
      expect(ast.tokens.size).toBe(0); // Root should only have groups
    });

    it("should handle flat token structure", () => {
      const doc: TokenDocument = {
        primary: { $value: "#0066cc", $type: "color" },
        secondary: { $value: "#ff6600", $type: "color" },
        small: { $value: "4px", $type: "dimension" },
      };

      const ast = createAST(doc);

      expect(ast.tokens.size).toBe(3);
      expect(ast.groups.size).toBe(0);

      const primary = ast.tokens.get("primary");
      expect(primary?.typedValue?.$value).toBe("#0066cc");
      expect(primary?.tokenType).toBe("color");
    });

    it("should handle deeply nested structures", () => {
      const doc: TokenDocument = {
        colors: {
          brand: {
            primary: {
              base: { $value: "#0066cc", $type: "color" },
              hover: { $value: "#0099ff", $type: "color" },
              active: { $value: "#0055aa", $type: "color" },
            },
          },
        },
      };

      const ast = createAST(doc);

      // Navigate through the tree
      const colors = ast.groups.get("colors") as GroupNode;
      expect(colors).toBeDefined();

      const brand = colors.groups.get("brand") as GroupNode;
      expect(brand).toBeDefined();

      const primary = brand.groups.get("primary") as GroupNode;
      expect(primary).toBeDefined();
      expect(primary.tokens.size).toBe(3);

      const base = primary.tokens.get("base");
      expect(base?.typedValue?.$value).toBe("#0066cc");
      expect(base?.path).toBe("colors.brand.primary.base");
    });

    it("should extract references from tokens", () => {
      const doc: TokenDocument = {
        base: { $value: "#0066cc", $type: "color" },
        primary: { $value: "{base}", $type: "color" },
        button: { $value: "{primary}", $type: "color" },
      };

      const ast = createAST(doc);

      const primary = ast.tokens.get("primary");
      expect(primary?.references).toContain("{base}");

      const button = ast.tokens.get("button");
      expect(button?.references).toContain("{primary}");
    });

    it("should handle JSON Schema $ref references", () => {
      const doc: TokenDocument = {
        base: { $value: "#0066cc", $type: "color" },
        primary: { $value: { $ref: "#/base/$value" }, $type: "color" },
      };

      const ast = createAST(doc);

      const primary = ast.tokens.get("primary");
      // $ref should remain in typedValue for reference resolver to handle
      expect(primary?.typedValue?.$value).toEqual({ $ref: "#/base/$value" });
      // $ref should not be in references array (handled separately)
      expect(primary?.references).toBeUndefined();
    });

    it("should preserve token metadata", () => {
      const doc: TokenDocument = {
        primary: {
          $value: "#0066cc",
          $type: "color",
          $description: "Primary brand color",
          $extensions: {
            custom: "metadata",
          },
        },
      };

      const ast = createAST(doc);

      const primary = ast.tokens.get("primary");
      expect(primary?.metadata?.description).toBe("Primary brand color");
      expect(primary?.metadata?.extensions).toEqual({ custom: "metadata" });
    });

    it("should handle mixed tokens and groups", () => {
      const doc: TokenDocument = {
        $description: "Mixed structure",
        baseColor: { $value: "#0066cc", $type: "color" },
        colors: {
          primary: { $value: "{baseColor}", $type: "color" },
          secondary: { $value: "#ff6600", $type: "color" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const ast = createAST(doc);

      expect(ast.tokens.has("baseColor")).toBe(true);
      expect(ast.groups.has("colors")).toBe(true);
      expect(ast.groups.has("spacing")).toBe(true);

      const colors = ast.groups.get("colors") as GroupNode;
      expect(colors.tokens.size).toBe(2);
    });

    it("should set parent references correctly", () => {
      const doc: TokenDocument = {
        colors: {
          primary: { $value: "#0066cc", $type: "color" },
        },
      };

      const ast = createAST(doc);
      const colors = ast.groups.get("colors") as GroupNode;
      const primary = colors.tokens.get("primary") as TokenNode;

      expect(colors.parent).toBe(ast);
      expect(primary.parent).toBe(colors);
    });

    it("should handle empty documents", () => {
      const ast = createAST({});

      expect(ast.type).toBe("group");
      expect(ast.tokens.size).toBe(0);
      expect(ast.groups.size).toBe(0);
    });

    it("should handle documents with only metadata", () => {
      const doc: TokenDocument = {
        $description: "Empty token file",
        $extensions: {
          version: "1.0.0",
        },
      };

      const ast = createAST(doc);

      expect(ast.tokens.size).toBe(0);
      expect(ast.groups.size).toBe(0);
      expect(ast.metadata?.description).toBe("Empty token file");
    });
  });

  describe("error handling", () => {
    it("should handle invalid token structures gracefully", async () => {
      const doc = (
        await import("@upft/fixtures/error-cases/broken-references.json", {
          with: { type: "json" },
        })
      ).default as TokenDocument;
      const ast = createAST(doc);

      // Should still build AST even with broken references
      expect(ast).toBeDefined();
      expect(ast.type).toBe("group");
    });

    it("should mark unresolved references", () => {
      const doc: TokenDocument = {
        primary: { $value: "{nonexistent}", $type: "color" },
      };

      const ast = createAST(doc);
      const primary = ast.tokens.get("primary");

      expect(primary?.references).toContain("{nonexistent}");
      expect(primary?.resolved).toBe(false);
    });
  });
});
