import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';

export default defineConfig([
    {
        ignores: ['public/build/**', 'test-results/**', 'playwright-report/**', '.yarn/**']
    },
    js.configs.recommended,
    svelte.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    {
        rules: {
            indent: ['error', 4],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'quote-props': ['error', 'as-needed']
        }
    }
]);
