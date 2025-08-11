module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  // Increase default timeout for integration tests if needed
  testTimeout: process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,
  coverageThreshold: {
    global: {
      branches: 39,
      functions: 55,
      lines: 50,
      statements: 50,
    },
  },
};

