/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '../../../',
  testMatch: ['<rootDir>/__tests__/e2e/detox/**/*.e2e.ts'],
  testTimeout: 120_000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      { configFile: './babel.config.js' },
    ],
  },
};
