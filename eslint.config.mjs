import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Archived Node CommonJS reference scripts intentionally retain their original imports.
  {
    files: ["tools/wechat-full-002-reference/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "coverage/**",
    "exports/**",
    ".local/**",
    "output/playwright/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
