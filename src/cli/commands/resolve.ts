/**
 * Resolve/Preview command implementation
 */

import type { TokenFileReader } from "../../filesystem/file-reader.js";
import { UPFTResolver } from "../../resolver/upft-resolver.js";
import type {
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../../resolver/upft-types.js";

export interface ResolveCommandOptions {
  fileReader?: TokenFileReader;
  basePath?: string;
}

export class ResolveCommand {
  private resolver: UPFTResolver;

  constructor(options: ResolveCommandOptions = {}) {
    this.resolver = new UPFTResolver(
      options.fileReader || options.basePath
        ? {
            ...(options.fileReader && { fileReader: options.fileReader }),
            ...(options.basePath && { basePath: options.basePath }),
          }
        : {},
    );
  }

  /**
   * Resolve tokens with specific modifiers
   */
  async resolve(
    manifest: UPFTResolverManifest,
    modifiers: ResolutionInput = {},
  ): Promise<ResolvedPermutation> {
    return this.resolver.resolvePermutation(manifest, modifiers);
  }

  /**
   * List all possible permutations from a manifest
   */
  async list(manifest: UPFTResolverManifest): Promise<ResolvedPermutation[]> {
    return this.resolver.generateAll(manifest);
  }
}
