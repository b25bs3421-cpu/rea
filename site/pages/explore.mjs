import { pagehead } from "../lib/shell.mjs";
import { h, list, n, shortDigest } from "../lib/html.mjs";

export const explorePage = (data, datasets) => {
  const artifact = data.artifact.projection;
  const application = data.application.projection;

  const body = `
${pagehead({
  kicker: "Explorer",
  title: "Read a real graph, node by node",
  lede: "Two captured analyses from this checkout. Drag to pan, scroll to zoom, and select a node to read every property REA recorded for it. Nothing here is fetched at runtime — the graphs ship with the page.",
  crumbs: [
    { href: "/", label: "Home" },
    { href: "/explore/", label: "Explorer" },
  ],
})}

<section class="section section--flush">
  <div class="wrap">
    <div data-explorer>
      <div class="between" style="margin-bottom:1rem;gap:1rem;flex-wrap:wrap">
        <div class="segmented" role="group" aria-label="Dataset">
          <button type="button" data-dataset="artifact" aria-pressed="true">Artifact inventory</button>
          <button type="button" data-dataset="application" aria-pressed="false">Application graph</button>
        </div>
        <div class="row" style="gap:.5rem">
          <label class="faint tiny" for="graph-search" style="margin:0">Find node</label>
          <input id="graph-search" type="search" placeholder="ipc, preload, .js…" data-graph-search
            style="padding:.45rem .7rem;border:1px solid var(--line);border-radius:8px;background:var(--raise);color:var(--ink);font:inherit;font-size:.85rem;min-width:190px">
        </div>
      </div>

      <div class="explorer">
        <div class="canvas">
          <div class="canvas__tools">
            <button class="iconbtn" type="button" data-zoom="in" aria-label="Zoom in">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 3v10M3 8h10"/></svg>
            </button>
            <button class="iconbtn" type="button" data-zoom="out" aria-label="Zoom out">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10"/></svg>
            </button>
            <button class="iconbtn" type="button" data-zoom="fit" aria-label="Fit to view">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>
            </button>
          </div>
          <svg data-graph role="img" aria-label="Captured evidence graph">
            <g data-graph-viewport></g>
          </svg>
          <span class="canvas__hint">drag to pan · ＋ / − to zoom · tap a node</span>
        </div>

        <aside class="inspector" data-inspector aria-live="polite">
          <div class="kicker">Inspector</div>
          <p class="inspector__empty">Pick any node to read the properties REA recorded
          for it — paths, digests, roles and hash status — plus every relation that
          touches it.</p>
        </aside>
      </div>

      <div class="between" style="margin-top:1rem;gap:1rem;flex-wrap:wrap">
        <div>
          <p class="mono" style="margin:0" data-graph-title></p>
          <p class="small faint" style="margin:.2rem 0 0" data-graph-meta></p>
        </div>
        <div class="legend" data-graph-legend></div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">01 · the artifact capture</p>
        <h2>Every occurrence and its digest</h2>
      </div>
      <p>${n(artifact.files.length)} occurrences, all verified by SHA-256, across
      ${n(artifact.artifact.manifest.nodes)} graded artifacts.</p>
    </div>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th scope="col">Logical path</th><th scope="col">Format</th><th scope="col" class="num">Bytes</th><th scope="col">Hash</th><th scope="col">SHA-256</th></tr></thead>
        <tbody>
${list(
  artifact.files,
  (file) => `          <tr>
            <td class="mono">${h(file.path)}</td>
            <td>${h(file.format)}</td>
            <td class="num">${n(file.size ?? 0)}</td>
            <td><span class="tag ${file.hashStatus === "verified" ? "tag--ok" : "tag--warn"}">${h(file.hashStatus)}</span></td>
            <td class="mono faint">${h(shortDigest(file.sha256, 10))}</td>
          </tr>`,
)}
        </tbody>
      </table>
    </div>
    <div class="row" style="margin-top:1rem">
      <a class="btn small" href="/evidence/artifact.json" download>Download the Evidence (${n(Math.round(data.evidenceBytes.artifact / 1024))} KiB)</a>
      <a class="btn small" href="/data/notes-electron.zip" download>Download the sample ZIP</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">02 · the application capture</p>
        <h2>Relationship edges, with their authority</h2>
      </div>
      <p>First ${Math.min(18, application.edges.length)} of ${application.edges.length}.
      “Observed” means the bytes said it; “inferred” names the rule that concluded it.</p>
    </div>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th scope="col">Relation</th><th scope="col">From</th><th scope="col">To</th><th scope="col">State</th><th scope="col">Confidence</th><th scope="col">Location</th></tr></thead>
        <tbody>
${list(
  application.edges.slice(0, 18),
  (edge) => `          <tr>
            <td>${h(edge.relation)}</td>
            <td class="mono">${h(edge.from)}</td>
            <td class="mono">${h(edge.to)}</td>
            <td>${h(edge.state)}</td>
            <td>${h(edge.confidence)}</td>
            <td class="mono faint">${h(edge.location ?? "—")}</td>
          </tr>`,
)}
        </tbody>
      </table>
    </div>
    <div class="row" style="margin-top:1rem">
      <a class="btn small" href="/evidence/application.json" download>Download the Evidence (${n(Math.round(data.evidenceBytes.application / 1024))} KiB)</a>
      <a class="btn small" href="/workflows/#application">How this capture was produced</a>
    </div>
  </div>
</section>

<script type="application/json" id="explorer-data">${JSON.stringify(datasets).replace(/</g, "\\u003c")}</script>
`;

  return body;
};
