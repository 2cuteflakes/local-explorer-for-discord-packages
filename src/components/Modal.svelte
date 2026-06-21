<script>
    export let message;
</script>

<main>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- this component trusts its caller: `message` is rendered as raw HTML, so anything not fully app-authored (e.g. Discord-provided data like payment descriptions) must be escaped by the caller before being passed in. See extractor.js's summarizePayments() for the one call site that needed it. -->
    {@html message}
</main>
