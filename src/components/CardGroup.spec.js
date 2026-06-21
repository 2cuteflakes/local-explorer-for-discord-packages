import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CardGroup from './CardGroup.svelte';

describe('CardGroup', () => {
    beforeEach(() => localStorage.clear());

    it('renders the title and content expanded by default', () => {
        const { getByText, container } = render(CardGroup, { props: { name: 'general-stats', title: 'General Stats' } });
        expect(getByText('General Stats')).toBeInTheDocument();
        expect(container.querySelector('.card-group-content')).not.toBeNull();
    });

    it('toggles all content visibility together with one button', async () => {
        const { getByRole, container } = render(CardGroup, { props: { name: 'general-stats', title: 'General Stats' } });

        await fireEvent.click(getByRole('button'));
        expect(container.querySelector('.card-group-content')).toBeNull();

        await fireEvent.click(getByRole('button'));
        expect(container.querySelector('.card-group-content')).not.toBeNull();
    });

    it('persists collapsed state to localStorage, keyed by name', async () => {
        const { getByRole } = render(CardGroup, { props: { name: 'top-lists', title: 'Top Lists' } });
        await fireEvent.click(getByRole('button'));
        expect(localStorage.getItem('card-collapsed-top-lists')).toBe('true');
    });

    it('starts collapsed if localStorage already says so', () => {
        localStorage.setItem('card-collapsed-all-lists', 'true');
        const { container } = render(CardGroup, { props: { name: 'all-lists', title: 'All Lists' } });
        expect(container.querySelector('.card-group-content')).toBeNull();
    });
});
