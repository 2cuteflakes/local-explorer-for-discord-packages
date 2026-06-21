import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ThirdPartySmoke from './ThirdPartySmoke.svelte';

// svelte-routing, svelte-simple-modal, and svelte-tooltip declare no Svelte
// peerDependency range at all, so a Svelte major bump can't be flagged by
// npm/yarn if one of them breaks - this mounts the real usage patterns
// (Router/Link, the open(Component, props) modal flow, tooltip slot) to
// catch that kind of silent runtime incompatibility.
describe('third-party Svelte ecosystem packages (post-Svelte-4 bump)', () => {
    it('mounts Router/Link, SvelteTooltip, and the Modal context without throwing', () => {
        const { getByText } = render(ThirdPartySmoke);
        expect(getByText('smoke-link')).toBeInTheDocument();
        expect(getByText('hover-target')).toBeInTheDocument();
        expect(getByText('open-modal')).toBeInTheDocument();
    });

    it('opens a component into the modal via the simple-modal context', async () => {
        const { getByText, queryByText } = render(ThirdPartySmoke);
        expect(queryByText('smoke-modal-content')).toBeNull();

        await fireEvent.click(getByText('open-modal'));

        await waitFor(() => expect(getByText('smoke-modal-content')).toBeInTheDocument());
    });

    it('renders a svelte-frappe-charts Chart without throwing', () => {
        const { container } = render(ThirdPartySmoke);
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('pushes a @zerodevx/svelte-toast toast without throwing', async () => {
        const { getByText } = render(ThirdPartySmoke);
        await fireEvent.click(getByText('open-toast'));
        await waitFor(() => expect(getByText('smoke-toast')).toBeInTheDocument());
    });
});
