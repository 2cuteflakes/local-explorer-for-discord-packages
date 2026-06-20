<script>
    export let url;

    let previewOpen = false;

    const filename = (() => {
        try {
            const path = new URL(url).pathname;
            return decodeURIComponent(path.split('/').pop()) || url;
        } catch {
            return url;
        }
    })();

    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext);
    const isVideo = ['mp4', 'webm', 'mov', 'm4v'].includes(ext);
    const previewable = isImage || isVideo;
</script>

<div class="attachment">
    <span class="attachment-icon" aria-hidden="true">📎</span>
    <a class="attachment-link" href="{url}" target="_blank" rel="noopener noreferrer">{url}</a>
    {#if previewable}
        <button type="button" class="attachment-preview-btn" on:click={() => previewOpen = !previewOpen}>
            {previewOpen ? 'Hide preview' : 'Preview'}
        </button>
    {/if}
    {#if previewOpen}
        <div class="attachment-preview">
            {#if isImage}
                <img src="{url}" alt="{filename}" loading="lazy" />
            {:else}
                <video src="{url}" controls preload="metadata"></video>
            {/if}
        </div>
    {/if}
</div>

<style>
    .attachment {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    .attachment-icon {
        flex-shrink: 0;
        font-size: 0.9rem;
    }
    .attachment-link {
        color: #00aff4;
        word-break: break-all;
    }
    .attachment-preview-btn {
        background-color: #50555a;
        color: white;
        border: none;
        border-radius: 0.3rem;
        padding: 0.15rem 0.6rem;
        font-size: 0.75rem;
        cursor: pointer;
        flex-shrink: 0;
    }
    .attachment-preview-btn:hover {
        opacity: 0.85;
    }
    .attachment-preview {
        flex-basis: 100%;
        margin-top: 4px;
    }
    .attachment-preview img,
    .attachment-preview video {
        max-width: 100%;
        max-height: 400px;
        border-radius: 0.3rem;
        display: block;
    }
</style>
