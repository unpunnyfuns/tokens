import { watch as chokidarWatch, type FSWatcher } from "chokidar";
import type { TokenDocument } from "../types.js";
import { TokenFileReader } from "./file-reader.js";

/**
 * File change event
 */
export interface FileChangeEvent {
  type: "add" | "change" | "unlink";
  path: string;
  content?: TokenDocument;
}

/**
 * Watch options
 */
export interface WatchOptions {
  pattern?: string;
  ignore?: string[];
  debounce?: number;
  batch?: boolean;
  loadContent?: boolean;
  onError?: (error: Error) => void;
  readyTimeout?: number;
}

/**
 * Token file watcher
 */
export class TokenFileWatcher {
  private watcher: FSWatcher | undefined;
  private reader: TokenFileReader;
  private ready = false;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private batchedEvents: FileChangeEvent[] = [];
  private batchTimer: NodeJS.Timeout | undefined;

  constructor() {
    this.reader = new TokenFileReader();
  }

  /**
   * Start watching files
   */
  async watch(
    paths: string | string[],
    onChange: (event: FileChangeEvent | FileChangeEvent[]) => void,
    options: WatchOptions = {},
  ): Promise<void> {
    const pathArray = Array.isArray(paths) ? paths : [paths];

    // Create or update watcher
    if (this.watcher) {
      // Add new paths to existing watcher
      this.watcher.add(pathArray);
    } else {
      const watchOptions: Parameters<typeof chokidarWatch>[1] = {
        persistent: true,
        ignoreInitial: true,
      };

      if (options.ignore) {
        watchOptions.ignored = options.ignore;
      }

      this.watcher = chokidarWatch(pathArray, watchOptions);

      // Set up event handlers
      this.setupEventHandlers(onChange, options);

      // Wait for ready
      await this.waitForReady(options.readyTimeout);
    }
  }

  /**
   * Stop watching specific paths
   */
  unwatch(paths: string | string[]): void {
    if (!this.watcher) return;

    const pathArray = Array.isArray(paths) ? paths : [paths];
    this.watcher.unwatch(pathArray);
  }

  /**
   * Close the watcher
   */
  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      this.ready = false;
    }

    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.batchTimer = undefined;
  }

  /**
   * Check if watcher is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(
    onChange: (event: FileChangeEvent | FileChangeEvent[]) => void,
    options: WatchOptions,
  ): void {
    if (!this.watcher) return;

    const handleEvent = async (type: FileChangeEvent["type"], path: string) => {
      try {
        // Filter by pattern if specified
        if (options.pattern && !this.matchesPattern(path, options.pattern)) {
          return;
        }

        // Create event
        const event: FileChangeEvent = { type, path };

        // Load content if requested
        if (options.loadContent && type !== "unlink") {
          try {
            const file = await this.reader.readFile(path);
            event.content = file.tokens;
          } catch (error) {
            options.onError?.(error as Error);
            return;
          }
        }

        // Handle debouncing
        if (options.debounce) {
          this.debounceEvent(event, onChange, options);
        } else if (options.batch) {
          this.batchEvent(event, onChange, options);
        } else {
          onChange(event);
        }
      } catch (error) {
        options.onError?.(error as Error);
      }
    };

    this.watcher.on("add", (path) => handleEvent("add", path));
    this.watcher.on("change", (path) => handleEvent("change", path));
    this.watcher.on("unlink", (path) => handleEvent("unlink", path));
    this.watcher.on("error", (error) => options.onError?.(error as Error));
    this.watcher.on("ready", () => {
      this.ready = true;
    });
  }

  /**
   * Debounce file events
   */
  private debounceEvent(
    event: FileChangeEvent,
    onChange: (event: FileChangeEvent | FileChangeEvent[]) => void,
    options: WatchOptions,
  ): void {
    // Clear existing timer for this path
    const existingTimer = this.debounceTimers.get(event.path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(event.path);

      if (options.batch) {
        this.batchEvent(event, onChange, options);
      } else {
        onChange(event);
      }
    }, options.debounce);

    this.debounceTimers.set(event.path, timer);
  }

  /**
   * Batch multiple events
   */
  private batchEvent(
    event: FileChangeEvent,
    onChange: (event: FileChangeEvent | FileChangeEvent[]) => void,
    options: WatchOptions,
  ): void {
    // Add to batch
    this.batchedEvents.push(event);

    // Clear existing batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Set new batch timer
    this.batchTimer = setTimeout(() => {
      const events = [...this.batchedEvents];
      this.batchedEvents = [];
      this.batchTimer = undefined;

      if (events.length > 0) {
        onChange(events);
      }
    }, options.debounce ?? 100);
  }

  /**
   * Check if path matches pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    return new RegExp(regex).test(path);
  }

  /**
   * Wait for watcher to be ready
   */
  private waitForReady(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ready) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error("Watcher ready timeout"));
      }, timeout);

      this.watcher?.once("ready", () => {
        clearTimeout(timer);
        this.ready = true;
        resolve();
      });
    });
  }
}
