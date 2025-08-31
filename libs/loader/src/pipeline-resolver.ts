/**
 * Pipeline resolver for token permutation generation and resolution
 * Works directly with ProjectAST structures
 */

import {
  type GroupNode,
  getToken,
  type ManifestAST,
  type ModifierAST,
  type ProjectAST,
  type TokenAST,
  type TokenNode,
} from "@upft/ast";
import type { TokenDocument } from "@upft/foundation";
import { isDangerousProperty } from "@upft/foundation";

export interface PipelineResolutionInput {
  [modifierName: string]: string | string[] | null;
}

export interface PipelineResolvedPermutation {
  id: string;
  input: PipelineResolutionInput;
  files: string[];
  tokens: TokenDocument;
  metadata: {
    totalTokens: number;
    resolvedTokens: number;
    crossFileReferences: number;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Generate all possible permutations from ProjectAST
 */
export async function generateAllPermutations(
  project: ProjectAST,
): Promise<PipelineResolvedPermutation[]> {
  const manifest = project.manifest;
  if (!manifest) {
    throw new Error("Project has no manifest");
  }

  // Generate all modifier combinations
  const modifierCombinations = generateModifierCombinations(manifest);

  const permutations: PipelineResolvedPermutation[] = [];

  for (const combination of modifierCombinations) {
    try {
      const permutation = await resolvePermutation(project, combination);
      permutations.push(permutation);
    } catch (error) {
      // Skip invalid permutations but log the error
      console.warn(
        `Skipped invalid permutation ${JSON.stringify(combination)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return permutations;
}

/**
 * Resolve a specific permutation with modifiers
 */
export async function resolvePermutation(
  project: ProjectAST,
  modifiers: PipelineResolutionInput = {},
): Promise<PipelineResolvedPermutation> {
  const manifest = project.manifest;
  if (!manifest) {
    throw new Error("Project has no manifest");
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate modifiers against manifest
  const validationResult = validateModifiers(manifest, modifiers);
  if (validationResult.errors.length > 0) {
    errors.push(...validationResult.errors);
  }

  // Generate permutation ID
  const permutationId = generatePermutationId(modifiers);

  // Collect relevant files based on modifiers
  const relevantFiles = collectRelevantFiles(manifest, modifiers);

  // Merge tokens from relevant files
  const mergedTokens = mergeTokensFromFiles(project, relevantFiles);

  // Resolve references within merged tokens
  const resolvedTokens = resolveTokenReferences(mergedTokens, project);

  // Convert AST back to TokenDocument
  const tokenDocument = astToTokenDocument(resolvedTokens);

  // Calculate statistics (remove unused for now)
  // const allTokens = findAllTokens(project);
  // const tokensWithRefs = findTokensWithReferences(project);

  return {
    id: permutationId,
    input: modifiers,
    files: relevantFiles,
    tokens: tokenDocument,
    metadata: {
      totalTokens: Object.keys(tokenDocument).length,
      resolvedTokens: resolvedTokens.filter((t) => t.resolved).length,
      crossFileReferences: project.crossFileReferences.size,
      errors,
      warnings,
    },
  };
}

/**
 * Generate all possible modifier combinations
 */
function generateModifierCombinations(
  manifest: ManifestAST,
): PipelineResolutionInput[] {
  const modifiers = Array.from(manifest.modifiers.values());

  if (modifiers.length === 0) {
    return [{}]; // Empty combination if no modifiers
  }

  return generateCombinationsRecursive(modifiers, 0, {});
}

/**
 * Recursively generate modifier combinations
 */
function generateCombinationsRecursive(
  modifiers: ModifierAST[],
  currentIndex: number,
  currentCombination: PipelineResolutionInput,
): PipelineResolutionInput[] {
  if (currentIndex >= modifiers.length) {
    return [{ ...currentCombination }];
  }

  const modifier = modifiers[currentIndex];
  if (!modifier) return [];

  if (modifier.constraintType === "oneOf") {
    return generateOneOfCombinations(
      modifiers,
      currentIndex,
      currentCombination,
      modifier,
    );
  }
  if (modifier.constraintType === "anyOf") {
    return generateAnyOfCombinations(
      modifiers,
      currentIndex,
      currentCombination,
      modifier,
    );
  }

  return [];
}

/**
 * Generate combinations for oneOf modifiers
 */
function generateOneOfCombinations(
  modifiers: ModifierAST[],
  currentIndex: number,
  currentCombination: PipelineResolutionInput,
  modifier: ModifierAST,
): PipelineResolutionInput[] {
  const combinations: PipelineResolutionInput[] = [];

  for (const option of modifier.options) {
    const newCombination = { ...currentCombination };
    if (modifier.name) {
      newCombination[modifier.name] = option;
    }
    combinations.push(
      ...generateCombinationsRecursive(
        modifiers,
        currentIndex + 1,
        newCombination,
      ),
    );
  }

  return combinations;
}

/**
 * Generate combinations for anyOf modifiers
 */
function generateAnyOfCombinations(
  modifiers: ModifierAST[],
  currentIndex: number,
  currentCombination: PipelineResolutionInput,
  modifier: ModifierAST,
): PipelineResolutionInput[] {
  const combinations: PipelineResolutionInput[] = [];
  const options = modifier.options;
  const powersetSize = 2 ** options.length;

  for (let i = 0; i < powersetSize; i++) {
    const subset = generateSubset(options, i);
    const newCombination = { ...currentCombination };
    if (modifier.name) {
      newCombination[modifier.name] = subset;
    }
    combinations.push(
      ...generateCombinationsRecursive(
        modifiers,
        currentIndex + 1,
        newCombination,
      ),
    );
  }

  return combinations;
}

/**
 * Generate subset based on bit mask
 */
function generateSubset(options: string[], mask: number): string[] {
  const subset: string[] = [];
  for (let j = 0; j < options.length; j++) {
    const option = options[j];
    if (mask & (1 << j) && option) {
      subset.push(option);
    }
  }
  return subset;
}

/**
 * Validate a single oneOf modifier
 */
function validateOneOfModifier(
  name: string,
  value: unknown,
  modifierDef: ModifierAST,
): string[] {
  const errors: string[] = [];

  if (typeof value !== "string") {
    errors.push(`Modifier ${name} requires a single string value`);
    return errors;
  }

  if (!modifierDef.options.includes(value)) {
    errors.push(
      `Invalid value "${value}" for modifier ${name}. Valid options: ${modifierDef.options.join(", ")}`,
    );
  }

  return errors;
}

/**
 * Validate a single anyOf modifier
 */
function validateAnyOfModifier(
  name: string,
  value: unknown,
  modifierDef: ModifierAST,
): string[] {
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    errors.push(`Modifier ${name} requires an array of values`);
    return errors;
  }

  for (const v of value) {
    if (!modifierDef.options.includes(v)) {
      errors.push(
        `Invalid value "${v}" for modifier ${name}. Valid options: ${modifierDef.options.join(", ")}`,
      );
    }
  }

  return errors;
}

/**
 * Validate modifiers against manifest constraints
 */
function validateModifiers(
  manifest: ManifestAST,
  modifiers: PipelineResolutionInput,
): { errors: string[] } {
  const errors: string[] = [];

  for (const [name, value] of Object.entries(modifiers)) {
    // Skip special fields that aren't modifiers
    if (name === "output") {
      continue;
    }

    const modifierDef = manifest.modifiers.get(name);
    if (!modifierDef) {
      errors.push(`Unknown modifier: ${name}`);
      continue;
    }

    if (modifierDef.constraintType === "oneOf") {
      errors.push(...validateOneOfModifier(name, value, modifierDef));
    } else if (modifierDef.constraintType === "anyOf") {
      errors.push(...validateAnyOfModifier(name, value, modifierDef));
    }
  }

  return { errors };
}

/**
 * Generate a unique ID for this permutation
 */
function generatePermutationId(modifiers: PipelineResolutionInput): string {
  const sortedEntries = Object.entries(modifiers).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const parts = sortedEntries.map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}-${value.sort().join(",")}`;
    }
    return `${key}-${value}`;
  });
  return parts.join("&") || "default";
}

/**
 * Add base token set files to the collection
 */
function addBaseTokenSetFiles(manifest: ManifestAST, files: Set<string>): void {
  for (const [, tokenSet] of manifest.sets) {
    if (tokenSet.files) {
      for (const file of tokenSet.files) {
        files.add(file);
      }
    }
  }
}

/**
 * Add files from a single modifier value
 */
function addModifierFiles(
  modifierDef: ModifierAST,
  value: string,
  files: Set<string>,
): void {
  const modifierFiles = modifierDef.values.get(value);
  if (modifierFiles) {
    for (const file of modifierFiles) {
      files.add(file);
    }
  }
}

/**
 * Process modifier values and add their files
 */
function processModifierValue(
  modifierDef: ModifierAST,
  value: string | string[],
  files: Set<string>,
): void {
  if (typeof value === "string") {
    addModifierFiles(modifierDef, value, files);
  } else if (Array.isArray(value)) {
    for (const v of value) {
      addModifierFiles(modifierDef, v, files);
    }
  }
}

/**
 * Collect files that are relevant for this permutation
 */
function collectRelevantFiles(
  manifest: ManifestAST,
  modifiers: PipelineResolutionInput,
): string[] {
  const files = new Set<string>();

  // Add base token set files
  addBaseTokenSetFiles(manifest, files);

  // Add modifier-specific files
  for (const [name, value] of Object.entries(modifiers)) {
    const modifierDef = manifest.modifiers.get(name);
    if (modifierDef && value !== null) {
      processModifierValue(modifierDef, value, files);
    }
  }

  return Array.from(files);
}

/**
 * Merge tokens from the relevant files in the project
 */
function mergeTokensFromFiles(
  project: ProjectAST,
  filePaths: string[],
): TokenNode[] {
  const allTokens: TokenNode[] = [];

  for (const filePath of filePaths) {
    // Try to find file by exact path first
    let file = project.files.get(filePath);

    // If not found, try to find by basename or partial match
    if (!file) {
      for (const [projectPath, projectFile] of project.files) {
        if (projectPath.endsWith(filePath) || projectPath.includes(filePath)) {
          file = projectFile;
          break;
        }
      }
    }

    if (file) {
      // Get all tokens recursively from the file and its groups
      const fileTokens = extractAllTokensRecursively(file);
      allTokens.push(...fileTokens);
    }
  }

  return allTokens;
}

/**
 * Recursively extract all tokens from a file AST node and its groups
 */
function extractAllTokensRecursively(
  node:
    | TokenAST
    | { tokens?: Map<string, TokenNode>; groups?: Map<string, GroupNode> },
): TokenNode[] {
  const tokens: TokenNode[] = [];

  // Add direct tokens from this node
  if (node.tokens) {
    const nodeTokens = Array.from(node.tokens.values()) as TokenNode[];
    tokens.push(...nodeTokens);
  }

  // Recursively add tokens from child groups
  if (node.groups) {
    for (const childGroup of node.groups.values()) {
      tokens.push(...extractAllTokensRecursively(childGroup));
    }
  }

  return tokens;
}

/**
 * Resolve references within the merged token set
 */
function resolveTokenReferences(
  tokens: TokenNode[],
  project: ProjectAST,
): TokenNode[] {
  // Create a map for fast token lookup
  const tokenMap = new Map<string, TokenNode>();
  for (const token of tokens) {
    tokenMap.set(token.path, token);
  }

  // Resolve references by actually substituting values
  const resolvedTokens = tokens.map((token) => {
    if (!token.references || token.references.length === 0) {
      return { ...token, resolved: true };
    }

    // Clone the token to avoid mutation
    const resolvedToken = { ...token };
    let allResolved = true;

    // If token has references, try to resolve them
    if (token.references.length === 1) {
      // Single reference - replace with referenced token's value
      const ref = token.references[0];
      if (ref) {
        // Strip curly braces from DTCG reference format: {token.path} -> token.path
        const cleanRef = ref.replace(/^\{|\}$/g, "");
        const referencedToken =
          tokenMap.get(cleanRef) || getToken(project, cleanRef);
        if (referencedToken?.typedValue) {
          resolvedToken.resolvedValue = referencedToken.typedValue;
          resolvedToken.resolved = true;
        } else {
          allResolved = false;
        }
      }
    } else {
      // Multiple references - more complex resolution needed
      // For now, just mark as unresolved
      allResolved = false;
    }

    resolvedToken.resolved = allResolved;
    return resolvedToken;
  });

  return resolvedTokens;
}

/**
 * Convert AST tokens back to TokenDocument format
 */
function astToTokenDocument(tokens: TokenNode[]): TokenDocument {
  const document: TokenDocument = {};

  for (const token of tokens) {
    // Reconstruct the nested path structure
    const pathParts = token.path.split(".");
    let current: Record<string, unknown> = document;

    // Navigate/create the path structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part && !isDangerousProperty(part)) {
        if (!current[part]) {
          current[part] = Object.create(null);
        }
        current = current[part] as Record<string, unknown>;
      }
    }

    // Set the final token value
    const finalKey = pathParts[pathParts.length - 1];
    if (finalKey && !isDangerousProperty(finalKey)) {
      current[finalKey] = token.resolvedValue ||
        token.typedValue || {
          $type: token.tokenType,
          $value: "unresolved",
        };
    }
  }

  return document;
}
