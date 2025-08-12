module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    // Relax some rules for this project
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'curly': ['error', 'multi-line'], // Allow single-line if statements without braces
    'no-console': 'off', // Allow console.log for this project
    
    // Keep important rules strict
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'data/',
    '*.min.js',
  ],
};
