/**
 * Bundle command implementation
 */

// Use the core API instead of direct imports
import { TokenBundler } from "../../public-core.js";
import type { TokenFileReader } from "../../filesystem/file-reader.js";
import type { TokenFileWriter } from "../../filesystem/file-writer.js";
import type { UPFTResolverManifest } from "../../resolver/upft-types.js";

export interface BundleCommandOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
}

export interface BundleWriteResult {
  filePath: string;
  success: boolean;
  error?: string;
}

/**
 * Build tokens from a manifest
 */
export async function buildTokens(
  manifest: UPFTResolverManifest,
  options: BundleCommandOptions = {},
): Promise<BundleWriteResult[]> {
  const bundler = new TokenBundler({
    ...(options.fileReader && { fileReader: options.fileReader }),
    ...(options.fileWriter && { fileWriter: options.fileWriter }),
    ...(options.basePath && { basePath: options.basePath }),
  });
  return bundler.bundleToFiles(manifest);
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
