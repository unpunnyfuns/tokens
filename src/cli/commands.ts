/**
 * CLI commands orchestrator
 */

import type { BundleWriteResult } from "../bundler/bundler.js";
import type { TokenFileReader } from "../filesystem/file-reader.js";
import type { TokenFileWriter } from "../filesystem/file-writer.js";
import type {
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "../resolver/upft-types.js";
import type { TokenDocument, ValidationResult } from "../types.js";
import type { ManifestInfo, TokenDiff } from "./commands/index.js";
import {
  BundleCommand,
  DiffCommand,
  InfoCommand,
  ListCommand,
  ResolveCommand,
  ValidateCommand,
} from "./commands/index.js";

export type { ValidationResult } from "../types.js";
export type { ManifestInfo, TokenDiff } from "./commands/index.js";

export interface TokenCLIOptions {
  fileReader?: TokenFileReader;
  fileWriter?: TokenFileWriter;
  basePath?: string;
}

/**
 * Main CLI orchestrator that delegates to specific command implementations
 */
export class TokenCLI {
  private validateCommand: ValidateCommand;
  private bundleCommand: BundleCommand;
  private resolveCommand: ResolveCommand;
  private listCommand: ListCommand;
  private diffCommand: DiffCommand;
  private infoCommand: InfoCommand;

  constructor(options: TokenCLIOptions = {}) {
    // Initialize all command instances
    this.validateCommand = new ValidateCommand();
    this.bundleCommand = new BundleCommand(
      options.fileReader || options.fileWriter || options.basePath
        ? {
            ...(options.fileReader && { fileReader: options.fileReader }),
            ...(options.fileWriter && { fileWriter: options.fileWriter }),
            ...(options.basePath && { basePath: options.basePath }),
          }
        : {},
    );
    this.resolveCommand = new ResolveCommand(
      options.fileReader || options.basePath
        ? {
            ...(options.fileReader && { fileReader: options.fileReader }),
            ...(options.basePath && { basePath: options.basePath }),
          }
        : {},
    );
    this.listCommand = new ListCommand();
    this.diffCommand = new DiffCommand(
      options.fileReader || options.basePath
        ? {
            ...(options.fileReader && { fileReader: options.fileReader }),
            ...(options.basePath && { basePath: options.basePath }),
          }
        : {},
    );
    this.infoCommand = new InfoCommand();
  }

  // Validation methods
  async validate(pathOrManifest: string | unknown): Promise<ValidationResult> {
    return this.validateCommand.validate(pathOrManifest);
  }

  async validateManifest(manifest: unknown): Promise<ValidationResult> {
    return this.validateCommand.validateManifest(manifest);
  }

  async validateTokenFile(filePath: string): Promise<ValidationResult> {
    return this.validateCommand.validateTokenFile(filePath);
  }

  async validateDirectory(dirPath: string): Promise<ValidationResult> {
    return this.validateCommand.validateDirectory(dirPath);
  }

  // Bundle methods
  async build(manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> {
    return this.bundleCommand.build(manifest);
  }

  async bundle(manifest: UPFTResolverManifest): Promise<BundleWriteResult[]> {
    return this.bundleCommand.bundle(manifest);
  }

  // Resolve methods
  async resolve(
    manifest: UPFTResolverManifest,
    modifiers: ResolutionInput = {},
  ): Promise<ResolvedPermutation> {
    return this.resolveCommand.resolve(manifest, modifiers);
  }

  async list(manifest: UPFTResolverManifest): Promise<ResolvedPermutation[]> {
    return this.resolveCommand.list(manifest);
  }

  // List methods
  async listTokens(
    filePath: string,
    options?: { type?: string; group?: string },
  ): Promise<
    Array<{
      path: string;
      type?: string;
      value?: unknown;
      resolvedValue?: unknown;
      hasReference?: boolean;
    }>
  > {
    return this.listCommand.listTokens(filePath, options);
  }

  // Diff methods
  async diff(
    manifest: UPFTResolverManifest,
    leftModifiers: ResolutionInput = {},
    rightModifiers: ResolutionInput = {},
  ): Promise<TokenDiff> {
    return this.diffCommand.diff(manifest, leftModifiers, rightModifiers);
  }

  async diffDocuments(
    leftDoc: TokenDocument,
    rightDoc: TokenDocument,
  ): Promise<TokenDiff> {
    return this.diffCommand.diffDocuments(leftDoc, rightDoc);
  }

  // Info methods
  async info(manifest: UPFTResolverManifest): Promise<ManifestInfo> {
    return this.infoCommand.info(manifest);
  }
}
