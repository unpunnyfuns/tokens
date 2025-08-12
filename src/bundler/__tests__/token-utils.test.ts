import { expect, test } from "vitest";
import {
  extractReference,
  getTokenStats,
  hasReference,
  isTokenLeaf,
} from "../../core/utils";

test("isTokenLeaf identifies tokens with $value", () => {
  expect(isTokenLeaf({ $value: "#000" })).toBe(true);
  expect(isTokenLeaf({ $value: null })).toBe(true);
  expect(isTokenLeaf({ $value: undefined })).toBe(true);
});

test("isTokenLeaf identifies tokens with $ref", () => {
  expect(isTokenLeaf({ $ref: "#/colors/primary" })).toBe(true);
});

test("isTokenLeaf returns false for non-tokens", () => {
  expect(isTokenLeaf({})).toBe(false);
  expect(isTokenLeaf({ color: "#000" })).toBe(false);
  expect(isTokenLeaf(null)).toBe(false);
  expect(isTokenLeaf(undefined)).toBe(false);
  expect(isTokenLeaf("string")).toBe(false);
  expect(isTokenLeaf(123)).toBe(false);
  expect(isTokenLeaf([])).toBe(false);
});

test("hasReference detects direct references", () => {
  expect(hasReference({ $ref: "#/colors/primary" })).toBe(true);
  expect(hasReference({ $value: { $ref: "#/colors/primary" } })).toBe(true);
});

test("hasReference detects nested references", () => {
  const composite = {
    color: { $ref: "#/colors/primary" },
    width: "2px",
  };
  expect(hasReference(composite)).toBe(true);
});

test("hasReference detects references in arrays", () => {
  const array = [
    { $ref: "#/spacing/small" },
    "16px",
    { $ref: "#/spacing/large" },
  ];
  expect(hasReference(array)).toBe(true);
});

test("hasReference returns false when no references", () => {
  expect(hasReference("#000")).toBe(false);
  expect(hasReference({ color: "#000" })).toBe(false);
  expect(hasReference(["8px", "16px"])).toBe(false);
  expect(hasReference(null)).toBe(false);
});

test("extractReference gets direct reference", () => {
  expect(extractReference({ $ref: "#/colors/primary" })).toBe(
    "#/colors/primary",
  );
});

test("extractReference gets nested reference", () => {
  const composite = {
    color: { $ref: "#/colors/primary" },
    width: "2px",
  };
  expect(extractReference(composite)).toBe("#/colors/primary");
});

test("extractReference gets first reference from array", () => {
  const array = [
    "8px",
    { $ref: "#/spacing/small" },
    { $ref: "#/spacing/large" },
  ];
  expect(extractReference(array)).toBe("#/spacing/small");
});

test("extractReference returns null when no reference", () => {
  expect(extractReference("#000")).toBe(null);
  expect(extractReference({ color: "#000" })).toBe(null);
  expect(extractReference(null)).toBe(null);
});

test("getTokenStats counts tokens and groups", () => {
  const tokens = {
    colors: {
      primary: { $value: "#000", $type: "color" },
      secondary: { $value: "#fff", $type: "color" },
    },
    spacing: {
      small: { $value: "8px", $type: "dimension" },
    },
  };

  const stats = getTokenStats(tokens);

  expect(stats.totalTokens).toBe(3);
  expect(stats.totalGroups).toBe(2);
  expect(stats.tokensByType).toEqual({
    color: 2,
    dimension: 1,
  });
});

test("getTokenStats counts references", () => {
  const tokens = {
    base: { $value: "#000" },
    derived: { $value: { $ref: "#/base" } },
  };

  const stats = getTokenStats(tokens);

  expect(stats.tokensWithReferences).toBe(1);
});

test("getTokenStats calculates depth", () => {
  const tokens = {
    level1: {
      level2: {
        level3: {
          token: { $value: "#000" },
        },
      },
    },
  };

  const stats = getTokenStats(tokens);

  expect(stats.depth).toBe(3);
});

test("getTokenStats handles empty tokens", () => {
  const stats = getTokenStats({});

  expect(stats.totalTokens).toBe(0);
  expect(stats.totalGroups).toBe(0);
  expect(stats.depth).toBe(0);
});
