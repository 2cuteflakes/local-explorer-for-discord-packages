import '@testing-library/jest-dom/vitest';
import '@testing-library/svelte/vitest';

// jsdom doesn't implement ResizeObserver - frappe-charts (via
// svelte-frappe-charts) uses it to auto-resize the chart on container
// resize, which is a layout concern real browsers handle natively and
// our jsdom-based component tests don't need to exercise.
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};
