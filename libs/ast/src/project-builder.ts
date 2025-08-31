/**
 * Project-level AST utilities
 * Pure functions for building cross-file references and dependency graphs
 */

import { join, relative } from "node:path";
import type {
  CrossFileReference,
  ProjectAST,
  TokenAST,
  TokenNode,
} from "./types.js";

/**
 * Create a project AST from multiple token files
 * This is a simplified implementation that would need to be integrated with a file loader
 */
export async function createProjectAST(
  basePath: string,
  _filePaths: string[],
): Promise<ProjectAST> {
  const projectAST: ProjectAST = {
    type: "project",
    name: "Generated Project",
    path: basePath,
    basePath: basePath,
    files: new Map(),
    crossFileReferences: new Map(),
    dependencyGraph: new Map(),
    metadata: {},
  };

  // For now, this is a stub implementation
  // In a real implementation, this would:
  // 1. Load each file from the filesystem
  // 2. Parse and validate each file
  // 3. Create AST for each file using createAST
  // 4. Build cross-file references
  // 5. Build dependency graph

  console.warn(
    "createProjectAST is a stub implementation. Use the loader package for full functionality.",
  );

  return projectAST;
}

/**
 * Build cross-file reference mapping from already-loaded project files
 */
export function buildCrossFileReferences(project: ProjectAST): void {
  for (const [filePath, fileAST] of project.files) {
    const crossRefs: CrossFileReference[] = [];
    walkTokensForCrossFileRefs(fileAST, filePath, crossRefs, project.basePath);
    if (crossRefs.length > 0) {
      project.crossFileReferences.set(filePath, crossRefs);
      fileAST.crossFileReferences.set(filePath, crossRefs);
    }
  }
}

/**
 * Build dependency graph from cross-file references
 */
export function buildDependencyGraph(project: ProjectAST): void {
  // Initialize dependency graph nodes
  for (const filePath of project.files.keys()) {
    project.dependencyGraph.set(filePath, new Set());
  }

  // Build dependencies from cross-file references
  for (const [fromFile, crossRefs] of project.crossFileReferences) {
    for (const crossRef of crossRefs) {
      const toFile = crossRef.toFile;
      if (project.files.has(toFile)) {
        const deps = project.dependencyGraph.get(fromFile) || new Set();
        deps.add(toFile);
        project.dependencyGraph.set(fromFile, deps);
      }
    }
  }
}

/**
 * Get dependency resolution order using topological sort
 */
export function getResolutionOrder(project: ProjectAST): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  function visit(filePath: string): void {
    if (visiting.has(filePath)) {
      // Circular dependency - skip for now
      return;
    }
    if (visited.has(filePath)) {
      return;
    }

    visiting.add(filePath);
    const deps = project.dependencyGraph.get(filePath) || new Set();
    for (const dep of deps) {
      visit(dep);
    }
    visiting.delete(filePath);
    visited.add(filePath);
    result.push(filePath);
  }

  for (const filePath of project.files.keys()) {
    visit(filePath);
  }

  return result;
}

/**
 * Detect circular dependencies in the project
 */
export function detectCircularDependencies(project: ProjectAST): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];

  function visit(filePath: string): void {
    if (visiting.has(filePath)) {
      // Found a cycle
      const cycleStart = path.indexOf(filePath);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart).concat([filePath]));
      }
      return;
    }
    if (visited.has(filePath)) {
      return;
    }

    visiting.add(filePath);
    path.push(filePath);

    const deps = project.dependencyGraph.get(filePath) || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    path.pop();
    visiting.delete(filePath);
    visited.add(filePath);
  }

  for (const filePath of project.files.keys()) {
    if (!visited.has(filePath)) {
      visit(filePath);
    }
  }

  return cycles;
}

/**
 * Walk tokens to find cross-file references
 */
function walkTokensForCrossFileRefs(
  node: TokenAST | TokenNode,
  filePath: string,
  crossRefs: CrossFileReference[],
  basePath: string,
): void {
  if (node.type === "token") {
    const token = node as TokenNode;
    if (token.references) {
      for (const ref of token.references) {
        // Check if this is a cross-file reference
        const crossFileRef = createCrossFileReference(
          ref,
          token.path,
          filePath,
          basePath,
        );
        if (crossFileRef) {
          crossRefs.push(crossFileRef);
        }
      }
    }
  } else if (node.type === "file") {
    const fileAST = node as TokenAST;
    // Recursively walk all child nodes
    for (const child of fileAST.children.values()) {
      walkTokensForCrossFileRefs(
        child as TokenAST | TokenNode,
        filePath,
        crossRefs,
        basePath,
      );
    }
  }
}

/**
 * Create cross-file reference from token reference
 */
function createCrossFileReference(
  reference: string,
  tokenPath: string,
  _fromFile: string,
  basePath: string,
): CrossFileReference | null {
  // Only treat references with file paths or URLs as cross-file
  if (!(reference.includes("/") || reference.startsWith("http"))) {
    return null;
  }

  let toFile: string;
  let toToken: string;

  if (reference.startsWith("http")) {
    // HTTP/HTTPS reference
    const parts = reference.split("#");
    toFile = parts[0] || "";
    toToken = parts[1] || "";
  } else if (reference.startsWith("file://")) {
    // File URL reference
    const parts = reference.split("#");
    toFile = parts[0] || "";
    toToken = parts[1] || "";
  } else {
    // Relative file path reference
    const parts = reference.split("#");
    const relPath = parts[0];
    if (!relPath) return null;
    toFile = join(basePath, relPath);
    toToken = parts[1] || "";
  }

  return {
    fromToken: tokenPath,
    toFile: relative(basePath, toFile),
    toToken,
    reference,
    resolved: false,
  };
}
