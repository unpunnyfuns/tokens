/**
 * High-level pipeline orchestrator using multi-pass resolver
 *
 * THE FIFTH ELEMENT MULTI-PASS! 🚀
 */

import { resolve } from "node:path";
// Import real AST types
import type {
  ManifestAST,
  PermutationAST,
  ProjectAST,
  TokenAST,
} from "@upft/ast";
import {
  clearCache,
  createLoader,
  type LoaderState,
  loadSingleFile,
} from "./loader.js";
// Import real MultiPassResolver
import {
  discoverAllDependencies,
  resolveProject,
} from "./multi-pass-resolver.js";
import type { LoadOptions } from "./types.js";

export interface PipelineOptions extends LoadOptions {
  /** Base path for resolving files */
  basePath?: string;
  /** Enable verbose debug logging */
  debug?: boolean;
  /** Optional safety valve for dependency discovery rounds */
  discoveryMaxRounds?: number;
}

export interface PipelineResult {
  /** Final resolved ProjectAST */
  project: ProjectAST;
  /** All loaded files */
  files: Map<string, TokenAST>;
  /** Manifest AST */
  manifest: ManifestAST;
  /** Any errors during pipeline */
  errors: string[];
  /** Any warnings during pipeline */
  warnings: string[];
}

/**
 * Create failed project result for error cases
 */
function createFailedResult(
  options: PipelineOptions,
  errors: string[],
): PipelineResult {
  return {
    project: {
      type: "project",
      path: "",
      name: "failed-project",
      files: new Map(),
      crossFileReferences: new Map(),
      dependencyGraph: new Map(),
      basePath: options.basePath || process.cwd(),
    } as ProjectAST,
    files: new Map(),
    manifest: {
      type: "manifest",
      path: "",
      name: "failed-manifest",
      manifestType: "upft",
      sets: new Map(),
      modifiers: new Map(),
      permutations: new Map(),
    } as ManifestAST,
    errors,
    warnings: [],
  };
}

/**
 * Load and parse manifest file
 */
async function loadManifest(
  manifestPath: string,
  loader: LoaderState,
): Promise<ManifestAST> {
  const { parseManifest, registerBuiltInResolvers } = await import(
    "@upft/manifest"
  );

  // Ensure built-in resolvers are registered explicitly
  await registerBuiltInResolvers();

  // Load the manifest file using the loader
  const absoluteManifestPath = resolve(loader.basePath, manifestPath);
  await loadSingleFile(
    loader,
    absoluteManifestPath,
    { validate: true, parseToAST: false },
    [],
  );

  const loadedFile = loader.loadedFiles.get(absoluteManifestPath);
  if (!loadedFile?.data) {
    throw new Error("Failed to load manifest file");
  }

  // Parse the loaded JSON into ManifestAST
  const manifestAST = parseManifest(loadedFile.data, manifestPath);

  return manifestAST;
}

/**
 * Collect TokenASTs from loaded files
 */
function collectTokenASTs(loader: LoaderState): Map<string, TokenAST> {
  const fileASTs = new Map<string, TokenAST>();

  for (const file of Array.from(loader.loadedFiles.values())) {
    if (file.ast && file.info.type === "tokens") {
      fileASTs.set(file.info.path, file.ast as TokenAST);
    }
  }

  return fileASTs;
}

/**
 * Resolve all permutations with actual token data
 */
async function resolveAllPermutations(
  project: ProjectAST,
  allErrors: string[],
  allWarnings: string[],
): Promise<void> {
  if (!project.manifest) return;

  const { resolvePermutation } = await import("./pipeline-resolver.js");

  for (const [permId, permutation] of project.manifest.permutations) {
    try {
      const resolved = await resolvePermutation(project, permutation.input);
      permutation.resolvedFiles = resolved.files;
      permutation.tokens = resolved.tokens;

      if (resolved.metadata.errors.length > 0) {
        allErrors.push(...resolved.metadata.errors);
      }
      if (resolved.metadata.warnings.length > 0) {
        allWarnings.push(...resolved.metadata.warnings);
      }
    } catch (error) {
      allErrors.push(
        `Failed to resolve permutation ${permId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * Generate all permutations from the resolved project and attach them to the manifest
 */
async function generateAndAttachPermutations(
  manifestPath: string,
  resolutionResult: { project: ProjectAST },
): Promise<void> {
  if (!resolutionResult.project.manifest) return;

  const { generateAllPermutations } = await import("./pipeline-resolver.js");
  const permutations = await generateAllPermutations(resolutionResult.project);

  for (const perm of permutations) {
    // Filter out null values from input to match PermutationAST type
    const cleanInput: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(perm.input)) {
      if (value !== null) {
        cleanInput[key] = value;
      }
    }

    resolutionResult.project.manifest.permutations.set(perm.id, {
      type: "project" as const,
      name: perm.id, // Use permutation ID as name
      path: manifestPath,
      input: cleanInput,
      resolvedFiles: perm.files,
      tokens: perm.tokens,
      metadata: perm.metadata,
    } as PermutationAST);
  }
}

/**
 * Execute the full multi-pass pipeline
 */
export async function runPipeline(
  manifestPath: string,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const loader = createLoader(options.basePath);
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  try {
    // Step 1: Load manifest
    const manifestAST = await loadManifest(manifestPath, loader);

    // Step 2: Discover dependencies
    const discoveryOptions =
      options.discoveryMaxRounds !== undefined
        ? { maxRounds: options.discoveryMaxRounds }
        : undefined;

    const discoveryResult = await discoverAllDependencies(
      manifestAST,
      manifestPath,
      loader,
      discoveryOptions,
    );

    allErrors.push(...discoveryResult.errors);
    allWarnings.push(...discoveryResult.warnings);

    if (options.basePath) {
      console.log(
        `🔍 Discovered ${discoveryResult.dependencies.length} dependencies in ${discoveryResult.rounds} rounds`,
      );
    }

    // Step 3: Collect file ASTs
    const fileASTs = collectTokenASTs(loader);

    // Step 4: Resolve project
    const resolutionResult = await resolveProject(
      manifestAST,
      fileASTs,
      options.basePath,
    );

    allErrors.push(...resolutionResult.errors);
    allWarnings.push(...resolutionResult.warnings);

    // Step 5: Generate all possible permutations from modifiers
    await generateAndAttachPermutations(manifestPath, resolutionResult);

    // Step 6: Resolve permutations
    await resolveAllPermutations(
      resolutionResult.project,
      allErrors,
      allWarnings,
    );

    return {
      project: resolutionResult.project,
      files: fileASTs,
      manifest: manifestAST,
      errors: allErrors,
      warnings: allWarnings,
    };
  } catch (error) {
    allErrors.push(
      `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return createFailedResult(options, allErrors);
  } finally {
    clearCache(loader);
  }
}
