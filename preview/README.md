# Liquid Sculpture Hero — shadcn preview

A minimal [shadcn/ui](https://ui.shadcn.com) workspace for
`components/ui/liquid-sculpture-hero.tsx`: React 19, Vite, Tailwind CSS v4 and
TypeScript. It exists so the component can be run, inspected and type-checked
from this repository, which otherwise contains no React application.

| Path                                         | What it is                                                     |
| -------------------------------------------- | -------------------------------------------------------------- |
| `../components/ui/liquid-sculpture-hero.tsx` | The component (the shadcn `ui` folder, at the repository root) |
| `../components/demo.tsx`                     | The canonical usage: `<SculptureHero />`                       |
| `../lib/utils.ts`                            | `cn()` helper created by `shadcn init`                         |
| `components.json`                            | shadcn project config for this preview app                     |
| `src/index.css`                              | Tailwind CSS v4 entry and the shadcn design tokens             |
| `src/App.tsx`                                | Renders the hero with the bundled artwork                      |
| `public/`                                    | Sculpture artwork used by the preview                          |

## Why `components/ui`

shadcn/ui is copy-in source, not a dependency: the CLI writes components to the
`ui` alias of `components.json`, which defaults to `@/components/ui`. Keeping
that path and the `@/` alias means

- `npx shadcn@latest add …` drops new components next to this one,
- every component imports the shared helper as `@/lib/utils`,
- `@/components/ui/liquid-sculpture-hero` matches the import in
  `components/demo.tsx`.

If the folder were renamed (for example `src/components`), the aliases in
`components.json` and `tsconfig.json` would have to change with it, and
copy-pasted shadcn examples would stop resolving.

## Run it

```bash
cd preview
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then production build
npm run typecheck  # tsc --noEmit over the app *and* ../components
```

## Using the component

```tsx
import SculptureHero from "@/components/ui/liquid-sculpture-hero";

export default function Page() {
  return <SculptureHero />;
}
```

`SculptureHero` takes the full prop set of the upstream component: copy, links,
theme, fonts, sculpture placement and the particle engine
(`strength`, `radius`, `particleDensity`, `dotSize`, `particleSpread`,
`turbulence`, `liquid`, `streaks`, `restStyle`, `returnSpeed`, `ambient`,
`speed`, `intro`). Defaults reproduce the studio hero.

Things worth knowing:

- **WebGL2 is optional.** Without it (or without
  `EXT_color_buffer_half_float`) the hero keeps the static `<img>` and the
  canvas is never shown. Reduced-motion preferences lower the simulation
  instead of disabling it.
- **Remote artwork must be CORS-readable.** The engine samples the image
  through a 2D canvas, so a cross-origin image needs
  `Access-Control-Allow-Origin`. Local files such as `public/sculpture-*.jpg`
  are read directly by the preview.
- **Flat artwork background.** The particle mask is keyed on the image
  background: pass `imageBackground` when the backdrop is a known flat colour,
  otherwise the four corners are sampled.
- The component is self-contained CSS-in-JSX (a `<style>` element with `sh-`
  classes), so it needs Tailwind in the project but no particular theme tokens.

## How this preview is wired

The component lives outside this package, so `vite.config.ts` aliases `@` to the
repository root and pins `react`, `react-dom`, `clsx` and `tailwind-merge` to the
copies in `preview/node_modules`. That keeps a single React instance for the app
and the component without duplicating the upstream file.

## Starting a shadcn project from scratch

In a fresh app (Next.js or Vite + React + TypeScript):

```bash
# Vite + React + TypeScript
npm create vite@latest my-app -- --template react-ts

# Tailwind CSS v4 (Vite)
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react(), tailwindcss()] });
```

```css
/* src/index.css */
@import "tailwindcss";
```

```bash
# shadcn: writes components.json, lib/utils.ts and the CSS variables,
# and configures the @/* alias in tsconfig.json
npx shadcn@latest init
```

Then copy `components/ui/liquid-sculpture-hero.tsx` into `components/ui/` (or
keep `components.json`'s `ui` alias pointed at that folder) and import it as
`@/components/ui/liquid-sculpture-hero`.

## Artwork

`public/sculpture-light.jpg` and `public/sculpture-dark.jpg` are the preview
artwork. `scripts/prepare-artwork.py` flattens their studio backdrop onto the
page colour so the particle mask keys cleanly (a soft vignette would leave a
halo of stray particles); it needs `pillow` and `numpy`:

```bash
python3 scripts/prepare-artwork.py public/sculpture-light.jpg "#EBE9E5"
python3 scripts/prepare-artwork.py public/sculpture-dark.jpg "#111110"
```
