import { expect, test, vi } from "vitest";
import {
  convertAliasToRef,
  convertRefToAlias,
  convertToDTCG,
} from "../dtcg-exporter";

test("converts basic tokens to DTCG format", () => {
  const input = {
    colors: {
      primary: {
        $type: "color",
        $value: "#0066cc",
        $description: "Primary color",
      },
    },
  };

  const result = convertToDTCG(input);

  expect(result).toEqual({
    colors: {
      primary: {
        $type: "color",
        $value: "#0066cc",
        $description: "Primary color",
      },
    },
  });
});

test("converts JSON pointer references to DTCG alias format", () => {
  const input = {
    colors: {
      primary: {
        $type: "color",
        $value: "#0066cc",
      },
      secondary: {
        $type: "color",
        $value: {
          $ref: "#/colors/primary/$value",
        },
      },
    },
  };

  const result = convertToDTCG(input);

  expect(result).toEqual({
    colors: {
      primary: {
        $type: "color",
        $value: "#0066cc",
      },
      secondary: {
        $type: "color",
        $value: "{colors.primary}",
      },
    },
  });
});

test("handles nested references", () => {
  const input = {
    theme: {
      colors: {
        base: {
          blue: {
            $type: "color",
            $value: "#0000ff",
          },
        },
        semantic: {
          primary: {
            $type: "color",
            $value: {
              $ref: "#/theme/colors/base/blue/$value",
            },
          },
        },
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).theme.colors.semantic.primary.$value).toBe(
    "{theme.colors.base.blue}",
  );
});

test("handles composite values with references", () => {
  const input = {
    colors: {
      primary: {
        $type: "color",
        $value: "#000",
      },
    },
    borders: {
      default: {
        $type: "border",
        $value: {
          color: { $ref: "#/colors/primary/$value" },
          width: "2px",
          style: "solid",
        },
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).borders.default.$value).toEqual({
    color: "{colors.primary}",
    width: "2px",
    style: "solid",
  });
});

test("handles arrays with references", () => {
  const input = {
    spacing: {
      small: {
        $type: "dimension",
        $value: "8px",
      },
    },
    composite: {
      list: {
        $type: "custom",
        $value: [
          { $ref: "#/spacing/small/$value" },
          "16px",
          { $ref: "#/spacing/small/$value" },
        ],
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).composite.list.$value).toEqual([
    "{spacing.small}",
    "16px",
    "{spacing.small}",
  ]);
});

test("preserves non-reference values", () => {
  const input = {
    tokens: {
      string: {
        $type: "string",
        $value: "hello world",
      },
      number: {
        $type: "number",
        $value: 42,
      },
      boolean: {
        $type: "boolean",
        $value: true,
      },
      null: {
        $type: "custom",
        $value: null,
      },
    },
  };

  const result = convertToDTCG(input);

  expect(result).toEqual(input);
});

test("handles empty objects", () => {
  const input = {};
  const result = convertToDTCG(input);
  expect(result).toEqual({});
});

test("handles deeply nested structures", () => {
  const input = {
    level1: {
      level2: {
        level3: {
          level4: {
            token: {
              $type: "color",
              $value: { $ref: "#/other/token/$value" },
            },
          },
        },
      },
    },
    other: {
      token: {
        $type: "color",
        $value: "#fff",
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).level1.level2.level3.level4.token.$value).toBe(
    "{other.token}",
  );
});

test("preserves metadata and extensions", () => {
  const input = {
    $description: "Token theme",
    $extensions: {
      "com.example": {
        version: "1.0",
      },
    },
    tokens: {
      color: {
        $type: "color",
        $value: "#000",
        $description: "A color",
        $extensions: {
          "com.example": {
            customData: true,
          },
        },
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).$description).toBe("Token theme");
  expect((result as any).$extensions).toEqual(input.$extensions);
  expect((result as any).tokens.color.$description).toBe("A color");
  expect((result as any).tokens.color.$extensions).toEqual(
    input.tokens.color.$extensions,
  );
});

test("handles malformed references gracefully", () => {
  const input = {
    token: {
      $type: "color",
      $value: {
        $ref: "not-a-json-pointer",
      },
    },
  };

  const result = convertToDTCG(input);

  // Malformed references get converted to string
  expect((result as any).token.$value).toBe("not-a-json-pointer");
});

test("handles references without $value suffix", () => {
  const input = {
    colors: {
      primary: {
        $type: "color",
        $value: "#000",
      },
      secondary: {
        $type: "color",
        $value: {
          $ref: "#/colors/primary",
        },
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).colors.secondary.$value).toBe("{colors.primary}");
});

test("does not modify non-token properties", () => {
  const input = {
    metadata: {
      version: "1.0",
      author: "test",
    },
    tokens: {
      color: {
        $type: "color",
        $value: "#000",
      },
    },
  };

  const result = convertToDTCG(input);

  expect((result as any).metadata).toEqual(input.metadata);
});

test("convertRefToAlias handles external references with preservation", () => {
  const ref = "other.json#/token";
  const result = convertRefToAlias(ref, {
    preserveExternal: true,
    convertInternal: true,
    warnOnConversion: false,
  });
  expect(result).toEqual({ $ref: "other.json#/token" });
});

test("convertRefToAlias warns about external references without preservation", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const ref = "other.json#/token";
  const result = convertRefToAlias(ref, {
    preserveExternal: false,
    convertInternal: true,
    warnOnConversion: true,
  });

  expect(result).toBe("other.json#/token");
  expect(warnSpy).toHaveBeenCalledWith(
    "External reference other.json#/token cannot be converted to DTCG alias format",
  );

  warnSpy.mockRestore();
});

test("convertRefToAlias handles internal references without conversion", () => {
  const ref = "#/colors/primary";
  const result = convertRefToAlias(ref, {
    preserveExternal: false,
    convertInternal: false,
    warnOnConversion: false,
  });
  expect(result).toEqual({ $ref: "#/colors/primary" });
});

test("convertRefToAlias warns about unknown reference formats", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const result = convertRefToAlias("not-a-json-pointer", {
    preserveExternal: false,
    convertInternal: true,
    warnOnConversion: true,
  });

  expect(result).toBe("not-a-json-pointer");
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining("Unknown reference format"),
  );

  warnSpy.mockRestore();
});

test("convertAliasToRef converts DTCG alias to ref", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const result = convertAliasToRef("{colors.primary}");

  expect(result).toBe("#/colors/primary");
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining("not fully supported"),
  );

  warnSpy.mockRestore();
});

test("convertAliasToRef returns non-alias strings unchanged", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const result = convertAliasToRef("not an alias");

  expect(result).toBe("not an alias");

  warnSpy.mockRestore();
});
