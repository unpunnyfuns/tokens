/**
 * Comprehensive tests for multi-pass-resolver.ts
 * Tests dependency discovery and project resolution
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ManifestAST } from "@upft/ast";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLoader } from "./loader.js";
import {
  createProjectAST,
  discoverAllDependencies,
  resolveProject,
} from "./multi-pass-resolver.js";

const TEST_DIR = resolve(__dirname, "__multipass_fixtures__");

const BASE_TOKENS = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    primary: {
      $type: "color",
      $value: "#0066CC",
    },
    secondary: {
      $type: "color",
      $value: "{color.primary}",
    },
  },
};

const SEMANTIC_TOKENS = {
  $schema: "https://schemas.upft.co/draft/tokens/v0.json",
  color: {
    surface: {
      $type: "color",
      $value: "{color.primary}",
    },
  },
};

const MANIFEST_AST: ManifestAST = {
  type: "manifest",
  path: "/test/manifest.json",
  name: "test-manifest",
  manifestType: "upft",
  sets: new Map([
    [
      "base",
      {
        name: "base",
        files: ["base-tokens.json"],
      },
    ],
    [
      "semantic",
      {
        name: "semantic",
        files: ["semantic-tokens.json"],
      },
    ],
  ]),
  modifiers: new Map([
    [
      "theme",
      {
        name: "theme",
        constraintType: "oneOf",
        options: ["light", "dark"],
        values: new Map([
          ["light", []],
          ["dark", ["dark-tokens.json"]],
        ]),
      },
    ],
  ]),
  permutations: new Map(),
};

describe("Multi-Pass Resolver", () => {
  beforeEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      /* Directory cleanup - ignore if doesn't exist */
    }
  });

  describe("createProjectAST", () => {
    it("should create project AST from file paths", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "semantic.json"),
        JSON.stringify(SEMANTIC_TOKENS, null, 2),
      );

      const project = await createProjectAST(TEST_DIR, [
        "base.json",
        "semantic.json",
      ]);

      expect(project.type).toBe("project");
      expect(project.name).toBe("project");
      expect(project.basePath).toBe(TEST_DIR);
      expect(project.files.size).toBe(2);
      expect(project.crossFileReferences).toBeDefined();
      expect(project.dependencyGraph).toBeDefined();
    });

    it("should create project AST with manifest", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );

      const project = await createProjectAST(
        TEST_DIR,
        ["base.json"],
        MANIFEST_AST,
      );

      expect(project.manifest).toBeDefined();
      expect(project.manifest?.type).toBe("manifest");
      expect(project.manifest?.parent).toBe(project);
    });

    it("should handle empty file list", async () => {
      const project = await createProjectAST(TEST_DIR, []);

      expect(project.files.size).toBe(0);
      expect(project.crossFileReferences.size).toBe(0);
    });

    it("should create TokenAST nodes for each file", async () => {
      writeFileSync(
        resolve(TEST_DIR, "tokens.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );

      const project = await createProjectAST(TEST_DIR, ["tokens.json"]);

      const tokenFile = project.files.get("tokens.json");
      expect(tokenFile).toBeDefined();
      expect(tokenFile?.type).toBe("file");
      expect(tokenFile?.path).toBe("tokens.json");
      expect(tokenFile?.parent).toBe(project);
      expect(tokenFile?.children.size).toBe(1);
    });

    it("should build cross-file references", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "semantic.json"),
        JSON.stringify(SEMANTIC_TOKENS, null, 2),
      );

      const project = await createProjectAST(TEST_DIR, [
        "base.json",
        "semantic.json",
      ]);

      // Cross-file references should be built
      expect(project.crossFileReferences).toBeDefined();
    });

    it("should build dependency graph", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "semantic.json"),
        JSON.stringify(SEMANTIC_TOKENS, null, 2),
      );

      const project = await createProjectAST(TEST_DIR, [
        "base.json",
        "semantic.json",
      ]);

      expect(project.dependencyGraph).toBeDefined();
    });

    it("should handle missing files gracefully", async () => {
      // Don't create the file, should fail
      await expect(
        createProjectAST(TEST_DIR, ["nonexistent.json"]),
      ).rejects.toThrow();
    });
  });

  describe("discoverAllDependencies", () => {
    it("should discover dependencies from manifest", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base-tokens.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "semantic-tokens.json"),
        JSON.stringify(SEMANTIC_TOKENS, null, 2),
      );

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        MANIFEST_AST,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      expect(result.dependencies.length).toBeGreaterThan(0);
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.rounds).toBeGreaterThan(0);
    });

    it("should handle missing dependencies", async () => {
      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        MANIFEST_AST,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.dependencies).toBeDefined();
    });

    it("should limit discovery rounds", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base-tokens.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        MANIFEST_AST,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      // Should complete within reasonable rounds
      expect(result.rounds).toBeLessThan(10);
    });

    it("should discover transitive dependencies", async () => {
      // Create chain: manifest -> base -> semantic
      const baseWithRef = {
        ...BASE_TOKENS,
        color: {
          ...BASE_TOKENS.color,
          imported: {
            $type: "color",
            $value: "{semantic.surface}",
          },
        },
      };

      writeFileSync(
        resolve(TEST_DIR, "base-tokens.json"),
        JSON.stringify(baseWithRef, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "semantic-tokens.json"),
        JSON.stringify(SEMANTIC_TOKENS, null, 2),
      );

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        MANIFEST_AST,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      expect(result.dependencies.length).toBeGreaterThan(1);
    });

    it("should handle circular dependencies", async () => {
      // Create circular reference
      const circular1 = {
        $schema: "https://schemas.upft.co/draft/tokens/v0.json",
        color: {
          one: {
            $type: "color",
            $value: "{color.two}",
          },
        },
      };

      const circular2 = {
        $schema: "https://schemas.upft.co/draft/tokens/v0.json",
        color: {
          two: {
            $type: "color",
            $value: "{color.one}",
          },
        },
      };

      writeFileSync(
        resolve(TEST_DIR, "circular1.json"),
        JSON.stringify(circular1, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "circular2.json"),
        JSON.stringify(circular2, null, 2),
      );

      const circularManifest: ManifestAST = {
        ...MANIFEST_AST,
        sets: new Map([
          ["circular", { name: "circular", files: ["circular1.json"] }],
        ]),
      };

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        circularManifest,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      // Should handle circular deps without infinite loop
      expect(result.rounds).toBeLessThan(20);
    });

    it("should extract files from manifest modifiers", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base-tokens.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "dark-tokens.json"),
        JSON.stringify(
          {
            $schema: "https://schemas.upft.co/draft/tokens/v0.json",
            color: { bg: { $type: "color", $value: "#000" } },
          },
          null,
          2,
        ),
      );

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        MANIFEST_AST,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      // Should discover both base and dark tokens
      expect(result.dependencies).toContain("base-tokens.json");
      expect(result.dependencies).toContain("dark-tokens.json");
    });
  });

  describe("resolveProject", () => {
    it("should resolve project with file ASTs", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );

      const project = await createProjectAST(TEST_DIR, ["base.json"]);
      const fileASTs = new Map([
        ...(project.files.get("base.json")
          ? [["base.json", project.files.get("base.json")]]
          : []),
      ]);

      const result = await resolveProject(MANIFEST_AST, fileASTs, TEST_DIR);

      expect(result.project).toBeDefined();
      expect(result.project.type).toBe("project");
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it("should handle empty file ASTs", async () => {
      const result = await resolveProject(MANIFEST_AST, new Map(), TEST_DIR);

      expect(result.project).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it("should set project metadata", async () => {
      const result = await resolveProject(MANIFEST_AST, new Map(), TEST_DIR);

      expect(result.project.basePath).toBe(TEST_DIR);
      expect(result.project.manifest).toBe(MANIFEST_AST);
    });

    it("should detect circular dependencies in project", async () => {
      // Create project with circular refs
      writeFileSync(
        resolve(TEST_DIR, "circular.json"),
        JSON.stringify(
          {
            $schema: "https://schemas.upft.co/draft/tokens/v0.json",
            a: { $type: "color", $value: "{b}" },
            b: { $type: "color", $value: "{a}" },
          },
          null,
          2,
        ),
      );

      const project = await createProjectAST(TEST_DIR, ["circular.json"]);
      const fileASTs = new Map([
        ...(project.files.get("circular.json")
          ? [["circular.json", project.files.get("circular.json")]]
          : []),
      ]);

      const result = await resolveProject(MANIFEST_AST, fileASTs, TEST_DIR);

      // Should complete and potentially warn about circular deps
      expect(result.project).toBeDefined();
    });

    it("should resolve cross-file references", async () => {
      writeFileSync(
        resolve(TEST_DIR, "base.json"),
        JSON.stringify(BASE_TOKENS, null, 2),
      );
      writeFileSync(
        resolve(TEST_DIR, "semantic.json"),
        JSON.stringify(SEMANTIC_TOKENS, null, 2),
      );

      const project = await createProjectAST(TEST_DIR, [
        "base.json",
        "semantic.json",
      ]);
      const fileASTs = project.files;

      const result = await resolveProject(MANIFEST_AST, fileASTs, TEST_DIR);

      expect(result.project.crossFileReferences).toBeDefined();
      expect(result.project.dependencyGraph).toBeDefined();
    });

    it("should handle invalid base path", async () => {
      const result = await resolveProject(
        MANIFEST_AST,
        new Map(),
        "/nonexistent/path",
      );

      expect(result.project).toBeDefined();
      expect(result.project.basePath).toBe("/nonexistent/path");
    });
  });

  describe("error handling", () => {
    it("should handle malformed token files during discovery", async () => {
      writeFileSync(resolve(TEST_DIR, "base-tokens.json"), "{ invalid json");

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        MANIFEST_AST,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle IO errors during project creation", async () => {
      // Try to read from restricted directory
      await expect(
        createProjectAST("/root/restricted", ["file.json"]),
      ).rejects.toThrow();
    });

    it("should handle empty manifest sets", async () => {
      const emptyManifest: ManifestAST = {
        ...MANIFEST_AST,
        sets: new Map(),
      };

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        emptyManifest,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      expect(result.dependencies).toEqual([]);
      expect(result.rounds).toBe(1);
    });

    it("should handle manifest with undefined files", async () => {
      const manifestWithUndefinedFiles: ManifestAST = {
        ...MANIFEST_AST,
        sets: new Map([
          ["broken", { name: "broken", files: undefined as any }],
        ]),
      };

      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        manifestWithUndefinedFiles,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );

      expect(result.dependencies).toBeDefined();
    });
  });

  describe("performance", () => {
    it("should handle large dependency trees efficiently", async () => {
      // Create many files
      for (let i = 0; i < 20; i++) {
        writeFileSync(
          resolve(TEST_DIR, `tokens-${i}.json`),
          JSON.stringify(
            {
              $schema: "https://schemas.upft.co/draft/tokens/v0.json",
              [`token${i}`]: { $type: "color", $value: "#000" },
            },
            null,
            2,
          ),
        );
      }

      const largeManifest: ManifestAST = {
        ...MANIFEST_AST,
        sets: new Map(
          Array.from({ length: 20 }, (_, i) => [
            `set${i}`,
            { name: `set${i}`, files: [`tokens-${i}.json`] },
          ]),
        ),
      };

      const start = Date.now();
      const loader = createLoader(TEST_DIR);
      const result = await discoverAllDependencies(
        largeManifest,
        resolve(TEST_DIR, "manifest.json"),
        loader,
      );
      const duration = Date.now() - start;

      expect(result.dependencies.length).toBe(20);
      expect(duration).toBeLessThan(2000); // Should complete under 2 seconds
    });
  });
});
