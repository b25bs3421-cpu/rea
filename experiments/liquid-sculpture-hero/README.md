# Liquid Sculpture Hero

A React port of the "Sculpture Hero" component by
[guglielmogiannattasio.it](https://guglielmogiannattasio.it): ~100k WebGL2
GPGPU particles sampled from an image's own pixels. The cursor liquefies the
material and it settles back into the crisp artwork. Without WebGL2 the static
image is shown.

This directory is a **self-contained shadcn-style app** that hosts the
component. The repository itself is a Node/TypeScript CLI with a static HTML
site — it has no React, Tailwind, or shadcn project — so the component is
integrated here instead of being wired into `src/` or `website/`.

## What is in here

```
experiments/liquid-sculpture-hero/
├─ components.json                   # shadcn CLI config (aliases, css path)
├─ components/ui/
│  └─ liquid-sculpture-hero.tsx      # the component (vendored)
├─ lib/utils.ts                      # shadcn `cn()` helper (clsx + tailwind-merge)
├─ app/
│  ├─ demo.tsx                        # demo page: hero + three sections
│  ├─ globals.css                     # Tailwind v4 entry + shadcn design tokens
│  └─ main.tsx                        # client entry, self-hosted fonts
├─ public/art/*.webp                  # hero artwork, light/dark + portrait
├─ index.html
├─ vite.config.ts                     # `@/` alias, Tailwind plugin, LAN host
└─ tsconfig.json                      # strict, `@/*` paths
```

### Paths: `components/ui` and `app/globals.css`

These are the shadcn defaults, and `components.json` declares them:

| Alias               | Path              |
| ------------------- | ----------------- |
| `@/components/ui`   | `components/ui`   |
| `@/lib/utils`       | `lib/utils.ts`    |
| `@/app/globals.css` | `app/globals.css` |

Keeping the component in `components/ui` matters because the shadcn CLI writes
generated primitives there and rewrites imports through the `components.json`
aliases. Put a component elsewhere and `npx shadcn add …` will not find it,
`components.json`-aware tooling cannot dedupe it, and later CLI updates create a
second copy. The `@/*` alias must resolve from the project root in both
`tsconfig.json` and the bundler.

The component needs no Tailwind classes or design tokens of its own — it ships
its own scoped CSS inside the file — so it drops into any strictly-typed React
app. Tailwind here styles only the demo page around it.

## Run it

```bash
cd experiments/liquid-sculpture-hero
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

Stack: React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), TypeScript 7.

## Use in your own app

1. Copy `components/ui/liquid-sculpture-hero.tsx` to `<your-app>/components/ui/`.
2. Keep `"use client"` — the component creates WebGL contexts, canvas textures
   and observers, so in Next.js App Router it must stay a client component.
3. Render `<SculptureHero />`. No extra npm packages are needed; `lucide-react`
   is used by the demo page, not by the component.

```tsx
import SculptureHero from "@/components/ui/liquid-sculpture-hero";

export default function Page() {
  return (
    <SculptureHero
      src="/art/sculpture-light.webp"
      darkSrc="/art/sculpture-dark.webp"
      intro
    />
  );
}
```

If you are starting from scratch:

```bash
npx create-next-app@latest my-app --ts --tailwind --eslint --app --src-dir=false
cd my-app && npx shadcn@latest init
npx shadcn@latest add button          # creates components/ui/ if absent
```

`shadcn init` also creates `components.json` and `lib/utils.ts`; the component
alone needs neither, but they keep the project consistent with the CLI.

## Artwork

Four images live in `public/art/`, generated for this demo (they are not stock
photography and carry no third-party licence):

| File                            | Use                      |
| ------------------------------- | ------------------------ |
| `sculpture-light.webp`          | desktop, light theme     |
| `sculpture-dark.webp`           | desktop, dark theme      |
| `sculpture-light-portrait.webp` | phones (< 640 px), light |
| `sculpture-dark-portrait.webp`  | phones (< 640 px), dark  |

The engine keys the sculpture out of the image by colour distance from the image
background, then tints it toward the page background, so the photograph's flat
backdrop must match `background` / `darkBackground` closely. These four are
normalised to exactly `#ECEAE8` (light) and `#0D0D0C` (dark); `app/demo.tsx`
passes the same two values so the sculpture dissolves into the page with no
visible rectangle. If you swap in your own artwork:

- use one flat, uniform background colour per image, no gradient or vignette;
- pass `imageBackground` when auto-detection (an average of the four corners)
  is not accurate enough — it applies to both themes, so use it with a single
  image or images that share a backdrop;
- a transparent PNG/WebP is detected automatically and keyed by alpha instead;
- remote images need CORS (`crossOrigin="anonymous"` is already set) or the
  particle sampling falls back to the static image.

`sizes/aspect` drives the layout: a portrait image below 640 px gets the
narrow-screen treatment, so the phone files are 4:5 while the desktop ones are
2.4:1.

## Props

Everything is optional; the component renders a complete hero with no props.

**Media** — `src`, `darkSrc`, `mobileSrc`, `mobileDarkSrc`, `imageAlt`,
`imageBackground`

**Copy** — `brand`, `navLinks`, `navCta`, `showNav`, `eyebrow`, `headline`
(newlines start a new line), `headlineAccent` (substring rendered in the italic
accent face), `body`, `primaryCta`, `secondaryCta`, `hint`, `hintTouch`

**Theme** — `background`, `darkBackground`, `theme`, `themeToggle`, `textColor`,
`accentColor`, `headingFont`, `accentFont`, `bodyFont`, `loadFonts`

**Layout** — `sculptureScale`, `mobileSculptureScale`, `sculptureX`,
`sculptureY`, `height` (`100svh` by default), `backdropText`, `showCredit`,
`className`, `style`

**Simulation** — `interactive`, `strength`, `radius`, `particleDensity`,
`dotSize`, `particleSpread`, `turbulence`, `liquid`, `streaks`, `restStyle`,
`returnSpeed`, `ambient`, `ambientIntensity`, `speed`, `intro`

Performance notes: the engine caps DPR and backing-store size, halves the
particle grid on low-core/coarse-pointer devices, pauses when the hero scrolls
out of view or the tab is hidden, and stops its animation loop entirely once the
material has settled (unless `ambient` is on). `prefers-reduced-motion` is
honoured throughout.

## Changes made to the published source

The file in `components/ui/` is the published component with three edits, all
noted here so a future upstream sync is easy:

1. Two string literals arrived with a raw line break inside them (an
   unterminated string in the original paste): the `headline` default and the
   separator in `renderHeadline`. They are restored to
   `"Form that\nanswers back."` and `text.split("\n")`, which is what the
   originals intended — the headline renders as two lines.
2. The default `src` / `darkSrc` / `mobileSrc` / `mobileDarkSrc` now point at the
   four files in `public/art/` instead of the 21st.dev CDN.
3. A write-only `lastInput` field was removed (it tripped `noUnusedLocals`).

Formatting is `oxfmt` with the repository's `.oxfmtrc.json` (80 columns), so the
file matches `npm run format:check` from the repository root.
