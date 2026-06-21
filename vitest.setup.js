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

// jsdom doesn't implement matchMedia either - Svelte 5's internal
// MediaQuery reactive helper (used by @zerodevx/svelte-toast for a
// prefers-reduced-motion-style check) needs it. Real browsers have it
// natively.
global.matchMedia = global.matchMedia || function (query) {
    return {
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {}
    };
};

// jsdom doesn't implement the Web Animations API either - Svelte 5's
// transition internals (e.g. svelte-simple-modal's open/close, svelte-toast's
// fly/fade) call Element.animate(). Stub a no-op Animation with the bits
// Svelte's transition code actually touches (finished promise + cancel()).
if (!Element.prototype.animate) {
    Element.prototype.animate = function () {
        return {
            finished: Promise.resolve(),
            cancel() {},
            pause() {},
            play() {}
        };
    };
}
