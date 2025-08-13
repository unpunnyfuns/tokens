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
    {
      name: "no-core-deps-on-app",
      severity: "error",
      from: {
        path: "^src/core/",
      },
      to: {
        path: "^src/(api|cli|validation|resolver|bundler|ast|filesystem)/",
      },
    },
    {
      name: "no-models-deps-on-services",
      severity: "error",
      from: {
        path: "^src/(ast|filesystem)/",
      },
      to: {
        path: "^src/(validation|resolver|bundler|api|cli)/",
      },
    },
    {
      name: "no-services-deps-on-api",
      severity: "error",
      from: {
        path: "^src/(validation|resolver|bundler)/",
      },
      to: {
        path: "^src/(api|cli)/",
      },
    },
    {
      name: "no-api-deps-on-cli",
      severity: "error",
      from: {
        path: "^src/api/",
      },
      to: {
        path: "^src/cli/",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ["node_modules", "\\.(test|spec)\\.(js|ts)$"],
    },
    includeOnly: "^src/",
    exclude: {
      path: ["\\.(test|spec)\\.(js|ts)$", "__tests__"],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.json",
    },
  },
};
