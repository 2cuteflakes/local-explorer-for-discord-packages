import { describe, it, expect } from 'vitest';
import {
    getMessagesRoot,
    getServersRoot,
    getUserRoot,
    userFromID,
    parseMention,
    parseCSV,
    parseJson,
    lastMessageTimestamp,
    buildDmNames,
    hasCustomGroupDmName,
    groupDmParticipants,
    groupDmName,
    toTranscriptMessages,
    filterConfirmedPayments,
    netPaymentAmount,
    summarizePayments,
    countEventOccurrences,
    mapEventCountsToStatistics,
    analyticsEventNames
} from './extractor';

const f = (name) => ({ name });

describe('getMessagesRoot / getServersRoot / getUserRoot', () => {
    it('finds the messages root from a channel.json path', () => {
        expect(getMessagesRoot([f('Messages/c123456789012345678/channel.json')])).toBe('Messages');
    });

    it('throws when no channel.json is found', () => {
        expect(() => getMessagesRoot([f('Account/user.json')])).toThrow('Could not find Messages folder structure');
    });

    it('finds the servers root from a guild.json path, or null if absent', () => {
        expect(getServersRoot([f('Servers/123456789012345678/guild.json')])).toBe('Servers');
        expect(getServersRoot([f('Account/user.json')])).toBeNull();
    });

    it('finds the user root from a user.json path', () => {
        expect(getUserRoot([f('Account/user.json')])).toBe('Account');
    });

    it('throws when no user.json is found', () => {
        expect(() => getUserRoot([f('Messages/index.json')])).toThrow('Could not find User folder structure');
    });
});

describe('userFromID', () => {
    it('uses the dmNames display name when available', () => {
        const user = userFromID('111', { 111: 'testuser' });
        expect(user).toEqual({ id: '111', username: 'testuser', discriminator: '0', avatar: null });
    });

    it('falls back to the bare ID when there is no name', () => {
        expect(userFromID('111', {}).username).toBe('111');
    });

    it('falls back to the bare ID when the name is the "Unknown Participant" placeholder', () => {
        expect(userFromID('111', { 111: 'Unknown Participant' }).username).toBe('111');
        expect(userFromID('111', { 111: 'Direct Message with Unknown Participant' }).username).toBe('111');
    });
});

describe('parseMention', () => {
    it('extracts the user ID from a mention', () => {
        expect(parseMention('<@123456789>')).toBe('123456789');
        expect(parseMention('<@!123456789>')).toBe('123456789');
    });

    it('returns null for non-mention text', () => {
        expect(parseMention('hello')).toBeNull();
    });
});

describe('parseCSV / parseJson', () => {
    it('parses a messages CSV, dropping empty-content rows', () => {
        const csv = 'ID,Timestamp,Contents,Attachments\n123,2024-01-01T00:00:00Z,hello world,\n124,2024-01-01T00:01:00Z,,';
        const messages = parseCSV(csv);
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject({ id: '123', content: 'hello world', words: ['hello', 'world'], length: 11 });
    });

    it('parses a messages JSON array, dropping empty-content rows', () => {
        const json = JSON.stringify([
            { ID: '1', Timestamp: '2024-01-01T00:00:00Z', Contents: 'hi there', Attachments: '' },
            { ID: '2', Timestamp: '2024-01-01T00:01:00Z', Contents: '', Attachments: '' }
        ]);
        const messages = parseJson(json);
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject({ id: '1', content: 'hi there', words: ['hi', 'there'] });
    });
});

describe('lastMessageTimestamp', () => {
    it('returns the latest message timestamp when there are messages', () => {
        const channel = { data: { id: '1' }, messages: [{ timestamp: '2024-01-01T00:00:00Z' }, { timestamp: '2024-06-01T00:00:00Z' }] };
        expect(lastMessageTimestamp(channel)).toBe(new Date('2024-06-01T00:00:00Z').getTime());
    });

    it('falls back to the snowflake creation date when there are no messages', () => {
        const channel = { data: { id: '123456789012345678' }, messages: [] };
        expect(new Date(lastMessageTimestamp(channel)).toISOString()).toBe('2015-12-07T16:13:12.216Z');
    });
});

describe('buildDmNames', () => {
    it('maps DM partner IDs to their display name, stripping the "Direct Message with " prefix', () => {
        const channels = [
            { isDM: true, dmUserID: '1', name: 'Direct Message with testuser' },
            { isDM: true, dmUserID: '2', name: 'plainname' },
            { isDM: false, dmUserID: '3', name: 'a-guild-channel' },
            { isDM: true, dmUserID: '4', name: null }
        ];
        expect(buildDmNames(channels)).toEqual({ 1: 'testuser', 2: 'plainname' });
    });
});

describe('hasCustomGroupDmName', () => {
    it('is false for null, "None", and "Unknown channel"', () => {
        expect(hasCustomGroupDmName({ name: null })).toBe(false);
        expect(hasCustomGroupDmName({ name: 'None' })).toBe(false);
        expect(hasCustomGroupDmName({ name: 'Unknown channel' })).toBe(false);
    });

    it('is true for a real custom name', () => {
        expect(hasCustomGroupDmName({ name: 'Game Night Squad' })).toBe(true);
    });
});

describe('groupDmParticipants / groupDmName', () => {
    const me = 'me-id';
    const channel = (recipients, name) => ({ data: { recipients }, name });

    it('excludes the current user from the participant list', () => {
        const participants = groupDmParticipants(channel([me, 'a', 'b']), {}, me);
        expect(participants.map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('uses the custom name when one is set', () => {
        expect(groupDmName(channel([me, 'a'], 'Game Night Squad'), {}, me)).toBe('Game Night Squad');
    });

    it('joins resolved participant usernames when there is no custom name', () => {
        const dmNames = { a: 'alice', b: 'bob' };
        expect(groupDmName(channel([me, 'a', 'b'], null), dmNames, me)).toBe('alice, bob');
    });

    it('falls back to bare IDs for unresolved participants', () => {
        expect(groupDmName(channel([me, 'a'], 'None'), {}, me)).toBe('a');
    });

    it('falls back to the literal "Group DM" when there are no other participants at all', () => {
        expect(groupDmName(channel([], 'None'), {}, me)).toBe('Group DM');
        expect(groupDmName(channel([me], 'Unknown channel'), {}, me)).toBe('Group DM');
    });
});

describe('toTranscriptMessages', () => {
    it('maps and sorts messages chronologically, splitting space-separated attachments', () => {
        const channel = {
            messages: [
                { id: '2', timestamp: '2024-01-02T00:00:00Z', content: 'second', attachments: '' },
                { id: '1', timestamp: '2024-01-01T00:00:00Z', content: 'first', attachments: 'https://a.com/1.png https://a.com/2.png' }
            ]
        };
        const result = toTranscriptMessages(channel);
        expect(result.map((m) => m.id)).toEqual(['1', '2']);
        expect(result[0].attachments).toEqual(['https://a.com/1.png', 'https://a.com/2.png']);
        expect(result[1].attachments).toEqual([]);
    });
});

describe('payments: filterConfirmedPayments / netPaymentAmount / summarizePayments', () => {
    it('filters to only the succeeded status, excluding discord_orb currency', () => {
        const payments = [
            { status: 2, currency: 'usd', amount: 100 },
            { status: 1, currency: 'usd', amount: 200 }, // pending, excluded
            { status: 2, currency: 'discord_orb', amount: 9999 } // orb, excluded
        ];
        expect(filterConfirmedPayments(payments, 2)).toEqual([{ status: 2, currency: 'usd', amount: 100 }]);
    });

    it('nets out refunds', () => {
        expect(netPaymentAmount({ amount: 1000, amount_refunded: 300 })).toBe(7);
        expect(netPaymentAmount({ amount: 1000 })).toBe(10);
    });

    it('returns the zero default when there are no confirmed payments', () => {
        expect(summarizePayments([])).toEqual({ total: 'USD 0.00', list: '' });
    });

    it('summarizes a single currency', () => {
        const payments = [{ currency: 'usd', amount: 499, amount_refunded: 0, description: 'Nitro', created_at: '2024-01-01T00:00:00Z' }];
        const { total, list } = summarizePayments(payments);
        expect(total).toBe('USD 4.99');
        expect(list).toBe('Nitro (USD 4.99)');
    });

    it('summarizes and orders multiple currencies/payments chronologically', () => {
        const payments = [
            { currency: 'eur', amount: 500, amount_refunded: 0, description: 'B', created_at: '2024-02-01T00:00:00Z' },
            { currency: 'usd', amount: 1000, amount_refunded: 0, description: 'A', created_at: '2024-01-01T00:00:00Z' }
        ];
        const { total, list } = summarizePayments(payments);
        expect(total).toBe('EUR 5, USD 10');
        expect(list).toBe('A (USD 10)<br>B (EUR 5)');
    });
});

describe('countEventOccurrences', () => {
    const names = [['appOpened', 'app_opened'], ['sendMessage', 'send_message']];

    it('counts non-overlapping occurrences of each event name', () => {
        const { counts } = countEventOccurrences('app_opened app_opened send_message', '', names);
        expect(counts).toEqual({ appOpened: 2, sendMessage: 1 });
    });

    it('carries the previous chunk tail to catch a match split across chunks', () => {
        // "send_message" split across two chunks: "...send_mess" + "age..."
        const first = countEventOccurrences('xsend_mess', '', names);
        expect(first.counts.sendMessage).toBe(0);
        const second = countEventOccurrences('age more text', first.nextChunkEnd, names);
        expect(second.counts.sendMessage).toBe(1);
    });

    it('does not double count when an event name is a substring match boundary', () => {
        const { counts } = countEventOccurrences('app_openedapp_opened', '', names);
        expect(counts.appOpened).toBe(2);
    });

    it('uses the real analyticsEventNames by default', () => {
        const { counts } = countEventOccurrences('app_opened', '');
        expect(counts.appOpened).toBe(1);
        expect(Object.keys(counts)).toEqual(analyticsEventNames.map(([event]) => event));
    });
});

describe('mapEventCountsToStatistics', () => {
    it('maps internal event keys to the public statistics shape', () => {
        const stats = mapEventCountsToStatistics({
            appOpened: 1,
            joinVoiceChannel: 2,
            joinCall: 3,
            addReaction: 4,
            messageEdited: 5,
            sendMessage: 6,
            applicationCommandUsed: 7
        });
        expect(stats).toEqual({
            openCount: 1,
            joinVoiceChannelCount: 2,
            joinCallCount: 3,
            addReactionCount: 4,
            messageEditedCount: 5,
            sendMessageCount: 6,
            slashCommandUsedCount: 7
        });
    });
});
