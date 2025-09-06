/**
 * Multi-pass resolver implementing dependency discovery and resolution
 *
 * THE FIFTH ELEMENT MULTI-PASS! 🚀
 *
 * Pass 1: Recursive dependency discovery (Tarjan-style)
 * Pass 2: Project-wide resolution with cross-file references
 */

import {
  buildCrossFileReferences,
  buildDependencyGraph,
  createAST,
  detectCircularDependencies,
  findAllTokens,
  findTokensWithReferences,
  type ManifestAST,
  type ProjectAST,
  resolveCrossFileReferences,
  type TokenAST,
} from "@upft/ast";
import { TokenFileReader } from "@upft/io";
import type { LoaderState } from "./loader.js";
import { loadFile } from "./loader.js";

export interface DependencyDiscoveryResult {
  /** All discovered file dependencies */
  dependencies: string[];
  /** Errors during discovery */
  errors: string[];
  /** Warnings during discovery */
  warnings: string[];
  /** Number of discovery rounds performed */
  rounds: number;
}

export interface ProjectResolutionResult {
  /** Final resolved ProjectAST */
  project: ProjectAST;
  /** Resolution errors */
  errors: string[];
  /** Resolution warnings */
  warnings: string[];
}

/**
 * Create a project AST from a directory containing token files
 * (File I/O version - belongs in loader, not AST)
 */
export async function createProjectAST(
  basePath: string,
  filePaths: string[],
  manifestAST?: ManifestAST,
): Promise<ProjectAST> {
  const reader = new TokenFileReader({ basePath });

  const project: ProjectAST = {
    type: "project",
    name: "project",
    path: "",
    basePath,
    files: new Map(),
    crossFileReferences: new Map(),
    dependencyGraph: new Map(),
    metadata: {},
  };

  // Load all token files into TokenAST nodes
  for (const filePath of filePaths) {
    const result = await reader.readFile(filePath);
    const groupAST = createAST(result.tokens);

    // Create TokenAST wrapper
    const tokenAST: TokenAST = {
      type: "file",
      path: filePath,
      name: filePath.split("/").pop() || filePath,
      filePath,
      parent: project,
      children: new Map([["root", groupAST]]),
      tokens: groupAST.tokens,
      groups: groupAST.groups,
      crossFileReferences: new Map(),
    };

    // Set parent reference for the group
    groupAST.parent = tokenAST;

    project.files.set(filePath, tokenAST);
  }

  // Build cross-file reference mapping
  buildCrossFileReferences(project);

  // Build dependency graph
  buildDependencyGraph(project);

  // Add manifest if provided
  if (manifestAST) {
    manifestAST.parent = project;
    project.manifest = manifestAST;
  }

  return project;
}

/**
 * Pass 1: Recursively discover all dependencies from manifest
 *
 * Uses a breadth-first approach to discover all transitive dependencies,
 * following DTCG references between files.
 */
/**
 * Extract initial file paths from manifest AST
 */
function extractManifestFilePaths(manifestAST: ManifestAST): string[] {
  const queue: string[] = [];

  // Add files from token sets
  for (const [, tokenSet] of manifestAST.sets) {
    if (tokenSet.files) {
      queue.push(...tokenSet.files);
    }
  }

  // Add files from modifiers
  for (const [, modifier] of manifestAST.modifiers) {
    for (const [, files] of modifier.values) {
      if (Array.isArray(files)) {
        queue.push(...files);
      }
    }
  }

  return queue;
}

/**
 * Extract dependencies from a loaded token file
 */
function extractFileDependencies(
  fileAST: TokenAST,
  allDependencies: Set<string>,
): string[] {
  const newDependencies: string[] = [];

  // Find all tokens with references in this file
  const tokensWithRefs = findTokensWithReferences(fileAST);

  // Extract cross-file dependencies
  for (const token of tokensWithRefs) {
    if (token.references) {
      for (const ref of token.references) {
        // Check if this is a cross-file reference
        const crossFileRef = parseCrossFileReference(ref);
        if (crossFileRef && !allDependencies.has(crossFileRef.file)) {
          newDependencies.push(crossFileRef.file);
        }
      }
    }
  }

  return newDependencies;
}

/**
 * Process a single file for dependency discovery
 */
async function processFileForDependencies(
  filePath: string,
  loader: LoaderState,
  allDependencies: Set<string>,
  _warnings: string[],
  errors: string[],
): Promise<string[]> {
  try {
    // Load and parse the file
    const result = await loadFile(loader, filePath, {
      validate: true,
      parseToAST: true,
    });

    if (result.errors.length > 0) {
      // Missing or invalid files should be errors, not warnings
      errors.push(
        `Failed to load required file ${filePath}: ${result.errors.join(", ")}`,
      );
      return [];
    }

    const file = result.files[0];
    if (!file?.ast || file.info.type !== "tokens") {
      return [];
    }

    allDependencies.add(filePath);
    const fileAST = file.ast as TokenAST;

    return extractFileDependencies(fileAST, allDependencies);
  } catch (error) {
    errors.push(
      `Failed to process ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

export async function discoverAllDependencies(
  manifestAST: ManifestAST,
  _manifestPath: string,
  loader: LoaderState,
  options?: { maxRounds?: number },
): Promise<DependencyDiscoveryResult> {
  const allDependencies = new Set<string>();
  const warnings: string[] = [];
  const errors: string[] = [];
  let round = 0;
  const maxRounds = options?.maxRounds ?? Number.POSITIVE_INFINITY; // Prevent infinite loops if configured

  // Extract initial file paths from manifest
  const queue = extractManifestFilePaths(manifestAST);

  while (queue.length > 0 && round < maxRounds) {
    round++;
    const currentRoundFiles = [...queue];
    queue.length = 0; // Clear queue

    for (const filePath of currentRoundFiles) {
      if (allDependencies.has(filePath)) continue;

      const newDeps = await processFileForDependencies(
        filePath,
        loader,
        allDependencies,
        warnings,
        errors,
      );
      queue.push(...newDeps);
    }

    // Break if no new dependencies found
    if (queue.length === 0) break;
  }

  if (Number.isFinite(maxRounds) && round >= maxRounds) {
    warnings.push(
      `Dependency discovery hit maximum rounds (${maxRounds}), may have missed some dependencies (remaining: ${queue.length})`,
    );
  }

  return {
    dependencies: Array.from(allDependencies),
    errors,
    warnings,
    rounds: round,
  };
}

/**
 * Pass 2: Resolve project with all loaded files
 *
 * Creates a ProjectAST and resolves all cross-file references using
 * the multi-pass resolution algorithm.
 */
export async function resolveProject(
  manifestAST: ManifestAST,
  fileASTs: Map<string, TokenAST>,
  basePath?: string,
): Promise<ProjectResolutionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Extract file paths from the loaded TokenASTs
    const filePaths = Array.from(fileASTs.keys());

    // Create ProjectAST using the correct API
    const projectBasePath = basePath || process.cwd();
    const project = await createProjectAST(
      projectBasePath,
      filePaths,
      manifestAST,
    );

    // Detect circular dependencies
    const cycles = detectCircularDependencies(project);
    if (cycles.length > 0) {
      warnings.push(`Detected ${cycles.length} circular dependency cycles`);
      for (const cycle of cycles) {
        warnings.push(`  Cycle: ${cycle.join(" -> ")}`);
      }
    }

    // Resolve cross-file references
    const resolutionResult = resolveCrossFileReferences(project);

    if (resolutionResult.success) {
      warnings.push(
        `Resolved ${resolutionResult.resolvedReferences} cross-file references`,
      );
    } else {
      for (const error of resolutionResult.errors) {
        errors.push(
          `Resolution error in ${error.filePath || "unknown"}: ${error.message}`,
        );
      }
    }

    // Log statistics
    const allTokens = findAllTokens(project);
    const tokensWithRefs = findTokensWithReferences(project);
    warnings.push(
      `Project contains ${allTokens.length} tokens, ${tokensWithRefs.length} with references`,
    );

    return {
      project,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(
      `Failed to resolve project: ${error instanceof Error ? error.message : String(error)}`,
    );

    // Return minimal project on error
    const fallbackProject: ProjectAST = {
      type: "project",
      path: manifestAST.path,
      name: manifestAST.name,
      files: fileASTs,
      crossFileReferences: new Map(),
      dependencyGraph: new Map(),
      basePath: basePath || process.cwd(),
    };

    return {
      project: fallbackProject,
      errors,
      warnings,
    };
  }
}

/**
 * Parse a potential cross-file reference
 *
 * Cross-file references follow the pattern: "file.json#token.path"
 */
function parseCrossFileReference(
  reference: string,
): { file: string; token: string } | null {
  const crossFileMatch = reference.match(/^([^#]+)#(.+)$/);
  if (crossFileMatch?.[1] && crossFileMatch[2]) {
    return {
      file: crossFileMatch[1],
      token: crossFileMatch[2],
    };
  }
  return null;
}
