<!--
  Not used by the app - exists purely so a test can mount it and catch a
  runtime incompatibility in svelte-routing / svelte-simple-modal /
  svelte-tooltip, none of which declare a Svelte peerDependency range, so a
  Svelte major bump could silently break them without npm/yarn ever warning.
-->
<script>
    import { Router, Link } from 'svelte-routing';
    import Modal from 'svelte-simple-modal';
    import SvelteTooltip from 'svelte-tooltip';
    import Chart from 'svelte-frappe-charts';
    import { SvelteToast, toast } from '@zerodevx/svelte-toast';
    import ThirdPartySmokeOpener from './ThirdPartySmokeOpener.svelte';
</script>

<SvelteToast />
<Modal>
    <Router>
        <Link to="/somewhere">smoke-link</Link>
    </Router>
    <SvelteTooltip tip="smoke-tip" bottom>
        <span>hover-target</span>
    </SvelteTooltip>
    <ThirdPartySmokeOpener />
    <Chart
        data={{ labels: ['a', 'b'], datasets: [{ name: 'smoke', values: [1, 2] }] }}
        type="bar"
    />
    <button on:click={() => toast.push('smoke-toast')}>open-toast</button>
</Modal>
