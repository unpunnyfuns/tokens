import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSchemaCache,
  DTCG_SCHEMAS,
  getCachedSchemas,
  getSchemaForType,
  loadSchema,
  preloadSchemas,
  type SchemaLocation,
} from "./schema-utils.js";

// Mock node:fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe("Schema Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSchemaCache();
  });

  afterEach(() => {
    clearSchemaCache();
  });

  const mockSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      $value: { type: "string" },
    },
  };

  describe("loadSchema", () => {
    it("should load schema from local file in schemas directory", async () => {
      (existsSync as any).mockReturnValueOnce(true);
      (readFileSync as any).mockReturnValueOnce(JSON.stringify(mockSchema));

      const result = await loadSchema("test.schema.json");

      expect(existsSync).toHaveBeenCalled();
      expect(readFileSync).toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });

    it("should load schema from absolute path", async () => {
      (existsSync as any)
        .mockReturnValueOnce(false) // schemas directory
        .mockReturnValueOnce(true); // absolute path
      (readFileSync as any).mockReturnValueOnce(JSON.stringify(mockSchema));

      const result = await loadSchema("/absolute/path/schema.json");

      expect(existsSync).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSchema);
    });

    it.skip("should load schema from package", async () => {
      // Mock require.resolve globally
      const originalRequire = global.require;
      global.require = {
        ...originalRequire,
        resolve: vi.fn().mockReturnValue("/node_modules/package/schema.json"),
      } as any;
      (readFileSync as any).mockReturnValueOnce(JSON.stringify(mockSchema));

      const locations: SchemaLocation[] = [
        { type: "package", path: "@package/schema" },
      ];
      const result = await loadSchema("package-schema", locations);

      expect(global.require.resolve).toHaveBeenCalledWith("@package/schema");
      expect(result).toEqual(mockSchema);

      global.require = originalRequire;
    });

    it("should load schema from URL", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      });

      const locations: SchemaLocation[] = [
        { type: "url", path: "https://example.com/schema.json" },
      ];
      const result = await loadSchema("url-schema", locations);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/schema.json",
      );
      expect(result).toEqual(mockSchema);
    });

    it("should return cached schema on second call", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue(JSON.stringify(mockSchema));

      const result1 = await loadSchema("cached.schema.json");
      const result2 = await loadSchema("cached.schema.json");

      expect(readFileSync).toHaveBeenCalledTimes(1); // Only called once
      expect(result1).toBe(result2); // Same reference
    });

    it("should try multiple locations until one succeeds", async () => {
      (existsSync as any).mockReturnValue(false);
      const originalRequire = global.require;
      global.require = {
        ...originalRequire,
        resolve: vi.fn().mockImplementation(() => {
          throw new Error("Package not found");
        }),
      } as any;
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      });

      const locations: SchemaLocation[] = [
        { type: "local", path: "missing.json" },
        { type: "package", path: "@missing/schema" },
        { type: "url", path: "https://example.com/schema.json" },
      ];

      const result = await loadSchema("multi-location", locations);

      expect(result).toEqual(mockSchema);
      global.require = originalRequire;
    });

    it("should return null when schema not found", async () => {
      (existsSync as any).mockReturnValue(false);

      const result = await loadSchema("missing.schema.json");

      expect(result).toBeNull();
    });

    it("should handle JSON parse errors", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue("invalid json");

      const result = await loadSchema("invalid.json");

      expect(result).toBeNull();
    });

    it("should handle file read errors", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockImplementation(() => {
        throw new Error("File read error");
      });

      const result = await loadSchema("error.json");

      expect(result).toBeNull();
    });

    it("should handle package resolution errors", async () => {
      const originalRequire = global.require;
      global.require = {
        ...originalRequire,
        resolve: vi.fn().mockImplementation(() => {
          throw new Error("Cannot find module");
        }),
      } as any;

      const locations: SchemaLocation[] = [
        { type: "package", path: "@missing/package" },
      ];
      const result = await loadSchema("missing-package", locations);

      expect(result).toBeNull();
      global.require = originalRequire;
    });

    it("should handle fetch errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const locations: SchemaLocation[] = [
        { type: "url", path: "https://example.com/schema.json" },
      ];
      const result = await loadSchema("fetch-error", locations);

      expect(result).toBeNull();
    });

    it("should handle non-ok fetch responses", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const locations: SchemaLocation[] = [
        { type: "url", path: "https://example.com/404.json" },
      ];
      const result = await loadSchema("404-schema", locations);

      expect(result).toBeNull();
    });
  });

  describe("clearSchemaCache", () => {
    it("should clear all cached schemas", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue(JSON.stringify(mockSchema));

      await loadSchema("schema1.json");
      await loadSchema("schema2.json");

      let cached = getCachedSchemas();
      expect(cached.size).toBe(2);

      clearSchemaCache();

      cached = getCachedSchemas();
      expect(cached.size).toBe(0);
    });
  });

  describe("getCachedSchemas", () => {
    it("should return a copy of cached schemas", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue(JSON.stringify(mockSchema));

      await loadSchema("schema1.json");
      await loadSchema("schema2.json");

      const cached = getCachedSchemas();
      expect(cached.size).toBe(2);
      expect(cached.has("schema1.json")).toBe(true);
      expect(cached.has("schema2.json")).toBe(true);

      // Modifying the returned map should not affect the cache
      cached.clear();
      const cached2 = getCachedSchemas();
      expect(cached2.size).toBe(2);
    });

    it("should return empty map when no schemas cached", () => {
      const cached = getCachedSchemas();
      expect(cached.size).toBe(0);
    });
  });

  describe("preloadSchemas", () => {
    it("should load multiple schemas", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any)
        .mockReturnValueOnce(JSON.stringify({ id: "schema1" }))
        .mockReturnValueOnce(JSON.stringify({ id: "schema2" }))
        .mockReturnValueOnce(JSON.stringify({ id: "schema3" }));

      const schemaIds = ["schema1.json", "schema2.json", "schema3.json"];
      const loaded = await preloadSchemas(schemaIds);

      expect(loaded.size).toBe(3);
      expect(loaded.get("schema1.json")).toEqual({ id: "schema1" });
      expect(loaded.get("schema2.json")).toEqual({ id: "schema2" });
      expect(loaded.get("schema3.json")).toEqual({ id: "schema3" });
    });

    it("should skip schemas that fail to load", async () => {
      (existsSync as any)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false) // Second check for absolute path
        .mockReturnValueOnce(true);
      (readFileSync as any)
        .mockReturnValueOnce(JSON.stringify({ id: "schema1" }))
        .mockReturnValueOnce(JSON.stringify({ id: "schema3" }));

      const schemaIds = ["schema1.json", "missing.json", "schema3.json"];
      const loaded = await preloadSchemas(schemaIds);

      expect(loaded.size).toBe(2);
      expect(loaded.has("schema1.json")).toBe(true);
      expect(loaded.has("missing.json")).toBe(false);
      expect(loaded.has("schema3.json")).toBe(true);
    });

    it("should handle empty array", async () => {
      const loaded = await preloadSchemas([]);
      expect(loaded.size).toBe(0);
    });

    it("should cache loaded schemas", async () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue(JSON.stringify(mockSchema));

      await preloadSchemas(["schema1.json"]);
      const cached = getCachedSchemas();

      expect(cached.has("schema1.json")).toBe(true);
    });
  });

  describe("DTCG_SCHEMAS", () => {
    it("should contain all expected schema paths", () => {
      expect(DTCG_SCHEMAS.BASE).toBe("tokens/base.schema.json");
      expect(DTCG_SCHEMAS.FULL).toBe("tokens/full.schema.json");
      expect(DTCG_SCHEMAS.COLOR).toBe("tokens/types/color.schema.json");
      expect(DTCG_SCHEMAS.DIMENSION).toBe("tokens/types/dimension.schema.json");
      expect(DTCG_SCHEMAS.TYPOGRAPHY).toBe(
        "tokens/types/typography.schema.json",
      );
      expect(DTCG_SCHEMAS.SHADOW).toBe("tokens/types/shadow.schema.json");
      expect(DTCG_SCHEMAS.BORDER).toBe("tokens/types/border.schema.json");
      expect(DTCG_SCHEMAS.GRADIENT).toBe("tokens/types/gradient.schema.json");
      expect(DTCG_SCHEMAS.TRANSITION).toBe(
        "tokens/types/transition.schema.json",
      );
      expect(DTCG_SCHEMAS.FONT_FAMILY).toBe(
        "tokens/types/font-family.schema.json",
      );
      expect(DTCG_SCHEMAS.FONT_WEIGHT).toBe(
        "tokens/types/font-weight.schema.json",
      );
      expect(DTCG_SCHEMAS.DURATION).toBe("tokens/types/duration.schema.json");
      expect(DTCG_SCHEMAS.CUBIC_BEZIER).toBe(
        "tokens/types/cubic-bezier.schema.json",
      );
      expect(DTCG_SCHEMAS.NUMBER).toBe("tokens/types/number.schema.json");
      expect(DTCG_SCHEMAS.STROKE_STYLE).toBe(
        "tokens/types/stroke-style.schema.json",
      );
    });
  });

  describe("getSchemaForType", () => {
    it("should return correct schema path for known types", () => {
      expect(getSchemaForType("color")).toBe(DTCG_SCHEMAS.COLOR);
      expect(getSchemaForType("dimension")).toBe(DTCG_SCHEMAS.DIMENSION);
      expect(getSchemaForType("typography")).toBe(DTCG_SCHEMAS.TYPOGRAPHY);
      expect(getSchemaForType("shadow")).toBe(DTCG_SCHEMAS.SHADOW);
      expect(getSchemaForType("border")).toBe(DTCG_SCHEMAS.BORDER);
      expect(getSchemaForType("gradient")).toBe(DTCG_SCHEMAS.GRADIENT);
      expect(getSchemaForType("transition")).toBe(DTCG_SCHEMAS.TRANSITION);
      expect(getSchemaForType("fontFamily")).toBe(DTCG_SCHEMAS.FONT_FAMILY);
      expect(getSchemaForType("fontWeight")).toBe(DTCG_SCHEMAS.FONT_WEIGHT);
      expect(getSchemaForType("duration")).toBe(DTCG_SCHEMAS.DURATION);
      expect(getSchemaForType("cubicBezier")).toBe(DTCG_SCHEMAS.CUBIC_BEZIER);
      expect(getSchemaForType("number")).toBe(DTCG_SCHEMAS.NUMBER);
      expect(getSchemaForType("strokeStyle")).toBe(DTCG_SCHEMAS.STROKE_STYLE);
    });

    it("should return null for unknown types", () => {
      expect(getSchemaForType("unknown")).toBeNull();
      expect(getSchemaForType("custom")).toBeNull();
      expect(getSchemaForType("")).toBeNull();
    });
  });
});
