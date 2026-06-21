import { defineConfig } from 'vitest/config';

// Separate from vitest.config.mjs (the fast unit/component suite): this one
// runs src/integration/** only, in a plain Node environment (no jsdom), since
// these tests spawn a real server process and hit it over the network.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/integration/**/*.spec.js'],
        testTimeout: 30000,
        hookTimeout: 90000
    }
});
