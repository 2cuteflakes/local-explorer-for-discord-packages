// @vitest-environment node
//
// HTTP-level integration tests: actually spawns the real server (via
// start.sh, the same path a user runs) and hits it over the network.
//
// Important limit: this is a client-side SPA. The HTML these tests see is
// whatever's served BEFORE any JS runs - essentially an empty <body> plus
// the bundle <script> tag. These tests can only verify server/build-level
// behavior (does it start, serve the right files, route correctly) - they
// cannot see anything that only exists after Svelte mounts (search results,
// leaderboard content, modals, etc.). For that, see the Playwright specs in
// src/e2e/, which drive a real browser against this same server.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess;

const waitForServer = async (timeoutMs = 60000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(BASE_URL);
            if (res.status) return;
        } catch {
            // not up yet
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Server did not respond at ${BASE_URL} within ${timeoutMs}ms`);
};

describe('server (HTTP-level only)', () => {
    beforeAll(async () => {
        serverProcess = spawn('./start.sh', ['--port', String(PORT)], {
            cwd: process.cwd(),
            stdio: 'pipe'
        });
        await waitForServer();
    }, 90000);

    afterAll(() => {
        serverProcess?.kill();
    });

    it('given the app is freshly built and started, when I request the root path, then it responds 200 with the app title', async () => {
        const res = await fetch(`${BASE_URL}/`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('<title>Local Explorer for Discord Packages</title>');
    });

    it('given the server is running, when I request the JS bundle, then it is served as JavaScript and contains the app name', async () => {
        const res = await fetch(`${BASE_URL}/build/bundle.js`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('javascript');
        const js = await res.text();
        expect(js).toContain('Local Explorer for Discord Packages');
    });

    it('given this is a client-side-routed SPA, when I request a non-root app route, then the server still falls back to index.html (not a 404)', async () => {
        const res = await fetch(`${BASE_URL}/stats/demo`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('<title>Local Explorer for Discord Packages</title>');
    });

    it('given sirv is run in --single (SPA) mode, when I request a path that looks like a missing asset, then it still falls back to the index.html shell rather than a real 404 - this is intentional SPA-routing behavior, but means a typo\'d asset URL fails silently as a blank page instead of a clear 404', async () => {
        const res = await fetch(`${BASE_URL}/build/this-file-does-not-exist.js`);
        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).toContain('<title>Local Explorer for Discord Packages</title>');
    });
});
