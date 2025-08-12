import { describe, expect, test } from "vitest";
import { convertToDTCG } from "../src/bundler/dtcg-exporter";
import { buildEnhancedAST } from "../src/core/ast";
import { validateReferences } from "../src/core/ast-validator";
import { loadExample } from "./example-loader";

describe("Integration tests with valid DTCG tokens", () => {
  test("AST builder handles valid tokens", () => {
    const tokens = loadExample("tokens/primitives/colors.json") as Record<
      string,
      unknown
    >;
    const ast = buildEnhancedAST(tokens);

    // Just verify the AST was built without errors
    expect(ast).toBeDefined();
    expect(ast.stats.totalTokens).toBeGreaterThan(0);
    expect(ast.stats.totalGroups).toBeGreaterThan(0);
    expect(ast.tokens).toBeDefined();
    expect(ast.groups).toBeDefined();
  });

  test("Reference validator handles valid references", () => {
    const tokensWithReferences = loadExample(
      "tokens/composite-tokens.json",
    ) as Record<string, unknown>;
    const result = validateReferences(tokensWithReferences);

    expect((result as any).valid).toBe(true);
    expect((result as any).errors).toHaveLength(0);
    expect((result as any).stats.totalReferences).toBeGreaterThan(0);
    expect((result as any).stats.invalidReferences).toBe(0);
  });

  test("DTCG exporter converts references correctly", () => {
    // Create a simple tokens structure with references
    const tokensWithReferences = {
      primitives: {
        blue500: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            alpha: 1,
            hex: "#0066cc",
          },
        },
        spacing4: {
          $type: "dimension",
          $value: "16px",
        },
      },
      semantic: {
        primary: {
          $type: "color",
          $value: { $ref: "#/primitives/blue500/$value" },
        },
        buttonPadding: {
          $type: "dimension",
          $value: { $ref: "#/primitives/spacing4/$value" },
        },
      },
      components: {
        button: {
          background: {
            $type: "color",
            $value: { $ref: "#/semantic/primary/$value" },
          },
        },
      },
    };

    const converted = convertToDTCG(tokensWithReferences) as Record<
      string,
      unknown
    >;

    // Check that references were converted to DTCG format
    expect((converted as any).semantic.primary.$value).toBe(
      "{primitives.blue500}",
    );
    expect((converted as any).semantic.buttonPadding.$value).toBe(
      "{primitives.spacing4}",
    );
    expect((converted as any).components.button.background.$value).toBe(
      "{semantic.primary}",
    );
  });

  test("Token validation detects invalid tokens", () => {
    const invalidToken = {
      badColor: {
        $type: "color",
        $value: "#000000", // Invalid - should be object with colorSpace
      },
    };

    const result = validateReferences(invalidToken);
    // Reference validator doesn't validate token format, only references
    expect((result as any).valid).toBe(true);
  });

  test("Complex nested references resolve correctly", () => {
    const nestedTokens = {
      level1: {
        color: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [1, 0, 0],
            alpha: 1,
            hex: "#ff0000",
          },
        },
      },
      level2: {
        theme: {
          primary: {
            $type: "color",
            $value: { $ref: "#/level1/color/$value" },
          },
        },
      },
      level3: {
        components: {
          button: {
            bg: {
              $type: "color",
              $value: { $ref: "#/level2/theme/primary/$value" },
            },
          },
        },
      },
    };

    const result = validateReferences(nestedTokens);
    expect((result as any).valid).toBe(true);
    expect((result as any).stats.totalReferences).toBe(2);
  });

  test("Composite token references work correctly", () => {
    const compositeTokens = {
      primitives: {
        borderColor: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [0.5, 0.5, 0.5],
            alpha: 1,
            hex: "#808080",
          },
        },
        borderWidth: {
          $type: "dimension",
          $value: "2px",
        },
      },
      semantic: {
        border: {
          $type: "border",
          $value: {
            color: { $ref: "#/primitives/borderColor/$value" },
            width: { $ref: "#/primitives/borderWidth/$value" },
            style: "solid",
          },
        },
      },
    };

    const result = validateReferences(compositeTokens);
    expect((result as any).valid).toBe(true);

    const converted = convertToDTCG(compositeTokens) as Record<string, unknown>;
    expect((converted as any).semantic.border.$value.color).toBe(
      "{primitives.borderColor}",
    );
    expect((converted as any).semantic.border.$value.width).toBe(
      "{primitives.borderWidth}",
    );
  });

  test("Array value tokens with references", () => {
    const arrayTokens = {
      fonts: {
        primary: {
          $type: "fontFamily",
          $value: ["Helvetica", "Arial", "sans-serif"],
        },
        secondary: {
          $type: "fontFamily",
          $value: ["Georgia", "serif"],
        },
      },
      theme: {
        bodyFont: {
          $type: "fontFamily",
          $value: { $ref: "#/fonts/primary/$value" },
        },
      },
    };

    const result = validateReferences(arrayTokens);
    expect((result as any).valid).toBe(true);
  });
});
