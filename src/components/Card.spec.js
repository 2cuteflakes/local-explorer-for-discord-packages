import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Card from './Card.svelte';

describe('Card', () => {
    beforeEach(() => localStorage.clear());

    it('renders content without a title and no toggle button', () => {
        const { container, queryByRole } = render(Card, { props: { name: 'profile' } });
        expect(container.querySelector('.card-content')).not.toBeNull();
        expect(queryByRole('button')).toBeNull();
    });

    it('toggles content visibility when a title is set', async () => {
        const { container, getByRole, getByText } = render(Card, {
            props: { name: 'top-users', title: 'Top Users' }
        });
        expect(getByText('Top Users')).toBeInTheDocument();
        expect(container.querySelector('.card-content')).not.toBeNull();

        await fireEvent.click(getByRole('button'));
        expect(container.querySelector('.card-content')).toBeNull();

        await fireEvent.click(getByRole('button'));
        expect(container.querySelector('.card-content')).not.toBeNull();
    });

    it('persists collapsed state to localStorage', async () => {
        const { getByRole } = render(Card, {
            props: { name: 'top-users', title: 'Top Users' }
        });
        await fireEvent.click(getByRole('button'));
        expect(localStorage.getItem('card-collapsed-top-users')).toBe('true');
    });
});
