<script>
    export let name;
    export let title = null;

    const storageKey = `card-collapsed-${name}`;
    let collapsed = false;
    // Without a title there's no header/toggle to control collapsed state
    // with, so ignore any state a previous title-bearing version of this
    // card might have left behind - otherwise content could get stuck
    // hidden with no way to bring it back.
    if (title) {
        try {
            collapsed = localStorage.getItem(storageKey) === 'true';
        } catch {
            // localStorage unavailable - just default to expanded.
        }
    }

    function toggle() {
        collapsed = !collapsed;
        try {
            localStorage.setItem(storageKey, collapsed ? 'true' : 'false');
        } catch {
            // Not persisted, but the toggle still works for this session.
        }
    }
</script>

<div class="card {name}">
    {#if title}
        <button type="button" class="card-header" on:click={toggle} aria-expanded={!collapsed}>
            <h2 class="card-title">{title}</h2>
            <svg class="card-chevron" class:collapsed xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
    {/if}
    {#if !collapsed}
        <div class="card-content">
            <slot></slot>
        </div>
    {/if}
</div>

<style>
    .card {
        background-color: #202225;
        border-radius: 10px;
        overflow: hidden;
    }
    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background-color: var(--box-background-color);
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 16px 20px;
        font: inherit;
        text-align: left;
    }
    .card-title {
        margin: 0;
        font-size: 1.3rem;
    }
    .card-chevron {
        flex-shrink: 0;
        margin-left: 0.5rem;
        transition: transform 0.15s ease;
    }
    .card-chevron.collapsed {
        transform: rotate(-90deg);
    }
    .card-content {
        padding: 20px;
    }
    @media (min-width: 600px) {
        .card.hours {
            grid-column: 1 / 12;
        }
    }
</style>
