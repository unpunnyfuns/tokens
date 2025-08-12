import { expect, test } from "vitest";
import {
  createReferenceMap,
  getModifierFiles,
  loadTokenFiles,
  type Manifest,
  type TokenLoader,
} from "../token-loader";

// Test implementation of TokenLoader for testing
class TestTokenLoader implements TokenLoader {
  constructor(private files: Map<string, unknown>) {}

  async loadJson(path: string): Promise<unknown> {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return this.files.get(path);
  }
}

test("loads and merges token files", async () => {
  const loader = new TestTokenLoader(
    new Map([
      ["/base/colors.json", { colors: { primary: "#000" } }],
      ["/base/spacing.json", { spacing: { small: "8px" } }],
    ]),
  );

  const tokens = await loadTokenFiles(
    ["colors.json", "spacing.json"],
    "/base",
    loader,
  );

  expect(tokens).toEqual({
    colors: { primary: "#000" },
    spacing: { small: "8px" },
  });
});

test("overwrites tokens from later files", async () => {
  const loader = new TestTokenLoader(
    new Map([
      ["/base/base.json", { color: { primary: "#000" } }],
      ["/base/override.json", { color: { primary: "#fff" } }],
    ]),
  );

  const tokens = await loadTokenFiles(
    ["base.json", "override.json"],
    "/base",
    loader,
  );

  expect(tokens.color).toEqual({ primary: "#fff" });
});

test("handles empty file list", async () => {
  const loader = new TestTokenLoader(new Map());
  const tokens = await loadTokenFiles([], "/base", loader);
  expect(tokens).toEqual({});
});

test("gets base set files from manifest", () => {
  const manifest: Manifest = {
    sets: [
      { values: ["base/colors.json", "base/spacing.json"] },
      { values: ["base/typography.json"] },
    ],
  };

  const files = getModifierFiles(manifest);

  expect(files).toEqual([
    "base/colors.json",
    "base/spacing.json",
    "base/typography.json",
  ]);
});

test("gets theme-specific files from manifest", () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
    modifiers: [
      {
        name: "theme",
        values: [
          { name: "light", values: ["themes/light.json"] },
          { name: "dark", values: ["themes/dark.json"] },
        ],
      },
    ],
  };

  const files = getModifierFiles(manifest, "dark");

  expect(files).toEqual(["base.json", "themes/dark.json"]);
});

test("gets mode-specific files from manifest", () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
    modifiers: [
      {
        name: "mode",
        values: [
          { name: "compact", values: ["modes/compact.json"] },
          { name: "comfortable", values: ["modes/comfortable.json"] },
        ],
      },
    ],
  };

  const files = getModifierFiles(manifest, undefined, "compact");

  expect(files).toEqual(["base.json", "modes/compact.json"]);
});

test("combines theme and mode files", () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
    modifiers: [
      {
        name: "theme",
        values: [{ name: "dark", values: ["themes/dark.json"] }],
      },
      {
        name: "mode",
        values: [{ name: "compact", values: ["modes/compact.json"] }],
      },
    ],
  };

  const files = getModifierFiles(manifest, "dark", "compact");

  expect(files).toEqual([
    "base.json",
    "themes/dark.json",
    "modes/compact.json",
  ]);
});

test("handles missing modifiers gracefully", () => {
  const manifest: Manifest = {
    sets: [{ values: ["base.json"] }],
  };

  const files = getModifierFiles(manifest, "dark", "compact");

  expect(files).toEqual(["base.json"]);
});

test("creates reference map for flat tokens", () => {
  const tokens = {
    colors: {
      primary: { $value: "#000" },
      secondary: { $value: "#fff" },
    },
  };

  const refMap = createReferenceMap(tokens);

  expect(refMap.get("#/colors/primary/$value")).toBe("#000");
  expect(refMap.get("#/colors/secondary/$value")).toBe("#fff");
  expect(refMap.get("#/colors/primary")).toEqual({ $value: "#000" });
});

test("creates reference map for nested tokens", () => {
  const tokens = {
    theme: {
      colors: {
        brand: {
          primary: { $value: "#0066cc" },
        },
      },
    },
  };

  const refMap = createReferenceMap(tokens);

  expect(refMap.get("#/theme/colors/brand/primary/$value")).toBe("#0066cc");
  expect(refMap.get("#/theme/colors/brand/primary")).toEqual({
    $value: "#0066cc",
  });
});

test("creates reference map with custom prefix", () => {
  const tokens = {
    color: { $value: "#000" },
  };

  const refMap = createReferenceMap(tokens, "custom");

  expect(refMap.get("custom/color/$value")).toBe("#000");
  expect(refMap.get("#/color/$value")).toBeUndefined();
});

test("handles tokens with metadata in reference map", () => {
  const tokens = {
    colors: {
      primary: {
        $value: "#000",
        $type: "color",
        $description: "Primary color",
      },
    },
  };

  const refMap = createReferenceMap(tokens);

  expect(refMap.get("#/colors/primary")).toEqual({
    $value: "#000",
    $type: "color",
    $description: "Primary color",
  });
  expect(refMap.get("#/colors/primary/$value")).toBe("#000");
});

test("skips non-token objects in reference map", () => {
  const tokens = {
    metadata: {
      version: "1.0",
      author: "test",
    },
    colors: {
      primary: { $value: "#000" },
    },
  };

  const refMap = createReferenceMap(tokens);

  expect(refMap.has("#/metadata/version")).toBe(false);
  expect(refMap.has("#/metadata/author")).toBe(false);
  expect(refMap.has("#/colors/primary/$value")).toBe(true);
});
