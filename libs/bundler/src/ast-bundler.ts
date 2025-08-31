/**
 * AST-based token bundler - clean functional API that works with resolved ProjectAST
 */

import { basename, join } from "node:path";
import type { PermutationAST, ProjectAST } from "@upft/ast";
import type { TokenDocument } from "@upft/foundation";
import {
  type FormatOptions,
  TokenFileWriter,
  type WriteOptions,
} from "@upft/io";

export type TokenTransform = (tokens: TokenDocument) => TokenDocument;

export interface ASTBundlerOptions {
  fileWriter?: TokenFileWriter;
  outputFormat?: "json" | "yaml" | "json5";
  prettify?: boolean;
  transforms?: TokenTransform[];
  validate?: boolean;
  backup?: boolean;
  atomic?: boolean;
}

export interface Bundle {
  id: string;
  tokens: TokenDocument;
  resolvedTokens?: TokenDocument;
  files: string[];
  output?: string;
  format: string;
}

export interface BundleWriteResult {
  filePath: string;
  success: boolean;
  error?: string;
}

/**
 * Generate bundles from a resolved ProjectAST
 */
export function bundleFromAST(
  projectAST: ProjectAST,
  options: ASTBundlerOptions = {},
): Bundle[] {
  if (!projectAST.manifest) {
    throw new Error("ProjectAST must contain a manifest to generate bundles");
  }

  const outputFormat = options.outputFormat || "json";
  const transforms = options.transforms || [];

  return Array.from(projectAST.manifest.permutations.values()).map(
    (permutation: PermutationAST) =>
      createBundle(permutation, outputFormat, transforms),
  );
}

/**
 * Generate a single bundle from a specific permutation
 */
export function bundlePermutation(
  permutation: PermutationAST,
  options: ASTBundlerOptions = {},
): Bundle {
  const outputFormat = options.outputFormat || "json";
  const transforms = options.transforms || [];

  return createBundle(permutation, outputFormat, transforms);
}

/**
 * Write bundles to filesystem from ProjectAST
 */
export async function writeBundlesFromAST(
  projectAST: ProjectAST,
  basePath: string,
  options: ASTBundlerOptions = {},
): Promise<BundleWriteResult[]> {
  const bundles = bundleFromAST(projectAST, options);
  return writeBundlesToFiles(bundles, basePath, options);
}

/**
 * Write an array of bundles to files
 */
export async function writeBundlesToFiles(
  bundles: Bundle[],
  basePath: string,
  options: ASTBundlerOptions = {},
): Promise<BundleWriteResult[]> {
  const fileWriter = options.fileWriter ?? new TokenFileWriter();
  const results: BundleWriteResult[] = [];

  for (const bundle of bundles) {
    const result = await writeBundleToFile(
      bundle,
      fileWriter,
      basePath,
      options,
    );
    results.push(result);
  }

  return results;
}

/**
 * Create bundle from resolved permutation
 */
function createBundle(
  permutation: PermutationAST,
  outputFormat: string,
  transforms: TokenTransform[],
): Bundle {
  let tokens = permutation.tokens;

  // Apply transforms with error handling
  for (const transform of transforms) {
    try {
      tokens = transform(tokens);
    } catch (error) {
      const transformName = transform.name || "anonymous";
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Transform '${transformName}' failed for permutation '${permutation.name}': ${errorMessage}`,
      );
    }
  }

  return {
    id: permutation.name,
    tokens,
    ...(permutation.resolvedTokens && {
      resolvedTokens: permutation.resolvedTokens,
    }),
    files: permutation.resolvedFiles,
    ...(permutation.outputPath && { output: permutation.outputPath }),
    format: outputFormat,
  };
}

/**
 * Write a single bundle to filesystem
 */
async function writeBundleToFile(
  bundle: Bundle,
  fileWriter: TokenFileWriter,
  basePath: string,
  options: ASTBundlerOptions,
): Promise<BundleWriteResult> {
  const filePath = getOutputPath(bundle, options.outputFormat || "json");
  const fullPath = join(basePath, filePath);

  try {
    const tokens = bundle.resolvedTokens || bundle.tokens;

    const formatOptions: FormatOptions = {
      type: options.outputFormat || "json",
      sortKeys: false,
    };

    if (options.prettify ?? true) {
      formatOptions.indent = 2;
    }

    const writeOptions: WriteOptions = {
      format: formatOptions,
    };

    if (options.validate !== undefined) {
      writeOptions.validate = options.validate;
    }
    if (options.backup !== undefined) {
      writeOptions.backup = options.backup;
    }
    if (options.atomic !== undefined) {
      writeOptions.atomic = options.atomic;
    }

    await fileWriter.writeFile(fullPath, tokens, writeOptions);

    return {
      filePath,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      filePath,
      success: false,
      error: `Failed to write ${filePath}: ${errorMessage}`,
    };
  }
}

/**
 * Get output file path for bundle
 */
function getOutputPath(
  bundle: Bundle,
  outputFormat: "json" | "yaml" | "json5",
): string {
  if (bundle.output && bundle.output !== "") {
    // Extract just the filename from the output path to avoid directory issues
    return basename(bundle.output);
  }

  // Generate default output path from bundle ID
  const extension = getFileExtension(outputFormat);
  return `${bundle.id}${extension}`;
}

/**
 * Get file extension based on output format
 */
function getFileExtension(outputFormat: "json" | "yaml" | "json5"): string {
  switch (outputFormat) {
    case "yaml":
      return ".yaml";
    case "json5":
      return ".json5";
    default:
      return ".json";
  }
}
