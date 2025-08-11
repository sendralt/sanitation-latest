module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  // Increase default timeout for integration tests if needed
  testTimeout: 30000,
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 55,
      lines: 50,
      statements: 50,
    },
  },
};

