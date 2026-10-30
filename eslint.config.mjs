import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".vercel/**",
  ]),
  // ESLint 10 compatibility and project-maturity overrides.
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      "react/display-name": "off",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
