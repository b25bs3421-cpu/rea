import { codeBlock, pagehead } from "../lib/shell.mjs";
import { countOf, h, list, n, shortDigest } from "../lib/html.mjs";

const ipcTable = (channels) => `
      <div class="table-scroll">
        <table class="data">
          <caption>IPC channels observed</caption>
          <thead><tr><th scope="col">Channel</th><th scope="col">Side</th><th scope="col">Operation</th><th scope="col">Resolution</th><th scope="col">Location</th></tr></thead>
          <tbody>
${list(channels, (channel) =>
  list(
    channel.sides,
    (side) => `            <tr>
              <td>${h(channel.channel)}</td>
              <td>${h(side.side)}</td>
              <td>${h(side.operation)}</td>
              <td>${h(side.resolution)}</td>
              <td class="mono">${h(side.location ?? "—")}</td>
            </tr>`,
  ),
)}
          </tbody>
        </table>
      </div>`;

const filesTable = (files) => `
      <div class="table-scroll">
        <table class="data">
          <caption>File inventory · ${files.length} files</caption>
          <thead><tr><th scope="col">Path</th><th scope="col">Kind</th><th scope="col" class="num">Bytes</th><th scope="col">Parse</th><th scope="col">SHA-256</th></tr></thead>
          <tbody>
${list(
  files,
  (file) => `            <tr>
              <td class="mono">${h(file.path)}</td>
              <td>${h(file.kind)}</td>
              <td class="num">${n(file.bytes)}</td>
              <td>${h(file.parseStatus)}</td>
              <td class="mono faint">${h(shortDigest(file.sha256, 8))}</td>
            </tr>`,
)}
          </tbody>
        </table>
      </div>`;

const occurrenceTable = (files) => `
      <div class="table-scroll">
        <table class="data">
          <caption>Occurrences · ${files.length} entries</caption>
          <thead><tr><th scope="col">Logical path</th><th scope="col">Format</th><th scope="col" class="num">Bytes</th><th scope="col">Hash</th><th scope="col">SHA-256</th></tr></thead>
          <tbody>
${list(
  files,
  (file) => `            <tr>
              <td class="mono">${h(file.path)}</td>
              <td>${h(file.format)}</td>
              <td class="num">${n(file.size ?? 0)}</td>
              <td><span class="tag ${file.hashStatus === "verified" ? "tag--ok" : "tag--warn"}">${h(file.hashStatus)}</span></td>
              <td class="mono faint">${h(shortDigest(file.sha256, 8))}</td>
            </tr>`,
)}
          </tbody>
        </table>
      </div>`;

const rolesTable = (roles, summary) => `
      <div class="grid grid--2" style="align-items:start">
        <div class="table-scroll">
          <table class="data">
            <caption>Resolved roles · ${roles.length}</caption>
            <thead><tr><th scope="col">Role</th><th scope="col">Label</th><th scope="col">Location</th></tr></thead>
            <tbody>
${list(
  roles,
  (role) => `              <tr>
                <td>${h(role.kind)}</td>
                <td class="mono">${h(role.label)}</td>
                <td class="mono faint">${h(role.location ?? "—")}</td>
              </tr>`,
)}
            </tbody>
          </table>
        </div>
        <div class="panel">
          <div class="panel__head"><span>Electron summary</span><span>${n(summary.ipc?.operations ?? 0)} IPC operations</span></div>
          <div class="panel__body">
            <div class="bars">
${list(
  Object.entries(summary).filter(([, value]) => typeof value === "number"),
  ([key, value]) => `              <div class="bar">
                <span class="bar__label">${h(key)}</span>
                <span class="bar__track"><span class="bar__fill" style="width:${Math.min(100, value * 22)}%"></span></span>
                <span class="bar__value">${n(value)}</span>
              </div>`,
)}
            </div>
          </div>
        </div>
      </div>`;

export const workflowsPage = (data) => {
  const application = data.application.projection;
  const artifact = data.artifact.projection;
  const manifest = artifact.artifact.manifest;

  const body = `
${pagehead({
  kicker: "Workflows",
  title: "The two things you can run without an engine",
  lede: "REA ships 193 tools, but the shortest path to understanding it is two workflows that need nothing installed but Node. Both samples below were captured from this checkout — every number is a real result.",
  crumbs: [
    { href: "/", label: "Home" },
    { href: "/workflows/", label: "Workflows" },
  ],
  actions:
    '<a class="btn btn--primary" href="/explore/?dataset=application">Explore the app graph</a><a class="btn" href="/explore/?dataset=artifact">Explore the artifact tree</a>',
})}

<section class="section section--flush" id="application">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">01 · app reconstruction</p>
        <h2>analyze-javascript-application</h2>
      </div>
      <p>Point it at an extracted Electron or web app. It reads syntax and files,
      never runs them.</p>
    </div>

    <div class="grid grid--2" style="align-items:start;margin-bottom:1.5rem">
      <div class="card">
        <span class="card__eyebrow">Input</span>
        <ul class="list-clean">
          <li>A directory, an <code>.asar</code>, or a single <code>.js</code> / <code>.json</code> file.</li>
          <li>Sample used here: <code>${h(data.application.target)}</code> — a small notes app with one IPC channel.</li>
          <li>Resolution happens inside the inventoried container; nothing outside it is read.</li>
        </ul>
      </div>
      <div class="card">
        <span class="card__eyebrow">What the record contains</span>
        <ul class="list-clean">
          <li>File inventory with digests, parse status and text inclusion.</li>
          <li>Electron roles: main, preload, renderer, windows, package, bridges.</li>
          <li>IPC channels with both sides and source locations.</li>
          <li>${application.edges.length} relationship edges plus the semantic graph.</li>
          <li>${application.unknowns.total} retained unknowns across ${application.unknowns.families.length} families.</li>
        </ul>
      </div>
    </div>

    <div class="grid grid--2" style="align-items:start;gap:1.5rem">
      <div class="stack">
        <div class="panel">
          <div class="panel__head"><span>Capture</span><span>${n(data.application.durationMs)} ms · ${h(data.application.capturedAt)}</span></div>
          <div class="panel__body">
            <dl class="definition">
              <dt>Evidence</dt><dd class="mono">${h(application.evidence.id)}</dd>
              <dt>Predicate</dt><dd class="mono">${h(application.evidence.predicate)}</dd>
              <dt>Confidence</dt><dd>${h(application.evidence.confidence)} · ${h(application.evidence.authority)}</dd>
              <dt>Coverage</dt><dd>${h(application.coverage.status)} · ${application.coverage.omitted_count} omitted</dd>
              <dt>Root digest</dt><dd class="mono">${h(shortDigest(application.digests.rootArtifact, 16))}</dd>
            </dl>
          </div>
        </div>
        ${codeBlock({
          headLabel: "run it yourself",
          code: `node scripts/rea.mjs analyze-javascript-application \\
  website/public/examples/notes-electron --json`,
        })}
        <div class="row">
          <a class="btn small" href="/explore/?dataset=application">Open the graph</a>
          <a class="btn small" href="/evidence/application.json" download>Raw Evidence (${n(Math.round(data.evidenceBytes.application / 1024))} KiB)</a>
        </div>
      </div>
      <div class="stack">
        <div class="facets">
${list(
  [
    ["Files", application.files.length, "in the inventory"],
    [
      "Parsed JS",
      application.statistics.parsed_javascript_files,
      "syntax recovered",
    ],
    ["AST nodes", application.statistics.visited_ast_nodes, "visited"],
    ["Roles", application.roles.length, "resolved"],
    ["Edges", application.edges.length, "relationship claims"],
    ["Unknowns", application.unknowns.total, "kept, not guessed"],
  ],
  ([label, value, note]) => `          <article>
            <h3 style="font-size:1.5rem">${n(value)}</h3>
            <p><span class="tiny faint">${h(label)}</span><br>${h(note)}</p>
          </article>`,
)}
        </div>
        <div class="panel">
          <div class="panel__head"><span>Top relations</span><span>${application.edgeTotal ?? application.edges.length} total</span></div>
          <div class="panel__body">
            <div class="bars">
${list(
  application.relationCounts.slice(0, 8),
  (relation) => `              <div class="bar">
                <span class="bar__label">${h(relation.relation)}</span>
                <span class="bar__track"><span class="bar__fill" style="width:${Math.round((relation.count / application.relationCounts[0].count) * 100)}%"></span></span>
                <span class="bar__value">${n(relation.count)}</span>
              </div>`,
)}
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 style="margin:2.5rem 0 1rem">The capture, in full</h3>
    <div class="stack">
      ${ipcTable(application.ipcChannels)}
      ${rolesTable(application.roles, application.summary)}
      ${filesTable(application.files)}
    </div>

    <div class="note" style="margin-top:1.25rem">
      <span>▸</span>
      <span><strong>Read the unknowns as the honest part.</strong> ${application.unknowns.total}
      questions stayed in the record — mostly ${h(application.unknowns.families.map((family) => `${family.family} (${family.count})`).join(", "))}.
      A different tool would have resolved them by guessing.</span>
    </div>
  </div>
</section>

<section class="section" id="artifact">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">02 · artifact inventory</p>
        <h2>inspect-artifact</h2>
      </div>
      <p>Give it a package. It returns a graded artifact graph with digests,
      containment edges and coverage — no engine involved.</p>
    </div>

    <div class="grid grid--2" style="align-items:start;margin-bottom:1.5rem">
      <div class="card">
        <span class="card__eyebrow">Input</span>
        <ul class="list-clean">
          <li>ZIP, ASAR, APK, DMG, <code>.app</code>, a raw binary, or any package file the provider recognizes.</li>
          <li>Sample used here: <code>${h(data.artifact.target)}</code> — ${n(data.artifact.bytes)} bytes, packed from the notes example.</li>
          <li>Directories are rejected with a remediation, because this workflow reads a file.</li>
        </ul>
      </div>
      <div class="card">
        <span class="card__eyebrow">What the record contains</span>
        <ul class="list-clean">
          <li>Artifacts deduplicated by digest, each graded by how completely it is materialized.</li>
          <li>Every occurrence: logical path, entry kind, hash status, executable and encrypted flags.</li>
          <li>Containment edges, integrity contradictions, hypotheses and next probes.</li>
          <li>Coverage across substeps, with omitted counts when a bound is hit.</li>
        </ul>
      </div>
    </div>

    <div class="grid grid--2" style="align-items:start;gap:1.5rem">
      <div class="stack">
        <div class="panel">
          <div class="panel__head"><span>Manifest</span><span>${n(data.artifact.durationMs)} ms · ${h(data.artifact.capturedAt)}</span></div>
          <div class="panel__body">
            <dl class="definition">
              <dt>Manifest</dt><dd class="mono">${h(shortDigest(manifest.id, 18))}</dd>
              <dt>Root</dt><dd class="mono">${h(manifest.rootFormat)} · ${h(shortDigest(manifest.rootSha256, 16))}</dd>
              <dt>Graph</dt><dd class="mono">${h(shortDigest(manifest.graphSha256, 16))}</dd>
              <dt>Counts</dt><dd>${manifest.nodes} artifacts · ${manifest.edges} edges · ${manifest.occurrences} occurrences</dd>
              <dt>Coverage</dt><dd>${h(artifact.artifact.coverage.status)} · ${artifact.artifact.coverage.substeps} substep</dd>
              <dt>Contradictions</dt><dd>${countOf(artifact.artifact.contradictions)}</dd>
            </dl>
          </div>
        </div>
        ${codeBlock({
          headLabel: "run it yourself",
          code: `node scripts/rea.mjs inspect-artifact ./notes-electron.zip --json`,
        })}
        <div class="row">
          <a class="btn small" href="/explore/?dataset=artifact">Open the tree</a>
          <a class="btn small" href="/evidence/artifact.json" download>Raw Evidence</a>
          <a class="btn small" href="/data/notes-electron.zip" download>Sample ZIP</a>
        </div>
      </div>
      <div class="stack">
        <div class="panel">
          <div class="panel__head"><span>Formats</span><span>${artifact.artifact.formats.length} distinct</span></div>
          <div class="panel__body">
            <div class="bars">
${list(
  artifact.artifact.formats,
  (format) => `              <div class="bar">
                <span class="bar__label">${h(format.format)}</span>
                <span class="bar__track"><span class="bar__fill" style="width:${Math.round((format.count / Math.max(...artifact.artifact.formats.map((entry) => entry.count))) * 100)}%"></span></span>
                <span class="bar__value">${n(format.count)}</span>
              </div>`,
)}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel__head"><span>Substeps</span><span>${artifact.artifact.substeps.length}</span></div>
          <div class="panel__body">
            <div class="stack" style="gap:.5rem">
${list(
  artifact.artifact.substeps,
  (step) => `              <div class="between" style="gap:.5rem">
                <span class="mono small">${h(step.operation)}</span>
                <span class="tag ${step.status === "completed" ? "tag--ok" : "tag--warn"}">${h(step.status)}</span>
              </div>`,
)}
              <p class="small faint" style="margin:.5rem 0 0">
                Hypotheses: ${artifact.artifact.hypotheses.length} · probes: ${artifact.artifact.probes.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 style="margin:2.5rem 0 1rem">The capture, in full</h3>
    ${occurrenceTable(artifact.files)}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">03 · choosing</p>
        <h2>Which one do I want?</h2>
      </div>
      <p>They compose: inventory the package first, then reconstruct the
      JavaScript inside it.</p>
    </div>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th scope="col"></th><th scope="col">analyze-javascript-application</th><th scope="col">inspect-artifact</th></tr></thead>
        <tbody>
          <tr><td>Best for</td><td>Understanding behaviour: IPC, bridges, roles, imports.</td><td>Understanding contents: what is inside a package and whether it is intact.</td></tr>
          <tr><td>Accepts</td><td>Directory, <code>.asar</code>, single <code>.js</code>/<code>.json</code></td><td>ZIP, ASAR, APK, DMG, <code>.app</code>, binary, package file</td></tr>
          <tr><td>Needs</td><td>Node.js only</td><td>Node.js only</td></tr>
          <tr><td>Executes the target</td><td>No</td><td>No</td></tr>
          <tr><td>Typical output</td><td>Graph of roles, edges, IPC channels, unknowns</td><td>Graded artifact graph with digests and occurrences</td></tr>
          <tr><td>Try it</td><td><a href="/explore/?dataset=application">Application graph</a></td><td><a href="/explore/?dataset=artifact">Artifact tree</a></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>
`;

  return body;
};
