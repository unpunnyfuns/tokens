/**
 * Functional token bundler API
 */

import { join } from "node:path";
import type { TokenFileReader } from "../io/file-reader.js";
import {
  TokenFileWriter,
  type WriteOptions,
  type FormatOptions,
} from "../io/file-writer.js";
import { generateAll as generateAllPermutations } from "../manifest/manifest-core.js";
import type {
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../manifest/upft-types.js";
import type { ResolverOptions } from "../types/options.js";
import type { TokenDocument } from "../types.js";

export type TokenTransform = (tokens: TokenDocument) => TokenDocument;

export interface BundlerOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
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
 * Generate bundles from a resolver manifest
 */
export async function bundle(
  manifest: UPFTResolverManifest,
  options: BundlerOptions = {},
): Promise<Bundle[]> {
  const basePath = options.basePath ?? process.cwd();
  const resolverOptions: ResolverOptions = { basePath };

  if (options.fileReader) {
    resolverOptions.fileReader = options.fileReader;
  }

  // Validate manifest structure first
  if (!manifest?.sets) {
    throw new Error("Invalid manifest: missing required 'sets' property");
  }

  const permutations = await generateAllPermutations(manifest, resolverOptions);
  const outputFormat = options.outputFormat || "json";
  const transforms = options.transforms || [];

  return permutations.map((permutation) =>
    createBundle(permutation, outputFormat, transforms),
  );
}

/**
 * Write a single bundle to filesystem
 */
async function writeBundleToFile(
  bundleItem: Bundle,
  fileWriter: TokenFileWriter,
  options: BundlerOptions & {
    basePath: string;
    prettify: boolean;
    outputFormat: string;
  },
): Promise<BundleWriteResult> {
  const filePath = getOutputPath(bundleItem, options.outputFormat);
  const fullPath = join(options.basePath, filePath);

  try {
    const tokens = bundleItem.resolvedTokens || bundleItem.tokens;

    const formatOptions: FormatOptions = {
      type: options.outputFormat,
      sortKeys: false,
    };

    if (options.prettify) {
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
    console.error(`Failed to write ${filePath}: ${errorMessage}`);

    return {
      filePath,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate bundles and write to filesystem
 */
export async function writeBundles(
  manifest: UPFTResolverManifest,
  options: BundlerOptions = {},
): Promise<BundleWriteResult[]> {
  const fileWriter = options.fileWriter ?? new TokenFileWriter();
  const basePath = options.basePath ?? process.cwd();
  const prettify = options.prettify ?? true;
  const outputFormat = options.outputFormat || "json";

  const bundles = await bundle(manifest, options);
  const results: BundleWriteResult[] = [];

  for (const bundleItem of bundles) {
    const result = await writeBundleToFile(bundleItem, fileWriter, {
      ...options,
      basePath,
      prettify,
      outputFormat,
    });
    results.push(result);
  }

  return results;
}

/**
 * Create bundle from resolved permutation
 */
function createBundle(
  permutation: ResolvedPermutation,
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
        `Transform '${transformName}' failed for permutation '${permutation.id}': ${errorMessage}`,
      );
    }
  }

  return {
    id: permutation.id,
    tokens,
    ...(permutation.resolvedTokens && {
      resolvedTokens: permutation.resolvedTokens,
    }),
    files: permutation.files,
    ...(permutation.output && { output: permutation.output }),
    format: outputFormat,
  };
}

/**
 * Get output file path for bundle
 */
function getOutputPath(
  bundle: Bundle,
  outputFormat: "json" | "yaml" | "json5",
): string {
  if (bundle.output) {
    return bundle.output;
  }

  // Generate default output path
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
