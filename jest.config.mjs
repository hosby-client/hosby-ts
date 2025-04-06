/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  preset: 'ts-jest',
  testEnvironment: "node",
  moduleFileExtensions: ['ts', 'js'],
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.ts'], // Pour localiser les tests
  modulePathIgnorePatterns: ['dist'], // Ignorer les fichiers compilés
  rootDir: './',
  setupFiles: ['./__tests__/setup.ts'],
  testTimeout: 10000
};