import { describe, it, expect } from 'vitest';
import {
    escapeHtml,
    generateAvatarURL,
    messageCountInfo,
    messageCountColor,
    MESSAGE_COUNT_COLORS,
    linkify,
    getCreatedTimestamp,
    getFavoriteWords,
    generateFileStructureDump,
    generateGitHubIssueURL
} from './helpers';

describe('escapeHtml', () => {
    it('escapes all five HTML-meaningful characters', () => {
        expect(escapeHtml('<script>alert(\'"&"\')</script>')).toBe('&lt;script&gt;alert(&#39;&quot;&amp;&quot;&#39;)&lt;/script&gt;');
    });

    it('leaves plain text untouched', () => {
        expect(escapeHtml('Nitro Classic - 1 Month')).toBe('Nitro Classic - 1 Month');
    });

    it('coerces non-string input', () => {
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('generateAvatarURL', () => {
    it('returns null when there is no avatar hash', () => {
        expect(generateAvatarURL(null, '123')).toBeNull();
        expect(generateAvatarURL(undefined, '123')).toBeNull();
        expect(generateAvatarURL('', '123')).toBeNull();
    });

    it('builds a static webp URL for a normal hash', () => {
        expect(generateAvatarURL('abc123', '555')).toBe('https://cdn.discordapp.com/avatars/555/abc123.webp');
    });

    it('builds an animated gif URL for an "a_"-prefixed hash', () => {
        expect(generateAvatarURL('a_abc123', '555')).toBe('https://cdn.discordapp.com/avatars/555/a_abc123.gif');
    });
});

describe('messageCountInfo', () => {
    it('returns the grey band at and below the low threshold', () => {
        expect(messageCountInfo(0, 0, 1000).color).toBe('#b0b0b0');
        expect(messageCountInfo(20, 0, 1000)).toMatchObject({ color: '#b0b0b0', rangeLabel: '0-20' });
    });

    it('returns the white band between 21 and 200', () => {
        expect(messageCountInfo(21, 0, 1000)).toMatchObject({ color: '#ffffff', rangeLabel: '21-200' });
        expect(messageCountInfo(200, 0, 1000)).toMatchObject({ color: '#ffffff', rangeLabel: '21-200' });
    });

    it('scales the upper 5 bands across the list max, low to high', () => {
        // upper range is 201-1200 (1000 wide -> 200-wide bands); using the
        // midpoint of each band avoids ambiguity at the exact boundaries.
        const max = 1200;
        expect(messageCountInfo(300, 0, max).color).toBe('#f5e6a8');
        expect(messageCountInfo(500, 0, max).color).toBe('#a8d4ef');
        expect(messageCountInfo(700, 0, max).color).toBe('#aee0a8');
        expect(messageCountInfo(900, 0, max).color).toBe('#c7b3e8');
        expect(messageCountInfo(1100, 0, max).color).toBe('#f4a6c6');
        expect(messageCountInfo(max, 0, max).color).toBe('#f4a6c6');
    });

    it('the highest band is always pink, regardless of the list max', () => {
        expect(messageCountInfo(50000, 0, 50000).color).toBe('#f4a6c6');
        expect(messageCountInfo(300, 0, 300).color).toBe('#f4a6c6');
    });

    it('clamps to a single upper band when max barely exceeds the mid threshold', () => {
        // max = 201 means the whole upper range is 1 value wide
        const info = messageCountInfo(201, 0, 201);
        expect(info.rangeLabel).toBe('201-201');
        expect(info.color).toBe('#f4a6c6');
    });

    it('messageCountColor returns just the color', () => {
        expect(messageCountColor(5, 0, 1000)).toBe(messageCountInfo(5, 0, 1000).color);
    });

    it('MESSAGE_COUNT_COLORS exposes exactly the 5 upper-band colors, low to high', () => {
        expect(MESSAGE_COUNT_COLORS).toEqual(['#f5e6a8', '#a8d4ef', '#aee0a8', '#c7b3e8', '#f4a6c6']);
    });
});

describe('linkify', () => {
    it('returns a single text segment when there are no URLs', () => {
        expect(linkify('no links here')).toEqual([{ type: 'text', value: 'no links here' }]);
    });

    it('splits a single URL out from surrounding text', () => {
        expect(linkify('check https://example.com/foo out')).toEqual([
            { type: 'text', value: 'check ' },
            { type: 'link', value: 'https://example.com/foo' },
            { type: 'text', value: ' out' }
        ]);
    });

    it('excludes trailing punctuation and closing parens from the link', () => {
        expect(linkify('see (https://example.com) and https://x.com.')).toEqual([
            { type: 'text', value: 'see (' },
            { type: 'link', value: 'https://example.com' },
            { type: 'text', value: ') and ' },
            { type: 'link', value: 'https://x.com' },
            { type: 'text', value: '.' }
        ]);
    });

    it('handles multiple links back-to-back', () => {
        expect(linkify('https://a.com https://b.com/path,here')).toEqual([
            { type: 'link', value: 'https://a.com' },
            { type: 'text', value: ' ' },
            { type: 'link', value: 'https://b.com/path,here' }
        ]);
    });

    it('handles an empty string', () => {
        expect(linkify('')).toEqual([]);
    });
});

describe('getCreatedTimestamp', () => {
    it('decodes a Discord snowflake into a plausible Unix timestamp', () => {
        // Arbitrary snowflake -> its decoded creation date, verified against Discord's own epoch math
        const ts = getCreatedTimestamp('123456789012345678');
        expect(new Date(ts).toISOString()).toBe('2015-12-07T16:13:12.216Z');
    });

    it('returns exactly the Discord epoch for snowflake 0', () => {
        expect(getCreatedTimestamp(0)).toBe(1420070400000);
    });
});

describe('getFavoriteWords', () => {
    it('returns the top 2 most frequent words, descending by count', () => {
        const words = ['a', 'a', 'a', 'b', 'b', 'c'];
        expect(getFavoriteWords(words)).toEqual([
            { word: 'a', count: 3 },
            { word: 'b', count: 2 }
        ]);
    });

    it('ignores falsy entries', () => {
        const words = ['a', '', null, undefined, 'a'];
        expect(getFavoriteWords(words)).toEqual([{ word: 'a', count: 2 }]);
    });

    it('flattens nested arrays up to 3 levels deep', () => {
        const words = [['a', ['a', ['a']]], 'b'];
        expect(getFavoriteWords(words)).toEqual([
            { word: 'a', count: 3 },
            { word: 'b', count: 1 }
        ]);
    });

    it('returns an empty array for no words', () => {
        expect(getFavoriteWords([])).toEqual([]);
    });
});

describe('generateFileStructureDump', () => {
    it('handles an empty file list', () => {
        expect(generateFileStructureDump([])).toBe('No files found in package');
        expect(generateFileStructureDump(null)).toBe('No files found in package');
    });

    it('lists unique, sorted first-level directories', () => {
        const files = [
            { name: 'Messages/index.json' },
            { name: 'Account/user.json' },
            { name: 'Messages/c123/channel.json' }
        ];
        const dump = generateFileStructureDump(files);
        expect(dump).toContain('Total files: 3');
        expect(dump).toContain('Root directories: 2');
        const accountIndex = dump.indexOf('Account/');
        const messagesIndex = dump.indexOf('Messages/');
        expect(accountIndex).toBeGreaterThan(-1);
        expect(messagesIndex).toBeGreaterThan(accountIndex);
    });
});

describe('generateGitHubIssueURL', () => {
    it('builds a well-formed pre-filled GitHub issue URL', () => {
        const url = generateGitHubIssueURL('Something broke', 'Total files: 1');
        expect(url).toContain('https://github.com/2cuteflakes/local-explorer-for-discord-packages/issues/new?title=');
        expect(url).toContain('labels=bug,auto-report');
        expect(decodeURIComponent(url)).toContain('Something broke');
        expect(decodeURIComponent(url)).toContain('Total files: 1');
    });
});
