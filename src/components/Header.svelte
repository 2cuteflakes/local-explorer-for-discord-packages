<script>
    import { link, navigate } from 'svelte-routing';
    import { getContext, onMount, onDestroy } from 'svelte';
    import { loadTask, loadEstimatedTime, currentFile, dmTranscripts, channelTranscripts } from '../app/store';
    import { loadPackageFile, LoadError } from '../app/loader';
    import Modal from './Modal.svelte';

    let inputEl;
    let loading = false;

    const { open } = getContext('simple-modal');

    const showError = (message, reportURL) => {
        let html = `<h3 style="text-align: center;">${message}</h3>`;
        if (reportURL) {
            html += `<div style="margin-top: 1rem; padding: 0.75rem; background-color: rgba(249, 168, 37, 0.1); border-radius: 0.3rem; border-left: 3px solid #f9a825;">
                <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">It would be an immense help if you can report this problem (it takes one click, everything is pre-filled) on GitHub so we have all the details needed to help you.</p>
                <a href="${reportURL}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 0.5rem 1rem; background-color: #f9a825; color: black !important; text-decoration: none; border-radius: 0.3rem; font-size: 0.9rem;">Send the issue on GitHub</a>
            </div>`;
        }
        open(Modal, { message: html });
    };

    async function handleFile(file) {
        loading = true;
        currentFile.set(file);
        try {
            await loadPackageFile(file);
            navigate('/stats');
        } catch (err) {
            if (err instanceof LoadError) showError(err.message, err.reportURL);
            else {
                console.error(err);
                showError('Something went wrong while reading your package.');
            }
        } finally {
            loading = false;
        }
    }

    const pickFile = () => inputEl.click();
    const refresh = () => $currentFile && handleFile($currentFile);

    // Search across every DM and channel transcript kept in memory.
    const MAX_SEARCH_RESULTS = 50;
    const SNIPPET_CONTEXT = 40;

    let searchQuery = '';
    let searchResults = [];
    let searchOpen = false;
    let searchTimeout;
    let searchContainerEl;

    function snippetOf(content, query) {
        const idx = content.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return { pre: content, match: '', post: '' };
        const start = Math.max(0, idx - SNIPPET_CONTEXT);
        const end = Math.min(content.length, idx + query.length + SNIPPET_CONTEXT);
        return {
            pre: (start > 0 ? '…' : '') + content.slice(start, idx),
            match: content.slice(idx, idx + query.length),
            post: content.slice(idx + query.length, end) + (end < content.length ? '…' : '')
        };
    }

    function runSearch(query) {
        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            searchResults = [];
            return;
        }
        const results = [];
        dmLoop: for (let [channelId, transcript] of Object.entries($dmTranscripts)) {
            for (let message of transcript.messages) {
                if (message.content && message.content.toLowerCase().includes(q)) {
                    results.push({ type: 'dm', channelId, name: transcript.userData.username, message, snippet: snippetOf(message.content, q) });
                    if (results.length >= MAX_SEARCH_RESULTS) break dmLoop;
                }
            }
        }
        if (results.length < MAX_SEARCH_RESULTS) {
            channelLoop: for (let [channelId, transcript] of Object.entries($channelTranscripts)) {
                for (let message of transcript.messages) {
                    if (message.content && message.content.toLowerCase().includes(q)) {
                        results.push({ type: 'channel', channelId, name: transcript.name, guildName: transcript.guildName, message, snippet: snippetOf(message.content, q) });
                        if (results.length >= MAX_SEARCH_RESULTS) break channelLoop;
                    }
                }
            }
        }
        results.sort((a, b) => new Date(b.message.timestamp) - new Date(a.message.timestamp));
        searchResults = results;
    }

    function onSearchInput() {
        searchOpen = true;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => runSearch(searchQuery), 200);
    }

    function goToResult(result) {
        searchOpen = false;
        searchQuery = '';
        searchResults = [];
        navigate(result.type === 'dm' ? `/dm/${result.channelId}` : `/channel/${result.channelId}`);
    }

    function onWindowClick(event) {
        if (searchContainerEl && !searchContainerEl.contains(event.target)) searchOpen = false;
    }

    function onSearchKeydown(event) {
        if (event.key === 'Escape') searchOpen = false;
    }

    onMount(() => window.addEventListener('click', onWindowClick));
    onDestroy(() => window.removeEventListener('click', onWindowClick));
</script>

<input
    type="file"
    accept=".zip"
    bind:this={inputEl}
    style="display: none;"
    on:change={(e) => e.target.files[0] && handleFile(e.target.files[0])}
/>

<div class="app-header">
    <div class="app-header-container">
        <div class="app-header-left">
            <div class="app-header-icon tag"><a href="/" use:link>📦</a></div>
            <h1 on:click="{() => navigate('/')}">Local Explorer for Discord Packages</h1>
        </div>
        <div class="app-header-right">
            <div class="app-header-loader">
                {#if loading}
                    <span class="app-header-status">{$loadTask || 'Loading...'}{#if $loadEstimatedTime} — {$loadEstimatedTime}{/if}</span>
                {:else}
                    {#if $currentFile}
                        <span class="app-header-filename" title={$currentFile.name}>{$currentFile.name}</span>
                    {/if}
                    <button class="app-header-btn" on:click={pickFile}>Load Packet</button>
                    {#if $currentFile}
                        <button class="app-header-btn app-header-btn-icon" title="Reload this package" aria-label="Reload this package" on:click={refresh}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    {/if}
                {/if}
            </div>
            <div class="app-header-separator"></div>
            <div class="app-header-search" bind:this={searchContainerEl}>
                <input
                    type="text"
                    class="app-header-search-input"
                    placeholder="Search messages..."
                    bind:value={searchQuery}
                    on:input={onSearchInput}
                    on:focus={() => searchOpen = true}
                    on:keydown={onSearchKeydown}
                />
                <button type="button" class="app-header-btn app-header-btn-icon" title="Search" aria-label="Search" on:click={() => { searchOpen = true; runSearch(searchQuery); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
                </button>
                {#if searchOpen && searchQuery.trim().length >= 2}
                    <div class="app-header-search-results">
                        {#if searchResults.length === 0}
                            <div class="app-header-search-empty">No matches found.</div>
                        {:else}
                            {#each searchResults as result}
                                <button type="button" class="app-header-search-result" on:click={() => goToResult(result)}>
                                    <div class="app-header-search-result-name">
                                        <span>{result.name}{#if result.type === 'channel'} <small class="text-muted">#{result.guildName}</small>{/if}</span>
                                        <small class="text-muted app-header-search-result-date">{new Date(result.message.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</small>
                                    </div>
                                    <div class="app-header-search-result-snippet">{result.snippet.pre}<mark>{result.snippet.match}</mark>{result.snippet.post}</div>
                                </button>
                            {/each}
                            {#if searchResults.length >= MAX_SEARCH_RESULTS}
                                <div class="app-header-search-more">Showing first {MAX_SEARCH_RESULTS} results — refine your search for more.</div>
                            {/if}
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .app-header {
        width: 100%;
        position: fixed;
        background-color: var(--box-background-color);
        z-index: 9;
    }
    .app-header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.25rem 0.5rem;
    }
    .app-header-left {
        display: flex;
        align-items: center;

        h1 {
            font-size: 1.5rem;
            font-weight: 800;
            cursor: pointer;
            margin: 0;
        }
    }
    .app-header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }
    .app-header-icon {
        text-align: center;
        margin-left: 0.5rem;
        margin-right: 0.5rem;

        a {
            color: white !important;
            text-decoration: none;
        }
    }
    .app-header-separator {
        width: 1px;
        height: 1.4rem;
        background-color: #50555a;
    }
    .app-header-search {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }
    .app-header-search-input {
        background-color: var(--secondary-background-color);
        border: 1px solid #50555a;
        border-radius: 0.3rem;
        color: white;
        padding: 0.3rem 0.6rem;
        font-size: 0.85rem;
        width: 11rem;

        &:focus {
            outline: none;
            border-color: var(--main-color);
        }
    }
    .app-header-search-results {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        width: 22rem;
        max-height: 60vh;
        overflow-y: auto;
        background-color: #202225;
        border-radius: 0.3rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 10;
    }
    .app-header-search-empty,
    .app-header-search-more {
        padding: 0.6rem 0.8rem;
        font-size: 0.8rem;
        color: #6c757d;
    }
    .app-header-search-result {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid #303338;
        padding: 0.5rem 0.8rem;
        color: white;
        cursor: pointer;
        font-family: inherit;

        &:hover {
            background-color: #2a2d31;
        }

        &:last-child {
            border-bottom: none;
        }
    }
    .app-header-search-result-name {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 2px;
    }
    .app-header-search-result-date {
        font-weight: 400;
        white-space: nowrap;
    }
    .app-header-search-result-snippet {
        font-size: 0.8rem;
        color: #b9bbbe;
        white-space: pre-wrap;
        word-break: break-word;

        mark {
            background-color: var(--main-color);
            color: white;
            border-radius: 0.15rem;
        }
    }
    .text-muted {
        color: #6c757d;
    }
    .app-header-loader {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .app-header-status {
        font-size: 0.8rem;
        color: #b9bbbe;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 40vw;
    }
    .app-header-filename {
        font-size: 0.8rem;
        color: #b9bbbe;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 30vw;
    }
    .app-header-btn {
        background-color: var(--main-color);
        color: white;
        border: none;
        border-radius: 0.3rem;
        padding: 0.3rem 0.7rem;
        font-size: 0.8rem;
        cursor: pointer;

        &:hover {
            opacity: 0.85;
        }
    }
    .app-header-btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem;
    }
</style>
