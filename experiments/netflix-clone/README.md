# REELIX

A full-stack, original streaming experience built as a reverse-engineering study of the
UX patterns found in modern subscription video apps.

**REELIX is a work of fiction.** It is not affiliated with, endorsed by, or connected to
Netflix or any other streaming service. No third-party code, trademarks, catalogue data,
artwork or video is used. Every title, person, poster, price and frame of playback in this
project was invented or generated for the demo. No payment is ever collected.

---

## What it does

- **Cinematic landing page** with email capture, trending strip, feature cards, plan grid,
  FAQ and an instant demo entry point.
- **Accounts and sessions** — sign up, sign in, passwordless demo login, and sign out of
  every device. Sessions are signed HTTP-only cookies.
- **Five profiles per account** — avatars, kids profiles with a filtered catalogue,
  4-digit PIN locks, and a profile picker styled after a TV sign-in screen.
- **Onboarding** — choose a plan, create the first profile, start watching. Plan changes are
  local demo preferences; no billing exists.
- **Home billboard** that auto-rotates through four featured titles with progress dots.
- **Horizontal carousels** — continue watching, trending, Top 10, new releases, My List,
  because-you-watched, originals, critic picks and genre rows. Arrow paging on desktop,
  touch scrolling on mobile.
- **Hover previews** — a portal-rendered expand card with a Ken Burns preview, match score,
  maturity rating, genres, play / add-to-list controls and playback progress. Fine-pointer
  devices only.
- **Top 10** with the giant outlined numeral treatment, plus character bubbles in kids mode.
- **Title detail sheet** — hero key art, synopsis, cast, audio and subtitle lists, maturity
  description, similar titles, and a full episode list with per-episode progress.
- **A working custom player** — a synthetic cinematic rendered on `<canvas>` from each
  title's colour palette and key art, with an original WebAudio ambient score, captions,
  skip intro, 10-second seeking, playback speed, volume, fullscreen, an episode drawer,
  next-episode countdown and resume.
- **My List, likes and dislikes**, per-profile reminders for coming-soon titles, and a
  Top 10 notification feed.
- **Search** — debounced full-catalogue search across titles, people, genres and moods,
  recent searches, top searches and genre browsing.
- **Downloads** — simulated download queue with quality selection, storage summary,
  smart-downloads toggle and offline playback.
- **Account management** — plan switcher, profile shortcuts, playback preferences,
  device list and sign-out-everywhere.

## Tech stack

| Layer    | Choice |
| -------- | ------ |
| Frontend | React 18, TypeScript, Vite 5, hand-written CSS design system |
| Backend  | Node.js, Express 4, JSON file storage |
| Auth     | HMAC-signed session cookies, scrypt password hashing |
| Playback | Canvas 2D renderer + WebAudio synthesis — no media files |

The Vite dev server runs as Express middleware, so the whole app is served from a single
process and a single port. In production the Express server serves the built `dist/`.

## Running it

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

The demo account is pre-seeded and shown on the sign-in screen:

```
email:    demo@reelix.app
password: demo1234
```

The demo account has three profiles — Aarav, Priya (PIN `1234`) and Kabir (kids) —
plus a My List, ratings, downloads and viewing history, so every screen has something in it.

### Other scripts

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production bundle into dist/
npm run preview     # build, then serve dist/ with APP_ENV=production
npm run art         # regenerate public/art from the catalogue (dev only)
npm run smoke       # jsdom walk-through of every main route (needs `npm run dev`)
```

`PORT` defaults to `3000`. The server binds to `0.0.0.0` so it works inside containers and
sandbox previews.

## Project layout

```
server/
  catalog.mjs    26 original titles, seasons/episodes, palettes and dialogue
  store.mjs      JSON store, seed data, sessions, auth, per-profile state
  index.mjs      Express API + Vite middleware / static production server
src/
  components/    header, billboard, rows, cards, hover layer, artwork, modals …
  pages/         landing, auth, onboarding, profiles, home, browse, detail, account …
  player/        canvas renderer, WebAudio score, timeline and player chrome
  state/         AppContext — session, profile state, toasts, optimistic mutations
  lib/           typed API client, hash router, hooks, formatting helpers
  styles/        base, layout, pages, detail and player CSS layers
```

Data lives in `.data/reelix.json` (created on first run) and the session signing secret in
`.data/secret`. Delete `.data/` to reset the demo to its seeded state.

## Artwork pipeline

`public/art/` holds a poster, a backdrop and a clean "hero" frame for every one of the 26
titles. Three kinds of key art feed it, all created for this project:

- **Photographic** — cinematic frames generated for the demo (Blackwater, Neon District,
  The Last Orbit); the wide frame is reused as backdrop and hero, and the poster is cropped
  from it.
- **Composite** — titles with a photographic poster but no wide frame (The Paper Crown,
  Deep Signal, Crimson Protocol, The Glasshouse); the backdrop and hero are composed from
  the poster with a blurred fill and a cinematic side shade.
- **Procedural** — the remaining titles are rasterised from `GeneratedArt`, the React/SVG
  renderer the app also uses as its runtime fallback. It composes gradients, ridges, stars,
  light leaks, vignette and title typography from each title's palette and `titleStyle`.

`npm run art` rebuilds all three buckets and always writes compressed JPEGs; run it after
editing a palette in `server/catalog.mjs`. (Because the full 26-title set came from a
generative session limited to ten images per run, most posters are the procedural variant —
that is the intended, reproducible fallback rather than a gap.)

## Notes on playback

There are no video files in this repository. Every film and episode is generated at runtime:
the canvas renderer composes gradients, grain, light leaks, title typography and scenes from
the title's original palette, while the audio engine plays a slow synthesized score. The
player still supports real seeking, resume, captions, speed, fullscreen and episode
navigation, so the interaction model is complete even though the footage is synthetic.

Captions are original dialogue written for the demo. Episode durations are simulated at
accelerated speed so a full title can be watched in a few minutes.

## Originality

This project was built as a clean-room exercise: the **interaction patterns** (billboard,
rows, hover cards, Top 10, profile picker, detail modal, custom player) are intentionally
familiar, but the brand, visual design, copy, catalogue, artwork, audio and code are all
original. It is intended for learning and portfolio use, not as a substitute for any
commercial service.
