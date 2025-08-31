import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenFileReader } from "./file-reader.js";

// Setup MSW server for HTTP tests
const server = setupServer();

describe("TokenFileReader", () => {
  let reader: TokenFileReader;
  // Use a simpler path resolution approach for tests
  const examplesPath = join(process.cwd(), "..", "examples", "src");
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = join(tmpdir(), `test-${randomBytes(8).toString("hex")}`);
    await mkdir(tempDir, { recursive: true });
    // Start MSW server
    server.listen();
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
    // Reset MSW handlers and stop server
    server.resetHandlers();
    server.close();
    vi.clearAllMocks();
  });

  describe("reading example files", () => {
    beforeEach(() => {
      reader = new TokenFileReader({ basePath: examplesPath });
    });

    it("should read JSON token files", async () => {
      const file = await reader.readFile("test-scenarios/simple-tokens.json");

      expect(file.filePath).toBe("test-scenarios/simple-tokens.json");
      expect(file.format).toBe("json");
      expect(file.tokens).toBeDefined();
      expect(file.metadata.references).toBeDefined();
    });

    it("should read base tokens", async () => {
      const file = await reader.readFile("test-scenarios/base-tokens.json");

      expect(file.tokens).toBeDefined();
      expect(file.tokens.spacing).toBeDefined();
    });

    it("should read theme tokens", async () => {
      const lightTheme = await reader.readFile(
        "test-scenarios/theme-light.json",
      );
      const darkTheme = await reader.readFile("test-scenarios/theme-dark.json");

      expect(lightTheme.tokens.color).toBeDefined();
      expect(darkTheme.tokens.color).toBeDefined();
    });

    it("should read component tokens", async () => {
      const button = await reader.readFile("tokens/components/button.json");

      expect(button.tokens).toBeDefined();
      expect(button.format).toBe("json");
    });

    it("should extract references from tokens", async () => {
      const file = await reader.readFile("tokens/semantic/colors.json");

      expect(file.metadata.references).toBeInstanceOf(Set);
      // Semantic colors reference primitive colors
      expect(file.metadata.references?.size).toBeGreaterThan(0);
    });

    it("should handle nested token structures", async () => {
      const file = await reader.readFile("tokens/primitives/typography.json");

      expect(file.tokens).toBeDefined();
      expect(file.tokens.typography).toBeDefined();
    });
  });

  describe("reading directories", () => {
    beforeEach(() => {
      reader = new TokenFileReader({ basePath: examplesPath });
    });

    it("should read all token files from a directory", async () => {
      const files = await reader.readDirectory("tokens/primitives");

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.filePath.includes("colors.json"))).toBe(true);
      expect(files.some((f) => f.filePath.includes("typography.json"))).toBe(
        true,
      );
    });

    it("should filter files by pattern", async () => {
      const files = await reader.readDirectory("tokens", {
        pattern: "**/colors.json",
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.filePath.includes("colors.json"))).toBe(true);
    });

    it("should ignore specified patterns", async () => {
      const files = await reader.readDirectory("tokens", {
        ignore: ["**/themes/**"],
      });

      expect(files.every((f) => !f.filePath.includes("/themes/"))).toBe(true);
    });

    it("should handle recursive directory reading", async () => {
      const files = await reader.readDirectory("tokens", {
        recursive: true,
      });

      expect(files.length).toBeGreaterThan(0);
      // Should include files from subdirectories
      expect(files.some((f) => f.filePath.includes("primitives/"))).toBe(true);
      expect(files.some((f) => f.filePath.includes("semantic/"))).toBe(true);
    });
  });

  describe("file formats", () => {
    it("should detect JSON format", async () => {
      reader = new TokenFileReader({ basePath: examplesPath });
      const file = await reader.readFile("test-scenarios/simple-tokens.json");

      expect(file.format).toBe("json");
    });

    it("should handle JSON5 format", async () => {
      // Create a JSON5 file in temp directory
      const json5Content = `{
        // This is a comment
        color: {
          primary: {
            $value: "#007bff",
            $type: "color"
          }
        }
      }`;

      await writeFile(join(tempDir, "test.json5"), json5Content);
      reader = new TokenFileReader({ basePath: tempDir });

      const file = await reader.readFile("test.json5");
      expect(file.format).toBe("json5");
      expect((file.tokens.color as any)?.primary?.$value).toBe("#007bff");
    });

    it("should handle YAML format", async () => {
      // Create a YAML file in temp directory
      const yamlContent = `
color:
  primary:
    $value: "#007bff"
    $type: color
`;

      await writeFile(join(tempDir, "test.yaml"), yamlContent);
      reader = new TokenFileReader({ basePath: tempDir });

      const file = await reader.readFile("test.yaml");
      expect(file.format).toBe("yaml");
      expect((file.tokens.color as any)?.primary?.$value).toBe("#007bff");
    });
  });

  describe("caching", () => {
    beforeEach(() => {
      reader = new TokenFileReader({
        basePath: examplesPath,
        enableCache: true,
      });
    });

    it("should cache read files", async () => {
      const file1 = await reader.readFile("test-scenarios/simple-tokens.json");
      const file2 = await reader.readFile("test-scenarios/simple-tokens.json");

      // Should return the same object from cache
      expect(file1).toBe(file2);
    });

    it("should invalidate cache for specific file", async () => {
      const file1 = await reader.readFile("test-scenarios/simple-tokens.json");
      reader.invalidateCache("test-scenarios/simple-tokens.json");
      const file2 = await reader.readFile("test-scenarios/simple-tokens.json");

      // Should be different objects after invalidation
      expect(file1).not.toBe(file2);
      expect(file1.tokens).toEqual(file2.tokens);
    });

    it("should clear entire cache", async () => {
      await reader.readFile("test-scenarios/simple-tokens.json");
      await reader.readFile("test-scenarios/base-tokens.json");

      reader.clearCache();

      // Files should be re-read after clearing cache
      const file = await reader.readFile("test-scenarios/simple-tokens.json");
      expect(file).toBeDefined();
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      reader = new TokenFileReader({ basePath: examplesPath });
    });

    it("should throw error for non-existent file", async () => {
      await expect(reader.readFile("non-existent-file.json")).rejects.toThrow();
    });

    it("should throw error for unsupported format", async () => {
      // Create a file with unsupported extension
      await writeFile(join(tempDir, "test.txt"), "content");
      reader = new TokenFileReader({ basePath: tempDir });

      await expect(reader.readFile("test.txt")).rejects.toThrow(
        "Unsupported file format",
      );
    });

    it("should handle malformed JSON gracefully", async () => {
      await writeFile(join(tempDir, "malformed.json"), "{ invalid json");
      reader = new TokenFileReader({ basePath: tempDir });

      await expect(reader.readFile("malformed.json")).rejects.toThrow();
    });
  });

  describe("import resolution", () => {
    it("should resolve $import statements", async () => {
      // Create files with imports in temp directory
      await writeFile(
        join(tempDir, "base.json"),
        JSON.stringify({
          color: {
            primary: { $value: "#007bff", $type: "color" },
          },
        }),
      );

      await writeFile(
        join(tempDir, "importing.json"),
        JSON.stringify({
          $import: "./base.json",
          color: {
            secondary: { $value: "#6c757d", $type: "color" },
          },
        }),
      );

      reader = new TokenFileReader({ basePath: tempDir });
      const file = await reader.readFile("importing.json", {
        resolveImports: true,
      });

      // Should have both imported and local tokens
      expect((file.tokens.color as any)?.primary).toBeDefined();
      expect((file.tokens.color as any)?.secondary).toBeDefined();
    });

    it("should handle multiple imports", async () => {
      await writeFile(
        join(tempDir, "colors.json"),
        JSON.stringify({
          color: { red: { $value: "#ff0000", $type: "color" } },
        }),
      );

      await writeFile(
        join(tempDir, "spacing.json"),
        JSON.stringify({
          spacing: { small: { $value: "4px", $type: "dimension" } },
        }),
      );

      await writeFile(
        join(tempDir, "main.json"),
        JSON.stringify({
          $import: ["./colors.json", "./spacing.json"],
        }),
      );

      reader = new TokenFileReader({ basePath: tempDir });
      const file = await reader.readFile("main.json", { resolveImports: true });

      expect((file.tokens.color as any)?.red).toBeDefined();
      expect((file.tokens.spacing as any)?.small).toBeDefined();
    });

    it("should detect circular imports", async () => {
      await writeFile(
        join(tempDir, "a.json"),
        JSON.stringify({ $import: "./b.json" }),
      );

      await writeFile(
        join(tempDir, "b.json"),
        JSON.stringify({ $import: "./a.json" }),
      );

      reader = new TokenFileReader({ basePath: tempDir });

      await expect(
        reader.readFile("a.json", { resolveImports: true }),
      ).rejects.toThrow("Circular import");
    });
  });

  describe("HTTP support", () => {
    beforeEach(() => {
      reader = new TokenFileReader({ basePath: tempDir });
    });

    it("should read HTTP token files", async () => {
      const mockTokens = {
        colors: {
          primary: { $value: "#ff0000", $type: "color" },
          secondary: { $value: "#00ff00", $type: "color" },
        },
      };

      server.use(
        http.get("https://example.com/tokens.json", () => {
          return HttpResponse.json(mockTokens, {
            headers: { "content-type": "application/json" },
          });
        }),
      );

      const file = await reader.readFile("https://example.com/tokens.json");

      expect(file.filePath).toBe("https://example.com/tokens.json");
      expect(file.format).toBe("json");
      expect(file.tokens).toEqual(mockTokens);
    });

    it("should handle HTTP errors gracefully", async () => {
      server.use(
        http.get("https://example.com/not-found.json", () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 });
        }),
      );

      await expect(
        reader.readFile("https://example.com/not-found.json"),
      ).rejects.toThrow(
        "HTTP 404 Not Found: https://example.com/not-found.json",
      );
    });

    it("should handle network errors", async () => {
      server.use(
        http.get("https://example.com/tokens.json", () => {
          return HttpResponse.error();
        }),
      );

      await expect(
        reader.readFile("https://example.com/tokens.json"),
      ).rejects.toThrow(
        "Network error fetching https://example.com/tokens.json:",
      );
    });

    it("should handle different content types", async () => {
      const mockTokens = {
        colors: { primary: { $value: "#ff0000", $type: "color" } },
      };

      server.use(
        http.get("https://example.com/tokens.json", () => {
          return HttpResponse.json(mockTokens, {
            headers: { "content-type": "application/octet-stream" },
          });
        }),
      );

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        // Mock implementation - suppress console warnings during test
      });

      const file = await reader.readFile("https://example.com/tokens.json");

      expect(file.tokens).toEqual(mockTokens);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unexpected content-type "application/octet-stream" for https://example.com/tokens.json',
      );

      consoleSpy.mockRestore();
    });

    it("should support YAML files over HTTP", async () => {
      const yamlContent = `
colors:
  primary:
    $value: "#ff0000"
    $type: "color"
`;

      server.use(
        http.get("https://example.com/tokens.yaml", () => {
          return HttpResponse.text(yamlContent, {
            headers: { "content-type": "application/x-yaml" },
          });
        }),
      );

      const file = await reader.readFile("https://example.com/tokens.yaml");

      expect(file.format).toBe("yaml");
      expect(file.tokens.colors.primary.$value).toBe("#ff0000");
    });
  });
});
