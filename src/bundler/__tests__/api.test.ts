import { beforeEach, expect, test, vi } from "vitest";
import {
  type BundleOptions,
  bundleWithMetadata,
  createBundlerPlugin,
} from "../api";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("../index", () => ({
  bundle: vi.fn(),
}));
vi.mock("../../core/ast-validator", () => ({
  validateReferences: vi.fn(),
}));
vi.mock("../../core/ast", () => ({
  buildEnhancedAST: vi.fn(),
}));
vi.mock("../../core/utils", () => ({
  getTokenStats: vi.fn(),
  hasReference: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("bundleWithMetadata bundles tokens with metadata", async () => {
  const mockTokens = {
    colors: {
      primary: {
        $type: "color",
        $value: {
          colorSpace: "srgb",
          components: [0, 0, 0],
          alpha: 1,
          hex: "#000000",
        },
      },
    },
  };

  const { bundle } = await import("../index");
  const { getTokenStats } = await import("../../core/utils");

  vi.mocked(bundle).mockResolvedValue(mockTokens);
  vi.mocked(getTokenStats).mockReturnValue({
    totalTokens: 1,
    totalGroups: 1,
    tokensByType: { color: 1 },
    tokensWithReferences: 0,
    depth: 1,
  });

  const options: BundleOptions = {
    manifest: "/test/manifest.json",
    theme: "dark",
    mode: "compact",
    format: "dtcg",
    resolveValues: true,
    includeMetadata: true,
  };

  const result = await bundleWithMetadata(options);

  expect((result as any).tokens).toEqual(mockTokens);
  expect((result as any).metadata).toBeTruthy();
  expect((result as any).metadata?.theme).toBe("dark");
  expect((result as any).metadata?.mode).toBe("compact");
  expect((result as any).metadata?.format).toBe("dtcg");
  expect((result as any).metadata?.resolvedValues).toBe(true);
  expect((result as any).metadata?.stats.totalTokens).toBe(1);
});

test("bundleWithMetadata works without metadata", async () => {
  const mockTokens = { color: { $value: "#000" } };

  const { bundle } = await import("../index");
  vi.mocked(bundle).mockResolvedValue(mockTokens);

  const result = await bundleWithMetadata({
    manifest: "/test/manifest.json",
    includeMetadata: false,
  });

  expect((result as any).tokens).toEqual(mockTokens);
  expect((result as any).metadata).toBeNull();
});

test("bundleWithMetadata toJSON method", async () => {
  const mockTokens = { color: { $value: "#000" } };

  const { bundle } = await import("../index");
  vi.mocked(bundle).mockResolvedValue(mockTokens);

  const result = await bundleWithMetadata({
    manifest: "/test/manifest.json",
    includeMetadata: false,
  });

  const json = result.toJSON();
  expect(JSON.parse(json)).toEqual(mockTokens);
});

test("bundleWithMetadata getAST method", async () => {
  const mockTokens = { color: { $value: "#000" } };
  const mockAST = { type: "root", children: [] };

  const { bundle } = await import("../index");
  const { buildEnhancedAST } = await import("../../core/ast");

  vi.mocked(bundle).mockResolvedValue(mockTokens);
  vi.mocked(buildEnhancedAST).mockReturnValue(mockAST as any);

  const result = await bundleWithMetadata({
    manifest: "/test/manifest.json",
  });

  const ast = result.getAST();
  expect(ast).toEqual(mockAST);
  expect(buildEnhancedAST).toHaveBeenCalledWith(mockTokens);
});

test("bundleWithMetadata validate method", async () => {
  const mockTokens = { color: { $value: "#000" } };
  const mockValidation = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalReferences: 0,
      validReferences: 0,
      invalidReferences: 0,
    },
  };

  const { bundle } = await import("../index");
  const { validateReferences } = await import("../../core/ast-validator");

  vi.mocked(bundle).mockResolvedValue(mockTokens);
  vi.mocked(validateReferences).mockReturnValue(mockValidation);

  const result = await bundleWithMetadata({
    manifest: "/test/path/manifest.json",
  });

  const validation = await result.validate();
  expect(validation).toEqual(mockValidation);
  expect(validateReferences).toHaveBeenCalledWith(mockTokens, {
    basePath: "/test/path",
  });
});

test("createBundlerPlugin creates plugin with correct interface", () => {
  const plugin = createBundlerPlugin({
    manifest: "/default/manifest.json",
  });

  expect(plugin.name).toBe("@unpunnyfuns/tokens-bundler");
  expect(plugin.version).toBe("0.1.0");
  expect(typeof plugin.parse).toBe("function");
  expect(typeof plugin.transform).toBe("function");
  expect(typeof plugin.validate).toBe("function");
});

test("plugin parse method", async () => {
  const mockTokens = { color: { $value: "#000" } };
  const mockAST = { type: "root" };
  const _mockMetadata = { bundleTime: 100 };

  const { bundle } = await import("../index");
  const { buildEnhancedAST } = await import("../../core/ast");
  const { getTokenStats, hasReference } = await import("../../core/utils");

  vi.mocked(bundle).mockResolvedValue(mockTokens);
  vi.mocked(buildEnhancedAST).mockReturnValue(mockAST as any);
  vi.mocked(getTokenStats).mockReturnValue({
    totalTokens: 1,
    totalGroups: 0,
    tokensByType: {},
    tokensWithReferences: 0,
    depth: 1,
  });
  vi.mocked(hasReference).mockReturnValue(false);

  const plugin = createBundlerPlugin({
    manifest: "/default/manifest.json",
  });

  const result = await plugin.parse({
    theme: "dark",
  });

  expect((result as any).tokens).toEqual(mockTokens);
  expect((result as any).ast).toEqual(mockAST);
  expect((result as any).metadata).toBeTruthy();
});

test("plugin transform method with resolveValues", async () => {
  const inputTokens = {
    base: { $value: "#000" },
    ref: { $value: { $ref: "#/base" } },
  };
  const resolvedTokens = {
    base: { $value: "#000" },
    ref: { $value: "#000" },
  };

  const plugin = createBundlerPlugin();

  // Mock dynamic imports
  vi.doMock("../../core/resolver", () => ({
    resolveReferences: vi.fn().mockResolvedValue(resolvedTokens),
  }));

  const result = await plugin.transform(inputTokens, {
    resolveValues: true,
  });

  expect(result).toEqual(resolvedTokens);
});

test("plugin transform method with dtcg format", async () => {
  const inputTokens = {
    ref: { $value: { $ref: "#/base" } },
  };
  const dtcgTokens = {
    ref: { $value: "{base}" },
  };

  const plugin = createBundlerPlugin();

  // Mock dynamic imports
  vi.doMock("../dtcg-exporter", () => ({
    convertToDTCG: vi.fn().mockReturnValue(dtcgTokens),
  }));

  const result = await plugin.transform(inputTokens, {
    format: "dtcg",
  });

  expect(result).toEqual(dtcgTokens);
});

test("plugin transform method without options", async () => {
  const tokens = { color: { $value: "#000" } };
  const plugin = createBundlerPlugin();

  const result = await plugin.transform(tokens, {});

  expect(result).toEqual(tokens);
});

test("plugin validate method", async () => {
  const tokens = { color: { $value: "#000" } };
  const validationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalReferences: 0,
      validReferences: 0,
      invalidReferences: 0,
    },
  };

  const { validateReferences } = await import("../../core/ast-validator");
  vi.mocked(validateReferences).mockReturnValue(validationResult);

  const plugin = createBundlerPlugin();
  const result = await plugin.validate(tokens, {
    basePath: "/custom/path",
    strict: true,
  });

  expect(result).toEqual(validationResult);
  expect(validateReferences).toHaveBeenCalledWith(tokens, {
    basePath: "/custom/path",
    strict: true,
  });
});

test("plugin validate method with defaults", async () => {
  const tokens = { color: { $value: "#000" } };
  const { validateReferences } = await import("../../core/ast-validator");

  const plugin = createBundlerPlugin();
  await plugin.validate(tokens, {});

  expect(validateReferences).toHaveBeenCalledWith(tokens, {
    basePath: process.cwd(),
    strict: false,
  });
});
