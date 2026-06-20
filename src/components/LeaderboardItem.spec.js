import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import LeaderboardItem from './LeaderboardItem.svelte';

const baseProps = { position: 0, name: 'testuser', discriminator: '0', count: '1,234' };

describe('LeaderboardItem', () => {
    it('renders the envelope placeholder when there is no avatar and it is not a channel', () => {
        const { getByText } = render(LeaderboardItem, { props: baseProps });
        expect(getByText('✉️')).toBeInTheDocument();
    });

    it('renders an <img> when an avatarURL is given', () => {
        const { container } = render(LeaderboardItem, { props: { ...baseProps, avatarURL: 'https://example.com/a.png' } });
        const img = container.querySelector('img.top-avatar');
        expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    });

    it('renders the keycap hashtag placeholder for a channel row, ignoring avatarURL', () => {
        const { getByText } = render(LeaderboardItem, {
            props: { position: 1, name: 'general', guild: 'My Server', count: '50', channel: true, avatarURL: 'https://example.com/a.png' }
        });
        expect(getByText('#️⃣')).toBeInTheDocument();
    });

    it('shows the discriminator for a non-channel row and the guild name for a channel row', () => {
        const { getByText: getUserText } = render(LeaderboardItem, { props: baseProps });
        expect(getUserText('#0')).toBeInTheDocument();

        const { getByText: getChannelText } = render(LeaderboardItem, {
            props: { position: 0, name: 'general', guild: 'My Server', count: '5', channel: true }
        });
        expect(getChannelText('My Server')).toBeInTheDocument();
    });

    it('numbers the top 3 positions with first/second/third styling classes', () => {
        const { container: c0 } = render(LeaderboardItem, { props: { ...baseProps, position: 0 } });
        expect(c0.querySelector('.top-bubble.first').textContent).toBe('1');
        const { container: c2 } = render(LeaderboardItem, { props: { ...baseProps, position: 2 } });
        expect(c2.querySelector('.top-bubble.third').textContent).toBe('3');
    });

    it('renders the name as plain text when there is no linkTo', () => {
        const { getByText, container } = render(LeaderboardItem, { props: baseProps });
        expect(getByText('testuser')).toBeInTheDocument();
        expect(container.querySelector('a.top-name-link')).toBeNull();
    });

    it('renders the name as a link to linkTo when given', () => {
        const { getByText } = render(LeaderboardItem, { props: { ...baseProps, linkTo: '/dm/123' } });
        const link = getByText('testuser');
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/dm/123');
    });

    it('shows the last-message date when lastMessageAt is given', () => {
        const lastMessageAt = new Date('2024-03-15T12:00:00Z').getTime();
        const expectedDate = new Date(lastMessageAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const { getByText } = render(LeaderboardItem, { props: { ...baseProps, lastMessageAt } });
        expect(getByText(`Last message: ${expectedDate}`)).toBeInTheDocument();
    });

    it('omits the last-message line entirely when lastMessageAt is not given', () => {
        const { queryByText } = render(LeaderboardItem, { props: baseProps });
        expect(queryByText(/Last message:/)).toBeNull();
    });

    it('applies the count color as an inline style', () => {
        const { getByText } = render(LeaderboardItem, { props: { ...baseProps, countColor: '#f4a6c6' } });
        expect(getByText('1,234')).toHaveStyle({ color: '#f4a6c6' });
    });

    it('renders the tooltip range label and message (shown on hover via CSS) when both are provided', () => {
        // The tooltip's show/hide is pure CSS (:hover), which jsdom doesn't
        // apply component styles for in this test setup - so this just
        // confirms the content itself renders, not the hover visibility.
        const { getByText, queryByText } = render(LeaderboardItem, {
            props: { ...baseProps, countRangeLabel: '1,000-2,000', countMessage: 'Solid buddies!' }
        });
        expect(getByText('1,000-2,000 messages')).toBeInTheDocument();
        expect(getByText('Solid buddies!')).toBeInTheDocument();
    });

    it('renders no tooltip markup when range label/message are not both provided', () => {
        const { container } = render(LeaderboardItem, { props: baseProps });
        expect(container.querySelector('.count-tooltip')).toBeNull();
    });
});
