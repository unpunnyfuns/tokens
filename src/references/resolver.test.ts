import { describe, expect, it } from "vitest";
import {
  buildDependencyGraph,
  extractReference,
  getAllReferences,
  hasReferences,
  normalizeReference,
  resolveReferences,
} from "./resolver.js";

describe("Reference Resolver", () => {
  describe("hasReferences", () => {
    it("should detect DTCG references", () => {
      expect(hasReferences("{color.primary}")).toBe(true);
      expect(hasReferences("not a reference")).toBe(false);
      expect(hasReferences("#ff0000")).toBe(false);
    });

    it("should detect references in arrays", () => {
      expect(hasReferences(["{color.primary}", "#ff0000"])).toBe(true);
      expect(hasReferences(["#ff0000", "#00ff00"])).toBe(false);
    });

    it("should detect references in objects", () => {
      expect(hasReferences({ color: "{color.primary}" })).toBe(true);
      expect(hasReferences({ $ref: "#/color/primary" })).toBe(true);
      expect(hasReferences({ color: "#ff0000" })).toBe(false);
    });
  });

  describe("extractReference", () => {
    it("should extract DTCG reference path", () => {
      expect(extractReference("{color.primary}")).toBe("color.primary");
      expect(extractReference("{spacing.small}")).toBe("spacing.small");
    });

    it("should return null for non-references", () => {
      expect(extractReference("not a reference")).toBe(null);
      expect(extractReference("{incomplete")).toBe(null);
      expect(extractReference("multiple {ref} here")).toBe(null);
    });
  });

  describe("normalizeReference", () => {
    it("should convert JSON pointer to dot notation", () => {
      expect(normalizeReference("#/color/primary")).toBe("color.primary");
      expect(normalizeReference("#/spacing/component/button")).toBe(
        "spacing.component.button",
      );
    });

    it("should remove $value suffix", () => {
      expect(normalizeReference("#/color/primary/$value")).toBe(
        "color.primary",
      );
    });

    it("should handle external file references", () => {
      expect(normalizeReference("tokens.json#/color/primary")).toBe(
        "color.primary",
      );
    });

    it("should return dot notation as-is", () => {
      expect(normalizeReference("color.primary")).toBe("color.primary");
    });
  });

  describe("resolveReferences", () => {
    it("should resolve simple references", () => {
      const document = {
        color: {
          red: { $value: "#ff0000" },
          primary: { $value: "{color.red}" },
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.color).toEqual({
        red: { $value: "#ff0000" },
        primary: { $value: "#ff0000" },
      });
    });

    it("should resolve nested references", () => {
      const document = {
        color: {
          base: { $value: "#ff0000" },
          primary: { $value: "{color.base}" },
          button: { $value: "{color.primary}" },
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(true);
      expect((result.tokens.color as any).button.$value).toBe("#ff0000");
      // Chain should show the resolution path
      const chain = result.chains.get("color.button");
      expect(chain).toBeDefined();
      expect(chain).toContain("color.primary");
    });

    it("should detect circular references", () => {
      const document = {
        color: {
          a: { $value: "{color.b}" },
          b: { $value: "{color.a}" },
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.type).toBe("circular");
    });

    it("should handle missing references", () => {
      const document = {
        color: {
          primary: { $value: "{color.nonexistent}" },
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe("missing");
      expect((result.tokens.color as any).primary.$value).toBe(
        "{color.nonexistent}",
      );
    });

    it("should resolve references in composite values", () => {
      const document = {
        spacing: {
          small: { $value: "4px" },
        },
        shadow: {
          default: {
            $value: {
              x: "0",
              y: "{spacing.small}",
              blur: "8px",
              color: "#000000",
            },
          },
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(true);
      const shadow = (result.tokens.shadow as any).default.$value;
      expect(shadow.y).toBe("4px");
    });

    it("should resolve references in arrays", () => {
      const document = {
        color: {
          red: { $value: "#ff0000" },
          blue: { $value: "#0000ff" },
        },
        gradient: {
          $value: ["{color.red}", "{color.blue}"],
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(true);
      expect((result.tokens.gradient as any).$value).toEqual([
        "#ff0000",
        "#0000ff",
      ]);
    });

    it("should handle JSON Schema $ref format", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
        theme: {
          main: { $value: { $ref: "#/color/primary" } },
        },
      };

      const result = resolveReferences(document);

      expect(result.success).toBe(true);
      expect((result.tokens.theme as any).main.$value).toBe("#ff0000");
    });

    it("should respect maxDepth option", () => {
      const document = {
        a: { $value: "{b}" },
        b: { $value: "{c}" },
        c: { $value: "{d}" },
        d: { $value: "value" },
      };

      const result = resolveReferences(document, { maxDepth: 2 });

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.type === "depth")).toBe(true);
    });

    it("should handle partial resolution", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
          secondary: { $value: "{color.missing}" },
          tertiary: { $value: "{color.primary}" },
        },
      };

      const result = resolveReferences(document, { partial: true });

      expect((result.tokens.color as any).primary.$value).toBe("#ff0000");
      expect((result.tokens.color as any).tertiary.$value).toBe("#ff0000");
      expect((result.tokens.color as any).secondary.$value).toBe(
        "{color.missing}",
      );
    });
  });

  describe("getAllReferences", () => {
    it("should extract all references from document", () => {
      const document = {
        color: {
          primary: { $value: "{color.base}" },
          secondary: { $value: "#00ff00" },
        },
        spacing: {
          button: { $value: "{spacing.small}" },
        },
      };

      const refs = getAllReferences(document);

      expect(refs.size).toBe(2);
      expect(refs.get("color.primary")).toEqual(["color.base"]);
      expect(refs.get("spacing.button")).toEqual(["spacing.small"]);
    });

    it("should extract multiple references from composite values", () => {
      const document = {
        shadow: {
          default: {
            $value: {
              x: "{spacing.small}",
              y: "{spacing.small}",
              color: "{color.shadow}",
            },
          },
        },
      };

      const refs = getAllReferences(document);

      expect(refs.get("shadow.default")).toContain("spacing.small");
      expect(refs.get("shadow.default")).toContain("color.shadow");
    });
  });

  describe("buildDependencyGraph", () => {
    it("should build dependency and dependent maps", () => {
      const document = {
        color: {
          base: { $value: "#ff0000" },
          primary: { $value: "{color.base}" },
          button: { $value: "{color.primary}" },
        },
      };

      const { dependencies, dependents } = buildDependencyGraph(document);

      // Dependencies (what each token depends on)
      expect(dependencies.get("color.primary")).toEqual(
        new Set(["color.base"]),
      );
      expect(dependencies.get("color.button")).toEqual(
        new Set(["color.primary"]),
      );

      // Dependents (what depends on each token)
      expect(dependents.get("color.base")).toEqual(new Set(["color.primary"]));
      expect(dependents.get("color.primary")).toEqual(
        new Set(["color.button"]),
      );
    });

    it("should handle multiple dependencies", () => {
      const document = {
        spacing: {
          small: { $value: "4px" },
        },
        color: {
          shadow: { $value: "#000000" },
        },
        shadow: {
          default: {
            $value: {
              offset: "{spacing.small}",
              color: "{color.shadow}",
            },
          },
        },
      };

      const { dependencies } = buildDependencyGraph(document);

      expect(dependencies.get("shadow.default")).toEqual(
        new Set(["spacing.small", "color.shadow"]),
      );
    });
  });
});
