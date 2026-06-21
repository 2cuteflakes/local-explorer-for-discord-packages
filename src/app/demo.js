const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const demoUserObject = {
    // Discord snowflakes are always strings in the real API, specifically
    // to avoid this - a bare numeric literal this large already loses
    // precision at the source.
    id: '422820341791064085',
    username: 'Wumpus',
    discriminator: '0000',
    avatar: null
};
    
export default () => {

    const removeAnalytics = window.location.href.includes('noanalytics');

    // Randomizes both the day AND the time of day - otherwise every demo
    // message lands at nearly the same wall-clock hour (today's hour, just
    // shifted by whole days), which the UTC hours chart never reveals (it
    // reads a separately-randomized hoursValues array) but recomputing
    // hours from these per-message timestamps for a different timezone
    // does, collapsing almost everything into 1-2 buckets.
    const randomLastMessageAt = () => Date.now() - randomNumber(0, 365) * 24 * 60 * 60 * 1000 - randomNumber(0, 24 * 60 * 60 - 1) * 1000;

    const dmChannels = new Array(20).fill({}).map((_, i) => ({
        id: `demo-dm-${i}`,
        messageCount: randomNumber(200, 600),
        lastMessageAt: randomLastMessageAt(),
        userData: demoUserObject
    }));
    const guildChannels = new Array(20).fill({}).map((_, i) => ({
        id: `demo-channel-${i}`,
        messageCount: randomNumber(200, 600),
        lastMessageAt: randomLastMessageAt(),
        name: 'awesome',
        guildName: 'AndrozDev'
    }));

    const topDMs = [...dmChannels].sort((a, b) => b.messageCount - a.messageCount).slice(0, 10);
    const allDMs = [...dmChannels].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    const topChannels = [...guildChannels].sort((a, b) => b.messageCount - a.messageCount).slice(0, 10);
    const allChannels = [...guildChannels].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // One message always carries a (fake, non-resolving) image attachment so
    // the attachment-preview feature has something to exercise via the demo
    // route, without depending on a real package or real network access.
    let demoMessageIdCounter = 0;
    const demoMessages = (content) => new Array(15).fill({}).map((_, i) => ({
        // Real messages key their {#each} block by id (see DMViewer/
        // ChannelViewer) - needs to be unique per message, same as a real package.
        id: `demo-message-${demoMessageIdCounter++}`,
        timestamp: randomLastMessageAt(),
        content,
        // A real, publicly-loadable Discord asset (the default embed
        // avatar) rather than a fake non-resolving URL, so the preview
        // actually shows something when browsing the demo by hand.
        attachments: i === 0 ? ['https://cdn.discordapp.com/embed/avatars/0.png'] : []
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const dmTranscripts = {};
    for (let dm of allDMs) {
        dmTranscripts[dm.id] = {
            userData: demoUserObject,
            messages: demoMessages('This is a demo message, your real DMs will show up here!')
        };
    }

    const channelTranscripts = {};
    for (let chan of allChannels) {
        channelTranscripts[chan.id] = {
            name: chan.name,
            guildName: chan.guildName,
            messages: demoMessages('This is a demo message, your real channel messages will show up here!')
        };
    }

    return {
        isDemo: true,

        user: demoUserObject,

        topDMs,
        topChannels,
        allDMs,
        allChannels,
        dmTranscripts,
        channelTranscripts,
        guildCount: randomNumber(10, 200),
        dmChannelCount: randomNumber(30, 50),
        channelCount: randomNumber(50, 100),
        messageCount: randomNumber(300, 600),
        characterCount: randomNumber(4000, 10000),
        totalSpent: randomNumber(100, 200),
        hoursValues: new Array(24).fill(0).map(() => Math.floor(Math.random() * 300) + 1),
        favoriteWords: [
            {
                word: 'Androz2091',
                count: randomNumber(600, 1000)
            },
            {
                word: 'wumpus',
                count: randomNumber(200, 600)
            }
        ],
        payments: {
            total: 0,
            list: ''
        },

        ...(!removeAnalytics && {
            openCount: randomNumber(200, 300),
            averageOpenCountPerDay: randomNumber(3, 5),
            joinVoiceChannelCount: randomNumber(40, 100),
            joinCallCount: randomNumber(20, 30),
            addReactionCount: randomNumber(100, 200),
            messageEditedCount: randomNumber(50, 70),
            sentMessageCount: randomNumber(200, 600),
            averageMessageCountPerDay: randomNumber(20, 30),
            slashCommandUsedCount: randomNumber(10, 20)
        })
    };
};
