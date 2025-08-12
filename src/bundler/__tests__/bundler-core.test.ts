import { expect, test } from "vitest";
import {
  Bundler,
  mergeTokens,
  selectFilesFromManifest,
  type TokenSource,
  transformTokens,
} from "../bundler-core";
import type { Manifest } from "../token-loader";

// Test implementation of TokenSource
class TestTokenSource implements TokenSource {
  constructor(
    private manifest: Manifest,
    private tokensByFile: Map<string, Record<string, unknown>>,
  ) {}

  async getManifest(): Promise<Manifest> {
    return this.manifest;
  }

  async getTokensForFiles(files: string[]): Promise<Record<string, unknown>> {
    let result = {};
    for (const file of files) {
      const tokens = this.tokensByFile.get(file);
      if (tokens) {
        result = mergeTokens(result, tokens);
      }
    }
    return result;
  }
}

test("selectFilesFromManifest gets base files", () => {
  const manifest: Manifest = {
    sets: [
      { values: ["base/colors.json", "base/spacing.json"] },
      { values: ["base/typography.json"] },
    ],
  };

  const files = selectFilesFromManifest(manifest, {});

  expect(files).toEqual([
    "base/colors.json",
    "base/spacing.json",
    "base/typography.json",
  ]);
});

test("selectFilesFromManifest adds theme files", () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
    modifiers: [
      {
        name: "theme",
        values: [
          { name: "light", values: ["light.json"] },
          { name: "dark", values: ["dark.json"] },
        ],
      },
    ],
  };

  const files = selectFilesFromManifest(manifest, { theme: "dark" });

  expect(files).toEqual(["base.json", "dark.json"]);
});

test("selectFilesFromManifest handles multiple modifiers", () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
    modifiers: [
      {
        name: "theme",
        values: [{ name: "dark", values: ["dark.json"] }],
      },
      {
        name: "mode",
        values: [{ name: "compact", values: ["compact.json"] }],
      },
    ],
  };

  const files = selectFilesFromManifest(manifest, {
    theme: "dark",
    mode: "compact",
  });

  expect(files).toEqual(["base.json", "dark.json", "compact.json"]);
});

test("transformTokens preserves tokens by default", async () => {
  const tokens = {
    color: {
      $type: "color",
      $value: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
        hex: "#000000",
      },
    },
    size: {
      $type: "dimension",
      $value: "16px",
    },
  };

  const result = await transformTokens(tokens, {});

  expect(result).toEqual(tokens);
});

test("transformTokens resolves references when requested", async () => {
  const tokens = {
    base: {
      $type: "color",
      $value: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
        hex: "#000000",
      },
    },
    derived: {
      $type: "color",
      $value: { $ref: "#/base/$value" },
    },
  };

  const result = await transformTokens(tokens, { resolveValues: true });

  expect((result as any).derived.$value).toEqual(tokens.base.$value);
});

test("transformTokens converts to DTCG format", async () => {
  const tokens = {
    color: {
      $type: "color",
      $value: { $ref: "#/base/$value" },
    },
  };

  const result = await transformTokens(tokens, { format: "dtcg" });

  expect((result as any).color.$value).toBe("{base}");
});

test("transformTokens applies multiple transformations", async () => {
  const tokens = {
    base: {
      $type: "color",
      $value: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 1,
        hex: "#000000",
      },
    },
    derived: {
      $type: "color",
      $value: { $ref: "#/base/$value" },
    },
  };

  const result = await transformTokens(tokens, {
    resolveValues: true,
    format: "dtcg",
  });

  // First resolves reference, then format doesn't change it (no ref left)
  expect((result as any).derived.$value).toEqual(tokens.base.$value);
});

test("mergeTokens combines token sets", () => {
  const set1 = { colors: { primary: "#000" } };
  const set2 = { spacing: { small: "8px" } };

  const result = mergeTokens(set1, set2);

  expect(result).toEqual({
    colors: { primary: "#000" },
    spacing: { small: "8px" },
  });
});

test("mergeTokens overwrites with later values", () => {
  const set1 = { color: { $value: "#000" } };
  const set2 = { color: { $value: "#fff" } };

  const result = mergeTokens(set1, set2);

  expect(result).toEqual({ color: { $value: "#fff" } });
});

test("mergeTokens deep merges non-token objects", () => {
  const set1 = {
    theme: {
      colors: { primary: "#000" },
      spacing: { small: "8px" },
    },
  };
  const set2 = {
    theme: {
      colors: { secondary: "#fff" },
    },
  };

  const result = mergeTokens(set1, set2);

  expect(result).toEqual({
    theme: {
      colors: { primary: "#000", secondary: "#fff" },
      spacing: { small: "8px" },
    },
  });
});

test("mergeTokens replaces entire token objects", () => {
  const set1 = {
    color: {
      $value: "#000",
      $type: "color",
      $description: "Primary",
    },
  };
  const set2 = {
    color: {
      $value: "#fff",
    },
  };

  const result = mergeTokens(set1, set2);

  expect(result).toEqual({
    color: { $value: "#fff" },
  });
});

test("Bundler bundles with base files only", async () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
  };

  const source = new TestTokenSource(
    manifest,
    new Map([["base.json", { color: { $value: "#000" } }]]),
  );

  const bundler = new Bundler(source);
  const result = await bundler.bundle();

  expect(result).toEqual({ color: { $value: "#000" } });
});

test("Bundler bundles with theme", async () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
    modifiers: [
      {
        name: "theme",
        values: [{ name: "dark", values: ["dark.json"] }],
      },
    ],
  };

  const source = new TestTokenSource(
    manifest,
    new Map([
      ["base.json", { color: { $value: "#000" } }],
      ["dark.json", { color: { $value: "#fff" } }],
    ]),
  );

  const bundler = new Bundler(source);
  const result = await bundler.bundle({ theme: "dark" });

  expect(result).toEqual({ color: { $value: "#fff" } });
});

test("Bundler applies transformations", async () => {
  const manifest: Manifest = {
    sets: [{ values: ["tokens.json"] }],
  };

  const source = new TestTokenSource(
    manifest,
    new Map([
      [
        "tokens.json",
        {
          base: { $value: "#000" },
          ref: { $value: { $ref: "#/base/$value" } },
        },
      ],
    ]),
  );

  const bundler = new Bundler(source);
  const result = await bundler.bundle({ resolveValues: true });

  expect((result as any).ref.$value).toBe("#000");
});
