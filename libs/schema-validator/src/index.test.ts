/**
 * Basic tests for schema validator
 */

import { describe, expect, it } from "vitest";
import {
  detectFileType,
  validateManifest,
  validateTokenDocument,
} from "./index.js";

describe("Schema Validator", () => {
  it("should detect token document type", () => {
    const tokenDoc = {
      "color-primary": {
        $type: "color",
        $value: "#007AFF",
      },
    };

    const result = detectFileType(tokenDoc);
    expect(result).toBe("tokens");
  });

  it("should detect manifest type", () => {
    const manifest = {
      name: "test-manifest",
      sets: [],
      modifiers: {},
    };

    const result = detectFileType(manifest);
    expect(result).toBe("manifest");
  });

  it("should validate token document successfully", () => {
    const tokenDoc = {
      "color-primary": {
        $type: "color",
        $value: "#007AFF",
      },
    };

    const result = validateTokenDocument(tokenDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should validate manifest successfully", () => {
    const manifest = {
      name: "test-manifest",
      sets: [],
      modifiers: {},
    };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should detect unknown file type", () => {
    const unknown = {
      randomProperty: "value",
    };

    const result = detectFileType(unknown);
    expect(result).toBe("unknown");
  });
});
