# REA Workbench

A local operator console for this checkout. It answers one question — _what can
this repository actually do on this machine, and what does it return when it
does it_ — without asking you to read 57 documents or memorize 144 commands.

```bash
npm ci                       # once
npm run compile              # once: builds dist/ that the CLI runs
npm run workbench:data       # once: snapshots the generated catalogs
npm run workbench            # http://localhost:5180
npm run workbench:test       # self-tests for the ZIP plumbing and projectors
npm run workbench:check      # fail when the committed snapshot drifted
```

Everything is served by `node workbench/server.mjs` with Node built-ins only: no
frontend framework, no bundler, no npm dependency, no external service. Analysis
results never leave the machine unless you paste them somewhere yourself.

## What it does

| Section       | What you get                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview      | The investigation loop, live host capability, the analysis matrix from the README, starter commands, FAQ.                                                                                                                                                                                                                                                                                           |
| Live lab      | Runs two real workflows — `analyze-javascript-application` (app reconstruction: IPC channels, resolved Electron roles, modules, edges, residual unknowns) and `inspect-artifact` (artifact inventory: graded artifacts, containment edges, per-occurrence digests, coverage) — against a bundled sample, an upload, or a local path. Every result stays downloadable as the complete Evidence JSON. |
| Tool catalog  | All MCP tools from the generated contract catalog: kind, side effects, annotations, arguments with types and required flags, returned Evidence facets, and a copyable `tools/call` payload.                                                                                                                                                                                                         |
| CLI reference | Every primary command with its purpose, plus the live `--help` output for the selected command, read from this checkout on demand.                                                                                                                                                                                                                                                                  |
| Readiness     | `rea doctor --json` and `rea providers --json` rendered as checks, remediations, and per-provider availability reasons.                                                                                                                                                                                                                                                                             |
| Setup builder | Composes the `rea setup` command for the agents in this build, with the review/backup semantics explained next to it.                                                                                                                                                                                                                                                                               |
| Documents     | The documentation index with summaries, section lists, word counts and guide links.                                                                                                                                                                                                                                                                                                                 |
| Repo map      | Module weight, entry points, all package scripts, and the provenance digests of the generated data this console reads.                                                                                                                                                                                                                                                                              |

`Ctrl/⌘ + K` opens a palette over sections, tools, commands and documents.
The theme follows the system preference until you pick one; both are checked.

## Where the numbers come from

Nothing in the UI is written by hand:

- `workbench/scripts/generate-data.mjs` reads `.cache/mcp-tool-catalog.json`
  (from `npm run artifacts:mcp-catalog`), `docs/public/product-catalog.json`
  (from `npm run artifacts:product-catalog`), `docs/*.md`, `README.md`,
  `docs/mcp-prompts.md`, `package.json`, and the source tree itself.
- The CLI's own `--help` output supplies command descriptions.
- `rea doctor`, `rea providers` and every analysis call the published entry
  point, `scripts/rea.mjs`, as a child process. The Workbench never imports
  REA internals, so it cannot silently diverge from the CLI contract.

Regenerate and verify the snapshot:

```bash
npm run workbench:data           # rewrite workbench/data/*.json
npm run workbench:check          # fail when the snapshot drifted
```

## API

| Route                             | Purpose                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/meta`                   | Version, checkout, counts, workflows, limits, samples.                                                                         |
| `GET /api/data/<name>`            | `tools`, `cli`, `docs`, `repo`, `prompts`, `product`, `manifest`.                                                              |
| `GET /api/readiness`              | `rea doctor` + `rea providers`, cached for a minute.                                                                           |
| `GET /api/cli/<command>/help`     | Live `rea <command> --help` for a command in this build.                                                                       |
| `POST /api/analyze`               | JSON body `{ mode: "sample"\|"path", workflow, sample?, path? }`, or a binary body with `x-filename` and `x-workflow` headers. |
| `GET /api/analyses/<id>/evidence` | The unmodified CLI Evidence document.                                                                                          |

## Configuration

| Variable                            | Default   | Meaning                                             |
| ----------------------------------- | --------- | --------------------------------------------------- |
| `PORT`                              | `5180`    | Listen port.                                        |
| `HOST`                              | `0.0.0.0` | Bind address.                                       |
| `REA_WORKBENCH_UPLOAD_MB`           | `64`      | Upload ceiling for ZIP/ASAR/JS targets.             |
| `REA_WORKBENCH_ANALYSIS_TIMEOUT_MS` | `150000`  | Deadline for one analysis.                          |
| `REA_WORKBENCH_ALLOW_PATHS`         | `1`       | Set `0` to refuse analysing local filesystem paths. |

## Boundaries worth knowing

- The analysis target is **never executed**. Both workflows are static: app
  reconstruction reads syntax and files; artifact inventory reads containers.
- Uploads are unpacked into a temporary directory, analysed, and deleted. The
  Evidence is retained in memory for 30 minutes (six most recent runs) so the
  download link keeps working; nothing is written to disk.
- Displayed strings are rewritten so absolute host paths do not appear in the
  projection. The complete Evidence JSON is served unmodified, because that is
  the artifact the CLI produced.
- This is a single-user local tool. It has no authentication; do not expose the
  port to an untrusted network.

## Layout

```
workbench/
  server.mjs              HTTP server, JSON API, static files
  lib/analyse.mjs         run the CLI, project Evidence for the UI
  lib/zip.mjs             minimal ZIP reader (stored/deflated) and store-only writer
  test/workbench.test.mjs node:test self-tests (ZIP round-trip, projectors)
  scripts/generate-data.mjs   catalog snapshot generator (--check supported)
  data/*.json             committed snapshot the server reads
  public/                 index.html, styles.css, assets/*.js (no build step)
```
