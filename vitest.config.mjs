import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

export default defineConfig({
    plugins: [svelte({ preprocess: preprocess() })],
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.js'],
        include: ['src/**/*.{test,spec}.js'],
        // src/integration/** spawns a real server (rebuild + start.sh) and is
        // run separately via `yarn test:integration` - keeping it out of the
        // default `yarn test` run keeps everyday unit-test feedback fast.
        // src/e2e/** uses @playwright/test's own test/expect, run via
        // `yarn test:e2e` - it would otherwise be picked up (and fail) here.
        exclude: ['node_modules/**', 'src/integration/**', 'src/e2e/**']
    },
    resolve: {
        conditions: ['browser']
    }
});
