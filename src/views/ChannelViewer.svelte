<script>
    import { blur } from 'svelte/transition';
    import { channelTranscripts } from '../app/store';
    import { linkify } from '../app/helpers';
    import Attachment from '../components/Attachment.svelte';

    export let channelId;

    $: transcript = $channelTranscripts[channelId];
</script>

<div class="dm-viewer" transition:blur>
    {#if transcript}
        <div class="dm-header">
            <div class="dm-avatar dm-avatar-emoji" aria-hidden="true">#️⃣</div>
            <div>
                {#if transcript.isGroupDM}
                    <!-- eslint-disable-next-line svelte/no-useless-mustaches -- {' '} is deliberate, not useless: Svelte 5 trims literal whitespace at the end of an {#if} block, so a plain ", " here silently loses its trailing space (see Svelte 5 migration guide's "Whitespace handling changed" section). -->
                    <h1>{transcript.name || 'Group DM'}{#if transcript.participants.length}: {#each transcript.participants as participant, i (participant.id)}{#if i > 0}{', '}{/if}<a class="dm-username-link" href="https://vaultcord.com/tools/discord-id-lookup?prefill={participant.id}" target="_blank" rel="noopener noreferrer">{participant.username}</a>{/each}{/if}</h1>
                {:else}
                    <h1>{transcript.name}</h1>
                    <small class="text-muted">{transcript.guildName}</small>
                {/if}
            </div>
        </div>
        <p class="dm-note">Only messages <strong>you</strong> sent are included in your data package, so this is a one-sided transcript.</p>
        <div class="dm-messages">
            {#each transcript.messages as message (message.id)}
                <div class="dm-message">
                    <div class="dm-message-meta">{new Date(message.timestamp).toLocaleString('en-US')}</div>
                    {#if message.content}
                        <div class="dm-message-content">
                            {#each linkify(message.content) as segment, i (i)}
                                {#if segment.type === 'link'}<a href="{segment.value}" target="_blank" rel="noopener noreferrer">{segment.value}</a>{:else}{segment.value}{/if}
                            {/each}
                        </div>
                    {/if}
                    {#if message.attachments.length}
                        <div class="dm-message-attachments">
                            {#each message.attachments as attachment (attachment)}
                                <Attachment url={attachment} />
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <p class="dm-note">This transcript isn't available. Channel content is kept in memory only and isn't saved between sessions, so reload your data package to view it again.</p>
    {/if}
</div>

<style>
    .dm-viewer {
        margin-top: 5rem;
        color: white;
        padding: 20px;
        max-width: 768px;
        margin-left: auto;
        margin-right: auto;
    }
    .dm-header {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .dm-header h1 {
        margin-bottom: 0;
    }
    .text-muted {
        color: #6c757d;
    }
    .dm-username-link {
        color: inherit;
        text-decoration: none;
    }
    .dm-username-link:hover {
        text-decoration: underline;
    }
    .dm-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: #50555a;
        padding: 10px;
        box-sizing: border-box;
        flex-shrink: 0;
    }
    .dm-avatar-emoji {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        padding: 0;
    }
    .dm-note {
        color: #6c757d;
    }
    .dm-messages {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .dm-message {
        background-color: #202225;
        border-radius: 10px;
        padding: 10px 15px;
    }
    .dm-message-meta {
        color: #6c757d;
        font-size: 0.8rem;
        margin-bottom: 4px;
    }
    .dm-message-content {
        white-space: pre-wrap;
        word-break: break-word;
    }
    .dm-message-content a {
        color: #00aff4;
        word-break: break-all;
    }
    .dm-message-attachments {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
    }
</style>
