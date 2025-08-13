import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TokenFileReader } from "./file-reader.js";

describe("TokenFileReader", () => {
  let reader: TokenFileReader;
  const examplesPath = join(process.cwd(), "src", "examples");
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = join(tmpdir(), `test-${randomBytes(8).toString("hex")}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
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
});
