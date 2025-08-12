import { expect, test } from "vitest";
import { buildEnhancedAST } from "../../core/ast";

test("builds basic token structure", () => {
  const tokens = {
    colors: {
      primary: {
        $type: "color",
        $value: "#0066cc",
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.totalTokens).toBe(1);
  expect(ast.stats.totalGroups).toBe(1);
  expect(ast.tokens[0].path).toBe("colors.primary");
  expect(ast.tokens[0].tokenType).toBe("color");
});

test("handles nested groups", () => {
  const tokens = {
    theme: {
      colors: {
        primary: {
          base: {
            $type: "color",
            $value: "#0066cc",
          },
        },
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.totalGroups).toBe(3); // theme, theme.colors, theme.colors.primary
  expect(ast.tokens[0].path).toBe("theme.colors.primary.base");
});

test("extracts custom extensions from tokens", () => {
  const tokens = {
    custom: {
      $type: "color",
      $value: "#000",
      $customField: "custom value",
      $anotherExtension: 42,
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.tokens[0].extensions).toEqual({
    $customField: "custom value",
    $anotherExtension: 42,
  });
});

test("validates valid references", () => {
  const tokens = {
    colors: {
      primary: {
        $type: "color",
        $value: "#0066cc",
      },
      secondary: {
        $type: "color",
        $value: { $ref: "#/colors/primary/$value" },
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.validReferences).toBe(1);
  expect(ast.stats.invalidReferences).toBe(0);
  expect(ast.references[0].isValid).toBe(true);
  expect(ast.references[0].resolvedPath).toBe("colors.primary");
});

test("detects invalid references", () => {
  const tokens = {
    colors: {
      broken: {
        $type: "color",
        $value: { $ref: "#/does/not/exist" },
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.invalidReferences).toBe(1);
  expect(ast.unresolvedReferences).toContain("colors.broken");
  expect(ast.tokens[0].isValid).toBe(false);
  expect(ast.tokens[0].errors).toContain(
    "Reference to non-existent token: #/does/not/exist",
  );
});

test("handles references with null to field", () => {
  const tokens = {
    colors: {
      nullRef: {
        $type: "color",
        $value: { $ref: null },
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  // The token will be created and hasReference will be true (it has a $ref key)
  // but the reference will be invalid since 'to' is null
  expect(ast.stats.totalTokens).toBe(1);
  expect(ast.stats.totalReferences).toBe(1);
  expect(ast.tokens[0].hasReference).toBe(true);
  expect(ast.references[0].to).toBe(null);
  expect(ast.stats.invalidReferences).toBe(1);
  expect(ast.unresolvedReferences).toContain("colors.nullRef");
});

test("builds referencedBy map for multiple references", () => {
  const tokens = {
    base: {
      value: {
        $type: "dimension",
        $value: "16px",
      },
    },
    derived1: {
      $value: { $ref: "#/base/value/$value" },
    },
    derived2: {
      $value: { $ref: "#/base/value/$value" },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.referencedBy["base.value"]).toEqual(
    expect.arrayContaining(["derived1", "derived2"]),
  );
});

test("detects simple circular references", () => {
  const tokens = {
    circular: {
      a: {
        $type: "color",
        $value: { $ref: "#/circular/b/$value" },
      },
      b: {
        $type: "color",
        $value: { $ref: "#/circular/a/$value" },
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.circularReferences).toBe(1);
  expect(ast.circularReferences.length).toBe(1);
  expect(ast.circularReferences[0].chain).toContain("circular.a");
  expect(ast.circularReferences[0].chain).toContain("circular.b");
});

test("detects complex circular reference chains", () => {
  const tokens = {
    circle: {
      a: { $value: { $ref: "#/circle/b/$value" } },
      b: { $value: { $ref: "#/circle/c/$value" } },
      c: { $value: { $ref: "#/circle/d/$value" } },
      d: { $value: { $ref: "#/circle/a/$value" } },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.circularReferences).toBeGreaterThan(0);
  const hasCircle = ast.circularReferences.some(
    (ref) => ref.chain.length === 5, // a → b → c → d → a
  );
  expect(hasCircle).toBe(true);
});

test("marks circular reference tokens as invalid", () => {
  const tokens = {
    loop: {
      a: { $value: { $ref: "#/loop/b/$value" } },
      b: { $value: { $ref: "#/loop/a/$value" } },
    },
  };

  const ast = buildEnhancedAST(tokens);

  const tokenA = ast.tokens.find((t) => t.path === "loop.a");
  const tokenB = ast.tokens.find((t) => t.path === "loop.b");

  expect(tokenA?.isValid).toBe(false);
  expect(tokenB?.isValid).toBe(false);
  expect(tokenA?.errors?.[0]).toContain("circular reference");
});

test("infers types through reference chains", () => {
  const tokens = {
    base: {
      $type: "color",
      $value: "#000",
    },
    derived: {
      $value: { $ref: "#/base/$value" },
    },
    doubleDerived: {
      $value: { $ref: "#/derived/$value" },
    },
  };

  const ast = buildEnhancedAST(tokens);

  const derived = ast.tokens.find((t) => t.path === "derived");
  const doubleDerived = ast.tokens.find((t) => t.path === "doubleDerived");

  expect(derived?.resolvedType).toBe("color");
  expect(doubleDerived?.resolvedType).toBe("color");
  expect(ast.stats.tokensWithInferredTypes).toBe(2);
});

test("infers types from value patterns", () => {
  const tokens = {
    hexColor: { $value: "#ff0000" },
    hexColorAlpha: { $value: "#ff0000cc" }, // 8-digit hex with alpha
    pixelDim: { $value: "24px" },
    remDim: { $value: "1.5rem" },
    duration: { $value: "300ms" },
    plainNumber: { $value: 42 },
  };

  const ast = buildEnhancedAST(tokens);

  const hexColor = ast.tokens.find((t) => t.path === "hexColor");
  const hexColorAlpha = ast.tokens.find((t) => t.path === "hexColorAlpha");
  const pixelDim = ast.tokens.find((t) => t.path === "pixelDim");
  const duration = ast.tokens.find((t) => t.path === "duration");
  const plainNumber = ast.tokens.find((t) => t.path === "plainNumber");

  expect(hexColor?.resolvedType).toBe("color");
  expect(hexColorAlpha?.resolvedType).toBe("color");
  expect(pixelDim?.resolvedType).toBe("dimension");
  expect(duration?.resolvedType).toBe("duration");
  expect(plainNumber?.resolvedType).toBe("number");
});

test("infers composite types from structure", () => {
  const tokens = {
    shadow: {
      $value: {
        color: "#000",
        offsetX: "2px",
        offsetY: "2px",
        blur: "4px",
      },
    },
    border: {
      $value: {
        color: "#000",
        width: "1px",
        style: "solid",
      },
    },
    typography: {
      $value: {
        fontFamily: ["Inter", "sans-serif"],
        fontSize: "16px",
        lineHeight: 1.5,
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  const shadow = ast.tokens.find((t) => t.path === "shadow");
  const border = ast.tokens.find((t) => t.path === "border");
  const typography = ast.tokens.find((t) => t.path === "typography");

  expect(shadow?.resolvedType).toBe("shadow");
  expect(border?.resolvedType).toBe("border");
  expect(typography?.resolvedType).toBe("typography");
});

test("calculates reference depth correctly", () => {
  const tokens = {
    level0: { $type: "color", $value: "#000" },
    level1: { $value: { $ref: "#/level0/$value" } },
    level2: { $value: { $ref: "#/level1/$value" } },
    level3: { $value: { $ref: "#/level2/$value" } },
    level4: { $value: { $ref: "#/level3/$value" } },
  };

  const ast = buildEnhancedAST(tokens);

  const depths = ast.tokens.map((t) => ({
    path: t.path,
    depth: t.referenceDepth,
  }));

  expect(depths).toContainEqual({ path: "level0", depth: 0 });
  expect(depths).toContainEqual({ path: "level1", depth: 1 });
  expect(depths).toContainEqual({ path: "level2", depth: 2 });
  expect(depths).toContainEqual({ path: "level3", depth: 3 });
  expect(depths).toContainEqual({ path: "level4", depth: 4 });
  expect(ast.stats.maxReferenceDepth).toBe(4);
});

test("adds warnings for deep reference chains", () => {
  const tokens = {
    base: { $type: "color", $value: "#000" },
    l1: { $value: { $ref: "#/base/$value" } },
    l2: { $value: { $ref: "#/l1/$value" } },
    l3: { $value: { $ref: "#/l2/$value" } },
    l4: { $value: { $ref: "#/l3/$value" } },
  };

  const ast = buildEnhancedAST(tokens);

  const l4 = ast.tokens.find((t) => t.path === "l4");
  expect(l4?.warnings).toBeDefined();
  expect(l4?.warnings?.[0]).toContain("Deep reference chain");
});

test("sets depth to -1 for circular references", () => {
  const tokens = {
    circular: {
      a: { $value: { $ref: "#/circular/b/$value" } },
      b: { $value: { $ref: "#/circular/a/$value" } },
    },
  };

  const ast = buildEnhancedAST(tokens);

  const tokenA = ast.tokens.find((t) => t.path === "circular.a");
  const tokenB = ast.tokens.find((t) => t.path === "circular.b");

  expect(tokenA?.referenceDepth).toBe(-1);
  expect(tokenB?.referenceDepth).toBe(-1);
});

test("handles mixed valid and invalid references", () => {
  const tokens = {
    base: { $type: "color", $value: "#000" },
    valid: { $value: { $ref: "#/base/$value" } },
    invalid: { $value: { $ref: "#/missing/$value" } },
    alsoValid: { $value: { $ref: "#/valid/$value" } },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.validReferences).toBe(2);
  expect(ast.stats.invalidReferences).toBe(1);
  expect(ast.unresolvedReferences).toContain("invalid");
});

test("handles tokens with composite values containing references", () => {
  const tokens = {
    colors: {
      primary: { $type: "color", $value: "#000" },
    },
    border: {
      $type: "border",
      $value: {
        color: { $ref: "#/colors/primary/$value" },
        width: "2px",
        style: "solid",
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.totalReferences).toBe(1);
  expect(ast.referencedBy["colors.primary"]).toContain("border");
});

test("handles empty token trees", () => {
  const ast = buildEnhancedAST({});

  expect(ast.stats.totalTokens).toBe(0);
  expect(ast.stats.totalGroups).toBe(0);
  expect(ast.tokens).toEqual([]);
  expect(ast.groups).toEqual([]);
});

test("skips special $ properties that aren't token properties", () => {
  const tokens = {
    group: {
      $description: "A group",
      $metadata: "should be ignored",
      $custom: "also ignored",
      token: {
        $type: "color",
        $value: "#000",
        $description: "kept",
      },
    },
  };

  const ast = buildEnhancedAST(tokens);

  expect(ast.stats.totalTokens).toBe(1);
  expect(ast.groups[0].description).toBe("A group");
  expect(ast.tokens[0].description).toBe("kept");
});
