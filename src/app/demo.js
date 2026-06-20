const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const demoUserObject = {
    id: 422820341791064085,
    username: 'Wumpus',
    discriminator: '0000',
    avatar: null
};
    
export default () => {

    const removeAnalytics = window.location.href.includes('noanalytics');

    const randomLastMessageAt = () => Date.now() - randomNumber(0, 365) * 24 * 60 * 60 * 1000;

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

    const demoMessages = (content) => new Array(15).fill({}).map(() => ({
        timestamp: randomLastMessageAt(),
        content,
        attachments: []
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
