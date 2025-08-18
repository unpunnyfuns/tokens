/**
 * Schema utility functions
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Schema location options
 */
export interface SchemaLocation {
  type: "local" | "package" | "url";
  path: string;
}

// Cache for loaded schemas
const schemaCache = new Map<string, unknown>();

/**
 * Load a schema from a local file
 */
function loadLocalSchema(path: string): unknown | null {
  try {
    // Try relative to schemas directory
    const schemaPath = join(__dirname, "../schemas", path);
    if (existsSync(schemaPath)) {
      const content = readFileSync(schemaPath, "utf-8");
      return JSON.parse(content);
    }

    // Try absolute path
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Load a schema from a package
 */
function loadPackageSchema(path: string): unknown | null {
  try {
    // Try to resolve from node_modules
    const resolved = require.resolve(path);
    const content = readFileSync(resolved, "utf-8");
    return JSON.parse(content);
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Load a schema from a URL
 */
async function loadUrlSchema(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Load a schema from various sources
 */
export async function loadSchema(
  schemaId: string,
  locations: SchemaLocation[] = [{ type: "local", path: schemaId }],
): Promise<unknown | null> {
  // Check cache first
  const cached = schemaCache.get(schemaId);
  if (cached) return cached;

  // Try each location
  for (const location of locations) {
    let schema: unknown | null = null;

    switch (location.type) {
      case "local":
        schema = loadLocalSchema(location.path);
        break;
      case "package":
        schema = loadPackageSchema(location.path);
        break;
      case "url":
        schema = await loadUrlSchema(location.path);
        break;
    }

    if (schema) {
      schemaCache.set(schemaId, schema);
      return schema;
    }
  }

  return null;
}

/**
 * Clear the schema cache
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Get all cached schemas
 */
export function getCachedSchemas(): Map<string, unknown> {
  return new Map(schemaCache);
}

/**
 * Preload common schemas
 */
export async function preloadSchemas(
  schemaIds: string[],
): Promise<Map<string, unknown>> {
  const loaded = new Map<string, unknown>();

  for (const id of schemaIds) {
    const schema = await loadSchema(id);
    if (schema) {
      loaded.set(id, schema);
    }
  }

  return loaded;
}

/**
 * Common DTCG schema IDs
 */
export const DTCG_SCHEMAS = {
  BASE: "tokens/base.schema.json",
  FULL: "tokens/full.schema.json",
  COLOR: "tokens/types/color.schema.json",
  DIMENSION: "tokens/types/dimension.schema.json",
  TYPOGRAPHY: "tokens/types/typography.schema.json",
  SHADOW: "tokens/types/shadow.schema.json",
  BORDER: "tokens/types/border.schema.json",
  GRADIENT: "tokens/types/gradient.schema.json",
  TRANSITION: "tokens/types/transition.schema.json",
  FONT_FAMILY: "tokens/types/font-family.schema.json",
  FONT_WEIGHT: "tokens/types/font-weight.schema.json",
  DURATION: "tokens/types/duration.schema.json",
  CUBIC_BEZIER: "tokens/types/cubic-bezier.schema.json",
  NUMBER: "tokens/types/number.schema.json",
  STROKE_STYLE: "tokens/types/stroke-style.schema.json",
} as const;

/**
 * Get schema ID from $type value
 */
export function getSchemaForType(type: string): string | null {
  const typeMap: Record<string, string> = {
    color: DTCG_SCHEMAS.COLOR,
    dimension: DTCG_SCHEMAS.DIMENSION,
    typography: DTCG_SCHEMAS.TYPOGRAPHY,
    shadow: DTCG_SCHEMAS.SHADOW,
    border: DTCG_SCHEMAS.BORDER,
    gradient: DTCG_SCHEMAS.GRADIENT,
    transition: DTCG_SCHEMAS.TRANSITION,
    fontFamily: DTCG_SCHEMAS.FONT_FAMILY,
    fontWeight: DTCG_SCHEMAS.FONT_WEIGHT,
    duration: DTCG_SCHEMAS.DURATION,
    cubicBezier: DTCG_SCHEMAS.CUBIC_BEZIER,
    number: DTCG_SCHEMAS.NUMBER,
    strokeStyle: DTCG_SCHEMAS.STROKE_STYLE,
  };

  return typeMap[type] || null;
}
