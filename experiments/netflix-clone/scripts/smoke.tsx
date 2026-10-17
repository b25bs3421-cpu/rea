/**
 * Local smoke test: renders the real App in jsdom against a running server and
 * walks the main routes (landing → demo sign-in → profile pick → home → title →
 * browse → search → account → new → my list → downloads → genre → manage
 * profiles → onboarding → player).
 *
 * Start the app first (`npm run dev`), then run `npm run smoke`.
 * Not part of the app bundle.
 */
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:3000';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: `${BASE}/#/`,
  pretendToBeVisual: true,
});
const w = dom.window as unknown as Window & typeof globalThis;

const define = (name: string, value: unknown) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch {
    /* ignore readonly globals */
  }
};

define('window', w);
define('document', w.document);
define('navigator', w.navigator);
define('location', w.location);
define('history', w.history);
define('sessionStorage', w.sessionStorage);
define('localStorage', w.localStorage);
define('getComputedStyle', w.getComputedStyle.bind(w));
define('HTMLElement', w.HTMLElement);
define('HTMLCanvasElement', w.HTMLCanvasElement);
define('Element', w.Element);
define('Image', w.Image);
define('Node', w.Node);
define('Event', w.Event);
define('HashChangeEvent', w.HashChangeEvent);
define('MouseEvent', w.MouseEvent);
define('KeyboardEvent', w.KeyboardEvent);
define('requestAnimationFrame', w.requestAnimationFrame.bind(w));
define('cancelAnimationFrame', w.cancelAnimationFrame.bind(w));
const mediaStub = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});
define('matchMedia', mediaStub);
w.matchMedia = mediaStub as typeof w.matchMedia;
define('scrollTo', () => {});
w.scrollTo = (() => {}) as typeof w.scrollTo;
w.HTMLElement.prototype.scrollIntoView = () => {};
define('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});
define('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
});

/** Canvas stub: the player's renderer is exercised, drawing calls are no-ops. */
const gradientStub = { addColorStop: () => {} };
function makeContext() {
  const base: Record<string, unknown> = {
    canvas: { width: 1280, height: 720 },
    createLinearGradient: () => gradientStub,
    createRadialGradient: () => gradientStub,
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
      width: w,
      height: h,
    }),
    measureText: () => ({ width: 120 }),
  };
  return new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string') {
        target[key] = () => {};
        return target[key];
      }
      return undefined;
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  });
}
w.HTMLCanvasElement.prototype.getContext = (() => makeContext()) as typeof w.HTMLCanvasElement.prototype.getContext;

const nativeFetch = globalThis.fetch.bind(globalThis);
const cookies = new Map<string, string>();
async function appFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url =
    typeof input === 'string' && input.startsWith('/')
      ? `${BASE}${input}`
      : input instanceof URL
        ? input.toString()
        : input;
  const headers = new Headers(init.headers ?? {});
  if (cookies.size) {
    headers.set('cookie', [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; '));
  }
  const response = await nativeFetch(url as string, { ...init, headers, redirect: 'manual' });
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    const pair = cookie.split(';')[0];
    const index = pair.indexOf('=');
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
define('fetch', appFetch);
w.fetch = appFetch as typeof w.fetch;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const text = () => (w.document.body.textContent ?? '').replace(/\s+/g, ' ').trim();

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const { default: App } = await import('../src/App.tsx');
const { AppProvider } = await import('../src/state/AppContext.tsx');

function mount(containerId: string): Root {
  const container = w.document.createElement('div');
  container.id = containerId;
  w.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(createElement(AppProvider, null, createElement(App)));
  return root;
}

/* 1 — logged out: landing page renders with live catalogue */
const first = mount('root-a');
await sleep(2200);
const landingText = text();
console.log('\n--- landing excerpt ---\n' + landingText.slice(0, 420));
check('landing headline renders', landingText.includes('stay with you.'));
check('trending strip renders live titles', landingText.includes('Trending on REELIX') && landingText.includes('Blackwater'));
check('plan grid renders', landingText.includes('Pick your plan'));
check('FAQ renders', landingText.includes('Frequently asked questions'));
first.unmount();
w.document.body.innerHTML = '';

/* 2 — demo sign-in, then the profile gate */
const demo = await appFetch('/api/auth/demo', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});
check('demo login responds 200', demo.ok, String(demo.status));
const payload = (await demo.json()) as { profiles: Array<{ id: string; name: string; locked: boolean; kids: boolean }> };
check('demo account has three profiles', payload.profiles.length === 3, String(payload.profiles.length));
check('demo account has a locked profile', payload.profiles.some((profile) => profile.locked));

const second = mount('root-b');
await sleep(2000);
const gateText = text();
console.log('\n--- gate excerpt ---\n' + gateText.slice(0, 420));
check('profile gate renders', gateText.includes('Who’s watching?') || gateText.includes("Who's watching?"));
check('profile names render', payload.profiles.every((profile) => gateText.includes(profile.name)));

/* 3 — open a profile and render the home shell */
const aarav = payload.profiles.find((profile) => profile.name === 'Aarav');
const tiles = Array.from(w.document.querySelectorAll<HTMLButtonElement>('.profile-tile'));
const target = tiles.find((tile) => (tile.getAttribute('aria-label') ?? '').startsWith('Aarav'));
check('Aarav tile is clickable', Boolean(target));
target?.click();
await sleep(3000);
const homeText = text();
console.log('\n--- home excerpt ---\n' + homeText.slice(0, 640));
check('home billboard renders after profile select', homeText.includes('Blackwater'));
check('home rows render', homeText.includes('Top 10') || homeText.includes('Trending'));
check('header navigation rendered', homeText.includes('My List') && homeText.includes('New & Popular'));

/* 4 — title route renders the detail sheet */
w.location.hash = `#/title/${'blackwater'}`;
await sleep(2200);
const titleText = text();
console.log('\n--- title excerpt ---\n' + titleText.slice(0, 520));
check('title modal opens', titleText.includes('Every town keeps one secret too many.') || titleText.includes('Blackwater'));
check('title modal shows episodes', titleText.includes('Episodes'));

/* 5 — browse route renders a grid */
w.location.hash = '#/browse/movies';
await sleep(1400);
const browseText = text();
console.log('\n--- browse excerpt ---\n' + browseText.slice(0, 360));
check('browse page renders films', browseText.includes('Movies') && browseText.includes('Sort'));

/* 6 — search route */
w.location.hash = '#/search/blackwater';
await sleep(1600);
const searchText = text();
console.log('\n--- search excerpt ---\n' + searchText.slice(0, 360));
check('search results render', searchText.includes('Results for'));

/* 7 — account route */
w.location.hash = '#/account';
await sleep(1200);
const accountText = text();
console.log('\n--- account excerpt ---\n' + accountText.slice(0, 420));
check('account page renders', accountText.includes('Membership & plan') && accountText.includes('Devices'));

/* 8 — new & popular */
w.location.hash = '#/new';
await sleep(1300);
const newText = text();
check('new & popular renders', newText.includes('New & Popular') && newText.includes('Everyone’s watching this week'));

/* 9 — my list */
w.location.hash = '#/my-list';
await sleep(1200);
const listText = text();
check('my list renders', listText.includes('My List') && (listText.includes('saved to this profile') || listText.includes('Your list is waiting')));

/* 10 — downloads */
w.location.hash = '#/downloads';
await sleep(1200);
const downloadsText = text();
check('downloads page renders', downloadsText.includes('Downloads') && downloadsText.includes('Storage used'));

/* 11 — genre */
w.location.hash = '#/genre/crime';
await sleep(1200);
const genreText = text();
console.log('\n--- genre excerpt ---\n' + genreText.slice(0, 360));
check('genre page renders', genreText.includes('Crime') && genreText.includes('Genre'));

/* 12 — manage profiles */
w.location.hash = '#/manage-profiles';
await sleep(1200);
const manageText = text();
check('manage profiles renders', manageText.includes('Manage profiles') && manageText.includes('Add a profile'));

/* 13 — onboarding */
w.location.hash = '#/onboarding';
await sleep(1200);
const onboardingText = text();
check('onboarding renders plan step', onboardingText.includes('Choose the plan that fits your screen'));

/* 14 — synthetic player */
w.location.hash = '#/watch/blackwater/s1e1';
await sleep(2600);
const playerText = text();
check('player chrome renders', playerText.includes('DEMO · SYNTHETIC FOOTAGE') && playerText.includes('Blackwater'));
check('player canvas is mounted', Boolean(w.document.querySelector('.player__canvas')));
check('player timeline is mounted', Boolean(w.document.querySelector('.timeline')));

second.unmount();
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
