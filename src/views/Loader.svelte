<script>
    import { link } from 'svelte-routing';
</script>

<div class="app-empty">
    <p class="app-empty-description">
        <a href="/" use:link>This app</a> generates stats from your Discord Data Package. Your package data is processed entirely on your device and never sent anywhere.
    </p>
    <p>
        Use the <strong>Load</strong> button in the header above to select your <code>package.zip</code>.
    </p>
    <p>
        <a href="https://support.discord.com/hc/en-us/articles/360004957991-Your-Discord-Data-Package#h_01JV2QTH9QBJPZNKBCP758RZB3" target="_blank" rel="noopener noreferrer">How do I get my Discord data?</a>
    </p>
    <p class="app-demo">
        No package yet? <a href="/stats/demo" use:link>view the demo</a>
    </p>
</div>

<style>
    .app-empty {
        padding-top: 6rem;
        max-width: 768px;
        margin: auto;
        text-align: center;
        color: white;
        padding-left: 30px;
        padding-right: 30px;
    }
    .app-empty-description {
        font-weight: 500;
        margin-bottom: 2rem;
    }
    .app-demo {
        margin-top: 2rem;
    }
</style>
