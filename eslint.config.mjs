import { createRequire } from "node:module";

// Load plugins through CommonJS resolution so NODE_PATH is honored when
// ESLint runs from MegaLinter's bundled install (native ESM ignores it).
const require = createRequire(import.meta.url);
const { defineConfig } = require("eslint/config");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

export default defineConfig([{
    files: ["**/*.ts"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        globals: {
            workspaceFolder: false,
        },

        parser: tsParser,
        ecmaVersion: 6,
        sourceType: "module",

        parserOptions: {
            project: ["./server/tsconfig.json", "./client/tsconfig.json"],
        },
    },

    rules: {
        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "off",
        "@typescript-eslint/no-unused-vars": ["error", { 
            "args": "all",
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
        }]
    },
}]);
