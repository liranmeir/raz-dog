import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Standalone Node/CommonJS scripts that generate doc images - not part
    // of the app bundle, not run by `pnpm build`/`pnpm test`. See each
    // script's header comment for how it's actually run.
    "docs/**/*.js",
  ]),
]);

export default eslintConfig;
