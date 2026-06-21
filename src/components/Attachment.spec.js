import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Attachment from './Attachment.svelte';

describe('Attachment', () => {
    it('renders the full URL as the link text, not just the filename', () => {
        const url = 'https://cdn.discordapp.com/attachments/1/2/IMG_2418.png?ex=0&is=1';
        const { getByText } = render(Attachment, { props: { url } });
        const link = getByText(url);
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', url);
        expect(link).toHaveAttribute('target', '_blank');
    });

    it('shows a Preview button for an image extension and toggles a preview image', async () => {
        const url = 'https://cdn.discordapp.com/attachments/1/2/photo.png';
        const { getByText, container } = render(Attachment, { props: { url } });

        const button = getByText('Preview');
        expect(container.querySelector('img')).toBeNull();

        await fireEvent.click(button);
        expect(getByText('Hide preview')).toBeInTheDocument();
        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        expect(img).toHaveAttribute('src', url);

        await fireEvent.click(getByText('Hide preview'));
        expect(container.querySelector('img')).toBeNull();
    });

    it('shows a Preview button for a video extension and previews with a <video>', async () => {
        const url = 'https://cdn.discordapp.com/attachments/1/2/clip.mp4';
        const { getByText, container } = render(Attachment, { props: { url } });

        await fireEvent.click(getByText('Preview'));
        expect(container.querySelector('video')).not.toBeNull();
        expect(container.querySelector('img')).toBeNull();
    });

    it('shows no Preview button for a non-previewable extension', () => {
        const url = 'https://cdn.discordapp.com/attachments/1/2/document.pdf';
        const { queryByText } = render(Attachment, { props: { url } });
        expect(queryByText('Preview')).toBeNull();
    });

    it('falls back to the raw URL as filename if URL parsing fails', () => {
        const url = 'not-a-valid-url';
        const { getByText } = render(Attachment, { props: { url } });
        expect(getByText(url)).toBeInTheDocument();
    });
});
