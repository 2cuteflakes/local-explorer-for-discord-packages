import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import FunFact from './FunFact.svelte';

describe('FunFact', () => {
    it('substitutes the % placeholder with the formatted count', () => {
        const { container } = render(FunFact, {
            props: { svg: 'M0 0', content: 'You opened Discord % times', count: 12345 }
        });
        expect(container.querySelector('h3').textContent).toBe('You opened Discord 12,345 times');
    });

    it('shows N/A and the privacy-settings note when count is missing', () => {
        const { container, getByText } = render(FunFact, {
            props: { svg: 'M0 0', content: 'You sent % messages', count: undefined }
        });
        expect(container.querySelector('h3').textContent).toBe('You sent N/A messages');
        expect(getByText('This data is not available as you changed your Discord privacy settings')).toBeInTheDocument();
    });

    it('treats a count of exactly 0 as a real value, not missing', () => {
        const { container, queryByText } = render(FunFact, {
            props: { svg: 'M0 0', content: 'You used % Slash Commands', count: 0, explanation: 'Never used one!' }
        });
        expect(container.querySelector('h3').textContent).toBe('You used 0 Slash Commands');
        expect(queryByText('This data is not available as you changed your Discord privacy settings')).toBeNull();
        expect(queryByText('Never used one!')).toBeInTheDocument();
    });

    it('only shows the explanation when a count is present', () => {
        const { queryByText } = render(FunFact, {
            props: { svg: 'M0 0', content: 'You sent % messages', count: 5, explanation: 'Nice and chatty!' }
        });
        expect(queryByText('Nice and chatty!')).toBeInTheDocument();
    });

    it('renders content without a % placeholder verbatim', () => {
        const { container } = render(FunFact, {
            props: { svg: 'M0 0', content: 'Just plain text' }
        });
        expect(container.querySelector('h3').textContent).toBe('Just plain text');
    });
});
