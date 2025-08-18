import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenDocument } from "../types.js";
import {
  generateAll,
  type ResolverOptions,
  resolvePermutation,
} from "./manifest-core.js";
import type { ResolutionInput, UPFTResolverManifest } from "./upft-types.js";

// Mock dependencies
vi.mock("../validation/index.js", () => ({
  isValidManifest: vi.fn(),
  validateManifest: vi.fn(),
}));

vi.mock("./manifest-validation.js", () => ({
  validateInput: vi.fn(),
}));

vi.mock("./manifest-files.js", () => ({
  collectFiles: vi.fn(),
  loadAndMergeFiles: vi.fn(),
}));

vi.mock("./manifest-filtering.js", () => ({
  filterFiles: vi.fn(),
}));

vi.mock("./manifest-generation.js", () => ({
  expandGenerateSpec: vi.fn(),
  expandSpecWithFiltering: vi.fn(),
  generateAllPermutations: vi.fn(),
}));

vi.mock("../ast/ast-builder.js", () => ({
  createAST: vi.fn(),
}));

vi.mock("../ast/index.js", () => ({
  resolveASTReferences: vi.fn(),
}));

vi.mock("../io/file-reader.js", () => ({
  TokenFileReader: vi.fn().mockImplementation(() => ({
    readFile: vi.fn(),
  })),
}));

describe("manifest-core", () => {
  const mockManifest: UPFTResolverManifest = {
    sets: [
      { values: ["base.json"], name: "Base" },
      { values: ["theme.json"], name: "Theme" },
    ],
    modifiers: {
      mode: {
        oneOf: ["light", "dark"],
        values: { light: ["light.json"], dark: ["dark.json"] },
      },
      density: {
        oneOf: ["comfortable", "compact"],
        values: {
          comfortable: ["comfortable.json"],
          compact: ["compact.json"],
        },
      },
    },
  };

  const mockInput: ResolutionInput = {
    mode: "light",
    density: "comfortable",
  };

  const mockTokens: TokenDocument = {
    color: {
      primary: { $value: "#007acc", $type: "color" },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolvePermutation", () => {
    it("should resolve a valid permutation", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json", "theme.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);

      const result = await resolvePermutation(mockManifest, mockInput);

      expect(result).toEqual({
        id: "mode-light_density-comfortable",
        input: mockInput,
        files: ["base.json", "theme.json"],
        tokens: mockTokens,
      });

      expect(isValidManifest).toHaveBeenCalledWith(mockManifest);
      expect(validateInput).toHaveBeenCalledWith(mockManifest, mockInput);
      expect(collectFiles).toHaveBeenCalled();
      expect(loadAndMergeFiles).toHaveBeenCalledWith(
        ["base.json", "theme.json"],
        expect.any(Object),
      );
    });

    it("should throw error for invalid manifest", async () => {
      const { isValidManifest, validateManifest } = await import(
        "../validation/index.js"
      );

      (isValidManifest as any).mockReturnValue(false);
      (validateManifest as any).mockReturnValue({
        valid: false,
        errors: [{ message: "Invalid manifest structure" }],
      });

      await expect(resolvePermutation(mockManifest, mockInput)).rejects.toThrow(
        "Invalid manifest:\nInvalid manifest structure",
      );
    });

    it("should throw error for invalid input", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({
        valid: false,
        errors: [{ modifier: "mode", message: "Invalid value: blue" }],
      });

      await expect(resolvePermutation(mockManifest, mockInput)).rejects.toThrow(
        "Invalid input:\n  - mode: Invalid value: blue",
      );
    });

    it("should resolve references when enabled", async () => {
      const manifestWithReferences = {
        ...mockManifest,
        options: { resolveReferences: true },
      };

      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );
      const { createAST } = await import("../ast/ast-builder.js");
      const { resolveASTReferences } = await import("../ast/index.js");

      const mockAst = {
        type: "group",
        name: "root",
        children: new Map([
          [
            "color",
            {
              type: "group",
              name: "color",
              children: new Map([
                [
                  "primary",
                  {
                    type: "token",
                    name: "primary",
                    value: "#007acc",
                    resolvedValue: "#007acc",
                    tokenType: "color",
                  },
                ],
              ]),
            },
          ],
        ]),
      };

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);
      (createAST as any).mockReturnValue(mockAst);
      (resolveASTReferences as any).mockReturnValue([]);

      const result = await resolvePermutation(
        manifestWithReferences,
        mockInput,
      );

      expect(result.resolvedTokens).toBeDefined();
      expect(createAST).toHaveBeenCalledWith(mockTokens);
      expect(resolveASTReferences).toHaveBeenCalledWith(mockAst);
    });

    it("should throw error when reference resolution fails", async () => {
      const manifestWithReferences = {
        ...mockManifest,
        options: { resolveReferences: true },
      };

      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );
      const { createAST } = await import("../ast/ast-builder.js");
      const { resolveASTReferences } = await import("../ast/index.js");

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);
      (createAST as any).mockReturnValue({});
      (resolveASTReferences as any).mockReturnValue([
        { path: "color.primary", message: "Unresolved reference" },
      ]);

      await expect(
        resolvePermutation(manifestWithReferences, mockInput),
      ).rejects.toThrow(
        "Reference resolution failed:\n  - color.primary: Unresolved reference",
      );
    });

    it("should use filtered files when spec is provided", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { filterFiles } = await import("./manifest-filtering.js");
      const { loadAndMergeFiles } = await import("./manifest-files.js");

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (filterFiles as any).mockResolvedValue(["filtered.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);

      const spec = { mode: "light", sets: ["base"] };
      const result = await resolvePermutation(mockManifest, mockInput, {
        spec,
      });

      expect(filterFiles).toHaveBeenCalledWith(
        mockManifest,
        mockInput,
        spec,
        expect.any(Object),
      );
      expect(result.files).toEqual(["filtered.json"]);
    });

    it("should include output field when present in input", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      const inputWithOutput = { ...mockInput, output: "dist/tokens.json" };

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);

      const result = await resolvePermutation(mockManifest, inputWithOutput);

      expect(result.output).toBe("dist/tokens.json");
    });

    it("should use provided fileReader", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      const mockFileReader = {
        readFile: vi.fn(),
      };

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);

      const options: ResolverOptions = {
        fileReader: mockFileReader as any,
      };

      await resolvePermutation(mockManifest, mockInput, options);

      expect(collectFiles).toHaveBeenCalledWith(
        mockManifest,
        mockInput,
        mockFileReader,
      );
    });

    it("should handle empty input", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      const emptyInput: ResolutionInput = {};

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);

      const result = await resolvePermutation(mockManifest, emptyInput);

      expect(result.id).toBe("default");
    });

    it("should handle array values in input", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      const arrayInput: ResolutionInput = {
        themes: ["light", "blue"],
        platforms: ["web", "mobile"],
      };

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);

      const result = await resolvePermutation(mockManifest, arrayInput);

      expect(result.id).toBe("themes-light+blue_platforms-web+mobile");
    });
  });

  describe("generateAll", () => {
    it("should generate specified permutations", async () => {
      const manifestWithGenerate = {
        ...mockManifest,
        generate: [
          { mode: "light", density: "comfortable", output: "light.json" },
          { mode: "dark", density: "compact", output: "dark.json" },
        ],
      };

      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );
      const { expandSpecWithFiltering, expandGenerateSpec } = await import(
        "./manifest-generation.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);
      (expandSpecWithFiltering as any).mockImplementation(
        (_: any, spec: any) => [{ spec, output: spec.output }],
      );
      (expandGenerateSpec as any).mockImplementation((_: any, spec: any) => ({
        mode: spec.mode,
        density: spec.density,
      }));

      const results = await generateAll(manifestWithGenerate);

      expect(results).toHaveLength(2);
      expect(results[0]?.output).toBe("light.json");
      expect(results[1]?.output).toBe("dark.json");
    });

    it("should generate all permutations when no generate spec", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );
      const { generateAllPermutations } = await import(
        "./manifest-generation.js"
      );

      const allPermutations = [
        { mode: "light", density: "comfortable" },
        { mode: "light", density: "compact" },
        { mode: "dark", density: "comfortable" },
        { mode: "dark", density: "compact" },
      ];

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);
      (generateAllPermutations as any).mockReturnValue(allPermutations);

      const results = await generateAll(mockManifest);

      expect(results).toHaveLength(4);
      expect(generateAllPermutations).toHaveBeenCalledWith(mockManifest);
    });

    it("should throw error for invalid manifest", async () => {
      const { isValidManifest, validateManifest } = await import(
        "../validation/index.js"
      );

      (isValidManifest as any).mockReturnValue(false);
      (validateManifest as any).mockReturnValue({
        valid: false,
        errors: [{ message: "Invalid structure" }],
      });

      await expect(generateAll(mockManifest)).rejects.toThrow(
        "Invalid manifest:\nInvalid structure",
      );
    });

    it("should pass options to resolvePermutation", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );
      const { generateAllPermutations } = await import(
        "./manifest-generation.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue(["base.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);
      (generateAllPermutations as any).mockReturnValue([
        { mode: "light", density: "comfortable" },
      ]);

      const options: ResolverOptions = {
        basePath: "/custom/path",
      };

      await generateAll(mockManifest, options);

      // Verify that TokenFileReader was created with the basePath option
      const { TokenFileReader } = await import("../io/file-reader.js");
      expect(TokenFileReader).toHaveBeenCalledWith({
        basePath: "/custom/path",
      });
    });

    it("should handle empty generate array", async () => {
      const manifestWithEmptyGenerate = {
        ...mockManifest,
        generate: [],
      };

      const { isValidManifest } = await import("../validation/index.js");

      (isValidManifest as any).mockReturnValue(true);

      const results = await generateAll(manifestWithEmptyGenerate);

      expect(results).toEqual([]);
    });

    it("should handle expanded specs with filtering", async () => {
      const manifestWithGenerate = {
        ...mockManifest,
        generate: [{ mode: ["light", "dark"], density: "comfortable" }],
      };

      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { filterFiles } = await import("./manifest-filtering.js");
      const { loadAndMergeFiles } = await import("./manifest-files.js");
      const { expandSpecWithFiltering, expandGenerateSpec } = await import(
        "./manifest-generation.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (filterFiles as any).mockResolvedValue(["filtered.json"]);
      (loadAndMergeFiles as any).mockResolvedValue(mockTokens);
      (expandSpecWithFiltering as any).mockReturnValue([
        { spec: { mode: "light", density: "comfortable" } },
        { spec: { mode: "dark", density: "comfortable" } },
      ]);
      (expandGenerateSpec as any).mockImplementation(
        (_: any, spec: any) => spec,
      );

      const results = await generateAll(manifestWithGenerate);

      expect(results).toHaveLength(2);
      expect(filterFiles).toHaveBeenCalledTimes(2);
    });
  });

  describe("ID generation", () => {
    it("should generate correct ID for single values", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue([]);
      (loadAndMergeFiles as any).mockResolvedValue({});

      const result = await resolvePermutation(mockManifest, {
        mode: "light",
        density: "comfortable",
      });

      expect(result.id).toBe("mode-light_density-comfortable");
    });

    it("should generate correct ID for array values", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue([]);
      (loadAndMergeFiles as any).mockResolvedValue({});

      const result = await resolvePermutation(mockManifest, {
        themes: ["light", "blue"],
        platforms: ["web"],
      });

      expect(result.id).toBe("themes-light+blue_platforms-web");
    });

    it("should exclude output from ID", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue([]);
      (loadAndMergeFiles as any).mockResolvedValue({});

      const result = await resolvePermutation(mockManifest, {
        mode: "light",
        output: "dist/tokens.json",
      });

      expect(result.id).toBe("mode-light");
      expect(result.id).not.toContain("output");
    });

    it("should generate default ID for empty input", async () => {
      const { isValidManifest } = await import("../validation/index.js");
      const { validateInput } = await import("./manifest-validation.js");
      const { collectFiles, loadAndMergeFiles } = await import(
        "./manifest-files.js"
      );

      (isValidManifest as any).mockReturnValue(true);
      (validateInput as any).mockReturnValue({ valid: true, errors: [] });
      (collectFiles as any).mockResolvedValue([]);
      (loadAndMergeFiles as any).mockResolvedValue({});

      const result = await resolvePermutation(mockManifest, {});

      expect(result.id).toBe("default");
    });
  });
});
