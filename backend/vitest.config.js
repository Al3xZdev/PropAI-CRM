const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'forks',
    fileParallelism: false,    // Correr test files en serie
    singleFork: true           // Vitest 4: nivel top, no poolOptions.forks
  }
})
