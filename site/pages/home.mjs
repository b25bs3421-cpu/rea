import { codeBlock } from "../lib/shell.mjs";
import { countOf, h, list, n } from "../lib/html.mjs";

const evidenceSnippet = (artifact) => {
  const projection = artifact.projection;
  const evidence = projection.evidence;
  return JSON.stringify(
    {
      evidence_id: `${String(evidence.id).slice(0, 22)}…`,
      predicate_type: evidence.predicate,
      operation: evidence.operation,
      subject: {
        name: evidence.subject.name,
        format: evidence.subject.format,
        sha256: `${String(evidence.subject.sha256 ?? "").slice(0, 16)}…`,
      },
      confidence: evidence.confidence,
      authority: evidence.authority,
      coverage: projection.artifact.coverage,
      limitations: evidence.limitations.slice(0, 1),
    },
    null,
    2,
  );
};

const facets = [
  {
    number: "01",
    title: "Observations",
    body: "What was read, and from where. Nodes, occurrences, edges and source ranges — never a paraphrase of them.",
  },
  {
    number: "02",
    title: "Locations",
    body: "Every claim points at a file, an artifact path or a source range, so a reviewer can reopen the exact bytes.",
  },
  {
    number: "03",
    title: "Confidence",
    body: "Observed, derived or inferred, plus the authority that produced it — bytes, a parser or a static inference rule.",
  },
  {
    number: "04",
    title: "Coverage",
    body: "Complete, complete-within-substeps or bounded, with omitted counts when a limit was reached. Silence is never implied success.",
  },
  {
    number: "05",
    title: "Limitations",
    body: "What the provider could not do on this host, stated in the record instead of being left for the reader to guess.",
  },
  {
    number: "06",
    title: "Unknowns",
    body: "Residual questions stay in the graph as labelled unknowns with a reason — ambiguity is data, not noise to drop.",
  },
];

export const homePage = (data) => {
  const { stats, artifact, application } = data;
  const manifest = artifact.projection.artifact.manifest;
  const record = {
    id: artifact.projection.evidence.id,
    subject: artifact.target,
    confidence: artifact.projection.evidence.confidence,
    coverage: artifact.projection.artifact.coverage.status,
    occurrences: manifest.occurrences,
    artifacts: manifest.nodes,
    contradictions: countOf(artifact.projection.artifact.contradictions),
  };

  const body = `
<section class="hero">
  <div class="wrap">
    <div class="hero__inner">
      <div>
        <p class="kicker">REA ${h(data.version)} · ${n(stats.tools)} tools · ${n(stats.commands)} commands</p>
        <h1>Every answer arrives with its <em>evidence</em>.</h1>
        <p class="lede">
          REA gives a coding agent one contract for inspecting binaries, applications
          and browser behaviour. It returns a canonical Evidence record — observations,
          locations, confidence, coverage and limitations — instead of a confident
          summary. This site is generated from the repository itself, including two
          analyses you can open and read node by node.
        </p>
        <div class="hero__actions">
          <a class="btn btn--primary" href="/explore/">Open the evidence explorer</a>
          <a class="btn" href="/workflows/">See the two workflows</a>
        </div>
        <div class="hero__meta">
          <span class="tag">MCP server</span>
          <span class="tag">CLI</span>
          <span class="tag">${n(stats.documents)} documents</span>
          <span class="tag">${n(stats.providers)} providers</span>
          <span class="tag">static site · no backend</span>
        </div>
      </div>
      <aside class="record" aria-label="A real Evidence record from this site's sample run">
        <div class="record__head">
          <span>evidence · artifact inventory</span>
          <span class="tag tag--ok">captured</span>
        </div>
        <dl>
          <dt>Evidence</dt><dd><span class="truncate" style="max-width:26ch">${h(record.id)}</span></dd>
          <dt>Subject</dt><dd>${h(record.subject)}</dd>
          <dt>Confidence</dt><dd>${h(record.confidence)}</dd>
          <dt>Coverage</dt><dd>${h(record.coverage)}</dd>
          <dt>Artifacts</dt><dd>${record.artifacts} graded · ${record.occurrences} occurrences</dd>
          <dt>Contradictions</dt><dd>${record.contradictions}</dd>
        </dl>
        <div class="record__foot">
          <a class="btn btn--ghost small" href="/explore/?dataset=artifact">Inspect the graph</a>
          <a class="btn btn--ghost small" href="/evidence/artifact.json" download>Raw JSON</a>
        </div>
      </aside>
    </div>
  </div>
</section>

<div class="hairline-grid">
  <div><strong>${n(stats.tools)}</strong><span>MCP tools</span></div>
  <div><strong>${n(stats.commands)}</strong><span>CLI commands</span></div>
  <div><strong>${n(stats.providers)}</strong><span>providers</span></div>
  <div><strong>${n(stats.documents)}</strong><span>documents</span></div>
  <div><strong>${n(stats.clients)}</strong><span>MCP clients</span></div>
  <div><strong>${n(stats.productionLines)}</strong><span>lines of product code</span></div>
</div>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">01 · what runs here</p>
        <h2>Two workflows, one record shape</h2>
      </div>
      <p>Both run against a bundled sample in this checkout and both return the same
      Evidence contract. Neither executes the target.</p>
    </div>
    <div class="grid grid--2">
      <a class="card card--link" href="/workflows/#application">
        <span class="card__eyebrow">analyze-javascript-application</span>
        <h3>Reconstruct an Electron or web application</h3>
        <p class="muted small">
          Files, module references, context-bridge APIs, IPC channels with both
          sides, resolved main / preload / renderer roles, 45 relationship edges and
          the unknowns the static analysis refuses to guess.
        </p>
        <dl class="definition" style="margin-top:.5rem">
          <dt>Sample</dt><dd>${h(application.target)}</dd>
          <dt>Captured</dt><dd>${application.projection.files.length} files · ${application.projection.roles.length} roles · ${application.projection.edges.length} edges</dd>
          <dt>Coverage</dt><dd>${h(application.projection.coverage.status)}</dd>
        </dl>
        <span class="card__arrow">Read the workflow →</span>
      </a>
      <a class="card card--link" href="/workflows/#artifact">
        <span class="card__eyebrow">inspect-artifact</span>
        <h3>Inventory a package without an engine</h3>
        <p class="muted small">
          Any ZIP, ASAR, APK, DMG, app bundle or binary the artifact graph provider
          recognizes. You get graded artifacts deduplicated by digest, the
          containment tree, per-occurrence hash status and coverage.
        </p>
        <dl class="definition" style="margin-top:.5rem">
          <dt>Sample</dt><dd>${h(artifact.target)} · ${n(artifact.bytes)} bytes</dd>
          <dt>Captured</dt><dd>${manifest.nodes} artifacts · ${manifest.edges} edges · ${manifest.occurrences} occurrences</dd>
          <dt>Coverage</dt><dd>${h(artifact.projection.artifact.coverage.status)}</dd>
        </dl>
        <span class="card__arrow">Read the workflow →</span>
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">02 · the contract</p>
        <h2>One record, six honest facets</h2>
      </div>
      <p>An agent can act on this without trusting prose. Every field below appears
      in the JSON, including the uncomfortable ones.</p>
    </div>
    <div class="grid grid--2" style="align-items:start;gap:1.5rem">
      <div class="facets">
${list(
  facets,
  (facet) => `        <article>
          <h3>${facet.title} <span>${facet.number}</span></h3>
          <p>${facet.body}</p>
        </article>`,
)}
      </div>
      <div class="stack">
        ${codeBlock({
          code: evidenceSnippet(artifact),
          lang: "json",
          headLabel: "evidence · inspect-artifact · trimmed",
        })}
        <p class="small muted" style="margin:0">
          Trimmed for display. The complete document is
          <a href="/evidence/artifact.json" download>${n(Math.round(data.evidenceBytes.artifact / 1024))} KiB of JSON</a>
          and the explorer reads exactly the same capture.
        </p>
        <div class="note">
          <span>▸</span>
          <span><strong>Confidence is graded, not implied.</strong> Observed means the
          bytes said so; derived means a parser or rule produced it; inferred means a
          static relationship with an authority named in the record.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">03 · targets</p>
        <h2>What you can point it at</h2>
      </div>
      <p>Straight from the repository's capability matrix: what each format
      returns, and what has to be on the host first.</p>
    </div>
    <div class="table-scroll">
      <table class="data">
        <caption>Capability matrix · ${data.docs.targets.length} rows</caption>
        <thead>
          <tr><th scope="col">Target</th><th scope="col">What REA returns</th><th scope="col">Requirements</th></tr>
        </thead>
        <tbody>
${list(
  data.docs.targets,
  (target) => `          <tr>
            <td>${h(target.target)}</td>
            <td>${h(target.returns)}</td>
            <td class="small">${h(target.requirements)}${target.links?.length ? ` <span class="tag">${h(target.links[0].label)}</span>` : ""}</td>
          </tr>`,
)}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">04 · index</p>
        <h2>Every surface, one click away</h2>
      </div>
      <p>These indexes are generated from the same catalogs the MCP server and the
      CLI publish, so they cannot drift from the build.</p>
    </div>
    <div class="grid grid--4">
      <a class="card card--link" href="/reference/tools/">
        <span class="card__eyebrow">MCP</span>
        <h3>${n(stats.tools)} tools</h3>
        <p class="small muted">${n(stats.readonly)} read-only · ${n(stats.destructive)} with destructive effects · ${n(stats.sessionTools)} session-bound.</p>
        <span class="card__arrow">Browse →</span>
      </a>
      <a class="card card--link" href="/reference/cli/">
        <span class="card__eyebrow">CLI</span>
        <h3>${n(stats.commands)} commands</h3>
        <p class="small muted">The same workflows from a terminal, with aliases kept for compatibility.</p>
        <span class="card__arrow">Browse →</span>
      </a>
      <a class="card card--link" href="/reference/docs/">
        <span class="card__eyebrow">Docs</span>
        <h3>${n(stats.documents)} documents</h3>
        <p class="small muted">${n(stats.docWords)} words across six areas, from installation to provider internals.</p>
        <span class="card__arrow">Browse →</span>
      </a>
      <a class="card card--link" href="/about/">
        <span class="card__eyebrow">Provenance</span>
        <h3>${n(stats.providers)} providers</h3>
        <p class="small muted">${n(stats.clients)} MCP clients, and the exact digests behind every number on this site.</p>
        <span class="card__arrow">Read →</span>
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">05 · run it</p>
        <h2>Three commands from here</h2>
      </div>
      <p>The site is static. The analyses are not: run them from a checkout, or
      open the local console for the same workflows with a UI.</p>
    </div>
    <div class="grid grid--2" style="align-items:start">
      <div class="stack">
        ${codeBlock({
          headLabel: "install and inspect",
          code: `# install once, then connect your agent
npm install -g ${data.packageName}
rea setup

# inventory any package, no engine required
rea inspect-artifact ./app.zip --json

# reconstruct a JavaScript application
rea analyze-javascript-application ./extracted-app --json`,
        })}
        <p class="small muted" style="margin:0">
          Every command in this site is listed in the
          <a href="/reference/cli/">command reference</a> and every tool in the
          <a href="/reference/tools/">tool catalog</a>.
        </p>
      </div>
      <div class="stack">
        ${codeBlock({
          headLabel: "MCP client configuration",
          code: `{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["-y", "${data.packageName}@latest"]
    }
  }
}`,
        })}
        <div class="note">
          <span>▸</span>
          <span><strong>Want the UI?</strong> The Workbench console runs the same
          workflows against a local checkout, with uploads, path mode and evidence
          downloads: <code>npm run workbench</code> then
          <a href="http://localhost:5180" rel="noreferrer">localhost:5180</a>.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">06 · limits</p>
        <h2>What this site will not pretend</h2>
      </div>
      <p>Static pages cannot run an analysis. They also should not hide what the
      host could not do.</p>
    </div>
    <div class="grid grid--3">
      <article class="card">
        <span class="card__eyebrow">Static by design</span>
        <h3>Captured, not live</h3>
        <p class="small muted">The two datasets were captured on ${h(artifact.capturedAt)} from
        ${h(data.branch)}@${h(data.commit)}. They do not update when you read the page.</p>
      </article>
      <article class="card">
        <span class="card__eyebrow">Engines</span>
        <h3>No native engine here</h3>
        <p class="small muted">Hopper, Ghidra and IDA are not installed in this build,
        so the site demonstrates the engine-free workflows only. The record says so
        rather than implying deeper analysis.</p>
      </article>
      <article class="card">
        <span class="card__eyebrow">Sources</span>
        <h3>Summaries, with links</h3>
        <p class="small muted">Documents are indexed by title, summary and section
        headings; the prose stays in the repository so there is one source of truth.</p>
      </article>
    </div>
  </div>
</section>
`;

  return body;
};
