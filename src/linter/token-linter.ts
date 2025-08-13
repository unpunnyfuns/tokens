/**
 * Token linter for style and best practice rules
 * Separate from validation - these are opinions, not requirements
 */

import { isToken } from "../core/token/guards.js";
import { traverseTokens } from "../core/token/operations.js";
import type { Token, TokenDocument } from "../types.js";
import * as rules from "./lint-rules.js";

export interface LintResult {
  violations: LintViolation[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface LintViolation {
  path: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  fix?: string;
}

export interface LintRule {
  name: string;
  description: string;
  check: (token: Token, path: string) => LintViolation | null;
}

export interface LinterOptions {
  rules?: string[];
  customRules?: LintRule[];
  severity?: {
    [ruleName: string]: "error" | "warning" | "info" | "off";
  };
}

/**
 * Token linter for checking style and best practices
 */
export class TokenLinter {
  private enabledRules: Map<string, LintRule>;
  private severityOverrides: Map<string, "error" | "warning" | "info">;

  constructor(options: LinterOptions = {}) {
    this.enabledRules = new Map();
    this.severityOverrides = new Map();

    // Load default rules
    this.loadDefaultRules(options.rules);

    // Add custom rules
    if (options.customRules) {
      for (const rule of options.customRules) {
        this.enabledRules.set(rule.name, rule);
      }
    }

    // Apply severity overrides
    if (options.severity) {
      for (const [ruleName, severity] of Object.entries(options.severity)) {
        if (severity === "off") {
          this.enabledRules.delete(ruleName);
        } else {
          this.severityOverrides.set(ruleName, severity);
        }
      }
    }
  }

  /**
   * Lint a token document
   */
  lint(document: TokenDocument): LintResult {
    const violations: LintViolation[] = [];

    // Check each token
    traverseTokens(document, (path, tokenOrGroup) => {
      if (isToken(tokenOrGroup)) {
        this.lintToken(tokenOrGroup, path, violations);
      }
      return true;
    });

    // Calculate summary
    const summary = {
      errors: violations.filter((v) => v.severity === "error").length,
      warnings: violations.filter((v) => v.severity === "warning").length,
      info: violations.filter((v) => v.severity === "info").length,
    };

    return { violations, summary };
  }

  /**
   * Lint a single token
   */
  private lintToken(token: Token, path: string, violations: LintViolation[]) {
    for (const [ruleName, rule] of this.enabledRules) {
      const violation = rule.check(token, path);

      if (violation) {
        // Apply severity override if present
        const overrideSeverity = this.severityOverrides.get(ruleName);
        if (overrideSeverity) {
          violation.severity = overrideSeverity;
        }

        violations.push(violation);
      }
    }
  }

  /**
   * Load default lint rules
   */
  private loadDefaultRules(ruleNames?: string[]) {
    const defaultRules: LintRule[] = [
      {
        name: "valid-color-format",
        description: "Check color values are in valid format",
        check: (token, path) => {
          if (token.$type === "color" && token.$value) {
            if (!rules.validateColor(token.$value)) {
              return {
                path,
                rule: "valid-color-format",
                severity: "error",
                message: `Invalid color format: ${token.$value}`,
                fix: "Use hex (#RGB, #RRGGBB), rgb(), rgba(), hsl(), or hsla() format",
              };
            }
          }
          return null;
        },
      },
      {
        name: "valid-dimension-format",
        description: "Check dimension values have units",
        check: (token, path) => {
          if (token.$type === "dimension" && token.$value) {
            if (!rules.validateDimension(token.$value)) {
              return {
                path,
                rule: "valid-dimension-format",
                severity: "error",
                message: `Invalid dimension format: ${token.$value}`,
                fix: "Add a unit (px, rem, em, %, etc.) to the dimension",
              };
            }
          }
          return null;
        },
      },
      {
        name: "prefer-rem-over-px",
        description: "Prefer rem units over px for better accessibility",
        check: (token, path) => {
          if (token.$type === "dimension" && typeof token.$value === "string") {
            if (token.$value.endsWith("px") && !path.includes("border")) {
              return {
                path,
                rule: "prefer-rem-over-px",
                severity: "warning",
                message:
                  "Consider using rem instead of px for better accessibility",
                fix: `Convert ${token.$value} to rem (divide by 16)`,
              };
            }
          }
          return null;
        },
      },
      {
        name: "description-recommended",
        description: "Tokens should have descriptions",
        check: (token, path) => {
          if (!token.$description) {
            return {
              path,
              rule: "description-recommended",
              severity: "info",
              message: "Consider adding a $description to document this token",
              fix: "Add a $description field explaining the token's purpose",
            };
          }
          return null;
        },
      },
      {
        name: "naming-convention",
        description: "Check token naming follows conventions",
        check: (_, path) => {
          const segments = path.split(".");
          const lastSegment = segments[segments.length - 1];

          // Check for camelCase or kebab-case
          if (
            !(
              lastSegment &&
              (/^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/.test(lastSegment) ||
                /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(lastSegment))
            )
          ) {
            return {
              path,
              rule: "naming-convention",
              severity: "warning",
              message: "Token name should use camelCase or kebab-case",
              fix: "Rename to follow camelCase or kebab-case convention",
            };
          }
          return null;
        },
      },
    ];

    // Filter rules if specific ones requested
    const rulesToAdd = ruleNames
      ? defaultRules.filter((r) => ruleNames.includes(r.name))
      : defaultRules;

    for (const rule of rulesToAdd) {
      this.enabledRules.set(rule.name, rule);
    }
  }
}
