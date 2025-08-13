/**
 * Validation command implementation
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { ValidationResult } from "../../types.js";
import { ManifestValidator } from "../../validation/manifest-validator.js";
import { TokenValidator } from "../../validation/validator.js";

export class ValidateCommand {
  private manifestValidator: ManifestValidator;
  private tokenValidator: TokenValidator;

  constructor() {
    this.manifestValidator = new ManifestValidator();
    this.tokenValidator = new TokenValidator();
  }

  /**
   * Validate a resolver manifest
   */
  async validateManifest(manifest: unknown): Promise<ValidationResult> {
    return this.manifestValidator.validateManifest(manifest);
  }

  /**
   * Validate a token file
   */
  async validateTokenFile(filePath: string): Promise<ValidationResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      return this.tokenValidator.validateDocument(data);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            path: filePath,
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate all token files in a directory
   */
  async validateDirectory(dirPath: string): Promise<ValidationResult> {
    const errors: ValidationResult["errors"] = [];

    try {
      const files = await fs.readdir(dirPath);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      for (const file of jsonFiles) {
        const filePath = join(dirPath, file);
        const result = await this.validateTokenFile(filePath);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            path: dirPath,
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Legacy validate method for backward compatibility
   */
  async validate(pathOrManifest: string | unknown): Promise<ValidationResult> {
    if (typeof pathOrManifest === "string") {
      return this.validateTokenFile(pathOrManifest);
    }
    return this.validateManifest(pathOrManifest);
  }
}
