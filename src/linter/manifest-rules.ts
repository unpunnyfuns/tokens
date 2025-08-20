/**
 * Lint rules for UPFT manifests
 */

import type { UPFTResolverManifest } from "../manifest/upft-types.js";
import type { ManifestLintRule } from "./manifest-types.js";
import type { LintViolation } from "./token-types.js";

/**
 * Check if a modifier name matches a naming pattern
 */
function matchesNamingPattern(
  name: string,
  style: "camelCase" | "kebab-case",
): boolean {
  const pattern =
    style === "camelCase"
      ? /^[a-z][a-zA-Z0-9]*$/
      : /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

  return pattern.test(name);
}

/**
 * Get modifiers that don't match naming pattern
 */
function getNonConformingModifiers(
  manifest: UPFTResolverManifest,
  style: "camelCase" | "kebab-case",
): string[] {
  const modifierNames = manifest.modifiers
    ? Object.keys(manifest.modifiers)
    : [];
  return modifierNames.filter((name) => !matchesNamingPattern(name, style));
}

/**
 * Helper to collect file occurrences from sets
 */
function collectFilesFromSets(
  sets: UPFTResolverManifest["sets"],
  fileOccurrences: Map<string, string[]>,
): void {
  if (!sets) return;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    if (set?.values) {
      for (const file of set.values) {
        const paths = fileOccurrences.get(file) || [];
        paths.push(`sets[${i}].values`);
        fileOccurrences.set(file, paths);
      }
    }
  }
}

/**
 * Helper to collect file occurrences from modifiers
 */
function collectFilesFromModifiers(
  modifiers: UPFTResolverManifest["modifiers"],
  fileOccurrences: Map<string, string[]>,
): void {
  if (!modifiers) return;

  for (const [modKey, modifier] of Object.entries(modifiers)) {
    if (modifier.values) {
      for (const [valKey, files] of Object.entries(modifier.values)) {
        for (const file of files) {
          const paths = fileOccurrences.get(file) || [];
          paths.push(`modifiers.${modKey}.values.${valKey}`);
          fileOccurrences.set(file, paths);
        }
      }
    }
  }
}

/**
 * Helper to create duplicate file violations
 */
function createDuplicateViolations(
  fileOccurrences: Map<string, string[]>,
): LintViolation[] {
  const violations: LintViolation[] = [];

  for (const [file, paths] of fileOccurrences) {
    if (paths.length > 1) {
      violations.push({
        path: paths[0] || "unknown",
        rule: "no-duplicate-files",
        severity: "warn",
        message: `File "${file}" appears in ${paths.length} places: ${paths.join(", ")}`,
      });
    }
  }

  return violations;
}

/**
 * All manifest lint rules
 */
export const MANIFEST_RULES: Record<string, ManifestLintRule> = {
  // Structure rules
  "consistent-modifier-naming": {
    name: "consistent-modifier-naming",
    description: "Enforce consistent naming for modifiers",
    category: "structure",
    check: (manifest, options) => {
      const style = (options.style as string) || "any";
      if (style === "any" || !manifest.modifiers) return [];

      const namingStyle = style as "camelCase" | "kebab-case";
      const nonConforming = getNonConformingModifiers(manifest, namingStyle);

      return nonConforming.map((key) => ({
        path: `modifiers.${key}`,
        rule: "consistent-modifier-naming",
        severity: "warn" as const,
        message: `Modifier name should use ${style}`,
      }));
    },
  },

  "modifier-description-required": {
    name: "modifier-description-required",
    description: "Modifiers should have descriptions",
    category: "documentation",
    check: (manifest) => {
      const violations: LintViolation[] = [];
      if (!manifest.modifiers) return violations;

      for (const [key, modifier] of Object.entries(manifest.modifiers)) {
        if (!modifier.description) {
          violations.push({
            path: `modifiers.${key}`,
            rule: "modifier-description-required",
            severity: "warn",
            message: "Modifier should have a description",
          });
        }
      }

      return violations;
    },
  },

  "no-duplicate-files": {
    name: "no-duplicate-files",
    description: "Warn about duplicate file references",
    category: "best-practice",
    check: (manifest) => {
      const fileOccurrences = new Map<string, string[]>();

      collectFilesFromSets(manifest.sets, fileOccurrences);
      collectFilesFromModifiers(manifest.modifiers, fileOccurrences);

      return createDuplicateViolations(fileOccurrences);
    },
  },

  "prefer-default-values": {
    name: "prefer-default-values",
    description: "Suggest default values for modifiers",
    category: "best-practice",
    check: (manifest) => {
      const violations: LintViolation[] = [];
      if (!manifest.modifiers) return violations;

      const commonModifiers = ["theme", "mode", "density", "colorScheme"];

      for (const [key, modifier] of Object.entries(manifest.modifiers)) {
        if (commonModifiers.includes(key) && !modifier.default) {
          violations.push({
            path: `modifiers.${key}`,
            rule: "prefer-default-values",
            severity: "info",
            message: `Consider adding a default value for modifier "${key}"`,
          });
        }
      }

      return violations;
    },
  },

  "no-empty-sets": {
    name: "no-empty-sets",
    description: "Sets should contain files",
    category: "structure",
    check: (manifest) => {
      const violations: LintViolation[] = [];
      if (!manifest.sets) return violations;

      for (let i = 0; i < manifest.sets.length; i++) {
        const set = manifest.sets[i];
        if (!set?.values || set.values.length === 0) {
          violations.push({
            path: `sets[${i}]`,
            rule: "no-empty-sets",
            severity: "error",
            message: "Set should contain at least one file",
          });
        }
      }

      return violations;
    },
  },

  "no-unused-modifiers": {
    name: "no-unused-modifiers",
    description: "Find modifiers not used in generate",
    category: "best-practice",
    check: (manifest) => {
      const violations: LintViolation[] = [];
      if (!(manifest.modifiers && manifest.generate)) return violations;

      const usedModifiers = new Set<string>();
      for (const config of manifest.generate) {
        for (const key of Object.keys(config)) {
          if (key !== "output") {
            usedModifiers.add(key);
          }
        }
      }

      for (const key of Object.keys(manifest.modifiers)) {
        if (!usedModifiers.has(key)) {
          violations.push({
            path: `modifiers.${key}`,
            rule: "no-unused-modifiers",
            severity: "warn",
            message: `Modifier "${key}" is defined but not used in generate configurations`,
          });
        }
      }

      return violations;
    },
  },

  "consistent-output-paths": {
    name: "consistent-output-paths",
    description: "Check output path naming patterns",
    category: "structure",
    check: (manifest, options) => {
      const violations: LintViolation[] = [];
      if (!manifest.generate) return violations;

      const pattern = (options.pattern as string) || null;
      if (!pattern) return violations;

      const regex = new RegExp(pattern);

      for (let i = 0; i < manifest.generate.length; i++) {
        const config = manifest.generate[i];
        if (config?.output && !regex.test(config.output)) {
          violations.push({
            path: `generate[${i}].output`,
            rule: "consistent-output-paths",
            severity: "warn",
            message: `Output path should match pattern: ${pattern}`,
          });
        }
      }

      return violations;
    },
  },

  "reasonable-permutation-count": {
    name: "reasonable-permutation-count",
    description: "Warn about too many permutations",
    category: "performance",
    check: (manifest, options) => {
      const maxPermutations = (options.max as number) || 50;
      const violations: LintViolation[] = [];

      if (!manifest.modifiers) return violations;

      let permutationCount = 1;
      for (const modifier of Object.values(manifest.modifiers)) {
        const optionCount =
          ("oneOf" in modifier ? modifier.oneOf?.length : undefined) ||
          ("anyOf" in modifier ? modifier.anyOf?.length : undefined) ||
          Object.keys(modifier.values || {}).length;
        permutationCount *= optionCount || 1;
      }

      if (permutationCount > maxPermutations) {
        violations.push({
          path: "modifiers",
          rule: "reasonable-permutation-count",
          severity: "warn",
          message: `Manifest would generate ${permutationCount} permutations (max recommended: ${maxPermutations})`,
        });
      }

      return violations;
    },
  },
};
