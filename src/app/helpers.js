// Returns null when there's no real avatar to show, rather than falling
// back to one of Discord's own default-avatar artwork images - callers
// should render a generic placeholder (e.g. an initial) instead.
export const generateAvatarURL = (avatarHash, id) => {
    if (!avatarHash) return null;
    return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'webp'}`;
};

// Below 20 messages and between 21-200 get fixed grey/white bands. Above
// that, the rest of the range (up to the list's max) is split into 5
// equal-width bands using a colorblind-friendly palette, low -> high.
const MESSAGE_COUNT_LOW_THRESHOLD = 20;
const MESSAGE_COUNT_MID_THRESHOLD = 200;

const MESSAGE_COUNT_BANDS = [
    { color: '#b0b0b0', message: "You've barely talked - practically strangers." },
    { color: '#ffffff', message: 'A casual acquaintance.' },
    { color: '#f5e6a8', message: "You're getting to know each other." },
    { color: '#a8d4ef', message: 'A real friendship is forming.' },
    { color: '#aee0a8', message: 'Solid buddies at this point!' },
    { color: '#c7b3e8', message: 'Close friends, for sure.' },
    { color: '#f4a6c6', message: 'Your ride-or-die - an absolute bestie!' }
];
// Only the bands above the fixed grey/white thresholds; kept exported for
// anything that just wants the color scale itself.
export const MESSAGE_COUNT_COLORS = MESSAGE_COUNT_BANDS.slice(2).map((band) => band.color);

/**
 * Full info (color, range label, and a cute relationship blurb) for a
 * message count: fixed grey/white bands for small counts, then 5
 * colorblind-friendly bands scaled across the rest of the list's range
 * (every package has very different volumes, so that part adapts per-list
 * rather than using a fixed absolute ceiling).
 * @param value The message count to describe
 * @param min Unused - kept so call sites can keep passing the list's [min, max] range
 * @param max The largest value in the list
 * @returns { color, rangeLabel, message }
 */
export const messageCountInfo = (value, min, max) => {
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    if (value <= MESSAGE_COUNT_LOW_THRESHOLD) {
        return { ...MESSAGE_COUNT_BANDS[0], rangeLabel: `0-${MESSAGE_COUNT_LOW_THRESHOLD}` };
    }
    if (value <= MESSAGE_COUNT_MID_THRESHOLD) {
        return { ...MESSAGE_COUNT_BANDS[1], rangeLabel: `${MESSAGE_COUNT_LOW_THRESHOLD + 1}-${MESSAGE_COUNT_MID_THRESHOLD}` };
    }
    const upperBands = MESSAGE_COUNT_BANDS.slice(2);
    const upperMax = Math.max(max, MESSAGE_COUNT_MID_THRESHOLD + 1);
    const bandWidth = (upperMax - MESSAGE_COUNT_MID_THRESHOLD) / upperBands.length;
    const index = Math.min(upperBands.length - 1, Math.floor((value - MESSAGE_COUNT_MID_THRESHOLD) / bandWidth));
    const bandStart = Math.floor(MESSAGE_COUNT_MID_THRESHOLD + index * bandWidth) + 1;
    const bandEnd = index === upperBands.length - 1 ? upperMax : Math.floor(MESSAGE_COUNT_MID_THRESHOLD + (index + 1) * bandWidth);
    return { ...upperBands[index], rangeLabel: `${fmt(bandStart)}-${fmt(bandEnd)}` };
};

/**
 * Just the color from messageCountInfo, for call sites that don't need the
 * tooltip text.
 */
export const messageCountColor = (value, min, max) => messageCountInfo(value, min, max).color;

const URL_REGEX = /\bhttps?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#/%=~_|]/g;

/**
 * Split message text into plain-text and link segments, so URLs can be
 * rendered as clickable <a> tags without resorting to {@html} (message
 * content is untrusted-ish - it can contain anything a Discord message can).
 * @param text The raw message content
 * @returns Array of { type: 'text' | 'link', value }
 */
export const linkify = (text) => {
    const segments = [];
    let lastIndex = 0;
    for (const match of text.matchAll(URL_REGEX)) {
        if (match.index > lastIndex) segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        segments.push({ type: 'link', value: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) segments.push({ type: 'text', value: text.slice(lastIndex) });
    return segments;
};

export const getCreatedTimestamp = (id) => {
    const EPOCH = 1420070400000;
    return id / 4194304 + EPOCH;
};

export const getFavoriteWords = (words) => {
    words = words.flat(3);
    
    let item,
        length = words.length,
        array = [],
        object = {};
    
    for (let index = 0; index < length; index++) {
        item = words[index];
        if (!item) continue;
    
        if (!object[item]) object[item] = 1;
        else ++object[item];
    }
    
    for (let p in object) array[array.length] = p;
    
    return array.sort((a, b) => object[b] - object[a]).map((word) => ({ word: word, count: object[word] })).slice(0, 2);
};

/**
 * Generate a file structure dump from the zip files
 * @param files The files from the unzipped package
 * @returns A formatted string representing the file structure
 */
export const generateFileStructureDump = (files) => {
    if (!files || files.length === 0) return 'No files found in package';
    
    // Extract only first-level directories
    const directories = new Set();
    files.forEach(file => {
        const parts = file.name.split('/');
        // Only add the first directory level
        if (parts.length > 1 && parts[0]) {
            directories.add(parts[0]);
        }
    });
    
    // Convert to array and sort
    const sortedDirs = Array.from(directories).sort();
    
    // Format the structure
    let dump = `Total files: ${files.length}\n`;
    dump += `Root directories: ${sortedDirs.length}\n\n`;
    dump += 'Directory structure:\n';
    dump += '```\n';
    
    sortedDirs.forEach(dir => {
        dump += `${dir}/\n`;
    });
    
    dump += '```';
    return dump;
};

/**
 * Generate a GitHub issue URL with pre-filled error information
 * @param errorMessage The error message
 * @param fileStructure The file structure dump
 * @returns The GitHub issue URL
 */
export const generateGitHubIssueURL = (errorMessage, fileStructure) => {
    const repo = '2cuteflakes/local-explorer-for-discord-packages';
    const title = encodeURIComponent(`[Auto-Report] Package Processing Error`);
    
    const body = encodeURIComponent(
`**Error Message:**
${errorMessage}

**File Structure:**
${fileStructure}

**Browser:**
${navigator.userAgent}

**Date:**
${new Date().toISOString()}

**Additional Information:**
Please add any additional details about your Discord package that might help us investigate this issue.
`
    );
    
    return `https://github.com/${repo}/issues/new?title=${title}&body=${body}&labels=bug,auto-report`;
};
