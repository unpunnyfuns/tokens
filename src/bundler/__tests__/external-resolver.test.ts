import { readFile } from "node:fs/promises";
import { beforeEach, expect, test, vi } from "vitest";
import {
  checkForExternalReferences,
  resolveExternalReferences,
} from "../external-resolver";

// Mock fs.readFile - mock node:fs/promises to match core resolver import
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("resolveExternalReferences loads external file", async () => {
  const externalTokens = {
    colors: {
      primary: { $value: "#000" },
    },
  };

  vi.mocked(readFile).mockResolvedValue(JSON.stringify(externalTokens));

  const tokens = {
    theme: {
      color: { $ref: "external.json#/colors/primary" },
    },
  };

  const result = await resolveExternalReferences(tokens, "/base");

  expect((result as any).theme.color).toEqual({ $ref: "#/colors/primary" });
  expect(readFile).toHaveBeenCalledWith("/base/external.json", "utf-8");
});

test("resolveExternalReferences caches external files", async () => {
  const externalTokens = {
    colors: {
      primary: { $value: "#000" },
    },
  };

  vi.mocked(readFile).mockResolvedValue(JSON.stringify(externalTokens));

  const tokens = {
    theme1: { $ref: "external.json#/colors/primary" },
    theme2: { $ref: "external.json#/colors/primary" },
  };

  await resolveExternalReferences(tokens, "/base");

  // Should only read file once due to caching
  expect(readFile).toHaveBeenCalledTimes(1);
});

test("resolveExternalReferences merges entire file when no fragment", async () => {
  const externalTokens = {
    colors: {
      primary: { $value: "#000" },
      secondary: { $value: "#fff" },
    },
  };

  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify({ $schema: "test", ...externalTokens }),
  );

  const tokens = {
    imported: { $ref: "external.json" },
  };

  const result = await resolveExternalReferences(tokens, "/base");

  expect((result as any).imported).toEqual(externalTokens);
});

test("resolveExternalReferences handles nested external refs", async () => {
  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify({ color: { $value: "#000" } }),
  );

  const tokens = {
    theme: {
      colors: {
        primary: {
          $value: { $ref: "external.json#/color" },
        },
      },
    },
  };

  const result = await resolveExternalReferences(tokens, "/base");

  expect((result as any).theme.colors.primary.$value).toEqual({
    $ref: "#/color",
  });
});

test("resolveExternalReferences preserves internal references", async () => {
  const tokens = {
    base: { $value: "#000" },
    derived: { $ref: "#/base" },
  };

  const result = await resolveExternalReferences(tokens, "/base");

  expect(result).toEqual(tokens);
  expect(readFile).not.toHaveBeenCalled();
});

test("resolveExternalReferences handles arrays", async () => {
  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify({ spacing: { $value: "8px" } }),
  );

  const tokens = {
    list: [{ $ref: "external.json#/spacing" }, "16px", { $ref: "#/internal" }],
  };

  const result = await resolveExternalReferences(tokens, "/base");

  expect((result as any).list[0]).toEqual({ $ref: "#/spacing" });
  expect((result as any).list[1]).toBe("16px");
  expect((result as any).list[2]).toEqual({ $ref: "#/internal" });
});

test("checkForExternalReferences finds external refs", () => {
  const tokens = {
    external1: { $ref: "file.json#/token" },
    internal: { $ref: "#/local" },
    nested: {
      external2: { $ref: "other.json" },
    },
  };

  const result = checkForExternalReferences(tokens);

  expect((result as any).hasExternal).toBe(true);
  expect((result as any).externalRefs).toEqual([
    "file.json#/token",
    "other.json",
  ]);
});

test("checkForExternalReferences returns false for no external refs", () => {
  const tokens = {
    internal1: { $ref: "#/local" },
    internal2: { $value: { $ref: "#/other" } },
  };

  const result = checkForExternalReferences(tokens);

  expect((result as any).hasExternal).toBe(false);
  expect((result as any).externalRefs).toEqual([]);
});

test("checkForExternalReferences handles arrays", () => {
  const tokens = {
    list: [{ $ref: "external.json" }, { $ref: "#/internal" }],
  };

  const result = checkForExternalReferences(tokens);

  expect((result as any).hasExternal).toBe(true);
  expect((result as any).externalRefs).toEqual(["external.json"]);
});
