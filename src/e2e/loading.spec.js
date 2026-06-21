// Behavior coverage for the "nothing loaded yet" state and the package
// upload/validation flow - the one part of the app that can't be exercised
// via /stats/demo, since it's about *getting* data in, not displaying it.
//
// Bad-zip fixtures are built in-memory with fflate (already a project
// dependency) rather than committed as binary files, so there's nothing to
// keep in sync with the app's own zip-reading logic by hand.
import { test, expect } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';

test.describe('Empty state (no package loaded)', () => {
    // Why this test exists: this is the very first thing any user sees, and
    // it's pure markup with no data dependency - cheap to break by accident
    // while editing Loader.svelte/Header.svelte and easy to regress silently
    // since nothing else in the suite visits "/" directly.
    test('given a fresh visit with nothing loaded, when the page loads, then it shows the empty state instead of the stats page', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByText('Use the', { exact: false })).toBeVisible();
        await expect(page.locator('h1.packet-for')).toHaveCount(0);
    });

    // Why this test exists: the demo link is the only way to see the app
    // working without a real package - if it silently breaks, first-time
    // visitors have no way to evaluate the app at all.
    test('given the empty state, when I click "view the demo", then it takes me to the demo stats page', async ({ page }) => {
        await page.goto('/');

        await page.getByText('view the demo').click();

        await expect(page).toHaveURL(/\/stats\/demo/);
        await expect(page.locator('h1.packet-for')).toContainText('Packet for Wumpus');
    });
});

test.describe('Loading a bad package', () => {
    // Why this test exists: an empty zip is the simplest possible "this
    // isn't a real package" input, and it's the same code path Discord
    // itself can trigger if it ever ships a near-empty export - we want a
    // specific, actionable error message here, not a silent failure or a
    // generic crash.
    test('given an empty zip file, when I select it as my package, then it shows the "looks empty or in an unexpected format" error', async ({ page }) => {
        await page.goto('/');

        const emptyZip = zipSync({});
        await page.locator('input[type="file"]').setInputFiles({
            name: 'package.zip',
            mimeType: 'application/zip',
            buffer: Buffer.from(emptyZip)
        });

        // Not getByRole('dialog'): svelte-simple-modal's backdrop wrapper
        // has aria-hidden="true" on an ancestor of the role="dialog" node,
        // which suppresses the whole subtree from the accessibility tree
        // even though it's visually shown - a real (minor) a11y bug in that
        // library, discovered via this test. Plain attribute selector
        // sidesteps it.
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.getByText('looks empty or in an unexpected format', { exact: false })).toBeVisible();
    });

    // Why this test exists: same "not a real package" outcome as the empty
    // zip case, but via a different code path (a zip that has *a* file, just
    // not the right ones) - guards against a regression where only the
    // zero-files case is handled and a non-empty-but-wrong zip slips through
    // with a worse error or no error at all.
    test('given a zip with just a random text file, when I select it as my package, then it shows the same "unexpected format" error', async ({ page }) => {
        await page.goto('/');

        const wrongZip = zipSync({ 'hello.txt': strToU8('just some text, not a Discord package') });
        await page.locator('input[type="file"]').setInputFiles({
            name: 'package.zip',
            mimeType: 'application/zip',
            buffer: Buffer.from(wrongZip)
        });

        // Not getByRole('dialog'): svelte-simple-modal's backdrop wrapper
        // has aria-hidden="true" on an ancestor of the role="dialog" node,
        // which suppresses the whole subtree from the accessibility tree
        // even though it's visually shown - a real (minor) a11y bug in that
        // library, discovered via this test. Plain attribute selector
        // sidesteps it.
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.getByText('looks empty or in an unexpected format', { exact: false })).toBeVisible();
    });

    // Why this test exists: the error modal's whole purpose is to get a bug
    // report filed against the right place - this caught a real bug last
    // time (the link was hardcoded to the upstream repo instead of this
    // fork), so it's worth pinning down explicitly rather than trusting it
    // by inspection.
    test('given a load error, when I look at the report-it modal, then the "Send the issue on GitHub" link points at this fork\'s repo', async ({ page }) => {
        await page.goto('/');

        const emptyZip = zipSync({});
        await page.locator('input[type="file"]').setInputFiles({
            name: 'package.zip',
            mimeType: 'application/zip',
            buffer: Buffer.from(emptyZip)
        });

        // Not getByRole('link', ...): same aria-hidden-ancestor issue as
        // above suppresses this from the accessibility tree too.
        const reportLink = page.locator('a', { hasText: 'Send the issue on GitHub' });
        await expect(reportLink).toBeVisible();
        await expect(reportLink).toHaveAttribute('href', /github\.com\/2cuteflakes\/local-explorer-for-discord-packages\/issues\/new/);
    });
});
