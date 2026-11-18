import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Workspace boundaries: each workspace may use shared code (src/lib,
  // src/components, src/i18n) but never another workspace's internals.
  {
    files: ["src/features/finance/**", "src/app/finance/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/nutrition", "@/features/nutrition/*", "@/app/nutrition/*", "@/app/dashboard/*"],
          message: "Finance must not import Nutrition or Admin internals; move shared code to src/lib or src/components.",
        }],
      }],
    },
  },
  {
    files: ["src/features/nutrition/**", "src/app/nutrition/**", "src/app/api/nutrition/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/finance", "@/features/finance/*", "@/app/finance/*", "@/app/dashboard/*"],
          message: "Nutrition must not import Finance or Admin internals; move shared code to src/lib or src/components.",
        }],
      }],
    },
  },
  {
    files: ["src/app/dashboard/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/finance", "@/features/finance/*", "@/features/nutrition", "@/features/nutrition/*", "@/app/finance/*", "@/app/nutrition/*"],
          message: "Admin must not import workspace internals; move shared code to src/lib or src/components.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
