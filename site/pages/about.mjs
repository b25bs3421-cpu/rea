import { codeBlock, pagehead } from "../lib/shell.mjs";
import { h, list, n } from "../lib/html.mjs";

const sourceRows = (manifest) =>
  list(Object.entries(manifest.datasets), ([name, meta]) => {
    return `          <tr>
            <td class="mono">workbench/data/${h(name)}</td>
            <td class="num">${n(meta.bytes)}</td>
            <td class="mono faint">${h(meta.sha256)}</td>
          </tr>`;
  });

export const aboutPage = (data) => {
  const { application, artifact, manifest } = data;

  const body = `
${pagehead({
  kicker: "About this site",
  title: "Generated, not written by hand",
  lede: "Every number, name and table on this site comes from the repository at build time: a catalog snapshot, the Markdown sources, and two analyses run against the bundled sample. Here is the whole pipeline, including what it cannot do.",
  crumbs: [
    { href: "/", label: "Home" },
    { href: "/about/", label: "About" },
  ],
})}

<section class="section section--flush">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">01 · pipeline</p>
        <h2>Four steps, all in the repository</h2>
      </div>
      <p>Nothing is fetched from the network, and nothing below is hand-maintained
      except the prose on this page and in the pages' introductions.</p>
    </div>
    <div class="grid grid--4">
      <article class="card">
        <span class="card__eyebrow">Step 1</span>
        <h3>Snapshot</h3>
        <p class="small muted"><code>npm run workbench:data</code> reads the MCP
        contract catalog, product catalog, docs, README and source tree into
        <code>workbench/data/</code>.</p>
      </article>
      <article class="card">
        <span class="card__eyebrow">Step 2</span>
        <h3>Capture</h3>
        <p class="small muted"><code>npm run site:capture</code> runs the two
        workflows against the bundled sample and stores the Evidence plus the
        projections in <code>site/data/</code>.</p>
      </article>
      <article class="card">
        <span class="card__eyebrow">Step 3</span>
        <h3>Render</h3>
        <p class="small muted"><code>npm run site:build</code> renders static HTML
        from those files into <code>site/public/</code> — no framework, no bundler,
        no runtime.</p>
      </article>
      <article class="card">
        <span class="card__eyebrow">Step 4</span>
        <h3>Serve</h3>
        <p class="small muted"><code>npm run site:serve</code> previews the output
        on port 5181. The <code>public/</code> folder deploys to any static host.</p>
      </article>
    </div>
    <div style="margin-top:1.5rem">
      ${codeBlock({
        headLabel: "rebuild everything",
        code: `npm run workbench:data   # refresh the catalog snapshot
npm run site:capture     # re-run the two sample analyses
npm run site:build       # render site/public
npm run site:serve       # preview at http://localhost:5181`,
      })}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">02 · catalogs</p>
        <h2>What the site reads</h2>
      </div>
      <p>Digests are recorded by the snapshot generator; run
      <code>npm run workbench:check</code> to fail the build when they drift.</p>
    </div>
    <div class="table-scroll">
      <table class="data">
        <caption>Catalog snapshot · generated ${h(manifest.generatedAt)}</caption>
        <thead><tr><th scope="col">Dataset</th><th scope="col" class="num">Bytes</th><th scope="col">Prefix digest</th></tr></thead>
        <tbody>
${sourceRows(manifest)}
        </tbody>
      </table>
    </div>
    <div class="grid grid--3" style="margin-top:1.5rem">
      <div class="card">
        <span class="card__eyebrow">Upstream sources</span>
        <ul class="list-clean">
${list(
  Object.entries(manifest.sources),
  ([file, digest]) =>
    `          <li><code>${h(file)}</code> <span class="faint mono">${h(digest)}</span></li>`,
)}
        </ul>
      </div>
      <div class="card">
        <span class="card__eyebrow">Checkout</span>
        <dl class="definition" style="grid-template-columns:88px minmax(0,1fr)">
          <dt>Package</dt><dd class="mono">${h(manifest.package.name)} · ${h(manifest.package.version)}</dd>
          <dt>Branch</dt><dd class="mono">${h(manifest.checkout.branch)}</dd>
          <dt>Commit</dt><dd class="mono">${h(manifest.checkout.commit)}</dd>
          <dt>Remote</dt><dd class="mono">${h(manifest.checkout.remote)}</dd>
        </dl>
      </div>
      <div class="card">
        <span class="card__eyebrow">Source size</span>
        <dl class="definition" style="grid-template-columns:88px minmax(0,1fr)">
          <dt>Modules</dt><dd class="mono">${n(data.repo.totals.modules)}</dd>
          <dt>Product</dt><dd class="mono">${n(data.repo.totals.productionLines)} lines / ${n(data.repo.totals.productionFiles)} files</dd>
          <dt>Tests</dt><dd class="mono">${n(data.repo.totals.testLines)} lines / ${n(data.repo.totals.testFiles)} files</dd>
          <dt>Scripts</dt><dd class="mono">${n(data.repo.totals.scripts)}</dd>
        </dl>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">03 · captures</p>
        <h2>Two analyses, kept verbatim</h2>
      </div>
      <p>Both were produced by <code>scripts/rea.mjs</code> in this checkout. The
      projections are what the pages render; the raw Evidence is downloadable and
      unmodified.</p>
    </div>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th scope="col">Workflow</th><th scope="col">Target</th><th scope="col">Captured</th><th scope="col" class="num">Duration</th><th scope="col">Evidence</th><th scope="col"></th></tr></thead>
        <tbody>
          <tr>
            <td class="mono">analyze-javascript-application</td>
            <td class="mono">${h(application.target)}</td>
            <td>${h(application.capturedAt)}</td>
            <td class="num">${n(application.durationMs)} ms</td>
            <td class="mono faint">${h(application.projection.evidence.id)}</td>
            <td><a class="small" href="/evidence/application.json" download>JSON</a></td>
          </tr>
          <tr>
            <td class="mono">inspect-artifact</td>
            <td class="mono">${h(artifact.target)}</td>
            <td>${h(artifact.capturedAt)}</td>
            <td class="num">${n(artifact.durationMs)} ms</td>
            <td class="mono faint">${h(artifact.projection.evidence.id)}</td>
            <td><a class="small" href="/evidence/artifact.json" download>JSON</a></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="note" style="margin-top:1.25rem">
      <span>▸</span>
      <span>The sample ZIP at <a href="/data/notes-electron.zip" download>data/notes-electron.zip</a>
      is packed from <code>website/public/examples/notes-electron</code> with the
      Workbench's own store-only ZIP writer, so the fixture is reproducible from the
      checkout.</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">04 · boundaries</p>
        <h2>Deliberate limits</h2>
      </div>
      <p>Each of these is a decision, not an oversight.</p>
    </div>
    <div class="facets">
      <article><h3>Static output <span>01</span></h3><p>No server, no database and no
      analytics. The explorer reads a JSON island embedded in the page.</p></article>
      <article><h3>Captured data <span>02</span></h3><p>The two datasets are frozen at
      capture time. Live runs live in the Workbench console, which executes the
      same CLI in your checkout.</p></article>
      <article><h3>Engine-free <span>03</span></h3><p>No Hopper, Ghidra or IDA here,
      so native-binary demos would be dishonest. Those paths are documented and
      indexed, not simulated.</p></article>
      <article><h3>Docs stay in place <span>04</span></h3><p>Documents are indexed, not
      mirrored. One source of truth beats a copy that rots.</p></article>
      <article><h3>No telemetry <span>05</span></h3><p>No cookies, no third-party
      scripts, no fonts fetched at runtime.</p></article>
      <article><h3>Provenance first <span>06</span></h3><p>Every figure can be traced
      to a dataset digest or an Evidence id listed on this page.</p></article>
    </div>
    <div class="row" style="margin-top:1.5rem">
      <a class="btn small" href="/api/meta.json">Build metadata (JSON)</a>
      <a class="btn small" href="/sitemap.xml">Sitemap</a>
      <a class="btn small" href="https://github.com/b25bs3421-cpu/rea" rel="noreferrer">Repository ↗</a>
    </div>
  </div>
</section>
`;

  return body;
};
