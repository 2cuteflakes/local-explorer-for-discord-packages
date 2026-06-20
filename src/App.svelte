<script>
	import { Router, Route } from 'svelte-routing';

	import Header from './components/Header.svelte';

	import Stats from './views/Stats.svelte';
	import Loader from './views/Loader.svelte';
	import DMViewer from './views/DMViewer.svelte';
	import ChannelViewer from './views/ChannelViewer.svelte';

	import Modal from 'svelte-simple-modal';

	import { SvelteToast } from '@zerodevx/svelte-toast';

	const options = {
	    duration: 10000
	};
</script>

<svelte:head>
	<title>Local Explorer for Discord Packages</title>
</svelte:head>

<main class="app">
	<SvelteToast {options} />
	<Modal
		styleContent={{ 'background-color': '#18191c', color: 'white' }}
		closeOnOuterClick={false}
		closeOnEsc={false}
	>
		<Router>
			<Header />
			<div>
				<Route path="/stats" component={Stats} />
				<Route path="/stats/demo" component={Stats} />
				<Route path="/dm/:channelId" component={DMViewer} />
				<Route path="/channel/:channelId" component={ChannelViewer} />
				<Route path="/*" component={Loader} />
			</div>
		</Router>
	</Modal>
</main>

<style>
	.app {
		min-height: 100vh;
		display: grid;
		grid-template-rows: 1fr auto;
	}
</style>
