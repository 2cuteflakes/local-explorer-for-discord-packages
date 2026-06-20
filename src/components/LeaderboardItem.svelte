<script>
    import { link } from 'svelte-routing';
    import SvelteTooltip from 'svelte-tooltip';

    export let name;
    export let discriminator = null;
    export let guild = null;
    export let position;
    export let avatarURL = null;
    export let count;
    export let channel = false;
    export let lastMessageAt = null;
    export let linkTo = null;
    export let countColor = null;
    export let countRangeLabel = null;
    export let countMessage = null;

    const formattedDate = lastMessageAt ? new Date(lastMessageAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
</script>

<div class="top-item">
    <div class="top-whois">
        <div class="top-bubble { position === 0 ? 'first' : position === 1 ? 'second' : position === 2 ? 'third' : '' }">{ position + 1 }</div>
        {#if channel}
            <div class="top-avatar top-avatar-emoji" aria-hidden="true">#️⃣</div>
        {:else if avatarURL}
            <img class="top-avatar" src="{avatarURL}" alt="Avatar" />
        {:else}
            <div class="top-avatar top-avatar-emoji" aria-hidden="true">✉️</div>
        {/if}
        <h3 class="top-name">
            {#if linkTo}
                <a class="top-name-link" href={linkTo} use:link>{name}</a>
            {:else}
                {name}
            {/if}
            <small class="text-muted channel">{channel ? guild : `#${discriminator}`}</small>
        </h3>
    </div>
    <div class="top-messages">
        <h3>
            {#if countRangeLabel && countMessage}
                <SvelteTooltip bottom>
                    <span style={countColor ? `color: ${countColor}` : ''}>{count}</span>
                    <div slot="custom-tip" class="count-tooltip">
                        <strong>{countRangeLabel} messages</strong>
                        <span>{countMessage}</span>
                    </div>
                </SvelteTooltip>
            {:else}
                <span style={countColor ? `color: ${countColor}` : ''}>{count}</span>
            {/if}
            <small>messages</small>
        </h3>
        {#if formattedDate}
            <small class="text-muted last-message">Last message: {formattedDate}</small>
        {/if}
    </div>
</div>

<style>
    .count-tooltip {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background-color: #050505;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        white-space: normal;
        text-align: left;
        max-width: 220px;
    }
    .count-tooltip strong {
        font-size: 0.85rem;
    }
    .count-tooltip span {
        font-size: 0.8rem;
        color: #b9bbbe;
    }
    .text-muted {
        color: #6c757d;
    }
    .text-muted.channel {
        white-space: nowrap;
    }
    .top-name-link {
        color: white;
        text-decoration: none;
    }
    .top-name-link:hover {
        text-decoration: underline;
    }
    .top-item {
        display: flex;
        flex-direction: row;
        border-bottom: 1px solid white;
        align-items: center;
        justify-content: space-between;
    }
    .top-whois {
        padding: 8px;
        align-items: center;
        display: flex;
        min-width: 0;
        width: 100%;
    }
    .top-item:last-child {
        border-bottom: 0;
    }
    .top-avatar {
        border-radius: 50%;
        height: 50px;
        width: 50px;
        margin-right: 10px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
    }
    .top-avatar-emoji {
        background-color: #50555a;
        font-size: 1.4rem;
    }
    .top-name {
        margin-left: inherit;
        display: flex;
        flex-direction: column;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .top-messages {
        flex-shrink: 0;
        text-align: right;
    }
    .last-message {
        display: block;
    }
    .top-bubble {
        align-items: center;
        justify-content: center;
        display: flex;
        flex: 0 0 35px;
        height: 35px;
        background-color: #50555a;
        border-radius: 50%;
        margin-right: 10px;
    }
    .top-bubble.first {
        background-color: #da9e3b;
    }
    .top-bubble.second {
        background-color: #989898;
    }
    .top-bubble.third {
        background-color: #ae7441;
    }
</style>
