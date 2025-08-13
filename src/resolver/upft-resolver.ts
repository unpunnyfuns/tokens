/**
 * UPFT resolver implementation
 * Using JSON Schema terminology and explicit structure
 */

import { buildASTFromDocument } from "../ast/ast-builder.js";
import { resolveReferences } from "../ast/reference-resolver.js";
import type { ASTNode, GroupNode, TokenNode } from "../ast/types.js";
import { dtcgMerge } from "../core/dtcg-merge.js";
import { TokenFileReader } from "../filesystem/file-reader.js";
import type { TokenDocument } from "../types.js";
import { ManifestValidator } from "../validation/manifest-validator.js";
import type {
  GenerateSpec,
  InputValidation,
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "./upft-types.js";
import { isAnyOfModifier, isOneOfModifier } from "./upft-types.js";

export interface UPFTResolverOptions {
  fileReader?: TokenFileReader;
  basePath?: string;
  validateManifest?: boolean;
}

export class UPFTResolver {
  private fileReader: TokenFileReader;
  private manifestValidator: ManifestValidator;

  constructor(options: UPFTResolverOptions = {}) {
    this.fileReader =
      options.fileReader ??
      new TokenFileReader(
        options.basePath ? { basePath: options.basePath } : {},
      );
    this.manifestValidator = new ManifestValidator();
  }

  /**
   * Validate input against resolver modifiers
   */
  validateInput(
    manifest: UPFTResolverManifest,
    input: ResolutionInput,
  ): InputValidation {
    const errors: InputValidation["errors"] = [];

    // Validate known modifiers
    for (const [modifierName, modifierDef] of Object.entries(
      manifest.modifiers,
    )) {
      const inputValue = input[modifierName];

      if (isOneOfModifier(modifierDef)) {
        this.validateOneOfInput(modifierName, modifierDef, inputValue, errors);
      } else if (isAnyOfModifier(modifierDef)) {
        this.validateAnyOfInput(modifierName, modifierDef, inputValue, errors);
      }
    }

    // Check for unknown modifiers
    this.validateUnknownModifiers(manifest, input, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate oneOf modifier input
   */
  private validateOneOfInput(
    modifierName: string,
    modifierDef: { oneOf: string[] },
    inputValue: unknown,
    errors: InputValidation["errors"],
  ): void {
    // Use default if not specified
    if (inputValue === null || inputValue === undefined) {
      return;
    }

    if (typeof inputValue !== "string") {
      errors.push({
        modifier: modifierName,
        message: `oneOf modifier expects a single string value, got ${typeof inputValue}`,
        received: inputValue,
        expected: `one of: ${modifierDef.oneOf.join(", ")}`,
      });
      return;
    }

    if (!modifierDef.oneOf.includes(inputValue)) {
      errors.push({
        modifier: modifierName,
        message: `Invalid value for oneOf modifier`,
        received: inputValue,
        expected: `one of: ${modifierDef.oneOf.join(", ")}`,
      });
    }
  }

  /**
   * Validate anyOf modifier input
   */
  private validateAnyOfInput(
    modifierName: string,
    modifierDef: { anyOf: string[] },
    inputValue: unknown,
    errors: InputValidation["errors"],
  ): void {
    // Empty is valid for anyOf
    if (
      inputValue === null ||
      inputValue === undefined ||
      (Array.isArray(inputValue) && inputValue.length === 0)
    ) {
      return;
    }

    if (!Array.isArray(inputValue)) {
      errors.push({
        modifier: modifierName,
        message: `anyOf modifier expects an array of strings, got ${typeof inputValue}`,
        received: inputValue,
        expected: `array containing any of: ${modifierDef.anyOf.join(", ")}`,
      });
      return;
    }

    for (const value of inputValue) {
      if (typeof value !== "string") {
        errors.push({
          modifier: modifierName,
          message: `anyOf modifier array must contain only strings`,
          received: value,
          expected: "string",
        });
      } else if (!modifierDef.anyOf.includes(value)) {
        errors.push({
          modifier: modifierName,
          message: `Invalid value in anyOf modifier array`,
          received: value,
          expected: `one of: ${modifierDef.anyOf.join(", ")}`,
        });
      }
    }
  }

  /**
   * Check for unknown modifiers in input
   */
  private validateUnknownModifiers(
    manifest: UPFTResolverManifest,
    input: ResolutionInput,
    errors: InputValidation["errors"],
  ): void {
    for (const modifierName of Object.keys(input)) {
      if (!(modifierName in manifest.modifiers) && modifierName !== "output") {
        errors.push({
          modifier: modifierName,
          message: "Unknown modifier",
          received: modifierName,
          expected: `one of: ${Object.keys(manifest.modifiers).join(", ")}`,
        });
      }
    }
  }

  /**
   * Get all file paths for a given input
   */
  async getFilesForInput(
    manifest: UPFTResolverManifest,
    input: ResolutionInput,
  ): Promise<string[]> {
    const files: string[] = [];

    // Add base sets
    this.addBaseSetFiles(manifest, files);

    // Add modifier files
    this.addModifierFiles(manifest, input, files);

    return files;
  }

  /**
   * Add files from base sets
   */
  private addBaseSetFiles(
    manifest: UPFTResolverManifest,
    files: string[],
  ): void {
    for (const set of manifest.sets) {
      files.push(...set.values);
    }
  }

  /**
   * Add files from selected modifiers
   */
  private addModifierFiles(
    manifest: UPFTResolverManifest,
    input: ResolutionInput,
    files: string[],
  ): void {
    for (const [modifierName, modifierDef] of Object.entries(
      manifest.modifiers,
    )) {
      const inputValue = input[modifierName];

      if (isOneOfModifier(modifierDef)) {
        this.addOneOfFiles(modifierDef, inputValue as string, files);
      } else if (isAnyOfModifier(modifierDef)) {
        this.addAnyOfFiles(modifierDef, inputValue as string[], files);
      }
    }
  }

  /**
   * Add files for oneOf modifier
   */
  private addOneOfFiles(
    modifierDef: { oneOf: string[]; values: Record<string, string[]> },
    inputValue: string | undefined,
    files: string[],
  ): void {
    const selected = inputValue ?? modifierDef.oneOf[0];
    if (selected && modifierDef.values[selected]) {
      files.push(...modifierDef.values[selected]);
    }
  }

  /**
   * Add files for anyOf modifier
   */
  private addAnyOfFiles(
    modifierDef: { values: Record<string, string[]> },
    inputValue: string[] | undefined,
    files: string[],
  ): void {
    const selected = inputValue ?? [];
    for (const value of selected) {
      if (modifierDef.values[value]) {
        files.push(...modifierDef.values[value]);
      }
    }
  }

  /**
   * Resolve a single permutation with optional filtering
   */
  async resolvePermutation(
    manifest: unknown,
    input: ResolutionInput,
    spec?: GenerateSpec,
  ): Promise<ResolvedPermutation> {
    // Validate manifest structure
    if (!this.manifestValidator.isValidManifest(manifest)) {
      const validation = this.manifestValidator.validateManifest(manifest);
      throw new Error(`Invalid manifest:\n${validation.errors.join("\n")}`);
    }

    // Validate input
    const validation = this.validateInput(manifest, input);
    if (!validation.valid) {
      throw new Error(
        `Invalid input:\n${validation.errors
          .map((e) => `  - ${e.modifier}: ${e.message}`)
          .join("\n")}`,
      );
    }

    // Get all files to merge (with filtering if spec provided)
    const files = spec
      ? await this.getFilesForInputWithFiltering(manifest, input, spec)
      : await this.getFilesForInput(manifest, input);

    // Load and merge all files using DTCG-aware merge
    let tokens: TokenDocument = {};
    for (const file of files) {
      const tokenFile = await this.fileReader.readFile(file);
      tokens = dtcgMerge(tokens, tokenFile.tokens);
    }

    // Optionally resolve references
    let resolvedTokens: TokenDocument | undefined;
    if (manifest.options?.resolveReferences) {
      const ast = buildASTFromDocument(tokens);
      const { resolved, errors } = resolveReferences(ast);

      if (errors.length > 0) {
        throw new Error(
          `Reference resolution failed:\n${errors
            .map((e) => `  - ${e.path}: ${e.message}`)
            .join("\n")}`,
        );
      }

      resolvedTokens = this.astToTokens(resolved);
    }

    // Generate ID from input
    const id = this.generateId(input);

    const result: ResolvedPermutation = {
      id,
      input,
      files,
      tokens,
    };

    if (resolvedTokens) {
      result.resolvedTokens = resolvedTokens;
    }

    const output = (input as ResolutionInput & { output?: string }).output;
    if (output) {
      result.output = output;
    }

    return result;
  }

  /**
   * Expand wildcard in generate spec
   */
  expandGenerateSpec(
    manifest: UPFTResolverManifest,
    spec: GenerateSpec,
  ): ResolutionInput {
    const expanded: ResolutionInput = {};

    // Process spec entries
    this.processSpecEntries(manifest, spec, expanded);

    // Process includeModifiers with specific values
    this.processIncludeModifiersWithValues(spec, expanded);

    return expanded;
  }

  /**
   * Process spec entries and add to expanded result
   */
  private processSpecEntries(
    manifest: UPFTResolverManifest,
    spec: GenerateSpec,
    expanded: ResolutionInput,
  ): void {
    const skipKeys = new Set([
      "output",
      "includeSets",
      "excludeSets",
      "includeModifiers",
      "excludeModifiers",
    ]);

    for (const [modifierName, value] of Object.entries(spec)) {
      if (skipKeys.has(modifierName)) continue;

      const modifierDef = manifest.modifiers[modifierName];
      if (!modifierDef) continue;

      if (value === "*" && isAnyOfModifier(modifierDef)) {
        expanded[modifierName] = modifierDef.anyOf;
      } else {
        expanded[modifierName] = value;
      }
    }
  }

  /**
   * Process includeModifiers with specific values
   */
  private processIncludeModifiersWithValues(
    spec: GenerateSpec,
    expanded: ResolutionInput,
  ): void {
    if (!spec.includeModifiers) return;

    for (const includeSpec of spec.includeModifiers) {
      if (includeSpec.includes(":")) {
        const [modifierName, specificValue] = includeSpec.split(":");
        if (modifierName && specificValue) {
          expanded[modifierName] = specificValue;
        }
      }
    }
  }

  /**
   * Expand generate spec to handle filtering and multi-file generation
   */
  expandGenerateSpecWithFiltering(
    manifest: UPFTResolverManifest,
    spec: GenerateSpec,
  ): Array<{ spec: GenerateSpec; output: string }> {
    // Check if this spec requires multi-file generation
    const expandingModifiers = this.getExpandingModifiers(manifest, spec);

    if (expandingModifiers.length === 0) {
      // No expansion needed, return single spec
      return [
        {
          spec: this.applyFiltering(manifest, spec),
          output: this.generateOutputName(spec, {}),
        },
      ];
    }

    // Generate cartesian product of all expanding modifiers
    const combinations = this.generateModifierCombinations(
      manifest,
      expandingModifiers,
    );

    return combinations.map((combination) => {
      const expandedSpec = this.createExpandedSpec(spec, combination);
      const filteredSpec = this.applyFiltering(manifest, expandedSpec);
      const output = this.generateOutputName(spec, combination);

      return { spec: filteredSpec, output };
    });
  }

  /**
   * Get modifiers that need expansion (includeModifiers without specific values)
   */
  private getExpandingModifiers(
    manifest: UPFTResolverManifest,
    spec: GenerateSpec,
  ): string[] {
    if (!spec.includeModifiers) return [];

    return spec.includeModifiers.filter((modSpec) => {
      // If it contains ":", it's specific and doesn't need expansion
      if (modSpec.includes(":")) return false;

      // If a specific value is already provided in the spec, don't expand
      if (spec[modSpec] && typeof spec[modSpec] === "string") return false;

      // Check if this modifier exists and is oneOf (needs expansion)
      const modifierDef = manifest.modifiers[modSpec];
      return modifierDef && "oneOf" in modifierDef;
    });
  }

  /**
   * Generate all combinations of expanding modifier values
   */
  private generateModifierCombinations(
    manifest: UPFTResolverManifest,
    expandingModifiers: string[],
  ): Array<Record<string, string>> {
    if (expandingModifiers.length === 0) return [{}];

    const [first, ...rest] = expandingModifiers;
    if (!first) return [{}];

    const firstModifier = manifest.modifiers[first];

    if (!(firstModifier && "oneOf" in firstModifier)) return [{}];

    const restCombinations = this.generateModifierCombinations(manifest, rest);
    const combinations: Array<Record<string, string>> = [];

    for (const value of firstModifier.oneOf) {
      for (const restCombination of restCombinations) {
        combinations.push({ [first]: value, ...restCombination });
      }
    }

    return combinations;
  }

  /**
   * Create expanded spec with specific modifier values
   */
  private createExpandedSpec(
    originalSpec: GenerateSpec,
    combination: Record<string, string>,
  ): GenerateSpec {
    const expanded = { ...originalSpec };

    // Add specific modifier values from combination
    for (const [modifier, value] of Object.entries(combination)) {
      expanded[modifier] = value;
    }

    return expanded;
  }

  /**
   * Apply filtering to spec by modifying which sets/modifiers are included
   */
  private applyFiltering(
    _manifest: UPFTResolverManifest,
    spec: GenerateSpec,
  ): GenerateSpec {
    // For now, filtering is handled by creating a custom file collection method
    // The actual filtering happens in getFilesForInputWithFiltering
    return spec;
  }

  /**
   * Get files for input with filtering applied
   */
  async getFilesForInputWithFiltering(
    manifest: UPFTResolverManifest,
    input: ResolutionInput,
    spec: GenerateSpec,
  ): Promise<string[]> {
    const files: string[] = [];

    // Add filtered base sets
    this.addFilteredBaseSetFiles(manifest, spec, files);

    // Add filtered modifier files
    this.addFilteredModifierFiles(manifest, input, spec, files);

    return files;
  }

  /**
   * Add files from base sets with filtering
   */
  private addFilteredBaseSetFiles(
    manifest: UPFTResolverManifest,
    spec: GenerateSpec,
    files: string[],
  ): void {
    for (const set of manifest.sets) {
      const setName = set.name;

      // Skip if no name (can't filter unnamed sets)
      if (!setName) {
        // If no filtering specified, include unnamed sets
        if (!(spec.includeSets || spec.excludeSets)) {
          files.push(...set.values);
        }
        continue;
      }

      // Apply include/exclude logic
      const shouldInclude = this.shouldIncludeSet(setName, spec);
      if (shouldInclude) {
        files.push(...set.values);
      }
    }
  }

  /**
   * Add files from modifiers with filtering
   */
  private addFilteredModifierFiles(
    manifest: UPFTResolverManifest,
    input: ResolutionInput,
    spec: GenerateSpec,
    files: string[],
  ): void {
    for (const [modifierName, modifierDef] of Object.entries(
      manifest.modifiers,
    )) {
      // Check if this modifier should be included
      const shouldInclude = this.shouldIncludeModifier(modifierName, spec);
      if (!shouldInclude) continue;

      const inputValue = input[modifierName];

      if (isOneOfModifier(modifierDef)) {
        this.addOneOfFiles(modifierDef, inputValue as string, files);
      } else if (isAnyOfModifier(modifierDef)) {
        this.addAnyOfFiles(
          modifierDef,
          inputValue as string[] | undefined,
          files,
        );
      }
    }
  }

  /**
   * Check if a set should be included based on filtering rules
   */
  private shouldIncludeSet(setName: string, spec: GenerateSpec): boolean {
    const { includeSets, excludeSets } = spec;

    // If exclude list specified and set is in it, exclude
    if (excludeSets?.includes(setName) || excludeSets?.includes("*")) {
      return false;
    }

    // If include list specified, only include if set is in it
    if (includeSets) {
      return includeSets.includes(setName) || includeSets.includes("*");
    }

    // Default: include if not explicitly excluded
    return true;
  }

  /**
   * Check if a modifier should be included based on filtering rules
   */
  private shouldIncludeModifier(
    modifierName: string,
    spec: GenerateSpec,
  ): boolean {
    const { includeModifiers, excludeModifiers } = spec;

    // Check exclude rules first (they take precedence)
    if (excludeModifiers) {
      for (const excludeSpec of excludeModifiers) {
        const [excludeModifier] = excludeSpec.split(":");
        if (excludeModifier === modifierName || excludeSpec === "*") {
          return false;
        }
      }
    }

    // Check include rules
    if (includeModifiers) {
      for (const includeSpec of includeModifiers) {
        const [includeModifier] = includeSpec.split(":");
        if (includeModifier === modifierName || includeSpec === "*") {
          return true;
        }
      }
      return false; // If include list specified but modifier not in it
    }

    // Default: include if not explicitly excluded
    return true;
  }

  /**
   * Generate output filename based on modifier combination
   */
  private generateOutputName(
    spec: GenerateSpec,
    combination: Record<string, string>,
  ): string {
    const baseName = spec.output || "output";

    // Remove extension and add modifier suffixes
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, "");

    if (Object.keys(combination).length === 0) {
      return `${nameWithoutExt}.json`;
    }

    const suffixes = Object.values(combination).join("-");
    return `${nameWithoutExt}-${suffixes}.json`;
  }

  /**
   * Generate all permutations based on manifest.generate
   */
  async generateAll(manifest: unknown): Promise<ResolvedPermutation[]> {
    // Validate manifest structure
    if (!this.manifestValidator.isValidManifest(manifest)) {
      const validation = this.manifestValidator.validateManifest(manifest);
      throw new Error(`Invalid manifest:\n${validation.errors.join("\n")}`);
    }

    const results: ResolvedPermutation[] = [];

    if (manifest.generate) {
      // Generate only specified permutations
      for (const spec of manifest.generate) {
        const expandedSpecs = this.expandGenerateSpecWithFiltering(
          manifest,
          spec,
        );
        for (const expandedSpec of expandedSpecs) {
          const input = this.expandGenerateSpec(manifest, expandedSpec.spec);
          const result = await this.resolvePermutation(
            manifest,
            input,
            expandedSpec.spec,
          );
          if (expandedSpec.output) {
            result.output = expandedSpec.output;
          }
          results.push(result);
        }
      }
    } else {
      // Generate all possible permutations (cartesian product)
      const permutations = this.getAllPermutations(manifest);
      for (const input of permutations) {
        results.push(await this.resolvePermutation(manifest, input));
      }
    }

    return results;
  }

  /**
   * Get all possible permutations (for when generate is not specified)
   */
  private getAllPermutations(
    manifest: UPFTResolverManifest,
  ): ResolutionInput[] {
    const modifierOptions: Array<[string, string[] | string[][]]> = [];

    for (const [name, def] of Object.entries(manifest.modifiers)) {
      if (isOneOfModifier(def)) {
        // Each option is a single choice
        modifierOptions.push([name, def.oneOf]);
      } else if (isAnyOfModifier(def)) {
        // Generate all subsets (power set)
        const subsets = this.getPowerSet(def.anyOf);
        modifierOptions.push([name, subsets]);
      }
    }

    return this.cartesianProduct(modifierOptions);
  }

  /**
   * Get power set (all subsets) of an array
   */
  private getPowerSet(arr: string[]): string[][] {
    const result: string[][] = [[]];
    for (const item of arr) {
      const newSubsets = result.map((subset) => [...subset, item]);
      result.push(...newSubsets);
    }
    return result;
  }

  /**
   * Calculate cartesian product
   */
  private cartesianProduct(
    options: Array<[string, string[] | string[][]]>,
  ): ResolutionInput[] {
    if (options.length === 0) return [{}];

    const [first, ...rest] = options;
    if (!first) return [{}];
    const [name, values] = first;
    const restProduct = this.cartesianProduct(rest);

    const result: ResolutionInput[] = [];
    for (const value of values) {
      for (const restPerm of restProduct) {
        result.push({
          [name]: value,
          ...restPerm,
        });
      }
    }

    return result;
  }

  /**
   * Generate unique ID for a permutation
   */
  private generateId(input: ResolutionInput): string {
    const parts: string[] = [];

    for (const [name, value] of Object.entries(input)) {
      if (name === "output") continue;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          parts.push(`${name}-${value.join("+")}`);
        }
      } else if (value) {
        parts.push(`${name}-${value}`);
      }
    }

    return parts.join("_") || "default";
  }

  /**
   * Convert AST to token document
   */
  private astToTokens(ast: ASTNode): TokenDocument {
    const tokens: TokenDocument = {};

    // If the root node is a group, start with its children to avoid wrapping in 'root'
    if (ast.type === "group" && ast.name === "root") {
      const groupNode = ast as GroupNode;
      for (const [_name, child] of groupNode.children) {
        this.traverseASTNode(child, tokens, []);
      }
    } else {
      this.traverseASTNode(ast, tokens, []);
    }

    return tokens;
  }

  /**
   * Traverse AST node and build tokens
   */
  private traverseASTNode(
    node: ASTNode,
    tokens: TokenDocument,
    path: string[],
  ): void {
    if (node.type === "token") {
      this.setTokenAtPath(node, tokens, path);
    } else if (node.type === "group") {
      this.processGroupChildren(node, tokens, path);
    }
  }

  /**
   * Set token at the specified path
   */
  private setTokenAtPath(
    node: ASTNode,
    tokens: TokenDocument,
    path: string[],
  ): void {
    const fullPath = [...path, node.name as string];
    const current = this.navigateToParent(tokens, fullPath);

    if (fullPath.length > 0) {
      const tokenNode = node as TokenNode;
      const token: Record<string, unknown> = {
        $value: tokenNode.resolvedValue ?? tokenNode.value,
      };

      if (tokenNode.tokenType) {
        token.$type = tokenNode.tokenType;
      }

      const lastKey = fullPath[fullPath.length - 1];
      if (lastKey) {
        current[lastKey] = token;
      }
    }
  }

  /**
   * Navigate to parent object in token tree
   */
  private navigateToParent(
    tokens: TokenDocument,
    fullPath: string[],
  ): TokenDocument {
    let current = tokens;

    for (let i = 0; i < fullPath.length - 1; i++) {
      const key = fullPath[i];
      if (!key) continue;

      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as TokenDocument;
    }

    return current;
  }

  /**
   * Process children of a group node
   */
  private processGroupChildren(
    node: ASTNode,
    tokens: TokenDocument,
    path: string[],
  ): void {
    const groupNode = node as GroupNode;
    const currentPath = node.name ? [...path, node.name] : path;
    for (const [_name, child] of groupNode.children) {
      this.traverseASTNode(child, tokens, currentPath);
    }
  }
}
