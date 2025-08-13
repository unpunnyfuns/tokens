import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenFileReader } from "../filesystem/file-reader.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import type { UPFTResolverManifest } from "../resolver/upft-types.js";
import { type Bundle, TokenBundler } from "./bundler.js";

describe("TokenBundler", () => {
  let bundler: TokenBundler;
  let fileReader: TokenFileReader;
  let fileWriter: TokenFileWriter;
  const examplesPath = join(process.cwd(), "src", "examples");

  beforeEach(() => {
    // Use real file reader with examples directory
    fileReader = new TokenFileReader({
      basePath: examplesPath,
    });
    fileWriter = new TokenFileWriter();

    bundler = new TokenBundler({
      fileReader,
      fileWriter,
      basePath: examplesPath,
    });
  });

  describe("bundle generation", () => {
    it("should bundle tokens from simple manifest", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
        },
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(2);
      expect(bundles.map((b: Bundle) => b.id)).toEqual([
        "theme-light",
        "theme-dark",
      ]);

      // Check light theme bundle
      const lightBundle = bundles.find((b: Bundle) => b.id === "theme-light");
      expect(lightBundle).toBeDefined();
      expect(lightBundle?.tokens).toBeDefined();

      // Check dark theme bundle
      const darkBundle = bundles.find((b: Bundle) => b.id === "theme-dark");
      expect(darkBundle).toBeDefined();
      expect(darkBundle?.tokens).toBeDefined();
    });

    it("should handle density variants manifest", async () => {
      // Read the actual manifest from examples
      const manifestPath = join(
        examplesPath,
        "test-scenarios",
        "density-variants.manifest.json",
      );
      const { readFileSync } = await import("node:fs");
      const manifest: UPFTResolverManifest = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      );

      // Create bundler with correct base path for test-scenarios
      const testBundler = new TokenBundler({
        fileReader: new TokenFileReader({
          basePath: join(examplesPath, "test-scenarios"),
        }),
        fileWriter,
        basePath: join(examplesPath, "test-scenarios"),
      });

      const bundles = await testBundler.bundle(manifest);

      // Should have 3 density variants
      expect(bundles).toHaveLength(3);
      const ids = bundles.map((b: Bundle) => b.id);
      expect(ids).toContain("density-comfortable");
      expect(ids).toContain("density-compact");
      expect(ids).toContain("density-base");
    });

    it("should handle component tokens with references", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { values: ["tokens/primitives/colors.json"] },
          { values: ["tokens/semantic/colors.json"] },
        ],
        modifiers: {
          component: {
            oneOf: ["button", "card"],
            values: {
              button: ["tokens/components/button.json"],
              card: ["tokens/components/card.json"],
            },
          },
        },
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(2);

      const buttonBundle = bundles.find(
        (b: Bundle) => b.id === "component-button",
      );
      expect(buttonBundle).toBeDefined();
      expect(buttonBundle?.files).toContain("tokens/primitives/colors.json");
      expect(buttonBundle?.files).toContain("tokens/semantic/colors.json");
      expect(buttonBundle?.files).toContain("tokens/components/button.json");
    });

    it("should respect generate field when specified", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/base-tokens.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["test-scenarios/theme-light.json"],
              dark: ["test-scenarios/theme-dark.json"],
            },
          },
          density: {
            oneOf: ["base", "comfortable", "compact"],
            values: {
              base: ["test-scenarios/density-base.json"],
              comfortable: ["test-scenarios/density-comfortable.json"],
              compact: ["test-scenarios/density-compact.json"],
            },
          },
        },
        generate: [
          {
            theme: "light",
            density: "comfortable",
            output: "light-comfortable.json",
          },
          { theme: "dark", density: "compact", output: "dark-compact.json" },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      // Should only generate specified combinations
      expect(bundles).toHaveLength(2);

      const bundle1 = bundles.find(
        (b: Bundle) => b.output === "light-comfortable.json",
      );
      expect(bundle1).toBeDefined();
      expect(bundle1?.id).toBe("theme-light_density-comfortable");

      const bundle2 = bundles.find(
        (b: Bundle) => b.output === "dark-compact.json",
      );
      expect(bundle2).toBeDefined();
      expect(bundle2?.id).toBe("theme-dark_density-compact");
    });

    it("should handle anyOf modifiers", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["tokens/primitives/colors.json"] }],
        modifiers: {
          features: {
            anyOf: ["shadows", "typography"],
            values: {
              shadows: ["tokens/shadows.json"],
              typography: ["tokens/primitives/typography.json"],
            },
          },
        },
      };

      const bundles = await bundler.bundle(manifest);

      // Should generate 2^2 = 4 combinations (none, shadows, typography, both)
      expect(bundles).toHaveLength(4);

      const ids = bundles.map((b: Bundle) => b.id);
      expect(ids).toContain("default"); // No features
      expect(ids).toContain("features-shadows");
      expect(ids).toContain("features-typography");
      expect(ids).toContain("features-shadows+typography");
    });
  });

  describe("bundleToFiles", () => {
    it("should write bundles to filesystem", async () => {
      const writeSpy = vi.spyOn(fileWriter, "write");

      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {
          mode: {
            oneOf: ["default"],
            values: {
              default: [],
            },
          },
        },
        generate: [{ output: "output/bundle.json" }],
      };

      const results = await bundler.bundleToFiles(manifest);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.filePath).toBe("output/bundle.json");

      expect(writeSpy).toHaveBeenCalledWith(
        join(examplesPath, "output/bundle.json"),
        expect.any(String),
      );
    });

    it("should handle write errors gracefully", async () => {
      const writeError = new Error("Disk full");
      vi.spyOn(fileWriter, "write").mockRejectedValue(writeError);

      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {},
        generate: [{ output: "output/fail.json" }],
      };

      const results = await bundler.bundleToFiles(manifest);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.error).toBe("Disk full");
    });
  });

  describe("transforms", () => {
    it("should apply custom transforms to tokens", async () => {
      // Helper to check if object has string $value
      const hasStringValue = (obj: unknown): obj is { $value: string } => {
        if (!obj || typeof obj !== "object") return false;
        const record = obj as Record<string, unknown>;
        return typeof record.$value === "string";
      };

      // Helper to uppercase token values recursively
      const uppercaseTokenValues = (obj: unknown): void => {
        if (!obj || typeof obj !== "object") return;

        const record = obj as Record<string, unknown>;

        // Process each property
        for (const value of Object.values(record)) {
          if (hasStringValue(value)) {
            value.$value = value.$value.toUpperCase();
          }
          uppercaseTokenValues(value);
        }
      };

      const uppercaseTransform = (tokens: unknown) => {
        const transformed = JSON.parse(JSON.stringify(tokens));
        uppercaseTokenValues(transformed);
        return transformed;
      };

      bundler = new TokenBundler({
        fileReader,
        basePath: examplesPath,
        transforms: [uppercaseTransform],
      });

      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {},
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      // The transform should have been applied
      const tokens = bundles[0]?.tokens;
      expect(tokens).toBeDefined();
    });
  });

  describe("output formats", () => {
    it("should default to DTCG format", async () => {
      const writeSpy = vi.spyOn(fileWriter, "write");

      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {},
        generate: [{ output: "test.json" }],
      };

      await bundler.bundleToFiles(manifest);

      expect(writeSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("{"), // JSON format
      );
    });

    it("should support custom format", async () => {
      bundler = new TokenBundler({
        fileReader,
        fileWriter,
        basePath: examplesPath,
        outputFormat: "custom",
      });

      const writeSpy = vi.spyOn(fileWriter, "write");

      const manifest: UPFTResolverManifest = {
        sets: [{ values: ["test-scenarios/simple-tokens.json"] }],
        modifiers: {},
        generate: [{ output: "test.json" }],
      };

      await bundler.bundleToFiles(manifest);

      expect(writeSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String), // Custom format (defaults to DTCG)
      );
    });
  });
});
