import { describe, expect, it } from "vitest";
import { validateTokenDocument } from "./index.js";

describe("Color Format Validation", () => {
  it("should validate hex color values", () => {
    const tokenDoc = {
      color: {
        red: {
          $type: "color",
          $value: "#ff0000",
        },
        blue: {
          $type: "color",
          $value: "#00f",
        },
        greenWithAlpha: {
          $type: "color",
          $value: "#00ff0080",
        },
      },
    };

    const result = validateTokenDocument(tokenDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate DTCG color format", () => {
    const tokenDoc = {
      color: {
        red: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [1, 0, 0],
            alpha: 1,
          },
        },
        blue: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [0, 0, 1],
            alpha: 1,
          },
        },
      },
    };

    const result = validateTokenDocument(tokenDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate advanced color spaces", () => {
    const tokenDoc = {
      color: {
        hslColor: {
          $type: "color",
          $value: {
            colorSpace: "hsl",
            components: [240, 100, 50],
            alpha: 1,
          },
        },
        p3Color: {
          $type: "color",
          $value: {
            colorSpace: "display-p3",
            components: [1, 0, 0],
            alpha: 1,
          },
        },
        oklchColor: {
          $type: "color",
          $value: {
            colorSpace: "oklch",
            components: [0.7, 0.15, 180],
            alpha: 1,
          },
        },
      },
    };

    const result = validateTokenDocument(tokenDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate color references", () => {
    const tokenDoc = {
      colors: {
        primary: {
          $type: "color",
          $value: "#ff0000",
        },
        secondary: {
          $type: "color",
          $value: "{colors.primary}",
        },
      },
    };

    const result = validateTokenDocument(tokenDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject invalid hex values", () => {
    const tokenDoc = {
      color: {
        invalid: {
          $type: "color",
          $value: "#gggggg", // Invalid hex characters
        },
      },
    };

    const result = validateTokenDocument(tokenDoc, { strict: true });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject invalid DTCG values", () => {
    const tokenDoc = {
      color: {
        invalid: {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: [2, 0, 0], // Invalid RGB component > 1
            alpha: 1,
          },
        },
      },
    };

    const result = validateTokenDocument(tokenDoc, { strict: true });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
