/**
 * Token linter for style and best practice rules
 * Separate from validation - these are opinions, not requirements
 */

import type { GroupNode, TokenNode } from "@upft/ast";
import { createAST, visitGroups, visitTokens } from "@upft/ast";
import type { Token, TokenDocument, TokenOrGroup } from "@upft/foundation";
import { loadConfig, parseRuleSetting, resolveConfig } from "./config.js";
import { RULES } from "./token-rules.js";
import type {
  LinterOptions,
  LintResult,
  LintRule,
  LintViolation,
} from "./token-types.js";

/**
 * Token linter for checking style and best practices
 */
export class TokenLinter {
  private rules: Map<
    string,
    { rule: LintRule; severity: string; options: Record<string, unknown> }
  >;
  private ignorePatterns: string[];

  constructor(options: LinterOptions = {}) {
    this.rules = new Map();

    // Load configuration
    const config = loadConfig(options.configPath);
    const lintConfig = config.lint || {};
    const ruleConfig = resolveConfig(lintConfig);
    this.ignorePatterns = lintConfig.ignore || [];

    // Process rules from config
    for (const [ruleName, setting] of Object.entries(ruleConfig)) {
      const { severity, options: ruleOptions } = parseRuleSetting(setting);

      if (severity === "off") continue;

      const rule = RULES[ruleName];
      if (rule) {
        this.rules.set(ruleName, {
          rule,
          severity,
          options: ruleOptions,
        });
      }
    }
  }

  /**
   * Lint a token document
   */
  lint(document: TokenDocument): LintResult {
    const violations: LintViolation[] = [];
    const allTokens = new Map<string, Token>();
    const allGroups = new Map<string, TokenOrGroup>();
    const tokensByType = new Map<string, Map<string, Token>>();
    const valueOccurrences = new Map<string, string[]>();

    // Create AST for traversal
    const ast = createAST(document);

    // First pass: collect all tokens for document-level analysis
    visitTokens(ast, (tokenNode: TokenNode) => {
      // Check ignore patterns
      if (this.shouldIgnore(tokenNode.path)) {
        return true;
      }

      const token: Token = {
        $value:
          tokenNode.typedValue?.$value || tokenNode.resolvedValue?.$value || "",
        ...(tokenNode.tokenType ? { $type: tokenNode.tokenType } : {}),
      } as Token;
      allTokens.set(tokenNode.path, token);

      // Track by type
      const type = tokenNode.tokenType || "unknown";
      if (!tokensByType.has(type)) {
        tokensByType.set(type, new Map());
      }
      tokensByType.get(type)?.set(tokenNode.path, token);

      // Track value occurrences
      const valueStr = JSON.stringify(
        tokenNode.typedValue?.$value || tokenNode.resolvedValue?.$value,
      );
      if (!valueOccurrences.has(valueStr)) {
        valueOccurrences.set(valueStr, []);
      }
      valueOccurrences.get(valueStr)?.push(tokenNode.path);
      return true;
    });

    // Collect groups
    visitGroups(ast, (groupNode: GroupNode) => {
      if (this.shouldIgnore(groupNode.path)) {
        return true;
      }
      // Convert group node back to TokenOrGroup format for compatibility
      const group: TokenOrGroup = {};
      if (groupNode.metadata?.$type) {
        group.$type = groupNode.metadata.$type as string;
      }
      allGroups.set(groupNode.path, group);
      return true;
    });

    // Check token-level rules
    for (const [path, token] of allTokens) {
      this.lintToken(token, path, violations);
    }

    // Check group-level rules
    for (const [path, group] of allGroups) {
      this.lintGroup(group, path, violations, tokensByType);
    }

    // Check document-level rules
    this.lintDocument(allTokens, valueOccurrences, violations);

    // Calculate summary
    const summary = {
      errors: violations.filter((v) => v.severity === "error").length,
      warnings: violations.filter((v) => v.severity === "warn").length,
      info: violations.filter((v) => v.severity === "info").length,
    };

    return { violations, summary };
  }

  /**
   * Check if path should be ignored
   */
  private shouldIgnore(path: string): boolean {
    for (const pattern of this.ignorePatterns) {
      // Simple glob matching (supports * and **)
      const regex = pattern
        .replace(/\*\*/g, "___DOUBLE_STAR___")
        .replace(/\*/g, "[^.]*")
        .replace(/___DOUBLE_STAR___/g, ".*");

      if (new RegExp(`^${regex}$`).test(path)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Lint a single token
   */
  private lintToken(token: Token, path: string, violations: LintViolation[]) {
    for (const [ruleName, config] of this.rules) {
      // Skip group-level and document-level rules
      if (
        [
          "group-description-required",
          "no-mixed-token-types",
          "unused-tokens",
          "duplicate-values",
          "prefer-references",
        ].includes(ruleName)
      ) {
        continue;
      }

      const violation = config.rule.check(token, path, config.options);

      if (violation) {
        violation.severity = config.severity as "error" | "warn" | "info";
        violations.push(violation);
      }
    }
  }

  /**
   * Lint a group
   */
  private lintGroup(
    group: TokenOrGroup,
    path: string,
    violations: LintViolation[],
    tokensByType: Map<string, Map<string, Token>>,
  ) {
    this.checkGroupDescription(group, path, violations);
    this.checkMixedTokenTypes(path, violations, tokensByType);
  }

  /**
   * Check group description rule
   */
  private checkGroupDescription(
    group: TokenOrGroup,
    path: string,
    violations: LintViolation[],
  ) {
    const rule = this.rules.get("group-description-required");
    if (rule && !group.$description) {
      violations.push({
        path,
        rule: "group-description-required",
        severity: rule.severity as "error" | "warn" | "info",
        message: "Group should have a $description",
      });
    }
  }

  /**
   * Check mixed token types rule
   */
  private checkMixedTokenTypes(
    path: string,
    violations: LintViolation[],
    tokensByType: Map<string, Map<string, Token>>,
  ) {
    const rule = this.rules.get("no-mixed-token-types");
    if (!rule) return;

    const types = this.getDirectChildTypes(path, tokensByType);
    if (this.hasUnrelatedTypes(types)) {
      violations.push({
        path,
        rule: "no-mixed-token-types",
        severity: rule.severity as "error" | "warn" | "info",
        message: `Group contains mixed token types: ${Array.from(types).join(", ")}`,
      });
    }
  }

  /**
   * Get direct child types of a group
   */
  private getDirectChildTypes(
    path: string,
    tokensByType: Map<string, Map<string, Token>>,
  ): Set<string> {
    const types = new Set<string>();
    const groupPrefix = path ? `${path}.` : "";

    for (const [type, tokens] of tokensByType) {
      for (const tokenPath of tokens.keys()) {
        if (this.isDirectChild(tokenPath, groupPrefix)) {
          types.add(type);
        }
      }
    }

    return types;
  }

  /**
   * Check if token is direct child of group
   */
  private isDirectChild(tokenPath: string, groupPrefix: string): boolean {
    return (
      tokenPath.startsWith(groupPrefix) &&
      tokenPath.substring(groupPrefix.length).indexOf(".") === -1
    );
  }

  /**
   * Check if types are unrelated
   */
  private hasUnrelatedTypes(types: Set<string>): boolean {
    if (types.size <= 1) return false;

    const relatedTypes = [
      new Set(["dimension", "number"]),
      new Set(["color", "gradient"]),
    ];

    const typeArray = Array.from(types);
    return !relatedTypes.some((related) =>
      typeArray.every((t) => related.has(t)),
    );
  }

  /**
   * Lint document-level rules
   */
  private lintDocument(
    allTokens: Map<string, Token>,
    valueOccurrences: Map<string, string[]>,
    violations: LintViolation[],
  ) {
    this.checkDuplicateValues(valueOccurrences, violations);
    this.checkPreferReferences(valueOccurrences, violations);
    this.checkUnusedTokens(allTokens, violations);
  }

  /**
   * Check for duplicate values
   */
  private checkDuplicateValues(
    valueOccurrences: Map<string, string[]>,
    violations: LintViolation[],
  ) {
    const rule = this.rules.get("duplicate-values");
    if (!rule) return;

    for (const [value, paths] of valueOccurrences) {
      if (this.isSignificantDuplicate(value, paths)) {
        violations.push({
          path: paths[0] || "",
          rule: "duplicate-values",
          severity: rule.severity as "error" | "warn" | "info",
          message: `Value appears in ${paths.length} tokens: ${paths.join(", ")}`,
        });
      }
    }
  }

  /**
   * Check for values that should be references
   */
  private checkPreferReferences(
    valueOccurrences: Map<string, string[]>,
    violations: LintViolation[],
  ) {
    const rule = this.rules.get("prefer-references");
    if (!rule) return;

    const threshold = (rule.options.threshold as number) || 3;
    for (const [value, paths] of valueOccurrences) {
      if (this.shouldUseReference(value, paths, threshold)) {
        violations.push({
          path: paths[0] || "",
          rule: "prefer-references",
          severity: rule.severity as "error" | "warn" | "info",
          message: `Value repeated ${paths.length} times - consider using a reference token`,
        });
      }
    }
  }

  /**
   * Check for unused tokens
   */
  private checkUnusedTokens(
    allTokens: Map<string, Token>,
    violations: LintViolation[],
  ) {
    const rule = this.rules.get("unused-tokens");
    if (!rule) return;

    const referencedTokens = this.findReferencedTokens(allTokens);
    for (const path of allTokens.keys()) {
      if (!referencedTokens.has(path)) {
        violations.push({
          path,
          rule: "unused-tokens",
          severity: rule.severity as "error" | "warn" | "info",
          message: "Token is not referenced by any other token",
        });
      }
    }
  }

  /**
   * Find all referenced tokens
   */
  private findReferencedTokens(allTokens: Map<string, Token>): Set<string> {
    const referencedTokens = new Set<string>();
    const refPattern = /\{([^}]+)\}/g;

    for (const [, token] of allTokens) {
      const tokenStr = JSON.stringify(token);
      let match: RegExpExecArray | null = refPattern.exec(tokenStr);
      while (match !== null) {
        referencedTokens.add(match[1] || "");
        match = refPattern.exec(tokenStr);
      }
    }

    return referencedTokens;
  }

  /**
   * Check if value is a significant duplicate
   */
  private isSignificantDuplicate(value: string, paths: string[]): boolean {
    return paths.length > 1 && value !== '""' && value !== "null";
  }

  /**
   * Check if value should use reference
   */
  private shouldUseReference(
    value: string,
    paths: string[],
    threshold: number,
  ): boolean {
    return paths.length >= threshold && value !== '""' && value !== "null";
  }
}
