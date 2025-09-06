module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'scope-enum': [
      2,
      'always',
      [
        'analysis',
        'ast',
        'bundler',
        'cli',
        'fixtures',
        'foundation',
        'io',
        'linter',
        'loader',
        'manifest',
        'schema-validator',
        'schemas',
        'tokens',
        'repo',
        'deps',
        'release'
      ]
    ],
    'subject-case': [0]
  }
};
