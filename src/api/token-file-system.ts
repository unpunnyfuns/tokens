/**
 * Token File System for managing multiple token sources and manifests
 */

import { TokenFileReader } from "../filesystem/file-reader.js";
import { ManifestReader } from "../filesystem/manifest-reader.js";
import { UPFTResolver } from "../resolver/upft-resolver.js";
import type { UPFTResolverManifest } from "../resolver/upft-types.js";
import type { TokenDocument } from "../types.js";

/**
 * System for managing multiple token documents and manifests
 * Provides a unified interface for working with collections of token files
 */
export class TokenFileSystem {
  private documents: Map<string, TokenDocument> = new Map();
  private manifests: Map<string, UPFTResolverManifest> = new Map();
  private fileReader = new TokenFileReader();
  private manifestReader = new ManifestReader();

  /**
   * Add a token document
   */
  async addDocument(path: string): Promise<void> {
    const fileData = await this.fileReader.readFile(path);
    const doc = fileData.tokens;
    this.documents.set(path, doc);
  }

  /**
   * Add multiple token documents
   */
  async addDocuments(paths: string[]): Promise<void> {
    for (const path of paths) {
      await this.addDocument(path);
    }
  }

  /**
   * Add a manifest and optionally resolve it
   */
  async addManifest(
    path: string,
    modifiers?: Record<string, string>,
  ): Promise<void> {
    const manifest = await this.manifestReader.readManifest(path);
    this.manifests.set(path, manifest);

    // If modifiers provided, resolve and add the result
    if (modifiers) {
      const resolver = new UPFTResolver();
      const result = await resolver.resolvePermutation(manifest, modifiers);
      this.documents.set(`${path}:resolved`, result.tokens);
    }
  }

  /**
   * Get all loaded documents
   */
  getDocuments(): TokenDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get a specific document by path
   */
  getDocument(path: string): TokenDocument | undefined {
    return this.documents.get(path);
  }

  /**
   * Get all loaded manifests
   */
  getManifests(): UPFTResolverManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Get a specific manifest by path
   */
  getManifest(path: string): UPFTResolverManifest | undefined {
    return this.manifests.get(path);
  }

  /**
   * Clear all loaded documents and manifests
   */
  clear(): void {
    this.documents.clear();
    this.manifests.clear();
  }

  /**
   * Get statistics about loaded files
   */
  getStats(): {
    documentCount: number;
    manifestCount: number;
    totalSize: number;
  } {
    let totalSize = 0;
    for (const doc of this.documents.values()) {
      totalSize += JSON.stringify(doc).length;
    }

    return {
      documentCount: this.documents.size,
      manifestCount: this.manifests.size,
      totalSize,
    };
  }
}
