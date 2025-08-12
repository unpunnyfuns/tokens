import { promises as fs } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  clearSchemaCache,
  parseSchemaReference,
  validateTokenFile,
  validateTokenFiles,
} from "../token-validator";

// Mock only the file system
vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  clearSchemaCache();
});

describe("parseSchemaReference", () => {
  test("parses relative paths", () => {
    const result = parseSchemaReference(
      "../../../schemas/tokens/base.schema.json",
      "/project",
      "/project/examples/tokens/primitives/colors.json",
    );
    expect(result).toBe("/project/schemas/tokens/base.schema.json");
  });

  test("parses schema URLs", () => {
    const result = parseSchemaReference(
      "https://tokens.unpunny.fun/schema/0.1.0/tokens/base",
      "/project",
    );
    expect(result).toBe("/project/schemas/tokens/base.schema.json");
  });

  test("returns null for unsupported URLs", () => {
    const result = parseSchemaReference(
      "https://unknown.com/schema",
      "/project",
    );
    expect(result).toBeNull();
  });

  test("handles plain schema names", () => {
    const result = parseSchemaReference("base.schema.json", "/project");
    expect(result).toBe("/project/schemas/base.schema.json");
  });
});

describe("validateTokenFile", () => {
  test("validates a valid token file", async () => {
    const mockTokens = {
      $schema: "../../schemas/tokens/base.schema.json",
      colors: {
        primary: {
          $type: "color",
          $value: "#000000",
        },
      },
    };

    // Mock a simple base schema that accepts any structure
    const mockSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: true,
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("token.json")) {
        return JSON.stringify(mockTokens);
      }
      if (pathStr.includes("base.schema.json")) {
        return JSON.stringify(mockSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateTokenFile(
      "/project/token.json",
      undefined,
      "/project",
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("handles invalid JSON", async () => {
    vi.mocked(fs.readFile).mockResolvedValue("not valid json {");

    const result = await validateTokenFile(
      "/project/invalid.json",
      undefined,
      "/project",
    );

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("JSON parse error");
  });

  test("skips files without $schema", async () => {
    const mockTokens = {
      colors: { primary: "#000" },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockTokens));

    const result = await validateTokenFile(
      "/project/no-schema.json",
      undefined,
      "/project",
    );

    expect(result.valid).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("No $schema property found");
  });

  test("handles missing schema file", async () => {
    const mockTokens = {
      $schema: "../schemas/missing.schema.json",
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockTokens));
    vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

    const result = await validateTokenFile(
      "/project/token.json",
      undefined,
      "/project",
    );

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("Schema file not found");
  });

  test("handles validation errors", async () => {
    const mockTokens = {
      $schema: "../../schemas/tokens/base.schema.json",
      invalid: "data",
    };

    // Mock a schema that requires specific properties
    const mockSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["$type"],
      additionalProperties: false,
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("token.json")) {
        return JSON.stringify(mockTokens);
      }
      if (pathStr.includes("base.schema.json")) {
        return JSON.stringify(mockSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateTokenFile(
      "/project/token.json",
      undefined,
      "/project",
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  test("uses explicit schema path when provided", async () => {
    const mockTokens = {
      colors: { primary: "#000" },
    };

    const mockSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("token.json")) {
        return JSON.stringify(mockTokens);
      }
      if (pathStr.includes("custom.schema.json")) {
        return JSON.stringify(mockSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateTokenFile(
      "/project/token.json",
      "/project/custom.schema.json",
      "/project",
    );

    expect(result.valid).toBe(true);
    expect(fs.readFile).toHaveBeenCalledWith(
      "/project/custom.schema.json",
      "utf8",
    );
  });

  test("handles unsupported schema URLs", async () => {
    const mockTokens = {
      $schema: "https://unknown.com/schema",
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockTokens));

    const result = await validateTokenFile(
      "/project/token.json",
      undefined,
      "/project",
    );

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("Unsupported schema URL format");
  });
});

describe("validateTokenFiles", () => {
  test("validates multiple files", async () => {
    const mockTokens1 = {
      $schema: "../../schemas/base.schema.json",
      colors: { primary: "#000" },
    };

    const mockTokens2 = {
      $schema: "../../schemas/base.schema.json",
      spacing: { small: "4px" },
    };

    const mockSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("colors.json")) {
        return JSON.stringify(mockTokens1);
      }
      if (pathStr.includes("spacing.json")) {
        return JSON.stringify(mockTokens2);
      }
      if (pathStr.includes("base.schema.json")) {
        return JSON.stringify(mockSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateTokenFiles(
      ["/project/colors.json", "/project/spacing.json"],
      "/project",
    );

    expect(result.valid).toBe(true);
    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(2);
    expect(result.summary.invalid).toBe(0);
  });

  test.skip("handles mixed valid and invalid files", async () => {
    const validTokens = {
      $schema: "../../schemas/base.schema.json",
      colors: { primary: "#000" },
    };

    const invalidTokens = {
      $schema: "../../schemas/strict.schema.json",
      // Missing required property 'requiredProp'
      someProperty: "value",
    };

    const baseSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
    };

    const strictSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      // This schema requires specific properties and forbids others
      properties: {
        requiredProp: { type: "string" },
      },
      required: ["requiredProp"],
      additionalProperties: false,
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("valid.json")) {
        return JSON.stringify(validTokens);
      }
      if (pathStr.includes("invalid.json")) {
        return JSON.stringify(invalidTokens);
      }
      if (pathStr.includes("base.schema.json")) {
        return JSON.stringify(baseSchema);
      }
      if (pathStr.includes("strict.schema.json")) {
        return JSON.stringify(strictSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateTokenFiles(
      ["/project/valid.json", "/project/invalid.json"],
      "/project",
    );

    expect(result.valid).toBe(false);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.invalid).toBe(1);
  });

  test("preloads schema files", async () => {
    const mockTokens = {
      $schema: "../../schemas/base.schema.json",
      colors: { primary: "#000" },
    };

    const mockSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("token.json")) {
        return JSON.stringify(mockTokens);
      }
      if (pathStr.includes("schema")) {
        return JSON.stringify(mockSchema);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await validateTokenFiles(
      ["/project/token.json"],
      "/project",
      [
        "/project/schemas/base.schema.json",
        "/project/schemas/other.schema.json",
      ],
    );

    expect(result.valid).toBe(true);
    // Verify that schema files were attempted to be loaded
    expect(fs.readFile).toHaveBeenCalled();
  });

  test("handles empty file list", async () => {
    const result = await validateTokenFiles([], "/project");

    expect(result.valid).toBe(true);
    expect(result.summary.total).toBe(0);
    expect(result.summary.valid).toBe(0);
  });
});
