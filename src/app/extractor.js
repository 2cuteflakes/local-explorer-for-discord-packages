import Papa from 'papaparse';

import eventsData from './events.json';
import { loadEstimatedTime, loadTask } from './store';
import { getCreatedTimestamp, getFavoriteWords, escapeHtml } from './helpers';
import { DecodeUTF8 } from 'fflate';
import { snakeCase } from 'snake-case';

export const getMessagesRoot = (files) => {
    // Find any channel.json inside a numbered folder
    const sample = files.find(f => /\/c?[0-9]{16,32}\/channel\.json$/.test(f.name));
    if (!sample) throw new Error('Could not find Messages folder structure');
    // Remove the channel ID and file name to get the root
    const segments = sample.name.split('/');
    return segments.slice(0, segments.length - 2).join('/');
};

export const getServersRoot = (files) => {
    // Find any guild.json inside a numbered folder
    const sample = files.find(f => /\/[0-9]{16,32}\/guild\.json$/.test(f.name));
    if (!sample) return null;
    // Remove the guild ID and file name to get the root
    const segments = sample.name.split('/');
    return segments.slice(0, segments.length - 2).join('/');
};

/*
 * Gets the root of the user folder.
 *
 * Important: we cannot simply use the first user.json file found, because the package can contain multiple files.
 *
 *   * Activités/Activities_1/users/user.json
 *   * Compte/user.json
 */
export const getUserRoot = (files) => {
    // Find any user.json file
    const sample = files.find(f => /^([^/]+)\/user\.json$/.test(f.name));
    if (!sample) throw new Error('Could not find User folder structure');
    // Remove the file name to get the root
    const segments = sample.name.split('/');
    return segments.slice(0, segments.length - 1).join('/');
};

/**
 * Build a user object for display, using the name from Messages/index.json
 * when the user is a DM partner (the only place the package names other
 * users), falling back to the raw ID otherwise. The package never contains
 * other users' avatars.
 * @param userID The ID of the user
 * @param dmNames Map of DM partner user ID -> display name, from Messages/index.json
 */
export const userFromID = (userID, dmNames = {}) => ({
    id: userID,
    username: (dmNames[userID] && !dmNames[userID].includes('Unknown Participant')) ? dmNames[userID] : `${userID}`,
    discriminator: '0',
    avatar: null
});

/**
 * Parse the mention to return a user ID
 */
export const parseMention = (mention) => {
    const mentionRegex = /^<@!?(\d+)>$/;
    return mentionRegex.test(mention) ? mention.match(mentionRegex)[1] : null;
};

/**
 * Parse a messages CSV into an object
 * @param input
 */
export const parseCSV = (input) => {
    return Papa.parse(input, {
        header: true,
        newline: ',\r'
    })
        .data
        .filter((m) => m.Contents)
        .map((m) => ({
            id: m.ID,
            timestamp: m.Timestamp,
            length: m.Contents.length,
            words: m.Contents.split(' '),
            content: m.Contents,
            attachments: m.Attachments
        }));
};

/**
 * Parse a messages JSON into an object
 * @param input
 */
export const parseJson = (input) => {
    return JSON.parse(input)
        .filter((m) => m.Contents)
        .map((m) => ({
            id: m.ID,
            timestamp: m.Timestamp,
            length: m.Contents.length,
            words: m.Contents.split(' '),
            content: m.Contents,
            attachments: m.Attachments
        }));
};

export const perDay = (value, userID) => {
    return parseInt(value / ((Date.now() - getCreatedTimestamp(userID)) / 24 / 60 / 60 / 1000));
};

// Some DMs (and the occasional channel) have zero messages - e.g. opening
// someone's profile creates the DM channel even if you never send anything.
// Channel IDs are Discord snowflakes, which encode their own creation
// timestamp, so fall back to decoding that instead of showing no date at all.
export const lastMessageTimestamp = (channel) => channel.messages.reduce((latest, message) => {
    const t = new Date(message.timestamp).getTime();
    return t > latest ? t : latest;
}, 0) || getCreatedTimestamp(channel.data.id);

// Messages/index.json names DM channels after the other participant - it's
// the only place in the package other users get a display name. Discord
// sometimes formats that name as "Direct Message with X" rather than just
// "X" - strip the redundant prefix since DMs are already labelled as such
// everywhere we display this.
export const buildDmNames = (channels) => {
    const dmNames = {};
    for (let channel of channels) {
        if (channel.isDM && channel.dmUserID && channel.name) {
            dmNames[channel.dmUserID] = channel.name.replace(/^Direct Message with /i, '');
        }
    }
    return dmNames;
};

// Group DMs aren't true 1:1 DMs - they behave more like informal channels,
// so list them alongside guild channels (using the participant list as a
// stand-in "guild name") instead of dropping them entirely. Discord
// serializes an unset custom name as the literal string "None" rather than
// null/empty.
export const hasCustomGroupDmName = (channel) => Boolean(channel.name) && channel.name !== 'None' && channel.name !== 'Unknown channel';

export const groupDmParticipants = (channel, dmNames, currentUserId) => (channel.data.recipients || [])
    .filter((id) => id !== currentUserId)
    .map((id) => userFromID(id, dmNames));

export const groupDmName = (channel, dmNames, currentUserId) => {
    if (hasCustomGroupDmName(channel)) return channel.name;
    const participantNames = groupDmParticipants(channel, dmNames, currentUserId).map((p) => p.username);
    return participantNames.length ? participantNames.join(', ') : 'Group DM';
};

// Kept separate from the rest of extractedData because it holds raw message
// content, which (unlike everything else) must never be persisted to
// localStorage. The caller is responsible for splitting this out before
// storing the rest of extractedData.
export const toTranscriptMessages = (channel) => channel.messages
    .map((m) => ({
        id: m.id,
        timestamp: m.timestamp,
        content: m.content,
        // Multiple attachment URLs are space-separated, not comma-separated -
        // a literal comma would otherwise mangle a single URL's query string.
        attachments: (m.attachments || '').split(/\s+/).map((a) => a.trim()).filter(Boolean)
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

// Discord Orbs are a virtual currency awarded via Quests / events - the user
// never pays real money for them, and the `amount` is denominated in orbs
// (not cents). Including these would tell e.g. a user with €0 of real spend
// but 29 720 orbs of cosmetic purchases that they spent "DISCORD_ORB
// 297.20", which is meaningless. Drop them alongside the status filter.
export const filterConfirmedPayments = (allPayments, paymentSucceededStatus) =>
    allPayments.filter((p) => p.status === paymentSucceededStatus && p.currency !== 'discord_orb');

export const netPaymentAmount = (p) => (p.amount - (p.amount_refunded || 0)) / 100;

export const summarizePayments = (confirmedPayments) => {
    if (!confirmedPayments.length) return { total: 'USD 0.00', list: '' };
    const totalsByCurrency = {};
    for (let p of confirmedPayments) {
        totalsByCurrency[p.currency] = (totalsByCurrency[p.currency] || 0) + netPaymentAmount(p);
    }
    // p.description is Discord-generated, not user-typed, but we don't
    // control or validate its contents - this gets rendered via {@html} in
    // Stats.svelte's payments popup, so it needs escaping like any other
    // untrusted-ish string would.
    const list = confirmedPayments
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((p) => `${escapeHtml(p.description)} (${p.currency.toUpperCase()} ${netPaymentAmount(p)})`)
        .join('<br>');
    const total = Object.keys(totalsByCurrency)
        .map((currency) => `${currency.toUpperCase()} ${totalsByCurrency[currency].toLocaleString('en-US')}`)
        .join(', ');
    return { total, list };
};

// The list of [eventKey, snake_case_event_name] pairs scanned for in the
// analytics file, plus how long a chunk-boundary tail needs to be kept to
// catch an event name split across two chunks.
export const analyticsEventNames = eventsData.eventsEnabled.map((event) => [event, snakeCase(event)]);
export const maxAnalyticsEventNameLength = Math.max(...analyticsEventNames.map(([, name]) => name.length));

/**
 * Count occurrences of each tracked event name within a chunk of decoded
 * analytics-file text, carrying over enough of the previous chunk's tail to
 * catch a match split across the chunk boundary.
 * @param text The newly-decoded chunk of text
 * @param prevChunkEnd The tail kept from the previous call (or '' for the first chunk)
 * @param eventNames Defaults to the real analyticsEventNames - overridable for tests
 * @returns { counts, nextChunkEnd }
 */
export const countEventOccurrences = (text, prevChunkEnd = '', eventNames = analyticsEventNames) => {
    const str = prevChunkEnd + text;
    const counts = {};
    for (let [event, eventName] of eventNames) {
        counts[event] = 0;
        let searchFrom = 0;
        let ind;
         
        while ((ind = str.indexOf(eventName, searchFrom)) !== -1) {
            counts[event]++;
            searchFrom = ind + eventName.length;
        }
    }
    const maxLength = Math.max(...eventNames.map(([, name]) => name.length));
    const nextChunkEnd = str.slice(-(maxLength - 1));
    return { counts, nextChunkEnd };
};

export const mapEventCountsToStatistics = (eventsOccurrences) => ({
    openCount: eventsOccurrences.appOpened,
    joinVoiceChannelCount: eventsOccurrences.joinVoiceChannel,
    joinCallCount: eventsOccurrences.joinCall,
    addReactionCount: eventsOccurrences.addReaction,
    messageEditedCount: eventsOccurrences.messageEdited,
    sendMessageCount: eventsOccurrences.sendMessage,
    slashCommandUsedCount: eventsOccurrences.applicationCommandUsed
});

export const readAnalyticsFile = (file) => {
    return new Promise((resolve) => {
        if (!file) return resolve({});
        const eventsOccurrences = {};
        for (let [event] of analyticsEventNames) eventsOccurrences[event] = 0;
        const decoder = new DecodeUTF8();
        let startAt = Date.now();
        let bytesRead = 0;
        file.ondata = (_err, data, final) => {
            bytesRead += data.length;
            loadTask.set(`Loading user statistics... ${Math.ceil(bytesRead / file.originalSize * 100)}%`);
            const remainingBytes = file.originalSize-bytesRead;
            const timeToReadByte = (Date.now()-startAt) / bytesRead;
            const remainingTime = parseInt(remainingBytes * timeToReadByte / 1000);
            loadEstimatedTime.set(`Estimated time: ${remainingTime+1} second${remainingTime+1 === 1 ? '' : 's'}`);
            decoder.push(data, final);
        };
        let prevChkEnd = '';
        decoder.ondata = (str, final) => {
            const { counts, nextChunkEnd } = countEventOccurrences(str, prevChkEnd);
            for (let [event] of analyticsEventNames) eventsOccurrences[event] += counts[event];
            prevChkEnd = nextChunkEnd;
            if (final) resolve(mapEventCountsToStatistics(eventsOccurrences));
        };
        file.start();
    });
};

/**
 * Extract the data from the package file.
 * @param files The files in the package
 * @returns The extracted data
 */
export const extractData = async (files) => {

    const extractedData = {
        user: null,

        topDMs: [],
        topChannels: [],
        allDMs: [],
        allChannels: [],
        guildCount: 0,
        dmChannelCount: 0,
        channelCount: 0,
        messageCount: 0,
        characterCount: 0,
        totalSpent: 0,
        hoursValues: [],
        favoriteWords: null,
        payments: {
            total: 'USD 0.00',
            list: ''
        }
    };

    const accountFolder = getUserRoot(files);
    const serversFolder = getServersRoot(files);
    const messagesRoot = getMessagesRoot(files);

    console.log('[debug] Found account folder:', accountFolder);
    console.log('[debug] Found servers folder:', serversFolder);
    console.log('[debug] Found messages root:', messagesRoot);

    const getFile = (name) => files.find((file) => file.name === name);
    // Read a file from its name
    const readFile = (name) => {
        return new Promise((resolve) => {
            const file = getFile(name);
            if (!file) return resolve(null);
            const fileContent = [];
            const decoder = new DecodeUTF8();
            file.ondata = (err, data, final) => {
                decoder.push(data, final);
            };
            decoder.ondata = (str, final) => {
                fileContent.push(str);
                if (final) resolve(fileContent.join(''));
            };
            file.start();
        });
    };

    // Parse and load current user informations
    console.log('[debug] Loading user info...');
    loadTask.set('Loading user information...');

    extractedData.user = JSON.parse(await readFile(`${accountFolder}/user.json`));
    extractedData.user.avatar_hash = extractedData.user.avatar_hash || extractedData.user.avatar || null;
    extractedData.user.discriminator = extractedData.user.discriminator || '0';
    extractedData.user.username = extractedData.user.username || 'Unknown';

    // Payments used to be inlined in user.json as `user.payments`. They've
    // since moved to their own export under Account/user_data_exports/
    // discord_billing/payments.json, as a { records: [...] } table, and the
    // `status` codes were renumbered (1 = Pending, 2 = Succeeded now, where
    // 1 used to mean confirmed). Support both shapes.
    const billingPaymentsRaw = await readFile(`${accountFolder}/user_data_exports/discord_billing/payments.json`);
    const allPayments = billingPaymentsRaw
        ? JSON.parse(billingPaymentsRaw).records
        : (extractedData.user.payments || []);
    const paymentSucceededStatus = billingPaymentsRaw ? 2 : 1;

    const confirmedPayments = filterConfirmedPayments(allPayments, paymentSucceededStatus);
    extractedData.payments = summarizePayments(confirmedPayments);
    console.log('[debug] User info loaded.');

    // Parse and load channels
    console.log('[debug] Loading channels...');
    loadTask.set('Loading user messages...');

    const messagesIndex = JSON.parse(await readFile(`${messagesRoot}/index.json`));

    const messagesPathRegex = /c?([0-9]{16,32})\/$/;
    const channelsIDsFile = files.filter((file) => messagesPathRegex.test(file.name) && file.name.startsWith(messagesRoot));

    // Packages before 06-12-2021 does not have the leading "c" before the channel ID
    const isOldPackage = channelsIDsFile[0].name.match(/(c)?([0-9]{16,32})\/$/)[1] === undefined;
    const channelsIDs = channelsIDsFile.map((file) => file.name.match(messagesPathRegex)[1]);

    // Packages before 01-03-2024 does not have json files for messages but csv files
    const isOldPackagev2 = files.find((file) => /c?([0-9]{16,32})\/messages.json/.test(file.name)) === undefined;

    console.log(`[debug] Old package (2021): ${isOldPackage}`);
    console.log(`[debug] Old package (2024): ${isOldPackagev2}`);

    const channels = [];
    let messagesRead = 0;

    await Promise.all(channelsIDs.map((channelID) => {
        return new Promise((resolve) => {

            const channelDataPath = `${messagesRoot}/${isOldPackage ? '' : 'c'}${channelID}/channel.json`;
            const extension = isOldPackagev2 ? 'csv' : 'json';
            const channelMessagesPath = `${messagesRoot}/${isOldPackage ? '' : 'c'}${channelID}/messages.${extension}`;

            Promise.all([
                readFile(channelDataPath),
                readFile(channelMessagesPath)
            ]).then(([ rawData, rawMessages ]) => {

                if (!rawData || !rawMessages) {
                    console.log(`[debug] Files of channel ${channelID} can't be read. Data is ${!!rawData} and messages are ${!!rawMessages}. (path=${channelDataPath})`);
                    return resolve();
                } else messagesRead++;

                const data = JSON.parse(rawData);
                const messages = extension === 'csv' ? parseCSV(rawMessages) : parseJson(rawMessages);
                const name = messagesIndex[data.id];
                // A group DM can shrink down to just 2 remaining recipients
                // over time but keeps its GROUP_DM type, so recipient count
                // alone isn't a reliable way to tell it apart from a true DM.
                const isDM = data.type === 'DM';
                const isGroupDM = data.type === 'GROUP_DM';
                const dmUserID = isDM ? data.recipients.find((userID) => userID !== extractedData.user.id) : undefined;
                channels.push({
                    data,
                    messages,
                    name,
                    isDM,
                    isGroupDM,
                    dmUserID
                });

                resolve();
            });

        });
    }));

    if (messagesRead === 0) throw new Error('invalid_package_missing_messages');

    loadTask.set('Calculating statistics...');

    extractedData.channelCount = channels.filter(c => !c.isDM).length;
    extractedData.dmChannelCount = channels.length - extractedData.channelCount;

    const dmNames = buildDmNames(channels);
    const currentUserId = extractedData.user.id;

    const guildChannels = channels.filter(c => (c.data && c.data.guild) || c.isGroupDM).map((channel) => ({
        id: channel.data.id,
        name: channel.isGroupDM ? groupDmName(channel, dmNames, currentUserId) : channel.name,
        messageCount: channel.messages.length,
        guildName: channel.isGroupDM ? 'Group DM' : channel.data.guild.name,
        lastMessageAt: lastMessageTimestamp(channel)
    }));
    extractedData.topChannels = [...guildChannels].sort((a, b) => b.messageCount - a.messageCount).slice(0, 10);
    extractedData.allChannels = [...guildChannels].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    extractedData.characterCount = channels.map((channel) => channel.messages).flat().map((message) => message.length).reduce((p, c) => p + c);

    // Message timestamps in the package are UTC. Bucket by UTC here so the
    // persisted default is deterministic regardless of the browser's local
    // timezone setting - the Stats page offers a timezone picker that
    // recomputes this from the in-memory transcripts for the current session.
    const allMessageTimestamps = channels.map((c) => c.messages).flat().map((m) => m.timestamp);
    for (let i = 0; i < 24; i++) {
        extractedData.hoursValues.push(allMessageTimestamps.filter((t) => new Date(t).getUTCHours() === i).length);
    }

    console.log(`[debug] ${channels.length} channels loaded.`);

    console.log('[debug] Loading guilds...');
    loadTask.set('Loading joined servers...');

    if (serversFolder) {
        const guildIndex = JSON.parse(await readFile(`${serversFolder}/index.json`));
        extractedData.guildCount = Object.keys(guildIndex).length;
    }

    console.log(`[debug] ${extractedData.guildCount} guilds loaded`);

    const words = channels.map((channel) => channel.messages).flat().map((message) => message.words).flat().filter((w) => w.length > 5);
    extractedData.favoriteWords = getFavoriteWords(words);
    for (let wordData of extractedData.favoriteWords) {
        const userID = parseMention(wordData.word);
        if (userID) {
            extractedData.favoriteWords[extractedData.favoriteWords.findIndex((wd) => wd.word === wordData.word)] = {
                word: `@${userFromID(userID, dmNames).username}`,
                count: wordData.count
            };
        }
    }

    console.log('[debug] Fetching top DMs...');
    loadTask.set('Loading user activity...');

    const dmChannels = channels
        .filter((channel) => channel.isDM)
        .map((channel) => ({
            id: channel.data.id,
            dmUserID: channel.dmUserID,
            messageCount: channel.messages.length,
            lastMessageAt: lastMessageTimestamp(channel),
            userData: userFromID(channel.dmUserID, dmNames)
        }));
    extractedData.topDMs = [...dmChannels].sort((a, b) => b.messageCount - a.messageCount).slice(0, 10);
    extractedData.allDMs = [...dmChannels].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    console.log(`[debug] ${extractedData.topDMs.length} top DMs loaded.`);

    extractedData.dmTranscripts = {};
    for (let channel of channels.filter((c) => c.isDM)) {
        extractedData.dmTranscripts[channel.data.id] = {
            userData: userFromID(channel.dmUserID, dmNames),
            messages: toTranscriptMessages(channel)
        };
    }

    extractedData.channelTranscripts = {};
    for (let channel of channels.filter((c) => (c.data && c.data.guild) || c.isGroupDM)) {
        extractedData.channelTranscripts[channel.data.id] = channel.isGroupDM ? {
            // Keep the custom name (if any) separate from the participant
            // list, so the viewer isn't stuck saying "X, Y: X, Y" when the
            // name itself is just the participants joined together.
            name: hasCustomGroupDmName(channel) ? channel.name : null,
            guildName: 'Group DM',
            isGroupDM: true,
            participants: groupDmParticipants(channel, dmNames, currentUserId),
            messages: toTranscriptMessages(channel)
        } : {
            name: channel.name,
            guildName: channel.data.guild.name,
            isGroupDM: false,
            messages: toTranscriptMessages(channel)
        };
    }

    loadTask.set('Calculating statistics...');
    console.log('[debug] Fetching activity...');

    // Discord has moved this around over time: it used to live under
    // "analytics/events-...json", and is now under "Activity/<subfolder>/
    // events-...json" with the subfolder name varying (e.g. "reporting",
    // "tns"). Read every matching file and sum the counts together, since
    // an unrelated/empty one just contributes zeroes.
    const analyticsFiles = files.filter((file) => /events-[0-9]+-[0-9]+-of-[0-9]+\.json$/i.test(file.name));
    console.log('[debug] Found analytics files:', analyticsFiles.map((f) => f.name));
    const statisticsParts = await Promise.all(analyticsFiles.map((file) => readAnalyticsFile(file)));
    const statistics = statisticsParts.reduce((acc, part) => {
        for (let key of Object.keys(part)) acc[key] = (acc[key] || 0) + part[key];
        return acc;
    }, {});
    extractedData.openCount = statistics.openCount;
    extractedData.averageOpenCountPerDay = extractedData.openCount && perDay(statistics.openCount, extractedData.user.id);
    extractedData.joinVoiceChannelCount = statistics.joinVoiceChannelCount;
    extractedData.joinCallCount = statistics.joinCallCount;
    extractedData.addReactionCount = statistics.addReactionCount;
    extractedData.messageEditedCount = statistics.messageEditedCount;
    extractedData.sentMessageCount = statistics.sendMessageCount;
    extractedData.averageMessageCountPerDay = extractedData.sentMessageCount && perDay(extractedData.sentMessageCount, extractedData.user.id);
    extractedData.slashCommandUsedCount = statistics.slashCommandUsedCount;

    console.log('[debug] Activity fetched...');

    loadTask.set('Calculating statistics...');

    console.log(extractedData);

    return extractedData;
};
