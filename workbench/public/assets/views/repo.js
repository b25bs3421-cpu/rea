import {
  bytes,
  debounce,
  esc,
  int,
  pageHead,
  searchField,
  shortHash,
} from "../ui.js";

export const renderRepo = async (container, ctx) => {
  const [repo, manifest] = await Promise.all([
    ctx.api("repo"),
    ctx.api("manifest"),
  ]);
  const modules = repo.modules ?? [];
  const maxLoc = Math.max(
    ...modules.map((module) => module.loc + module.testLoc),
  );
  const state = { query: "" };

  container.innerHTML = `
    ${pageHead(
      "Repo map",
      "What is actually in this checkout",
      `Counts are computed from the files themselves. The generated catalogs the Workbench reads are listed at the bottom with their digests, so a stale snapshot is visible rather than silent.`,
    )}

    <div class="grid grid--4">
      <div class="metric metric--accent">
        <span class="metric__value">${int(repo.totals.productionLines)}</span>
        <span class="metric__label">production lines</span>
        <span class="metric__hint">${int(repo.totals.productionFiles)} files across ${int(repo.totals.modules)} modules</span>
      </div>
      <div class="metric">
        <span class="metric__value">${int(repo.totals.testLines)}</span>
        <span class="metric__label">test lines</span>
        <span class="metric__hint">${int(repo.totals.testFiles)} test files</span>
      </div>
      <div class="metric">
        <span class="metric__value">${int(repo.totals.scripts)}</span>
        <span class="metric__label">build scripts</span>
        <span class="metric__hint">verification, fixtures, packaging</span>
      </div>
      <div class="metric">
        <span class="metric__value">${int(repo.totals.documents)}</span>
        <span class="metric__label">documents</span>
        <span class="metric__hint">${int(repo.totals.bridgeSources)} bridge sources</span>
      </div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>01</span><span>Module weight</span></h2>
        <p class="section__hint">Production lines (green) with test lines (blue) beneath. Boundaries are enforced by <code class="mono">verify:module-boundaries</code>.</p>
      </div>
      <div class="panel">
        <div class="chart">
          ${modules
            .slice(0, 18)
            .map(
              (module) => `<div class="chart__row">
                <span class="chart__label">src/${esc(module.name)} <span>${int(module.files)}f</span></span>
                <span class="chart__track">
                  <span class="chart__fill" style="width:${((module.loc / maxLoc) * 100).toFixed(1)}%"></span>
                  <span class="chart__fill chart__fill--test" style="width:${((module.testLoc / maxLoc) * 100).toFixed(1)}%"></span>
                </span>
                <span class="chart__value">${int(module.loc)} loc · ${int(module.tests)} tests</span>
              </div>`,
            )
            .join("")}
        </div>
        <p class="panel__note" style="margin-top:12px">Showing the 18 largest of ${int(modules.length)} modules. Two thirds of the production code lives in <code class="mono">src/domain</code> and <code class="mono">src/application</code>; adapters and providers sit outside them.</p>
      </div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>02</span><span>Entry points</span></h2>
        <p class="section__hint">Where a run starts, and which layer owns the decision.</p>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Path</th><th>Role</th></tr></thead>
          <tbody>
            ${repo.entryPoints
              .map(
                (entry) =>
                  `<tr><td class="name">${esc(entry.path)}</td><td>${esc(entry.role)}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>03</span><span>Package scripts</span></h2>
        <p class="section__hint">${int((repo.scripts ?? []).length)} scripts from package.json, including every verifier.</p>
      </div>
      <div class="toolbar">
        ${searchField("scriptSearch", "Filter scripts (verify:, test:, docs:)")}
        <p class="toolbar__count" id="scriptCount"></p>
      </div>
      <div class="script-list" id="scriptList"></div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>04</span><span>Catalog provenance</span></h2>
        <p class="section__hint">The Workbench reads these generated artifacts. Regenerate with <code class="mono">node workbench/scripts/generate-data.mjs</code>.</p>
      </div>
      <div class="grid grid--2">
        <div class="panel stack">
          <p class="panel__title">Datasets</p>
          <div class="table-wrap" style="max-height:none">
            <table class="data">
              <thead><tr><th>File</th><th class="num">Bytes</th><th>Digest</th></tr></thead>
              <tbody>
                ${Object.entries(manifest.datasets ?? {})
                  .map(
                    ([name, entry]) => `<tr>
                      <td class="name">${esc(name)}</td>
                      <td class="num">${int(entry.bytes)}</td>
                      <td class="mono faint">${esc(shortHash(entry.sha256, 16))}</td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          <p class="panel__note">Generated ${esc(manifest.generatedAt ?? "—")} from checkout ${esc(manifest.checkout?.branch ?? "")}@${esc(manifest.checkout?.commit ?? "")}.</p>
        </div>
        <div class="panel stack">
          <p class="panel__title">Sources</p>
          <dl class="definition">
            ${Object.entries(manifest.sources ?? {})
              .map(
                ([name, digest]) =>
                  `<dt>${esc(name)}</dt><dd class="mono">${esc(digest)}</dd>`,
              )
              .join("")}
          </dl>
          <p class="panel__note">Each digest is a SHA-256 prefix of the source file at generation time. A generated catalog that drifts fails its own <code class="mono">--check</code> mode before it reaches a release.</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>05</span><span>Package facts</span></h2>
      </div>
      <div class="panel">
        <dl class="definition">
          <dt>name</dt><dd class="mono">${esc(repo.package.name)}</dd>
          <dt>version</dt><dd class="mono">${esc(repo.package.version)}</dd>
          <dt>license</dt><dd class="mono">${esc(repo.package.license ?? "—")}</dd>
          <dt>engines</dt><dd class="mono">${esc(repo.package.engines?.node ?? "—")}</dd>
          <dt>bins</dt><dd class="mono">${esc(Object.keys(repo.package.bin ?? {}).join(", "))}</dd>
          <dt>total dataset weight</dt><dd>${bytes(ctx.meta?.datasetBytes ?? 0)} served from <code class="mono">workbench/data</code></dd>
        </dl>
      </div>
    </div>
  `;

  const list = container.querySelector("#scriptList");
  const count = container.querySelector("#scriptCount");
  const draw = () => {
    const needle = state.query.toLowerCase();
    const scripts = (repo.scripts ?? []).filter((script) =>
      `${script.name} ${script.command}`.toLowerCase().includes(needle),
    );
    count.textContent = `${int(scripts.length)} shown`;
    list.innerHTML = scripts
      .map(
        (script) => `<div class="script">
          <button class="row-button" type="button" data-copy="npm run ${esc(script.name)}" style="color:var(--accent)">${esc(script.name)}</button>
          <span title="${esc(script.command)}">${esc(script.command)}</span>
          <button class="btn btn--ghost btn--small" type="button" data-copy="npm run ${esc(script.name)}">Copy</button>
        </div>`,
      )
      .join("");
  };
  container.querySelector("#scriptSearch").addEventListener(
    "input",
    debounce(() => {
      state.query = container.querySelector("#scriptSearch").value.trim();
      draw();
    }, 120),
  );
  draw();
};
