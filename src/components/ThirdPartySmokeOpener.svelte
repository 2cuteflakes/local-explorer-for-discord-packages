<!-- Test fixture: a descendant of <Modal> that exercises the actual
     open(Component, props) pattern used throughout the real app (Header.svelte
     error popups, Stats.svelte's payments-list popup). -->
<script>
    import { getContext } from 'svelte';
    import ModalSmokeContent from './ModalSmokeContentSmoke.svelte';

    const { open } = getContext('simple-modal');
</script>

<button on:click={() => open(ModalSmokeContent, { message: 'smoke-modal-content' })}>
    open-modal
</button>
