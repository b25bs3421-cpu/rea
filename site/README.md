# REA Workbench — website

A static website generated from this checkout. It answers the question the
repository usually answers in prose: _what does REA return, and what does that
record actually look like_ — using the repository's own catalogs and two real
analyses instead of screenshots.

```
site/
  build.mjs                 renders public/ from the data below
  serve.mjs                 zero-dependency preview server (port 5181)
  scripts/capture-evidence.mjs   runs the CLI, stores the two sample records
  scripts/check-site.mjs    link, metadata and leak checks over public/
  lib/                      data loading, page shell, HTML helpers, graph data
  pages/                    one module per page
  assets/                   site.css, site.js, explore.js, favicon, OG card
  data/                     committed captures: two Evidence records + a sample ZIP
  public/                   the generated site (committed, deployable as-is)
```

## Quickstart

```bash
npm ci                    # once
npm run compile           # once: dist/ that scripts/rea.mjs runs from
npm run site:build        # render site/public
npm run site:serve        # http://localhost:5181
npm run site:check        # links, metadata, required files
```

`npm run site:capture` re-runs the two workflows and rewrites `site/data/`. That
step needs the checkout but not the network; the build itself only reads files.

## Pages

| Path                                    | What it is                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `/`                                     | The pitch, the live numbers, the Evidence contract, the capability matrix.  |
| `/workflows/`                           | The two engine-free workflows, explained with the captured results in full. |
| `/explore/`                             | Interactive graph of both captures: pan, zoom, select, read properties.     |
| `/reference/tools/`                     | All 193 MCP tools with arguments, effects, annotations and call shape.      |
| `/reference/cli/`                       | All 144 commands and their aliases.                                         |
| `/reference/docs/`                      | The 57-document index, grouped by area, linked to the Markdown sources.     |
| `/about/`                               | Provenance: pipeline, catalog digests, captures and deliberate limits.      |
| `/404.html`                             | Not-found page with the routes that do exist.                               |
| `/api/meta.json`                        | Build metadata, counts and capture ids for anything that wants to check.    |
| `/evidence/{artifact,application}.json` | The unmodified Evidence documents.                                          |

## Where the numbers come from

Nothing on the site is hand-maintained except the introductory prose:

1. `npm run workbench:data` snapshots the MCP contract catalog, product catalog,
   `docs/*.md`, `README.md`, prompts and the source tree into `workbench/data/`.
2. `npm run site:capture` runs `scripts/rea.mjs analyze-javascript-application`
   and `inspect-artifact` against the bundled notes sample, then projects the
   results with the Workbench projectors and writes `site/data/`.
3. `npm run site:build` renders the pages from those two inputs.

The explorer's graph data is shaped at build time (`lib/explore-data.mjs`) and
embedded in the page as JSON, so the site has no runtime data fetching, no
backend and no third-party scripts. Fonts are system fonts; the theme is a
`data-theme` attribute with a `localStorage` preference.

## Deploy

`site/public/` is a complete static site: copy it to GitHub Pages, Netlify,
Cloudflare Pages, S3 or any web server. `.html` files are directory indexes
(`/workflows/index.html`), so no rewrite rules are needed. Set
`REA_SITE_ORIGIN=https://your.host` while building to emit canonical URLs,
`og:url`, `og:image` and a sitemap with absolute locations.

## Honest limits

- The captures are frozen at their capture date; the page says when.
- No native analysis engine (Hopper, Ghidra, IDA) is installed here, so native
  demos are documented and indexed rather than simulated.
- Documents are indexed, not mirrored: the Markdown in `docs/` stays the source
  of truth, and every card links to its file on GitHub.
- Two older routes (`/` deep links into the console) assume `npm run workbench`
  is running locally on port 5180; the link simply does not resolve otherwise.

## Checks

```bash
npm run site:build && npm run site:check
npx oxfmt --check site
npx oxlint site
```

`site:check` fails on broken internal links, missing titles or descriptions,
missing required assets, and leaked template tokens (`undefined`, `NaN`,
`${…}`) in rendered pages.
