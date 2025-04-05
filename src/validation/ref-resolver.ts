import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";

type TokenValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

// Resolve all $ref references in a token object
export async function resolveRefs(
  tokens: Record<string, unknown>,
  basePath = "",
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = {};
  const resolving = new Set<string>(); // Track circular references

  async function resolveValue(
    value: unknown,
    currentPath: string[] = [],
  ): Promise<unknown> {
    // If it's a $ref, resolve it
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const valueObj = value as Record<string, unknown>;
      if (valueObj.$ref) {
        return await resolveRef(
          valueObj.$ref as string,
          tokens,
          basePath,
          currentPath,
          resolving,
        );
      }
    }

    // If it's an object, recursively resolve its properties
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const resolvedObj: Record<string, unknown> = {};
      const valueObj = value as Record<string, unknown>;
      for (const key in valueObj) {
        if (Object.hasOwn(valueObj, key)) {
          resolvedObj[key] = await resolveValue(valueObj[key], currentPath);
        }
      }
      return resolvedObj;
    }

    // If it's an array, resolve each element
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => resolveValue(item, currentPath)));
    }

    // Otherwise, return as-is
    return value;
  }

  // Recursively resolve all tokens
  async function resolveTokenNode(
    node: Record<string, unknown>,
    path: string[] = [],
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const key in node) {
      if (Object.hasOwn(node, key)) {
        const value = node[key];
        const currentPath = [...path, key];

        // Check if this is a token (has $value or $ref)
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const valueObj = value as Record<string, unknown>;
          if (valueObj.$ref) {
            // Resolve the reference
            const refPath = currentPath.join(".");
            if (resolving.has(refPath)) {
              throw new Error(`Circular reference detected: ${refPath}`);
            }
            resolving.add(refPath);

            try {
              const resolved = await resolveRef(
                valueObj.$ref as string,
                tokens,
                basePath,
                currentPath,
                resolving,
              );
              result[key] = {
                ...valueObj,
                $value: resolved,
                $ref: undefined,
              };
            } finally {
              resolving.delete(refPath);
            }
          } else if (valueObj.$value !== undefined) {
            // Resolve any refs within the value
            result[key] = {
              ...valueObj,
              $value: await resolveValue(valueObj.$value, currentPath),
            };
          } else if (!key.startsWith("$")) {
            // It's a node, recurse
            result[key] = await resolveTokenNode(valueObj, currentPath);
          } else {
            // It's a property, keep as-is
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  return await resolveTokenNode(tokens);
}

// Resolve a single $ref
async function resolveRef(
  ref: string,
  tokens: Record<string, unknown>,
  basePath: string,
  currentPath: string[],
  resolving: Set<string>,
): Promise<unknown> {
  // Check for circular reference
  const refId = `${currentPath.join(".")}->${ref}`;
  if (resolving.has(refId)) {
    throw new Error(`Circular reference detected: ${refId}`);
  }
  resolving.add(refId);

  try {
    // Parse the reference
    if (ref.startsWith("#/")) {
      // Internal reference
      const path = ref.substring(2).split("/");
      return getValueByPath(tokens, path);
    }
    if (ref.includes("#")) {
      // External file reference
      const [filePath, fragmentPath] = ref.split("#");
      const fullPath = join(basePath, filePath);

      // Load the external file
      const content = await fs.readFile(fullPath, "utf8");
      const externalTokens = JSON.parse(content);

      if (fragmentPath?.startsWith("/")) {
        // Get specific path in external file
        const path = fragmentPath.substring(1).split("/");
        return getValueByPath(externalTokens, path);
      }
      // Return the whole file
      return externalTokens;
    }
    throw new Error(`Invalid $ref format: ${ref}`);
  } finally {
    resolving.delete(refId);
  }
}

// Get value from object by path array
function getValueByPath(obj: unknown, path: string[]): unknown {
  let current = obj;

  for (const segment of path) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      const currentObj = current as Record<string, unknown>;
      if (segment in currentObj) {
        current = currentObj[segment];
      } else {
        throw new Error(`Reference path not found: #/${path.join("/")}`);
      }
    } else {
      throw new Error(`Reference path not found: #/${path.join("/")}`);
    }
  }

  // If the resolved value is a token, return its $value
  if (current && typeof current === "object" && !Array.isArray(current)) {
    const currentObj = current as Record<string, unknown>;
    if (currentObj.$value !== undefined) {
      return currentObj.$value;
    }
    if (currentObj.$ref !== undefined) {
      // If it's another reference, we need to resolve it recursively
      // This would need the full context, so for now throw an error
      throw new Error(`Cannot resolve nested $ref: ${currentObj.$ref}`);
    }
  }

  return current;
}

// Validate that all $refs in tokens can be resolved
export async function validateRefs(
  tokens: Record<string, unknown>,
  basePath = "",
): Promise<Array<{ path: string; ref: string; error: string }>> {
  const errors: Array<{ path: string; ref: string; error: string }> = [];

  async function checkRefs(node: unknown, path: string[] = []): Promise<void> {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return;
    }

    const nodeObj = node as Record<string, unknown>;
    for (const key in nodeObj) {
      if (Object.hasOwn(nodeObj, key)) {
        const value = nodeObj[key];
        const currentPath = [...path, key];

        if (value && typeof value === "object" && !Array.isArray(value)) {
          const valueObj = value as Record<string, unknown>;
          if (valueObj.$ref) {
            try {
              await resolveRef(
                valueObj.$ref as string,
                tokens,
                basePath,
                currentPath,
                new Set(),
              );
            } catch (error) {
              const err = error as Error;
              errors.push({
                path: currentPath.join("."),
                ref: valueObj.$ref as string,
                error: err.message,
              });
            }
          } else if (!key.startsWith("$")) {
            // Recurse into nodes
            await checkRefs(value, currentPath);
          }
        }
      }
    }
  }

  await checkRefs(tokens);
  return errors;
}
