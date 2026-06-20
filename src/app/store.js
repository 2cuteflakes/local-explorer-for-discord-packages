
import { writable } from 'svelte/store';

const storedData = localStorage.getItem('data') || null;

let dataValue = storedData && JSON.parse(storedData);

export const loadTask = writable(null);
export const loadEstimatedTime = writable(null);
export const data = writable(dataValue);

data.subscribe((value) => {
    if (!value) localStorage.removeItem('data');
    else if (!value.isDemo) localStorage.setItem('data', JSON.stringify(value));
});

// In-memory only, never persisted: transcripts contain raw message
// content, unlike everything else in the `data` store.
export const dmTranscripts = writable({});
export const channelTranscripts = writable({});

// The currently loaded package File, kept in memory so the header's
// refresh button can re-read it without prompting the file picker again.
// Never persisted: File objects aren't serializable, and don't survive a
// page reload anyway.
export const currentFile = writable(null);
