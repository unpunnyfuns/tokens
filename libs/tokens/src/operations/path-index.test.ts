import { describe, expect, it } from "vitest";
import {
  buildPathIndex,
  getPathsWithPrefix,
  getTokenFromIndex,
  getTokensByType,
  hasPath,
  removeFromIndex,
  updateIndex,
} from "./path-index.js";

describe("Path Index", () => {
  describe("buildPathIndex", () => {
    it("should index simple tokens", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
        },
      };

      const index = buildPathIndex(document);

      expect(index.tokens.size).toBe(2);
      expect(index.tokens.get("color.primary")).toEqual({ $value: "#ff0000" });
      expect(index.tokens.get("color.secondary")).toEqual({
        $value: "#00ff00",
      });
      expect(index.groups.has("color")).toBe(true);
    });

    it("should index nested groups", () => {
      const document = {
        spacing: {
          component: {
            button: {
              small: { $value: "4px" },
              large: { $value: "16px" },
            },
          },
        },
      };

      const index = buildPathIndex(document);

      expect(index.groups.has("spacing")).toBe(true);
      expect(index.groups.has("spacing.component")).toBe(true);
      expect(index.groups.has("spacing.component.button")).toBe(true);
      expect(index.tokens.get("spacing.component.button.small")).toEqual({
        $value: "4px",
      });
    });

    it("should track inherited types", () => {
      const document = {
        color: {
          $type: "color",
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
        },
      };

      const index = buildPathIndex(document);

      expect(index.types.get("color.primary")).toBe("color");
      expect(index.types.get("color.secondary")).toBe("color");
      expect(index.types.get("spacing.small")).toBe("dimension");
    });

    it("should handle empty document", () => {
      const index = buildPathIndex({});

      expect(index.tokens.size).toBe(0);
      expect(index.types.size).toBe(0);
      expect(index.groups.size).toBe(0);
    });
  });

  describe("getTokenFromIndex", () => {
    it("should retrieve token by path", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
      };
      const index = buildPathIndex(document);

      const token = getTokenFromIndex(index, "color.primary");
      expect(token).toEqual({ $value: "#ff0000" });
    });

    it("should return undefined for non-existent path", () => {
      const index = buildPathIndex({});
      const token = getTokenFromIndex(index, "color.primary");
      expect(token).toBeUndefined();
    });
  });

  describe("hasPath", () => {
    it("should check if token path exists", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
      };
      const index = buildPathIndex(document);

      expect(hasPath(index, "color.primary")).toBe(true);
      expect(hasPath(index, "color.secondary")).toBe(false);
    });

    it("should check if group path exists", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
      };
      const index = buildPathIndex(document);

      expect(hasPath(index, "color")).toBe(true);
      expect(hasPath(index, "spacing")).toBe(false);
    });
  });

  describe("getPathsWithPrefix", () => {
    it("should find all paths with prefix", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
          accent: {
            main: { $value: "#0000ff" },
            light: { $value: "#8080ff" },
          },
        },
        spacing: {
          small: { $value: "4px" },
        },
      };
      const index = buildPathIndex(document);

      const colorPaths = getPathsWithPrefix(index, "color");
      expect(colorPaths).toContain("color.primary");
      expect(colorPaths).toContain("color.secondary");
      expect(colorPaths).toContain("color.accent");
      expect(colorPaths).toContain("color.accent.main");
      expect(colorPaths).toContain("color.accent.light");
      expect(colorPaths).not.toContain("spacing.small");
    });

    it("should match exact path", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
      };
      const index = buildPathIndex(document);

      const paths = getPathsWithPrefix(index, "color.primary");
      expect(paths).toContain("color.primary");
      expect(paths).toHaveLength(1);
    });
  });

  describe("getTokensByType", () => {
    it("should find all tokens of a type", () => {
      const document = {
        color: {
          $type: "color",
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
        },
        spacing: {
          small: { $value: "4px", $type: "dimension" },
          large: { $value: "16px", $type: "dimension" },
        },
      };
      const index = buildPathIndex(document);

      const colors = getTokensByType(index, "color");
      expect(colors).toHaveLength(2);
      expect(colors.some(([path]) => path === "color.primary")).toBe(true);
      expect(colors.some(([path]) => path === "color.secondary")).toBe(true);

      const dimensions = getTokensByType(index, "dimension");
      expect(dimensions).toHaveLength(2);
      expect(dimensions.some(([path]) => path === "spacing.small")).toBe(true);
      expect(dimensions.some(([path]) => path === "spacing.large")).toBe(true);
    });
  });

  describe("updateIndex", () => {
    it("should add new token to index", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
      };
      const index = buildPathIndex(document);

      updateIndex(index, "color.secondary", { $value: "#00ff00" }, "color");

      expect(index.tokens.get("color.secondary")).toEqual({
        $value: "#00ff00",
      });
      expect(index.types.get("color.secondary")).toBe("color");
    });

    it("should update existing token", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
        },
      };
      const index = buildPathIndex(document);

      updateIndex(index, "color.primary", { $value: "#00ff00" });

      expect(index.tokens.get("color.primary")).toEqual({
        $value: "#00ff00",
      });
    });

    it("should add parent groups when adding nested token", () => {
      const index = buildPathIndex({});

      updateIndex(
        index,
        "spacing.component.button.small",
        { $value: "4px" },
        "dimension",
      );

      expect(index.groups.has("spacing")).toBe(true);
      expect(index.groups.has("spacing.component")).toBe(true);
      expect(index.groups.has("spacing.component.button")).toBe(true);
    });
  });

  describe("removeFromIndex", () => {
    it("should remove token from index", () => {
      const document = {
        color: {
          primary: { $value: "#ff0000" },
          secondary: { $value: "#00ff00" },
        },
      };
      const index = buildPathIndex(document);

      removeFromIndex(index, "color.primary");

      expect(index.tokens.has("color.primary")).toBe(false);
      expect(index.tokens.has("color.secondary")).toBe(true);
    });

    it("should remove children when removing group", () => {
      const document = {
        color: {
          accent: {
            main: { $value: "#0000ff" },
            light: { $value: "#8080ff" },
          },
        },
      };
      const index = buildPathIndex(document);

      removeFromIndex(index, "color.accent");

      expect(index.groups.has("color.accent")).toBe(false);
      expect(index.tokens.has("color.accent.main")).toBe(false);
      expect(index.tokens.has("color.accent.light")).toBe(false);
    });
  });
});
