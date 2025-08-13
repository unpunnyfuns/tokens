import type { TokenFile } from "./types.js";

/**
 * Generic LRU cache implementation
 */
export class LRUCache<T> {
  private cache = new Map<string, T>();
  private accessOrder: string[] = [];

  constructor(private maxSize: number) {}

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Update access order
    this.updateAccessOrder(key);
    return this.cache.get(key);
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a value
   */
  delete(key: string): boolean {
    if (this.cache.delete(key)) {
      this.removeFromAccessOrder(key);
      return true;
    }
    return false;
  }

  /**
   * Clear all values
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Resize the cache
   */
  resize(newSize: number): void {
    this.maxSize = newSize;
    while (this.cache.size > newSize) {
      this.evictLRU();
    }
  }

  /**
   * Get or compute and set a value
   */
  getOrSet(key: string, compute: () => T): T {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = compute();
    this.set(key, value);
    return value;
  }

  /**
   * Get all entries
   */
  entries(): IterableIterator<[string, T]> {
    return this.cache.entries();
  }

  /**
   * Get all keys
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  /**
   * Get all values
   */
  values(): IterableIterator<T> {
    return this.cache.values();
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    const lru = this.accessOrder.shift();
    if (lru) {
      this.cache.delete(lru);
    }
  }
}

/**
 * Cache entry with TTL support
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

/**
 * File cache with TTL and statistics
 */
export class FileCache {
  private cache: LRUCache<CacheEntry<TokenFile>>;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    private options: {
      maxSize: number;
      ttl?: number;
      refreshOnAccess?: boolean;
    } = { maxSize: 100 },
  ) {
    this.cache = new LRUCache(options.maxSize);
  }

  /**
   * Get a file from cache
   */
  get(path: string): TokenFile | undefined {
    const entry = this.cache.get(path);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.cache.delete(path);
      this.stats.misses++;
      return undefined;
    }

    // Update stats and optionally refresh TTL
    entry.hits++;
    this.stats.hits++;

    if (this.options.refreshOnAccess) {
      entry.timestamp = Date.now();
    }

    return entry.value;
  }

  /**
   * Set a file in cache
   */
  set(path: string, file: TokenFile): void {
    const entry: CacheEntry<TokenFile> = {
      value: file,
      timestamp: Date.now(),
      hits: 0,
    };

    this.cache.set(path, entry);
  }

  /**
   * Check if path is cached
   */
  has(path: string): boolean {
    const entry = this.cache.get(path);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(path);
      return false;
    }

    return true;
  }

  /**
   * Invalidate a cached file
   */
  invalidate(path: string): void {
    this.cache.delete(path);
  }

  /**
   * Invalidate files matching pattern
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate files by predicate
   */
  invalidateBy(predicate: (file: TokenFile) => boolean): void {
    for (const [key, entry] of this.cache.entries()) {
      if (predicate(entry.value)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached files
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size();
  }

  /**
   * Preload multiple files
   */
  preload(files: TokenFile[]): void {
    for (const file of files) {
      this.set(file.filePath, file);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size(),
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Estimate memory usage
   */
  getMemoryUsage(): number {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      // Rough estimation of JSON size
      totalSize += JSON.stringify(entry.value).length;
    }

    return totalSize;
  }

  private isExpired(entry: CacheEntry<TokenFile>): boolean {
    if (!this.options.ttl) return false;
    return Date.now() - entry.timestamp > this.options.ttl;
  }
}
