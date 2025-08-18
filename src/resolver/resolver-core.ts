/**
 * Core orchestration functions for token resolution
 * Composes pure functions from other resolver modules
 */

import { buildASTFromDocument } from "../ast/ast-builder.js";
import { resolveReferences } from "../ast/reference-resolver.js";
import type { ASTNode, GroupNode, TokenNode } from "../ast/types.js";
import { TokenFileReader } from "../filesystem/file-reader.js";
import type { TokenDocument } from "../types.js";
import type { ResolverOptions } from "../types/options.js";
import { ManifestValidator } from "../validation/manifest-validator.js";
import type {
  UPFTResolverManifest,
  ResolutionInput,
  ResolvedPermutation,
  GenerateSpec,
} from "./upft-types.js";
import { validateInput } from "./resolver-validation.js";
import { collectFiles, loadAndMergeFiles } from "./resolver-files.js";
import {
  expandGenerateSpec,
  expandSpecWithFiltering,
  generateAllPermutations,
} from "./resolver-generation.js";
import { filterFiles } from "./resolver-filtering.js";

export type { ResolverOptions } from "../types/options.js";

/**
 * Resolve a single permutation with optional filtering
 */
export async function resolvePermutation(
  manifest: UPFTResolverManifest,
  input: ResolutionInput,
  options: ResolverOptions & { spec?: GenerateSpec } = {},
): Promise<ResolvedPermutation> {
  // Validate manifest structure
  const manifestValidator = new ManifestValidator();
  if (!manifestValidator.isValidManifest(manifest)) {
    const validation = manifestValidator.validateManifest(manifest);
    throw new Error(`Invalid manifest:\n${validation.errors.join("\n")}`);
  }

  // Validate input
  const validation = validateInput(manifest, input);
  if (!validation.valid) {
    throw new Error(
      `Invalid input:\n${validation.errors
        .map((e) => `  - ${e.modifier}: ${e.message}`)
        .join("\n")}`,
    );
  }

  // Initialize file reader
  const fileReader =
    options.fileReader ??
    new TokenFileReader(options.basePath ? { basePath: options.basePath } : {});

  // Get all files to merge (with filtering if spec provided)
  const files = options.spec
    ? await filterFiles(manifest, input, options.spec, fileReader)
    : await collectFiles(manifest, input, fileReader);

  // Load and merge all files
  const tokens = await loadAndMergeFiles(files, fileReader);

  // Optionally resolve references
  let resolvedTokens: TokenDocument | undefined;
  if (manifest.options?.resolveReferences) {
    const ast = buildASTFromDocument(tokens);
    const { resolved, errors } = resolveReferences(ast);

    if (errors.length > 0) {
      throw new Error(
        `Reference resolution failed:\n${errors
          .map((e) => `  - ${e.path}: ${e.message}`)
          .join("\n")}`,
      );
    }

    resolvedTokens = astToTokens(resolved);
  }

  // Generate ID from input
  const id = generateId(input);

  const result: ResolvedPermutation = {
    id,
    input,
    files,
    tokens,
  };

  if (resolvedTokens) {
    result.resolvedTokens = resolvedTokens;
  }

  const output = (input as ResolutionInput & { output?: string }).output;
  if (output) {
    result.output = output;
  }

  return result;
}

/**
 * Generate all permutations based on manifest.generate
 */
export async function generateAll(
  manifest: UPFTResolverManifest,
  options: ResolverOptions = {},
): Promise<ResolvedPermutation[]> {
  // Validate manifest structure
  const manifestValidator = new ManifestValidator();
  if (!manifestValidator.isValidManifest(manifest)) {
    const validation = manifestValidator.validateManifest(manifest);
    throw new Error(`Invalid manifest:\n${validation.errors.join("\n")}`);
  }

  const results: ResolvedPermutation[] = [];

  if (manifest.generate) {
    // Generate only specified permutations
    for (const spec of manifest.generate) {
      const expandedSpecs = expandSpecWithFiltering(manifest, spec);
      for (const expandedSpec of expandedSpecs) {
        const input = expandGenerateSpec(manifest, expandedSpec.spec);
        const result = await resolvePermutation(manifest, input, {
          ...options,
          spec: expandedSpec.spec,
        });
        if (expandedSpec.output) {
          result.output = expandedSpec.output;
        }
        results.push(result);
      }
    }
  } else {
    // Generate all possible permutations (cartesian product)
    const permutations = generateAllPermutations(manifest);
    for (const input of permutations) {
      results.push(await resolvePermutation(manifest, input, options));
    }
  }

  return results;
}

/**
 * Generate unique ID for a permutation
 */
function generateId(input: ResolutionInput): string {
  const parts: string[] = [];

  for (const [name, value] of Object.entries(input)) {
    if (name === "output") continue;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        parts.push(`${name}-${value.join("+")}`);
      }
    } else if (value) {
      parts.push(`${name}-${value}`);
    }
  }

  return parts.join("_") || "default";
}

/**
 * Convert AST to token document
 */
function astToTokens(ast: ASTNode): TokenDocument {
  const tokens: TokenDocument = {};

  // If the root node is a group, start with its children to avoid wrapping in 'root'
  if (ast.type === "group" && ast.name === "root") {
    const groupNode = ast as GroupNode;
    for (const [_name, child] of groupNode.children) {
      traverseASTNode(child, tokens, []);
    }
  } else {
    traverseASTNode(ast, tokens, []);
  }

  return tokens;
}

/**
 * Traverse AST node and build tokens
 */
function traverseASTNode(
  node: ASTNode,
  tokens: TokenDocument,
  path: string[],
): void {
  if (node.type === "token") {
    setTokenAtPath(node, tokens, path);
  } else if (node.type === "group") {
    processGroupChildren(node, tokens, path);
  }
}

/**
 * Set token at the specified path
 */
function setTokenAtPath(
  node: ASTNode,
  tokens: TokenDocument,
  path: string[],
): void {
  const fullPath = [...path, node.name as string];
  const current = navigateToParent(tokens, fullPath);

  if (fullPath.length > 0) {
    const tokenNode = node as TokenNode;
    const token: Record<string, unknown> = {
      $value: tokenNode.resolvedValue ?? tokenNode.value,
    };

    if (tokenNode.tokenType) {
      token.$type = tokenNode.tokenType;
    }

    const lastKey = fullPath[fullPath.length - 1];
    if (lastKey) {
      current[lastKey] = token;
    }
  }
}

/**
 * Navigate to parent object in token tree
 */
function navigateToParent(
  tokens: TokenDocument,
  fullPath: string[],
): TokenDocument {
  let current = tokens;

  for (let i = 0; i < fullPath.length - 1; i++) {
    const key = fullPath[i];
    if (!key) continue;

    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as TokenDocument;
  }

  return current;
}

/**
 * Process children of a group node
 */
function processGroupChildren(
  node: ASTNode,
  tokens: TokenDocument,
  path: string[],
): void {
  const groupNode = node as GroupNode;
  const currentPath = node.name ? [...path, node.name] : path;
  for (const [_name, child] of groupNode.children) {
    traverseASTNode(child, tokens, currentPath);
  }
}
