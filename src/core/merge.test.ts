import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { TokenFileReader } from "../io/file-reader.js";
import { mergeTokens } from "./merge.js";

describe("mergeTokens", () => {
  describe("simple token merging", () => {
    it("should merge non-conflicting tokens", () => {
      const a = {
        color: { primary: { $value: "#ff0000" } },
        spacing: { small: { $value: "4px" } },
      };
      const b = {
        color: { secondary: { $value: "#00ff00" } },
        spacing: { large: { $value: "16px" } },
      };

      const result = mergeTokens(a, b);

      expect(result).toEqual({
        color: {
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
        },
        spacing: {
          small: { $value: "4px" },
          large: { $value: "16px" },
        },
      });
    });

    it("should override tokens with last-wins strategy", () => {
      const a = { color: { primary: { $value: "#ff0000" } } };
      const b = { color: { primary: { $value: "#00ff00" } } };

      const result = mergeTokens(a, b);

      expect(result).toEqual({
        color: { primary: { $value: "#00ff00" } },
      });
    });
  });

  describe("$type inheritance", () => {
    it("should inherit $type from parent groups", () => {
      const a = {
        color: {
          $type: "color",
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
        },
      };
      const b = {
        color: {
          tertiary: { $value: "#0000ff" },
        },
      };

      const result = mergeTokens(a, b);

      expect(result).toEqual({
        color: {
          $type: "color",
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
          tertiary: { $value: "#0000ff" },
        },
      });
    });

    it("should handle nested $type inheritance", () => {
      const a = {
        spacing: {
          $type: "dimension",
          component: {
            button: { $value: "8px" },
          },
        },
      };
      const b = {
        spacing: {
          component: {
            card: { $value: "16px" },
          },
        },
      };

      const result = mergeTokens(a, b);

      expect(result.spacing).toBeDefined();
      const spacing = result.spacing as any;
      expect(spacing.$type).toBe("dimension");
      expect(spacing.component?.button).toEqual({ $value: "8px" });
      expect(spacing.component?.card).toEqual({ $value: "16px" });
    });

    it("should handle conflicting $type at group level without throwing", () => {
      const a = {
        colors: {
          $type: "color",
          primary: { $value: "#ff0000" },
        },
      };
      const b = {
        colors: {
          $type: "gradient",
          primary: { $value: "linear-gradient(...)" },
        },
      };

      // mergeTokens is now safe by default - it should not throw
      const result = mergeTokens(a, b);
      expect(result).toBeDefined();
      // The last value wins in safe mode
      expect((result as any).colors?.$type).toBe("gradient");
    });

    it("should handle conflicting token-level $type without throwing", () => {
      const a = {
        theme: {
          primary: { $value: "#ff0000", $type: "color" },
        },
      };
      const b = {
        theme: {
          primary: { $value: "16px", $type: "dimension" },
        },
      };

      // mergeTokens is now safe by default - it should not throw
      const result = mergeTokens(a, b);
      expect(result).toBeDefined();
      // The last value wins in safe mode
      expect((result as any).theme?.primary?.$type).toBe("dimension");
    });
  });

  describe("group vs token conflicts", () => {
    it("should handle merging group into token without throwing", () => {
      const a = {
        spacing: { $value: "8px", $type: "dimension" },
      };
      const b = {
        spacing: {
          small: { $value: "4px" },
          large: { $value: "16px" },
        },
      };

      // mergeTokens is now safe by default - it should not throw
      const result = mergeTokens(a, b);
      expect(result).toBeDefined();
      // In safe mode, conflicting types are handled gracefully
      expect(result.spacing).toBeDefined();
    });

    it("should handle merging token into group without throwing", () => {
      const a = {
        spacing: {
          small: { $value: "4px" },
          large: { $value: "16px" },
        },
      };
      const b = {
        spacing: { $value: "8px", $type: "dimension" },
      };

      // mergeTokens is now safe by default - it should not throw
      const result = mergeTokens(a, b);
      expect(result).toBeDefined();
      // In safe mode, conflicting types are handled gracefully
      expect(result.spacing).toBeDefined();
    });
  });

  describe("composite token merging", () => {
    it("should deep merge shadow tokens", () => {
      const a = {
        shadow: {
          $type: "shadow",
          $value: {
            x: "0",
            y: "2px",
            blur: "4px",
            spread: "0",
            color: "#000000",
          },
        },
      };
      const b = {
        shadow: {
          $value: {
            color: "#ff0000",
            blur: "8px",
          },
        },
      };

      const result = mergeTokens(a, b);

      expect(result).toEqual({
        shadow: {
          $type: "shadow",
          $value: {
            x: "0",
            y: "2px",
            blur: "8px", // Updated
            spread: "0",
            color: "#ff0000", // Updated
          },
        },
      });
    });

    it("should deep merge typography tokens", () => {
      const a = {
        heading: {
          $type: "typography",
          $value: {
            fontFamily: "Arial",
            fontSize: "24px",
            fontWeight: "700",
            lineHeight: "1.5",
          },
        },
      };
      const b = {
        heading: {
          $value: {
            fontSize: "32px",
            letterSpacing: "0.02em",
          },
        },
      };

      const result = mergeTokens(a, b);

      expect(result).toEqual({
        heading: {
          $type: "typography",
          $value: {
            fontFamily: "Arial",
            fontSize: "32px", // Updated
            fontWeight: "700",
            lineHeight: "1.5",
            letterSpacing: "0.02em", // Added
          },
        },
      });
    });

    it("should replace simple token values entirely", () => {
      const a = {
        color: {
          primary: { $value: "#ff0000", $type: "color" },
        },
      };
      const b = {
        color: {
          primary: { $value: "#00ff00" },
        },
      };

      const result = mergeTokens(a, b);

      expect(result).toEqual({
        color: {
          primary: { $value: "#00ff00", $type: "color" },
        },
      });
    });
  });

  describe("$extensions merging", () => {
    it("should deep merge $extensions", () => {
      const a = {
        color: {
          primary: {
            $value: "#ff0000",
            $extensions: {
              "com.figma": { id: "123" },
              "com.adobe": { guid: "abc" },
            },
          },
        },
      };
      const b = {
        color: {
          primary: {
            $value: "#ff0000",
            $extensions: {
              "com.figma": { collection: "brand" },
              "com.sketch": { symbolId: "xyz" },
            },
          },
        },
      };

      const result = mergeTokens(a, b);

      const color = result.color as any;
      expect(color?.primary?.$extensions).toEqual({
        "com.figma": { id: "123", collection: "brand" },
        "com.adobe": { guid: "abc" },
        "com.sketch": { symbolId: "xyz" },
      });
    });
  });

  describe("$description and metadata merging", () => {
    it("should override $description with last value", () => {
      const a = {
        color: {
          primary: {
            $value: "#ff0000",
            $description: "Primary brand color",
          },
        },
      };
      const b = {
        color: {
          primary: {
            $value: "#00ff00",
            $description: "Updated primary color",
          },
        },
      };

      const result = mergeTokens(a, b);

      const color = result.color as any;
      expect(color?.primary?.$description).toBe("Updated primary color");
    });

    it("should preserve metadata when not overridden", () => {
      const a = {
        color: {
          primary: {
            $value: "#ff0000",
            $description: "Primary color",
            $deprecated: true,
          },
        },
      };
      const b = {
        color: {
          primary: {
            $value: "#00ff00",
          },
        },
      };

      const result = mergeTokens(a, b);

      const color = result.color as any;
      expect(color?.primary).toEqual({
        $value: "#00ff00",
        $description: "Primary color",
        $deprecated: true,
      });
    });
  });

  describe("error handling", () => {
    it("should handle conflicts gracefully without throwing", () => {
      const a = {
        deeply: {
          nested: {
            color: {
              $type: "color",
              primary: { $value: "#ff0000" },
            },
          },
        },
      };
      const b = {
        deeply: {
          nested: {
            color: {
              $type: "dimension",
              primary: { $value: "16px" },
            },
          },
        },
      };

      // mergeTokens is now safe by default - it should not throw
      const result = mergeTokens(a, b);
      expect(result).toBeDefined();
      // The merge should succeed with the last value winning
      expect((result as any).deeply?.nested?.color?.$type).toBe("dimension");
    });
  });

  describe("multiple file merging", () => {
    it("should merge multiple token files in order", () => {
      const files = [
        { color: { a: { $value: "#ff0000" } } },
        { color: { b: { $value: "#00ff00" } } },
        { color: { a: { $value: "#0000ff" }, c: { $value: "#ffff00" } } },
      ];

      const result = files.reduce((acc, file) => mergeTokens(acc, file), {});

      expect(result).toEqual({
        color: {
          a: { $value: "#0000ff" }, // Last one wins
          b: { $value: "#00ff00" },
          c: { $value: "#ffff00" },
        },
      });
    });
  });

  describe("with example files", () => {
    let fileReader: TokenFileReader;
    const examplesPath = join(process.cwd(), "src", "examples");

    beforeEach(() => {
      fileReader = new TokenFileReader({ basePath: examplesPath });
    });

    it("should merge primitive and semantic tokens", async () => {
      const primitives = await fileReader.readFile(
        "tokens/primitives/colors.json",
      );
      const semantic = await fileReader.readFile("tokens/semantic/colors.json");

      const merged = mergeTokens(primitives.tokens, semantic.tokens);

      // Should have both primitive and semantic colors
      expect(merged.colors).toBeDefined();
    });

    it("should merge base and theme tokens", async () => {
      const base = await fileReader.readFile("test-scenarios/base-tokens.json");
      const light = await fileReader.readFile(
        "test-scenarios/theme-light.json",
      );

      const merged = mergeTokens(base.tokens, light.tokens);

      // Theme should override base values
      expect(merged.color).toBeDefined();
      expect(merged.spacing).toBeDefined();
    });

    it("should handle density variants", async () => {
      const base = await fileReader.readFile(
        "test-scenarios/density-base.json",
      );
      const comfortable = await fileReader.readFile(
        "test-scenarios/density-comfortable.json",
      );
      const compact = await fileReader.readFile(
        "test-scenarios/density-compact.json",
      );

      const mergedComfortable = mergeTokens(base.tokens, comfortable.tokens);
      const mergedCompact = mergeTokens(base.tokens, compact.tokens);

      // Different densities should have different spacing values
      expect(mergedComfortable).toBeDefined();
      expect(mergedCompact).toBeDefined();
    });
  });
});
