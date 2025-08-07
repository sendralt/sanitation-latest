module.exports = {
  "roots": [
    "<rootDir>/Public",
    "<rootDir>/dhl_login"
  ],
  "testMatch": [
    "**/tests/**/*.test.js"
  ],
  "moduleNameMapper": {
    "^@/models/(.*)$": "<rootDir>/dhl_login/models/$1"
  },
  "testEnvironment": "node",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "coverageDirectory": "./coverage",
  "collectCoverageFrom": [
    "Public/scripts.js"
  ],
  "testResultsProcessor": "jest-junit",
  "reporters": [
    "default",
    ["jest-junit", {"outputDirectory": "./test-results", "outputName": "junit.xml"}]
  ],
  "verbose": true
}