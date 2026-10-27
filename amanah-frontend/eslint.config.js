const js = require("@eslint/js");
const ts = require("typescript-eslint");
module.exports = ts.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".expo/**",
      "src/core/api/schema.d.ts",
      "src/core/api/response-validators.ts",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        __DEV__: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
