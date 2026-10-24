# PS-01 — Grounded · live site

The working website for **PS-01 | Document-Grounded AI Research Assistant**, built from
[`PROMPT.md`](./PROMPT.md).

```
ps-01-grounded/
├─ README.md          ← you are here
├─ PROMPT.md          ← the generation spec (design system, copy, acceptance criteria)
└─ site/              ← the implementation (Vite + React + TypeScript + Tailwind + shadcn structure)
```

## Run it

```bash
cd site
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle into dist/
npm run preview  # serve the production build
```

Node 18+. No backend, no API keys, no environment variables. The site is fully static.

## What is built

One long scroll, light + dark, mobile-first.

| Section | Promise it keeps |
|---|---|
| **Hero** — `liquid-sculpture-hero.tsx` | The supplied component, unmodified except for the two string-literal line breaks in the original paste and one mis-wired shader pair (`pPart` compiles `PART_VS` + `PART_FS`). Driven only through its props. |
| **01 · Problem** | The brief itself, taped to a research desk, surrounded by six sticky notes that each name a cost of searching across documents. |
| **02 · Solution** | Four behaviours, each labelled with the exact line of the brief it serves. Closes on the rule: *no sentence without a supporting span*. |
| **03 · How it works** | Parse → Index → Retrieve → Ground, as an interactive stepper with a machine-readable contract per stage. |
| **04 · Evidence** | A sample transcript with real citation chips. Hover a chip → the supporting sentence and its evidence row light up. Directly beneath it, the abstention: *“Not found in your 12 documents.”* |
| **05 · Scope** | Eleven acceptance criteria stated as targets, plus in/out of scope. |
| **FAQ** | The four questions a jury asks. |
| **Closing + footer** | *Read less. Check more.* plus colophon. |

The four load-bearing claims from the brief (many documents · no evidence today · passages as proof ·
honest refusal) appear as structure, not as a slide of bullet points.

## Decisions worth knowing

- **Theme is one control, two palettes.** The hero keeps its own switch; a `MutationObserver`
  mirrors `--sh-bg` onto `<html>`, and the sticky top bar's switch pushes the other way. Both
  resolve to `#EBE9E5` / `#111110` — no third theme, no flash on load (an inline script in
  `index.html` applies the stored class before first paint).
- **Sculpture images are local.** `public/sculpture-{light,dark}.webp` — an interwoven filament loop
  on a perfectly flat ground (`#E9E9E7` / `#111111`). The hero keys the background out by sampling
  the image corners, so `imageBackground` is intentionally **not** passed: each theme detects its own.
- **Evidence is a list, not a table.** A five-column table can't breathe at 5/12 width. Each span is a
  `<li>` row with document, page, section, the quoted span and a status marker. The scope section
  does use a real `<table>` with `<caption>` and `<th scope>`.
- **No invented numbers.** "12 documents · 486 pages" is labelled sample data; every figure in Scope
  is prefixed *target*.
- **All copy lives in `src/lib/content.ts`.** Strings are never hard-coded inside section components,
  so changing the narrative is a single-file edit. `STATEMENT_BANK` (the justification layer from
  `PROMPT.md` §6) ships in that file as documentation.
- **Reduced motion.** The hero already handles it; everything else collapses to instant under
  `prefers-reduced-motion: reduce`.

## File map

```
site/src/
├─ App.tsx                     page composition + theme sync
├─ index.css                   tokens, base type, reveal, citation chip, sticky notes
├─ components/
│  ├─ ui/liquid-sculpture-hero.tsx   supplied hero (WebGL2 GPGPU)
│  ├─ sections/
│  │  ├─ top-bar.tsx  problem.tsx  solution.tsx  how-it-works.tsx
│  │  ├─ evidence.tsx  scope.tsx  faq.tsx  closing.tsx  footer.tsx
│  ├─ reveal.tsx               the single scroll gesture
│  └─ icons.tsx
└─ lib/
   ├─ content.ts               every string, citation and criterion
   └─ utils.ts                 cn()
```

## Deploy

`npm run build` produces a static `dist/`. Drop it on Vercel, Netlify, Cloudflare Pages or GitHub
Pages — no redirects or rewrites needed beyond `index.html` for `/`.

## Accessibility

Skip link, semantic landmarks, one `<h1>`, keyboard-operable theme switches, citation buttons and
accordion (`aria-expanded` / `aria-controls` / labelled regions), visible focus rings, and AA contrast
in both themes.
