/**
 * Bundle command implementation using AST-native pipeline
 */

import { dirname } from "node:path";
import type { BundleWriteResult } from "@upft/bundler";
import { bundle, validateBundle, writeBundlesToFiles } from "@upft/bundler";
import type {
  TokenDocument,
  TokenFileReader,
  TokenFileWriter,
} from "@upft/foundation";
import { runPipeline } from "@upft/loader";

export interface BundleCommandOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
  /** Output directory for bundle files */
  outputDir?: string;
  /** Skip bundle validation */
  skipValidation?: boolean;
  /** Fail on validation warnings */
  strict?: boolean;
}

export type { BundleWriteResult };

/**
 * Build tokens from a manifest file path using the full AST pipeline
 */
export async function buildTokens(
  manifestPath: string,
  options: BundleCommandOptions = {},
): Promise<BundleWriteResult[]> {
  // Use the full pipeline: manifest → AST → bundles
  const pipelineResult = await runPipeline(manifestPath, {
    basePath: options.basePath || dirname(manifestPath),
    validate: true,
    parseToAST: true,
  });

  if (pipelineResult.errors.length > 0) {
    throw new Error(`Pipeline failed: ${pipelineResult.errors.join(", ")}`);
  }

  // Generate bundles from ProjectAST
  const bundles = bundle(pipelineResult.project, {});

  // Validate bundles before writing (unless skipped)
  if (!options.skipValidation) {
    for (const [bundleId, bundleContent] of Object.entries(bundles)) {
      const validation = validateBundle(
        bundleContent as unknown as TokenDocument,
        {
          checkReferences: true,
          validateTypes: true,
          validateNaming: true,
          requireDescriptions: false,
        },
      );

      if (!validation.valid) {
        const errorMessages = validation.errors.map(
          (e) => `${e.path}: ${e.message}`,
        );
        throw new Error(
          `Bundle validation failed for ${bundleId}:\n${errorMessages.join("\n")}`,
        );
      }

      if (options.strict && validation.warnings.length > 0) {
        const warningMessages = validation.warnings.map(
          (w) => `${w.path}: ${w.message}`,
        );
        throw new Error(
          `Bundle validation warnings in strict mode for ${bundleId}:\n${warningMessages.join("\n")}`,
        );
      }
    }
  }

  // Write bundles to files
  const outputPath =
    options.outputDir || options.basePath || dirname(manifestPath);
  return writeBundlesToFiles(bundles, outputPath, {});
}

/**
 * Bundle tokens from a manifest file path (alias for build)
 */
export async function bundleTokens(
  manifestPath: string,
  options: BundleCommandOptions = {},
): Promise<BundleWriteResult[]> {
  return buildTokens(manifestPath, options);
}
