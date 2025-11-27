// ESLint v9 Flat Config
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default function createConfig(options = {}) {
  const { ignores = [] } = options;

  return tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        parserOptions: {
          project: "./tsconfig.json",
          tsconfigRootDir: options.tsconfigRootDir || process.cwd(),
        },
      },
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-explicit-any": "warn",
        "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      },
    },
    {
      files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
      ...tseslint.configs.disableTypeChecked,
    },
    {
      ignores: [
        "node_modules/**",
        "dist/**",
        "build/**",
        ".next/**",
        "coverage/**",
        ...ignores,
      ],
    }
  );
}
