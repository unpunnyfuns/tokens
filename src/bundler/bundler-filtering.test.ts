import { beforeEach, describe, expect, it } from "vitest";
import { TokenFileReader } from "../filesystem/file-reader.js";
import { TokenFileWriter } from "../filesystem/file-writer.js";
import type { UPFTResolverManifest } from "../resolver/upft-types.js";
import { TokenBundler } from "./bundler.js";
import { memfs } from "memfs";
import type { TokenDocument } from "../types.js";

describe("TokenBundler - Filtering Features", () => {
  let bundler: TokenBundler;
  let fileReader: TokenFileReader;
  let fileWriter: TokenFileWriter;

  const baseTokens: TokenDocument = {
    color: {
      primary: {
        $value: { colorSpace: "srgb", components: [0, 0.5, 1], alpha: 1 },
        $type: "color",
      },
    },
    spacing: {
      sm: { $value: { value: 8, unit: "px" }, $type: "dimension" },
      md: { $value: { value: 16, unit: "px" }, $type: "dimension" },
    },
  };

  const componentTokens: TokenDocument = {
    button: {
      padding: { $value: "{spacing.sm}", $type: "dimension" },
      background: { $value: "{color.primary}", $type: "color" },
    },
  };

  const lightTokens: TokenDocument = {
    color: {
      background: {
        $value: { colorSpace: "srgb", components: [1, 1, 1], alpha: 1 },
        $type: "color",
      },
      text: {
        $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1 },
        $type: "color",
      },
    },
  };

  const darkTokens: TokenDocument = {
    color: {
      background: {
        $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1 },
        $type: "color",
      },
      text: {
        $value: { colorSpace: "srgb", components: [1, 1, 1], alpha: 1 },
        $type: "color",
      },
    },
  };

  const comfortableTokens: TokenDocument = {
    spacing: {
      component: { $value: { value: 12, unit: "px" }, $type: "dimension" },
    },
  };

  const compactTokens: TokenDocument = {
    spacing: {
      component: { $value: { value: 8, unit: "px" }, $type: "dimension" },
    },
  };

  beforeEach(() => {
    const { fs } = memfs({
      "/base.json": JSON.stringify(baseTokens),
      "/components.json": JSON.stringify(componentTokens),
      "/light.json": JSON.stringify(lightTokens),
      "/dark.json": JSON.stringify(darkTokens),
      "/comfortable.json": JSON.stringify(comfortableTokens),
      "/compact.json": JSON.stringify(compactTokens),
    });

    fileReader = new TokenFileReader({
      fs: {
        readFile: async (path: string, encoding: string) =>
          fs.promises.readFile(path, encoding) as Promise<string>,
      },
      basePath: "/",
    });

    fileWriter = new TokenFileWriter();

    bundler = new TokenBundler({
      fileReader,
      fileWriter,
      basePath: "/",
    });
  });

  describe("Set Filtering", () => {
    it("should include only specified sets with includeSets", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {},
        generate: [
          {
            output: "base-only.json",
            includeSets: ["base"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.output).toBe("base-only.json");
      expect(bundles[0]?.tokens).toHaveProperty("color.primary");
      expect(bundles[0]?.tokens).not.toHaveProperty("button");
    });

    it("should exclude specified sets with excludeSets", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {},
        generate: [
          {
            output: "no-components.json",
            excludeSets: ["components"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.output).toBe("no-components.json");
      expect(bundles[0]?.tokens).toHaveProperty("color.primary");
      expect(bundles[0]?.tokens).not.toHaveProperty("button");
    });

    it("should support wildcard in includeSets", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {},
        generate: [
          {
            output: "all-sets.json",
            includeSets: ["*"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.output).toBe("all-sets.json");
      expect(bundles[0]?.tokens).toHaveProperty("color.primary");
      expect(bundles[0]?.tokens).toHaveProperty("button");
    });
  });

  describe("Modifier Filtering", () => {
    it("should include only specified modifiers with includeModifiers", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["comfortable.json"],
              compact: ["compact.json"],
            },
          },
        },
        generate: [
          {
            theme: "light",
            density: "comfortable",
            output: "theme-only.json",
            includeModifiers: ["theme"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.output).toBe("theme-only.json");
      expect(bundles[0]?.tokens).toHaveProperty("color.background");
      expect(bundles[0]?.tokens).not.toHaveProperty("spacing.component");
    });

    it("should exclude specified modifiers with excludeModifiers", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
        generate: [
          {
            theme: "light",
            output: "no-theme.json",
            excludeModifiers: ["theme"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.output).toBe("no-theme.json");
      expect(bundles[0]?.tokens).toHaveProperty("color.primary");
      expect(bundles[0]?.tokens).not.toHaveProperty("color.background");
    });
  });

  describe("Multi-File Generation", () => {
    it("should expand oneOf modifiers to multiple files", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
        generate: [
          {
            output: "themes.json",
            includeModifiers: ["theme"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(2);
      expect(bundles.map((b) => b.output)).toEqual([
        "themes-light.json",
        "themes-dark.json",
      ]);

      // Check light bundle
      const lightBundle = bundles.find((b) => b.output === "themes-light.json");
      const lightColor = lightBundle?.tokens.color as any;
      expect(lightColor?.background?.$value).toEqual({
        colorSpace: "srgb",
        components: [1, 1, 1],
        alpha: 1,
      });

      // Check dark bundle
      const darkBundle = bundles.find((b) => b.output === "themes-dark.json");
      const darkColor = darkBundle?.tokens.color as any;
      expect(darkColor?.background?.$value).toEqual({
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
      });
    });

    it("should handle multiple dimensions in file names", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["comfortable.json"],
              compact: ["compact.json"],
            },
          },
        },
        generate: [
          {
            output: "full.json",
            includeModifiers: ["theme", "density"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(4);
      expect(bundles.map((b) => b.output).sort()).toEqual([
        "full-dark-comfortable.json",
        "full-dark-compact.json",
        "full-light-comfortable.json",
        "full-light-compact.json",
      ]);
    });

    it("should not expand specific modifier values", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [{ name: "base", values: ["base.json"] }],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
        generate: [
          {
            output: "light-only.json",
            includeModifiers: ["theme:light"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.output).toBe("light-only.json");
      const bundleColor = bundles[0]?.tokens.color as any;
      expect(bundleColor?.background?.$value).toEqual({
        colorSpace: "srgb",
        components: [1, 1, 1],
        alpha: 1,
      });
    });
  });

  describe("Combined Filtering", () => {
    it("should combine set and modifier filtering", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
        },
        generate: [
          {
            output: "filtered.json",
            includeSets: ["base"],
            includeModifiers: ["theme"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(2);
      expect(bundles.map((b) => b.output)).toEqual([
        "filtered-light.json",
        "filtered-dark.json",
      ]);

      // Should have base tokens but not components
      const lightBundle = bundles.find(
        (b) => b.output === "filtered-light.json",
      );
      expect(lightBundle?.tokens).toHaveProperty("color.primary");
      expect(lightBundle?.tokens).toHaveProperty("color.background");
      expect(lightBundle?.tokens).not.toHaveProperty("button");
    });

    it("should handle complex filtering scenarios", async () => {
      const manifest: UPFTResolverManifest = {
        sets: [
          { name: "base", values: ["base.json"] },
          { name: "components", values: ["components.json"] },
        ],
        modifiers: {
          theme: {
            oneOf: ["light", "dark"],
            values: {
              light: ["light.json"],
              dark: ["dark.json"],
            },
          },
          density: {
            oneOf: ["comfortable", "compact"],
            values: {
              comfortable: ["comfortable.json"],
              compact: ["compact.json"],
            },
          },
        },
        generate: [
          {
            output: "complex.json",
            includeSets: ["base"],
            includeModifiers: ["theme", "density:compact"],
            excludeSets: ["components"],
          },
        ],
      };

      const bundles = await bundler.bundle(manifest);

      expect(bundles).toHaveLength(2);
      expect(bundles.map((b) => b.output)).toEqual([
        "complex-light.json",
        "complex-dark.json",
      ]);

      // Both should have compact density (not comfortable)
      const lightBundle = bundles.find(
        (b) => b.output === "complex-light.json",
      );
      const spacing = lightBundle?.tokens.spacing as any;
      expect(spacing?.component?.$value).toEqual({
        value: 8,
        unit: "px",
      });
    });
  });
});
