module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    // ===== ARCHITECTURAL LAYERS =====
    // Layer 0: Foundation - can only depend on external packages
    {
      name: "foundation-isolation",
      severity: "error",
      from: {
        path: "^libs/foundation/",
      },
      to: {
        path: "^(libs|apps)/",
        pathNot: "^libs/foundation/",
      },
    },
    // Layer 1: Core (ast, io, schemas) - can only depend on foundation
    {
      name: "core-layer-boundaries",
      severity: "error",
      from: {
        path: "^libs/(ast|io|schemas)/",
      },
      to: {
        path: "^(libs|apps)/",
        pathNot: "^libs/(foundation|ast|io|schemas)/",
      },
    },
    // Layer 2: Processing - can only depend on foundation + core layers
    {
      name: "processing-layer-boundaries",
      severity: "error",
      from: {
        path: "^libs/(validator|analysis|linter|tokens|schema-validator)/",
      },
      to: {
        path: "^libs/(loader|bundler)/",
      },
    },
    // Layer 3: Pipeline (loader, bundler) - can only depend on lower layers
    {
      name: "pipeline-no-cross-dependencies",
      severity: "error",
      from: {
        path: "^libs/loader/",
      },
      to: {
        path: "^libs/bundler/",
      },
    },
    {
      name: "pipeline-no-reverse-dependencies",
      severity: "error",
      from: {
        path: "^libs/bundler/",
      },
      to: {
        path: "^libs/loader/",
      },
    },
    // Apps can depend on any lib, but libs shouldn't depend on apps
    {
      name: "no-libs-depending-on-apps",
      severity: "error",
      from: {
        path: "^libs/",
      },
      to: {
        path: "^apps/",
      },
    },

    // ===== SPECIFIC ARCHITECTURAL ENFORCEMENT =====
    // AST package must NOT do file I/O - should only work with parsed content
    {
      name: "ast-no-file-io",
      severity: "error",
      comment: "AST package should not do file I/O - use loader instead",
      from: {
        path: "^libs/ast/",
      },
      to: {
        path: "^libs/io/",
      },
    },

    // File I/O should only be done by loader and io packages
    {
      name: "file-io-isolation",
      severity: "error",
      comment: "Only loader and io packages should import Node.js fs modules",
      from: {
        path: "^libs/",
        pathNot: "^libs/(loader|io)/",
      },
      to: {
        path: "node:fs",
      },
    },

    // Loader should orchestrate file operations, not bypass to filesystem
    {
      name: "loader-owns-file-orchestration",
      severity: "warn",
      comment: "File operations should go through loader's orchestration layer",
      from: {
        path: "^libs/",
        pathNot: "^libs/(loader|io)/",
      },
      to: {
        path: "^libs/io/",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ["node_modules", "\\.(test|spec)\\.(js|ts)$", "dist/"],
    },
    includeOnly: "^(libs|apps)/",
    exclude: {
      path: ["\\.(test|spec)\\.(js|ts)$", "__tests__", "dist/", "coverage/"],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.base.json",
    },
  },
};
