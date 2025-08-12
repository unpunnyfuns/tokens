/**
 * @module core/ast-validator
 * @description AST-based validation with compatibility interface
 */

import { buildEnhancedAST } from "./ast.ts";

/**
 * Validation result structure (compatible with old validator)
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalReferences: number;
    validReferences: number;
    invalidReferences: number;
  };
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  strict?: boolean; // Treat warnings as errors
  warnDepth?: number; // Warn about deep reference chains
  basePath?: string; // Base path for file resolution (not used in AST validation)
}

/**
 * Validate all references in a token tree using the enhanced AST
 * This replaces the old validateReferences function with AST-based validation
 *
 * @param tokens - Token tree to validate
 * @param options - Validation options
 * @returns Comprehensive validation result
 */
export function validateReferences(
  tokens: Record<string, unknown>,
  options: ValidationOptions = {},
): ValidationResult {
  const { strict = false, warnDepth = 5 } = options;

  // Build the enhanced AST which includes comprehensive validation
  const ast = buildEnhancedAST(tokens);

  // Handle case where AST might not have stats (e.g., empty tokens)
  if (!ast || !ast.stats) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        totalReferences: 0,
        validReferences: 0,
        invalidReferences: 0,
      },
    };
  }

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalReferences: ast.stats.totalReferences,
      validReferences: ast.stats.validReferences,
      invalidReferences: ast.stats.invalidReferences,
    },
  };

  // Collect errors from invalid tokens
  for (const token of ast.tokens) {
    if (!token.isValid && token.errors) {
      result.errors.push(
        ...token.errors.map((err) => {
          // Transform AST error messages to match expected format
          if (err.includes("Reference to non-existent token:")) {
            return err.replace(
              "Reference to non-existent token:",
              "Reference not found:",
            );
          }
          return `${token.path}: ${err}`;
        }),
      );
      result.valid = false;
    }
  }

  // Collect warnings from tokens (including external references)
  for (const token of ast.tokens) {
    if (token.warnings) {
      for (const warning of token.warnings) {
        if (warning.startsWith("External reference:")) {
          // Handle external references based on strict mode
          const extRef = warning.replace("External reference: ", "");
          const message = `External reference: ${extRef} from ${token.path}`;
          if (strict) {
            result.errors.push(message);
            result.valid = false;
          } else {
            result.warnings.push(message);
          }
        } else {
          // Other warnings
          const message = `${token.path}: ${warning}`;
          if (strict) {
            result.errors.push(message);
            result.valid = false;
          } else {
            result.warnings.push(message);
          }
        }
      }
    }
  }

  // Add circular reference errors
  for (const circular of ast.circularReferences) {
    const message = `Circular reference: ${circular.chain.join(" → ")}`;
    result.errors.push(message);
    result.valid = false;
  }

  // Add depth warnings if requested
  if (warnDepth > 0) {
    for (const token of ast.tokens) {
      if (token.referenceDepth > warnDepth) {
        const message = `Deep reference chain: ${token.path} has depth ${token.referenceDepth}`;
        if (strict) {
          result.errors.push(message);
          result.valid = false;
        } else {
          result.warnings.push(message);
        }
      }
    }
  }

  return result;
}

/**
 * Get enhanced AST for a token tree
 * This provides access to the full AST with all metadata
 */
export function getEnhancedAST(tokens: Record<string, unknown>) {
  return buildEnhancedAST(tokens);
}

/**
 * Validate tokens and return both validation result and AST
 * Useful when you need both validation and detailed analysis
 */
export function validateWithAST(
  tokens: Record<string, unknown>,
  options: ValidationOptions = {},
): { validation: ValidationResult; ast: ReturnType<typeof buildEnhancedAST> } {
  const ast = buildEnhancedAST(tokens);
  const validation = validateReferences(tokens, options);

  return { validation, ast };
}

/**
 * Validation issue types
 */
export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  path?: string;
  ref?: string;
}

// Export additional AST types that might be useful
export type {
  ASTGroup,
  ASTStats,
  ASTToken,
  EnhancedAST,
  ReferenceInfo,
} from "./ast.ts";
