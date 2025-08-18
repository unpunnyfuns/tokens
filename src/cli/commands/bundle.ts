/**
 * Bundle command implementation
 */

import type { BundleWriteResult } from "../../bundler/bundler-functional.js";
// Use the functional API
import { writeBundles } from "../../bundler/index.js";
import type { TokenFileReader } from "../../io/file-reader.js";
import type { TokenFileWriter } from "../../io/file-writer.js";
import type { UPFTResolverManifest } from "../../manifest/upft-types.js";

export interface BundleCommandOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
}

export type { BundleWriteResult };

/**
 * Build tokens from a manifest
 */
export async function buildTokens(
  manifest: UPFTResolverManifest,
  options: BundleCommandOptions = {},
): Promise<BundleWriteResult[]> {
  return writeBundles(manifest, {
    ...(options.fileReader && { fileReader: options.fileReader }),
    ...(options.fileWriter && { fileWriter: options.fileWriter }),
    ...(options.basePath && { basePath: options.basePath }),
  });
}

/**
 * Bundle tokens from a manifest (alias for build)
 */
export async function bundleTokens(
  manifest: UPFTResolverManifest,
  options: BundleCommandOptions = {},
): Promise<BundleWriteResult[]> {
  return buildTokens(manifest, options);
}
