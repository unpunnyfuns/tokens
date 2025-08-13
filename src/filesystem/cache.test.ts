import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache, LRUCache } from "./cache.js";
import type { TokenFile } from "./types.js";

describe("LRUCache", () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3); // Small cache for testing
  });

  describe("basic operations", () => {
    it("should set and get values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for missing keys", () => {
      expect(cache.get("missing")).toBeUndefined();
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("missing")).toBe(false);
    });

    it("should delete values", () => {
      cache.set("key1", "value1");
      cache.delete("key1");
      expect(cache.has("key1")).toBe(false);
    });

    it("should clear all values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();

      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
      expect(cache.size()).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used item when full", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4"); // Should evict key1

      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });

    it("should update LRU order on get", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.get("key1"); // Move key1 to most recent
      cache.set("key4", "value4"); // Should evict key2

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });

    it("should update LRU order on set", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.set("key1", "updated"); // Move key1 to most recent
      cache.set("key4", "value4"); // Should evict key2

      expect(cache.get("key1")).toBe("updated");
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("size management", () => {
    it("should track size correctly", () => {
      expect(cache.size()).toBe(0);

      cache.set("key1", "value1");
      expect(cache.size()).toBe(1);

      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);

      cache.delete("key1");
      expect(cache.size()).toBe(1);
    });

    it("should not exceed max size", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4");
      cache.set("key5", "value5");

      expect(cache.size()).toBe(3);
    });

    it("should handle resize", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.resize(2); // Shrink cache

      expect(cache.size()).toBe(2);
      expect(cache.has("key1")).toBe(false); // Oldest evicted
    });
  });

  describe("getOrSet", () => {
    it("should return existing value", () => {
      cache.set("key1", "value1");

      const result = cache.getOrSet("key1", () => "fallback");

      expect(result).toBe("value1");
    });

    it("should compute and cache missing value", () => {
      const compute = vi.fn(() => "computed");

      const result = cache.getOrSet("key1", compute);

      expect(compute).toHaveBeenCalled();
      expect(result).toBe("computed");
      expect(cache.get("key1")).toBe("computed");
    });

    it("should not compute if value exists", () => {
      cache.set("key1", "value1");
      const compute = vi.fn(() => "computed");

      cache.getOrSet("key1", compute);

      expect(compute).not.toHaveBeenCalled();
    });
  });

  describe("iteration", () => {
    it("should provide entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const entries = Array.from(cache.entries());

      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual(["key1", "value1"]);
      expect(entries).toContainEqual(["key2", "value2"]);
    });

    it("should provide keys", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const keys = Array.from(cache.keys());

      expect(keys).toHaveLength(2);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });

    it("should provide values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const values = Array.from(cache.values());

      expect(values).toHaveLength(2);
      expect(values).toContain("value1");
      expect(values).toContain("value2");
    });
  });
});

describe("FileCache", () => {
  let cache: FileCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new FileCache({ maxSize: 3, ttl: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("token file caching", () => {
    it("should cache token files", () => {
      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: { colors: { primary: { $value: "#000" } } },
        format: "json",
        metadata: {
          lastModified: new Date(),
        },
      };

      cache.set("/tokens.json", file);

      expect(cache.get("/tokens.json")).toEqual(file);
    });

    it("should track statistics", () => {
      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: {},
        format: "json",
        metadata: {},
      };

      cache.set("/tokens.json", file);
      cache.get("/tokens.json");
      cache.get("/tokens.json");
      cache.get("/missing");

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe("TTL expiration", () => {
    it("should expire entries after TTL", () => {
      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: {},
        format: "json",
        metadata: {},
      };

      cache.set("/tokens.json", file);

      expect(cache.get("/tokens.json")).toBeDefined();

      // Advance past TTL
      vi.advanceTimersByTime(1001);

      expect(cache.get("/tokens.json")).toBeUndefined();
    });

    it("should not expire if TTL is disabled", () => {
      const cacheNoTTL = new FileCache({ maxSize: 3 });

      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: {},
        format: "json",
        metadata: {},
      };

      cacheNoTTL.set("/tokens.json", file);

      vi.advanceTimersByTime(10000);

      expect(cacheNoTTL.get("/tokens.json")).toBeDefined();
    });

    it("should refresh TTL on access if configured", () => {
      const cacheRefresh = new FileCache({
        maxSize: 3,
        ttl: 1000,
        refreshOnAccess: true,
      });

      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: {},
        format: "json",
        metadata: {},
      };

      cacheRefresh.set("/tokens.json", file);

      vi.advanceTimersByTime(500);
      cacheRefresh.get("/tokens.json"); // Refresh TTL

      vi.advanceTimersByTime(600); // Total 1100ms from creation

      expect(cacheRefresh.get("/tokens.json")).toBeDefined();
    });
  });

  describe("invalidation", () => {
    it("should invalidate by path", () => {
      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: {},
        format: "json",
        metadata: {},
      };

      cache.set("/tokens.json", file);
      cache.invalidate("/tokens.json");

      expect(cache.has("/tokens.json")).toBe(false);
    });

    it("should invalidate by pattern", () => {
      cache.set("/colors.json", {
        filePath: "/colors.json",
        tokens: {},
        format: "json" as const,
        metadata: {},
      });
      cache.set("/spacing.json", {
        filePath: "/spacing.json",
        tokens: {},
        format: "json" as const,
        metadata: {},
      });
      cache.set("/other.yaml", {
        filePath: "/other.yaml",
        tokens: {},
        format: "json" as const,
        metadata: {},
      });

      cache.invalidatePattern(/\.json$/);

      expect(cache.has("/colors.json")).toBe(false);
      expect(cache.has("/spacing.json")).toBe(false);
      expect(cache.has("/other.yaml")).toBe(true);
    });

    it("should invalidate by predicate", () => {
      const oldFile: TokenFile = {
        filePath: "/old.json",
        tokens: {},
        format: "json",
        metadata: {
          lastModified: new Date(Date.now() - 10000),
        },
      };

      const newFile: TokenFile = {
        filePath: "/new.json",
        tokens: {},
        format: "json",
        metadata: {
          lastModified: new Date(),
        },
      };

      cache.set("/old.json", oldFile);
      cache.set("/new.json", newFile);

      cache.invalidateBy((file) => {
        if (!file.metadata?.lastModified) return false;
        return Date.now() - file.metadata.lastModified.getTime() > 5000;
      });

      expect(cache.has("/old.json")).toBe(false);
      expect(cache.has("/new.json")).toBe(true);
    });
  });

  describe("preloading", () => {
    it("should preload multiple files", () => {
      const files: TokenFile[] = [
        {
          filePath: "/colors.json",
          tokens: {},
          format: "json" as const,
          metadata: {},
        },
        {
          filePath: "/spacing.json",
          tokens: {},
          format: "json" as const,
          metadata: {},
        },
      ];

      cache.preload(files);

      expect(cache.has("/colors.json")).toBe(true);
      expect(cache.has("/spacing.json")).toBe(true);
    });

    it("should respect max size during preload", () => {
      const files: TokenFile[] = [
        {
          filePath: "/file1.json",
          tokens: {},
          format: "json" as const,
          metadata: {},
        },
        {
          filePath: "/file2.json",
          tokens: {},
          format: "json" as const,
          metadata: {},
        },
        {
          filePath: "/file3.json",
          tokens: {},
          format: "json" as const,
          metadata: {},
        },
        {
          filePath: "/file4.json",
          tokens: {},
          format: "json" as const,
          metadata: {},
        },
      ];

      cache.preload(files);

      expect(cache.size()).toBe(3);
      expect(cache.has("/file1.json")).toBe(false); // Evicted
      expect(cache.has("/file4.json")).toBe(true);
    });
  });

  describe("memory estimation", () => {
    it("should estimate memory usage", () => {
      const file: TokenFile = {
        filePath: "/tokens.json",
        tokens: {
          colors: {
            primary: { $value: "#000000" },
            secondary: { $value: "#ffffff" },
          },
        },
        format: "json" as const,
        metadata: {},
      };

      cache.set("/tokens.json", file);

      const memory = cache.getMemoryUsage();

      expect(memory).toBeGreaterThan(0);
      expect(memory).toBeLessThan(1000); // Reasonable size for small object
    });
  });
});
