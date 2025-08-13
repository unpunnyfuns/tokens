import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import JSON5 from "json5";
import YAML from "yaml";
import type { UPFTResolverManifest } from "../types.js";

/**
 * Reader for UPFT resolver manifest files
 */
export class ManifestReader {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? process.cwd();
  }

  /**
   * Read and parse a manifest file
   */
  async readManifest(filePath: string): Promise<UPFTResolverManifest> {
    const absolutePath = isAbsolute(filePath)
      ? filePath
      : join(this.basePath, filePath);

    const content = await readFile(absolutePath, "utf-8");
    const ext = filePath.split(".").pop()?.toLowerCase();

    let manifest: UPFTResolverManifest;

    switch (ext) {
      case "yaml":
      case "yml":
        manifest = YAML.parse(content);
        break;
      case "json5":
        manifest = JSON5.parse(content);
        break;
      default:
        manifest = JSON.parse(content);
        break;
    }

    // Validate basic structure
    if (!(manifest.sets && Array.isArray(manifest.sets))) {
      throw new Error(
        `Invalid manifest: missing or invalid 'sets' array in ${filePath}`,
      );
    }

    if (!manifest.modifiers || typeof manifest.modifiers !== "object") {
      throw new Error(
        `Invalid manifest: missing or invalid 'modifiers' object in ${filePath}`,
      );
    }

    return manifest;
  }

  /**
   * Validate sets in manifest
   */
  private validateSets(manifest: UPFTResolverManifest, errors: string[]): void {
    if (!(manifest.sets && Array.isArray(manifest.sets))) {
      errors.push("Missing or invalid 'sets' array");
      return;
    }

    manifest.sets.forEach((set, index) => {
      if (!(set.values && Array.isArray(set.values))) {
        errors.push(`Set ${index} missing 'values' array`);
      }
    });
  }

  /**
   * Validate modifiers in manifest
   */
  private validateModifiers(
    manifest: UPFTResolverManifest,
    errors: string[],
  ): void {
    if (!manifest.modifiers || typeof manifest.modifiers !== "object") {
      errors.push("Missing or invalid 'modifiers' object");
      return;
    }

    for (const [name, modifier] of Object.entries(manifest.modifiers)) {
      if (!("oneOf" in modifier || "anyOf" in modifier)) {
        errors.push(`Modifier '${name}' must have either 'oneOf' or 'anyOf'`);
      }
      if (!modifier.values || typeof modifier.values !== "object") {
        errors.push(`Modifier '${name}' missing 'values' object`);
      }
    }
  }

  /**
   * Validate a manifest structure
   */
  validateManifest(manifest: UPFTResolverManifest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    this.validateSets(manifest, errors);
    this.validateModifiers(manifest, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
