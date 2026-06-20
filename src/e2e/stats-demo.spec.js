// Real-browser behavior tests, driven by Playwright against the actual
// built+served app (see playwright.config.js's webServer block). These use
// the built-in /stats/demo route (mocked data, no real package needed) so
// they don't depend on a personal Discord export.
//
// Each test is written as a given/when/then in its title, with the
// behavior under test spelled out in plain language before the assertions
// that back it up - that's the pattern to keep extending for new features.
import { test, expect } from '@playwright/test';

test.describe('Stats page (demo data)', () => {
    // Why this test exists: this is the single most basic "did the app
    // actually load real(ish) data and render it" check - if this breaks,
    // essentially nothing downstream of it can be trusted either.
    test('given a fresh visit to /stats/demo, when the page loads, then it shows a "Packet for <username>" heading for the demo user', async ({ page }) => {
        await page.goto('/stats/demo');

        await expect(page.locator('h1.packet-for')).toContainText('Packet for Wumpus');
    });

    // Why this test exists: CardGroup defaulting to expanded is the
    // "everything visible unless you've chosen otherwise" baseline that the
    // collapse/persistence tests below build on - if the default flipped to
    // collapsed by accident, a first-time visitor would see an apparently
    // empty page.
    test('given the demo stats page, when I look at the General Stats group, then it is expanded by default with its stat cards visible', async ({ page }) => {
        await page.goto('/stats/demo');

        const group = page.locator('.card-group.general-stats');
        await expect(group.locator('.card-header')).toContainText('General Stats');
        await expect(group.locator('.card-group-content')).toBeVisible();
    });

    // Why this test exists: the whole point of grouping cards (vs. each one
    // collapsing individually) was to avoid leaving blank gaps when one
    // sub-card was hidden - this is the behavior that fix was for, so it's
    // worth pinning down directly rather than trusting the implementation.
    test('given an expanded stat group, when I click its header, then its content collapses; when I click again, then it re-expands', async ({ page }) => {
        await page.goto('/stats/demo');

        const group = page.locator('.card-group.general-stats');
        const header = group.locator('.card-header');
        const content = group.locator('.card-group-content');

        await expect(content).toBeVisible();
        await header.click();
        await expect(content).not.toBeVisible();
        await header.click();
        await expect(content).toBeVisible();
    });

    // Why this test exists: a previous version of this feature stored
    // collapsed state under a stale localStorage key with no way to
    // un-collapse it after a refactor - this guards the actual persisted
    // user experience (survives a reload), not just the in-memory toggle.
    test('given the demo page, when I reload after collapsing a group, then it stays collapsed (persisted to localStorage)', async ({ page }) => {
        await page.goto('/stats/demo');

        const header = page.locator('.card-group.top-lists .card-header');
        await header.click();
        await expect(page.locator('.card-group.top-lists .card-group-content')).not.toBeVisible();

        await page.reload();
        await expect(page.locator('.card-group.top-lists .card-group-content')).not.toBeVisible();
    });

    // Why this test exists: search only works against in-memory transcripts
    // for the current session (never persisted) - this confirms the happy
    // path actually surfaces a result, not just that the input accepts text.
    test('given the header search box, when I type a query matching a demo message, then matching results appear in the dropdown', async ({ page }) => {
        await page.goto('/stats/demo');

        await page.getByPlaceholder('Search messages...').fill('demo message');

        await expect(page.locator('.app-header-search-results')).toBeVisible();
        await expect(page.locator('.app-header-search-result').first()).toContainText('demo message');
    });

    // Why this test exists: an empty-results state is easy to get wrong
    // (showing nothing at all looks identical to "still loading" or "broken"
    // from a user's perspective) - this confirms there's an explicit,
    // visible "no matches" message instead of silence.
    test('given the header search box, when I type a query matching nothing, then it shows "No matches found"', async ({ page }) => {
        await page.goto('/stats/demo');

        await page.getByPlaceholder('Search messages...').fill('zzznomatchzzz');

        await expect(page.getByText('No matches found.')).toBeVisible();
    });

    // Why this test exists: the entire point of search is to jump straight
    // to the conversation a match came from - this is the actual payoff of
    // the feature, not just "results render."
    test('given a search result, when I click it, then it navigates to that conversation\'s transcript view', async ({ page }) => {
        await page.goto('/stats/demo');

        await page.getByPlaceholder('Search messages...').fill('demo message');
        await page.locator('.app-header-search-result').first().click();

        await expect(page).toHaveURL(/\/(dm|channel)\//);
        await expect(page.getByText('demo message', { exact: false }).first()).toBeVisible();
    });

    // Why this test exists: clicking a leaderboard name to open its
    // transcript is one of the earliest features added to this fork and is
    // exercised constantly by hand - it deserves a real regression test
    // rather than relying on memory of "it worked when I built it."
    test('given the Top Users leaderboard, when I click a user\'s name, then it navigates to their DM transcript view', async ({ page }) => {
        await page.goto('/stats/demo');

        await page.locator('.card-group.top-lists .card.top-users .top-name-link').first().click();

        await expect(page).toHaveURL(/\/dm\//);
        await expect(page.locator('.dm-header h1')).toContainText('Wumpus');
    });

    // Why this test exists: the timezone picker recomputes the hours chart
    // from raw message timestamps on the fly - it's disabled entirely when
    // transcripts aren't loaded, so this also confirms the demo route
    // populates them (a session-only in-memory store) well enough for the
    // picker to actually be usable, not just present.
    test('given the hours chart, when I pick a different timezone, then the favorite-hour sentence updates to reference that timezone', async ({ page }) => {
        await page.goto('/stats/demo');

        const select = page.locator('#hours-timezone-select');
        const sentence = page.locator('.card.hours p');

        await expect(select).toBeEnabled();
        await expect(sentence).toContainText('(UTC)');

        await select.selectOption('America/New_York');

        await expect(sentence).toContainText('(America/New_York)');
        await expect(sentence).not.toContainText('(UTC)');
    });

    // Why this test exists: attachments are rendered via a dedicated
    // component with extension-based logic deciding whether to show a
    // Preview button at all - this confirms the actual click-to-reveal
    // interaction works end to end, not just that the component renders in
    // isolation (already covered by Attachment.spec.js's jsdom tests).
    test('given a message with an image attachment, when I click Preview, then an inline image appears; when I click Hide preview, then it disappears again', async ({ page }) => {
        await page.goto('/stats/demo');
        await page.locator('.card-group.top-lists .card.top-users .top-name-link').first().click();
        await expect(page).toHaveURL(/\/dm\//);

        const attachment = page.locator('.attachment').first();
        await expect(attachment.getByText('Preview')).toBeVisible();
        await expect(attachment.locator('img')).toHaveCount(0);

        await attachment.getByText('Preview').click();
        await expect(attachment.locator('img')).toBeVisible();
        await expect(attachment.getByText('Hide preview')).toBeVisible();

        await attachment.getByText('Hide preview').click();
        await expect(attachment.locator('img')).toHaveCount(0);
    });
});
