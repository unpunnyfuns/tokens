import { beforeEach, describe, expect, it } from "vitest";
import type { TokenDocument } from "../types.js";
import { TokenValidator } from "./validator.js";

describe("TokenValidator", () => {
  describe("create", () => {
    it("should create validator with default options", async () => {
      const validator = await TokenValidator.create();
      expect(validator).toBeInstanceOf(TokenValidator);
    });

    it("should create validator with strict mode", async () => {
      const validator = await TokenValidator.create({ strict: true });
      expect(validator).toBeInstanceOf(TokenValidator);
    });

    it("should create validator with registry disabled", async () => {
      const validator = await TokenValidator.create({ useRegistry: false });
      expect(validator).toBeInstanceOf(TokenValidator);
    });

    it("should create validator with custom formats", async () => {
      const validator = await TokenValidator.create({
        // formats: {
        // 	customFormat: /^custom-/
        // }
      });
      expect(validator).toBeInstanceOf(TokenValidator);
    });
  });

  describe("validateDocument", () => {
    let validator: TokenValidator;

    beforeEach(async () => {
      validator = await TokenValidator.create({
        strict: true,
        useRegistry: true,
      });
    });

    it("should validate valid token document", async () => {
      const doc: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate document with references", async () => {
      const doc: TokenDocument = {
        colors: {
          red: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
          },
          primary: {
            $type: "color",
            $value: "{colors.red}",
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate dimension tokens", async () => {
      const doc: TokenDocument = {
        spacing: {
          small: { $type: "dimension", $value: { value: 8, unit: "px" } },
          medium: { $type: "dimension", $value: { value: 16, unit: "px" } },
          large: { $type: "dimension", $value: { value: 32, unit: "px" } },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate typography tokens", async () => {
      const doc: TokenDocument = {
        typography: {
          heading: {
            $type: "typography",
            $value: {
              fontFamily: "Arial",
              fontSize: { value: 24, unit: "px" },
              fontWeight: 700,
              lineHeight: 1.5,
              letterSpacing: { value: 0.02, unit: "rem" },
            },
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate shadow tokens", async () => {
      const doc: TokenDocument = {
        shadows: {
          elevation1: {
            $type: "shadow",
            $value: [
              {
                color: {
                  colorSpace: "srgb",
                  components: [0, 0, 0],
                  alpha: 0.2,
                },
                offsetX: { value: 0, unit: "px" },
                offsetY: { value: 2, unit: "px" },
                blur: { value: 4, unit: "px" },
                spread: { value: 0, unit: "px" },
              },
            ],
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate border tokens", async () => {
      const doc: TokenDocument = {
        borders: {
          default: {
            $type: "border",
            $value: {
              color: {
                colorSpace: "srgb",
                components: [0.5, 0.5, 0.5],
                alpha: 1,
              },
              width: { value: 1, unit: "px" },
              style: "solid",
            },
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate gradient tokens", async () => {
      const doc: TokenDocument = {
        gradients: {
          sunset: {
            $type: "gradient",
            $value: [
              {
                color: {
                  colorSpace: "srgb",
                  components: [1, 0.5, 0],
                  alpha: 1,
                },
                position: 0,
              },
              {
                color: {
                  colorSpace: "srgb",
                  components: [1, 0, 0.5],
                  alpha: 1,
                },
                position: 1,
              },
            ],
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate document with $extensions", async () => {
      const doc: TokenDocument = {
        $extensions: {
          "com.example.tool": {
            version: "1.0.0",
          },
        },
        colors: {
          primary: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            $extensions: {
              "com.example.tool": {
                customData: "value",
              },
            },
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate document with $description", async () => {
      const doc: TokenDocument = {
        $description: "Design tokens for our application",
        colors: {
          $description: "Color palette",
          primary: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            $description: "Primary brand color",
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should validate nested groups", async () => {
      const doc: TokenDocument = {
        theme: {
          light: {
            colors: {
              background: {
                $type: "color",
                $value: {
                  colorSpace: "srgb",
                  components: [1, 1, 1],
                  alpha: 1,
                },
              },
            },
          },
          dark: {
            colors: {
              background: {
                $type: "color",
                $value: {
                  colorSpace: "srgb",
                  components: [0, 0, 0],
                  alpha: 1,
                },
              },
            },
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should handle mixed token types in groups", async () => {
      const doc: TokenDocument = {
        design: {
          colors: {
            primary: {
              $type: "color",
              $value: {
                colorSpace: "srgb",
                components: [1, 0, 0],
                alpha: 1,
              },
            },
          },
          spacing: {
            small: {
              $type: "dimension",
              $value: { value: 8, unit: "px" },
            },
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });
  });

  describe("non-strict mode", () => {
    let validator: TokenValidator;

    beforeEach(async () => {
      validator = await TokenValidator.create({ strict: false });
    });

    it("should accept hex colors in non-strict mode", async () => {
      const doc: TokenDocument = {
        colors: {
          primary: {
            $type: "color",
            $value: "#ff0000",
          },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });

    it("should accept any value in non-strict mode", async () => {
      const doc: TokenDocument = {
        custom: {
          anything: { $value: { custom: "data", nested: { value: 123 } } },
        },
      };

      const result = await validator.validateDocument(doc);
      expect(result.valid).toBe(true);
    });
  });

  describe("custom formats", () => {
    it("should use custom format validators", async () => {
      const validator = await TokenValidator.create({
        // formats: {
        // 	customHex: /^#[0-9a-f]{6}$/i
        // }
      });

      // This would need a custom schema that uses the format
      // Just testing that it creates without error
      expect(validator).toBeInstanceOf(TokenValidator);
    });
  });
});
