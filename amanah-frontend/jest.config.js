module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverageFrom: [
    "src/core/auth/session-manager.ts",
    "src/core/i18n/formatters.ts",
    "src/core/notifications/plan.ts",
    "src/core/navigation/destinations.ts",
  ],
};
