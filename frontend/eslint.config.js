import { defineConfig, globalIgnores } from "eslint/config";
import path from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import sonarjs from "eslint-plugin-sonarjs";
import unusedImports from "eslint-plugin-unused-imports";
import { configs as tsEsLintConfigs } from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const compat = new FlatCompat({
  baseDirectory: dirname,
});
const eslintImport = [
  ...compat.config({
    extends: ["plugin:import/recommended", "plugin:import/typescript"],
  }),
];

const baseConfig = defineConfig([
  globalIgnores(["node_modules/", ".config/", "dist/", "tsconfig.json"]),
  {
    extends: [
      eslint.configs.recommended,
      tsEsLintConfigs.recommended,
      sonarjs.configs.recommended,
      ...eslintImport,
      eslintConfigPrettier,
    ],
    plugins: { "unused-imports": unusedImports },
    rules: {
      "linebreak-style": ["error", "unix"],
      semi: ["error", "always"],
      complexity: ["error", 10], // 複雑度の設定
      // The typescript-eslint FAQ provides guidance here:
      // https://typescript-eslint.io/troubleshooting/faqs/general/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
      // unuserd-importsのrecommended設定を適用
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // ここまで unuserd-importsのrecommended設定を適用
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ], // importの並び順の設定
          pathGroupsExcludedImportTypes: ["builtin"],
          pathGroups: [
            { pattern: "@/**", group: "parent", position: "before" },
          ], // エイリアスの位置を指定
          alphabetize: { order: "asc" }, // グループ内のソート順
        },
      ],
      "import/prefer-default-export": ["off"],
      "import/no-unresolved": [
        "error",
        {
          ignore: ["^hono/.+"],
        },
      ],
      "import/extensions": ["off"],
    },
    // https://www.npmjs.com/package/eslint-plugin-import#user-content-typescript
    settings: {
      "import/resolver": {
        node: true,
        typescript: true,
      },
    },
  },
]);

const customConfig = defineConfig([
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["dist", "public"],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      ...baseConfig,
    ],
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-alert": "off",
      "no-console": "off",
      // Redux Toolkit uses immer internally to allow "mutating" state
      "no-param-reassign": [
        "error",
        { props: true, ignorePropertyModificationsFor: ["state"] },
      ],
      // Allow TO DO comments for future implementation
      "sonarjs/todo-tag": "warn",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        myCustomGlobal: "readonly",
      },
    },
  },
]);

export default defineConfig([
  globalIgnores(["vite.config.ts", "tests/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...customConfig],
  },
]);
