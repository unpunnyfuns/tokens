import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { bundle } from "../index";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("../dtcg-exporter", () => ({
  convertToDTCG: vi.fn(),
}));
vi.mock("../../core/resolver", () => ({
  resolveReferences: vi.fn(),
}));
vi.mock("../bundler-core", () => ({
  mergeTokens: vi.fn(),
}));
vi.mock("../external-resolver", () => ({
  resolveExternalReferences: vi
    .fn()
    .mockImplementation((tokens) => Promise.resolve(tokens)),
  checkForExternalReferences: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bundle", () => {
  test("loads and bundles tokens from manifest", async () => {
    const manifest = {
      sets: [
        {
          values: ["tokens/base.json", "tokens/extended.json"],
        },
      ],
    };

    const baseTokens = {
      colors: {
        primary: { $value: "#000" },
      },
    };

    const extendedTokens = {
      colors: {
        secondary: { $value: "#fff" },
      },
    };

    const mergedTokens = {
      colors: {
        primary: { $value: "#000" },
        secondary: { $value: "#fff" },
      },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("base.json")) {
        return JSON.stringify(baseTokens);
      }
      if (pathStr.includes("extended.json")) {
        return JSON.stringify(extendedTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const { mergeTokens: mergeTokensCore } = await import("../bundler-core");
    const { convertToDTCG } = await import("../dtcg-exporter");
    const { checkForExternalReferences } = await import("../external-resolver");

    vi.mocked(mergeTokensCore).mockReturnValue(mergedTokens);
    vi.mocked(convertToDTCG).mockReturnValue(mergedTokens);
    vi.mocked(checkForExternalReferences).mockReturnValue({
      hasExternal: false,
      externalRefs: [],
    });

    const result = await bundle({
      manifest: "/test/manifest.json",
      format: "dtcg",
    });

    expect(result).toEqual(mergedTokens);
    expect(fs.readFile).toHaveBeenCalledWith("/test/manifest.json", "utf-8");
    expect(mergeTokensCore).toHaveBeenCalled();
    expect(convertToDTCG).toHaveBeenCalledWith(mergedTokens);
  });

  test("applies theme modifier", async () => {
    const manifest = {
      sets: [{ values: ["base.json"] }],
      modifiers: [
        {
          name: "theme",
          values: [
            {
              name: "dark",
              values: ["themes/dark.json"],
            },
          ],
        },
      ],
    };

    const baseTokens = { color: { $value: "#000" } };
    const darkTokens = { color: { $value: "#fff" } };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("base.json")) {
        return JSON.stringify(baseTokens);
      }
      if (pathStr.includes("dark.json")) {
        return JSON.stringify(darkTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const { mergeTokens: mergeTokensCore } = await import("../bundler-core");
    const { convertToDTCG } = await import("../dtcg-exporter");
    const { checkForExternalReferences } = await import("../external-resolver");

    vi.mocked(mergeTokensCore).mockReturnValue(darkTokens);
    vi.mocked(convertToDTCG).mockReturnValue(darkTokens);
    vi.mocked(checkForExternalReferences).mockReturnValue({
      hasExternal: false,
      externalRefs: [],
    });

    const result = await bundle({
      manifest: "/test/manifest.json",
      theme: "dark",
      format: "dtcg",
    });

    expect(result).toEqual(darkTokens);
    expect(fs.readFile).toHaveBeenCalledWith("/test/themes/dark.json", "utf-8");
  });

  test("applies mode modifier", async () => {
    const manifest = {
      modifiers: [
        {
          name: "mode",
          values: [
            {
              name: "compact",
              values: ["modes/compact.json"],
            },
          ],
        },
      ],
    };

    const compactTokens = { spacing: { $value: "4px" } };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("compact.json")) {
        return JSON.stringify(compactTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const { mergeTokens: mergeTokensCore } = await import("../bundler-core");
    const { convertToDTCG } = await import("../dtcg-exporter");
    const { checkForExternalReferences } = await import("../external-resolver");

    vi.mocked(mergeTokensCore).mockReturnValue(compactTokens);
    vi.mocked(convertToDTCG).mockReturnValue(compactTokens);
    vi.mocked(checkForExternalReferences).mockReturnValue({
      hasExternal: false,
      externalRefs: [],
    });

    const result = await bundle({
      manifest: "/test/manifest.json",
      mode: "compact",
      format: "dtcg",
    });

    expect(result).toEqual(compactTokens);
  });

  test("resolves values when requested", async () => {
    const manifest = { sets: [{ values: ["tokens.json"] }] };
    const tokens = {
      base: { $value: "#000" },
      ref: { $value: { $ref: "#/base" } },
    };
    const resolvedTokens = {
      base: { $value: "#000" },
      ref: { $value: "#000" },
    };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      return JSON.stringify(tokens);
    });

    const { mergeTokens: mergeTokensCore } = await import("../bundler-core");
    const { resolveReferences } = await import("../../core/resolver");
    const { convertToDTCG } = await import("../dtcg-exporter");
    const { checkForExternalReferences } = await import("../external-resolver");

    vi.mocked(mergeTokensCore).mockReturnValue(tokens);
    vi.mocked(resolveReferences).mockResolvedValue(resolvedTokens);
    vi.mocked(convertToDTCG).mockReturnValue(resolvedTokens);
    vi.mocked(checkForExternalReferences).mockReturnValue({
      hasExternal: false,
      externalRefs: [],
    });

    const result = await bundle({
      manifest: "/test/manifest.json",
      resolveValues: true,
      format: "dtcg",
    });

    expect(result).toEqual(resolvedTokens);
    expect(resolveReferences).toHaveBeenCalledWith(tokens, {
      basePath: "/test",
      mode: true,
      strict: false,
    });
  });

  test("preserves format when specified", async () => {
    const manifest = { sets: [{ values: ["tokens.json"] }] };
    const tokens = { color: { $value: { $ref: "#/base" } } };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      return JSON.stringify(tokens);
    });

    const { mergeTokens: mergeTokensCore } = await import("../bundler-core");
    const { checkForExternalReferences } = await import("../external-resolver");

    vi.mocked(mergeTokensCore).mockReturnValue(tokens);
    vi.mocked(checkForExternalReferences).mockReturnValue({
      hasExternal: false,
      externalRefs: [],
    });

    const result = await bundle({
      manifest: "/test/manifest.json",
      format: "preserve",
    });

    expect(result).toEqual(tokens);
  });

  test("handles custom modifiers", async () => {
    const manifest = {
      modifiers: [
        {
          name: "custom",
          values: [
            {
              name: "special",
              values: ["custom/special.json"],
            },
          ],
        },
      ],
    };

    const specialTokens = { custom: { $value: "special" } };

    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      const pathStr = path.toString();
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("special.json")) {
        return JSON.stringify(specialTokens);
      }
      throw new Error(`Unexpected file: ${path}`);
    });

    const { mergeTokens: mergeTokensCore } = await import("../bundler-core");
    const { convertToDTCG } = await import("../dtcg-exporter");
    const { checkForExternalReferences } = await import("../external-resolver");

    vi.mocked(mergeTokensCore).mockReturnValue(specialTokens);
    vi.mocked(convertToDTCG).mockReturnValue(specialTokens);
    vi.mocked(checkForExternalReferences).mockReturnValue({
      hasExternal: false,
      externalRefs: [],
    });

    const result = await bundle({
      manifest: "/test/manifest.json",
      custom: "special",
      format: "dtcg",
    });

    expect(result).toEqual(specialTokens);
  });
});
