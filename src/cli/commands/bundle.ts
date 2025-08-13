/**
 * Bundle command implementation
 */

import type { BundleWriteResult } from "../../bundler/bundler.js";
import { TokenBundler } from "../../bundler/bundler.js";
import type { TokenFileReader } from "../../filesystem/file-reader.js";
import type { TokenFileWriter } from "../../filesystem/file-writer.js";
import type { UPFTResolverManifest } from "../../resolver/upft-types.js";

export interface BundleCommandOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
}

export class BundleCommand {
  private bundler: TokenBundler;

  constructor(options: BundleCommandOptions = {}) {
    this.bundler = new TokenBundler(
      options.fileReader || options.fileWriter || options.basePath
        ? {
            ...(options.fileReader && { fileReader: options.fileReader }),
            ...(options.fileWriter && { fileWriter: options.fileWriter }),
            ...(options.basePath && { basePath: options.basePath }),
          }
        : {},
    );
  }

  /**
   * Build tokens from a manifest
   */
  async build(manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> {
    return this.bundler.bundleToFiles(manifest);
  }

  /**
   * Bundle tokens from a manifest (alias for build)
   */
  async bundle(manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> {
    return this.bundler.bundleToFiles(manifest);
  }
}
