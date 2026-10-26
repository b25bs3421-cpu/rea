import { codeBlock, esc, int, loadingState, sectionHead } from "../ui.js";

export const renderOverview = async (container, ctx) => {
  const [tools, cli, docs, repo] = await Promise.all([
    ctx.api("tools"),
    ctx.api("cli"),
    ctx.api("docs"),
    ctx.api("repo"),
  ]);
  const meta = ctx.meta;
  const counts = meta?.counts ?? {};

  container.innerHTML = `
    <section class="hero">
      <div class="hero__copy">
        <span class="kicker">Local console · ${esc(meta?.rea.platform ?? "host")}</span>
        <h1>Reverse engineer anything —<br />with the <em>receipts</em>.</h1>
        <p class="hero__lede">
          REA gives an agent or a terminal one contract for inspecting binaries,
          JavaScript and Electron apps, .NET assemblies, Android packages,
          captures and websites. Every result carries its evidence, coverage and
          limitations. This Workbench runs <strong>this checkout</strong>: the same
          CLI, the same catalogs, on this host.
        </p>
        <div class="hero__actions">
          <a class="btn btn--primary" href="#/lab">Run a live analysis</a>
          <a class="btn" href="#/tools">Browse ${int(counts.tools)} tools</a>
          <a class="btn btn--ghost" href="#/readiness">Check readiness</a>
        </div>
      </div>
      <aside class="deck" aria-label="Checkout facts">
        <div class="deck__line"><span>package</span><span class="deck__value">${esc(meta?.rea.version ?? "")}</span></div>
        <div class="deck__line"><span>checkout</span><span>${esc(meta?.rea.checkout.commit ?? "")} · ${esc((meta?.rea.checkout.branch ?? "").split("/").at(-1))}</span></div>
        <div class="deck__line"><span>node</span><span>${esc(meta?.rea.node ?? "")} · ${esc(meta?.rea.platform ?? "")}</span></div>
        <div class="deck__line"><span>mcp tools</span><span class="deck__value">${int(counts.tools)}</span></div>
        <div class="deck__line"><span>cli commands</span><span class="deck__value">${int(counts.cliCommands)}</span></div>
        <div class="deck__line"><span>providers</span><span class="deck__value">${int(counts.providers)}</span></div>
        <div class="deck__line"><span>documents</span><span class="deck__value">${int(counts.documents)}</span></div>
        <div class="deck__line"><span>source</span><span>${int(repo.totals.productionLines)} lines / ${int(repo.totals.productionFiles)} files</span></div>
      </aside>
    </section>

    <div class="grid grid--4" style="margin-top:22px">
      ${metric(int(counts.tools), "MCP tools", "One stdio server, 17 provider surfaces", true)}
      ${metric(int(counts.cliCommands), "CLI commands", "Same workflows from a terminal")}
      ${metric(int(counts.providers), "providers", "Engines, parsers and format bridges")}
      ${metric(int(counts.documents), "documents", `${int(docs.counts.words)} words of contracts and guides`)}
    </div>

    <section class="section" id="workflows">
      ${sectionHead("01", "Two workflows run here, live", "No engine required, no target executed, complete Evidence downloadable.")}
      <div class="grid grid--2">
        <a class="panel stack panel--ticked" href="#/lab" style="text-decoration:none;color:inherit">
          <div class="spread">
            <p class="panel__title" style="color:var(--accent)">analyze-javascript-application</p>
            <span class="tag tag--accent">app reconstruction</span>
          </div>
          <p class="muted small" style="line-height:1.6">
            Reconstruct an extracted Electron or web app: files, module
            references, context-bridge APIs, IPC channels with both sides,
            resolved main/preload/renderer roles, relationship edges, semantic
            fingerprints and the residual unknowns the static analysis refuses
            to guess.
          </p>
          <div class="term-command"><span class="prompt">$</span><code>rea analyze-javascript-application ./app --json</code></div>
        </a>
        <a class="panel stack panel--ticked" href="#/lab" style="text-decoration:none;color:inherit">
          <div class="spread">
            <p class="panel__title" style="color:var(--accent)">inspect-artifact</p>
            <span class="tag tag--accent">artifact inventory</span>
          </div>
          <p class="muted small" style="line-height:1.6">
            Inventory any package the safe artifact graph provider recognizes —
            ZIP, ASAR, APK, DMG, app bundle, binary. You get graded artifacts
            deduplicated by digest, the containment tree, per-occurrence hash
            status, coverage, hypotheses and next probes.
          </p>
          <div class="term-command"><span class="prompt">$</span><code>rea inspect-artifact ./package.zip --json</code></div>
        </a>
      </div>
    </section>

    <section class="section">
      ${sectionHead("02", "The loop", "What happens between a question about an app and a defensible answer.")}
      <div class="fig panel--ticked">
        ${pipelineFigure()}
        <p class="fig__caption">
          Each run produces a canonical Evidence record: observations with source
          locations, relationship coverage, digests, limitations and retained
          unknowns. The agent reads the record, not a summary of it.
        </p>
      </div>
      <div class="grid grid--3" style="margin-top:14px">
        ${loopCard("Ask", "Describe the feature, crash or artefact in the agent. REA exposes prompts and 193 typed tools; the agent picks the workflow.", "#/docs?doc=mcp-prompts")}
        ${loopCard("Inspect", "REA drives a provider — Hopper, Ghidra, IDA, a static parser or a capture reader — and returns Evidence with locations and coverage.", "#/tools")}
        ${loopCard("Reconstruct", "The agent explains the behaviour, drafts the equivalent implementation, and tests it. Unknowns stay labelled instead of becoming guesses.", "#/lab")}
      </div>
    </section>

    <section class="section" id="host">
      ${sectionHead("03", "What this host can do", "Read live from `rea doctor` and `rea providers` on this machine.")}
      <div id="hostPanel">${loadingState("Checking engines and providers…")}</div>
    </section>

    <section class="section" id="targets">
      ${sectionHead("04", "What REA can analyze", "Static inspection needs no engine unless the row says so.")}
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Target</th><th>What REA returns</th><th>Requirements and guide</th></tr></thead>
          <tbody>
            ${docs.targets
              .map(
                (target) => `<tr>
                  <td class="name">${esc(target.target)}</td>
                  <td>${esc(target.returns)}</td>
                  <td>${esc(target.requirements)}${
                    target.links.length === 0
                      ? ""
                      : `<div class="row" style="margin-top:4px">${target.links
                          .map(
                            (link) =>
                              `<a class="tag" href="${esc(link.href)}"${link.href.startsWith("http") ? ' target="_blank" rel="noreferrer noopener"' : ""}>${esc(link.label)}</a>`,
                          )
                          .join("")}</div>`
                  }</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section" id="start">
      ${sectionHead("05", "Start in one command", "Run these in the repository root, or copy them from the setup builder.")}
      <div class="grid grid--3">
        <div class="panel stack">
          <p class="panel__title">Connect an agent</p>
          ${codeBlock("npx rea-agents setup", "shell")}
          <p class="panel__note">Registers the MCP server and installs the matching workflow skill. Review the plan before approving.</p>
          <a class="btn btn--small" href="#/setup">Build a setup command</a>
        </div>
        <div class="panel stack">
          <p class="panel__title">Analyze an app</p>
          ${codeBlock(
            `npx rea-agents@latest ${cli.commands.find((entry) => entry.name === "analyze-javascript-application")?.name ?? "analyze-javascript-application"} /path/to/app --json`,
            "shell",
          )}
          <p class="panel__note">Static JavaScript and Electron reconstruction needs no native engine.</p>
          <a class="btn btn--small" href="#/lab">Run it on the sample</a>
        </div>
        <div class="panel stack">
          <p class="panel__title">Serve MCP locally</p>
          ${codeBlock("node scripts/rea.mjs mcp", "shell")}
          <p class="panel__note">The stdio server used by every supported client. ${int(counts.tools)} tools and ${int(counts.prompts ?? 0)} guided prompts.</p>
          <a class="btn btn--small" href="#/cli?cmd=mcp">Read the CLI entry</a>
        </div>
      </div>
      <div class="panel" style="margin-top:14px">
        <p class="panel__title" style="margin-bottom:10px">Prompts that work</p>
        <div class="stack">
          ${promptLine("Understand how search works in the Notes app, show me the evidence, and build a similar feature for my project.")}
          ${promptLine("Compare version 1.2 with 1.3 of this Electron app and list every IPC channel that changed.")}
          ${promptLine("Trace this crash address back to a function, then reconstruct the input that reaches it.")}
        </div>
      </div>
    </section>

    <section class="section" id="faq">
      ${sectionHead("06", "Common questions", "Short answers, with the full contract in the documents.")}
      <div class="accordion">
        ${docs.faq
          .map(
            (entry) => `<details>
              <summary>${esc(entry.question)}</summary>
              <div class="accordion__body">${esc(entry.answer)}</div>
            </details>`,
          )
          .join("")}
      </div>
    </section>
  `;

  hydrateHostPanel(container);
  void tools;
};

const metric = (value, label, hint, accent = false) => `
  <div class="metric${accent ? " metric--accent" : ""}">
    <span class="metric__value">${value}</span>
    <span class="metric__label">${esc(label)}</span>
    <span class="metric__hint">${esc(hint)}</span>
  </div>`;

const loopCard = (title, body, href) => `
  <a class="panel stack" href="${esc(href)}" style="text-decoration:none;color:inherit">
    <p class="panel__title" style="color:var(--accent)">${esc(title)}</p>
    <p style="color:var(--muted);font-size:12.5px;line-height:1.6">${esc(body)}</p>
    <span class="tag" style="align-self:start">open →</span>
  </a>`;

const promptLine = (text) => `
  <div class="term-command" style="white-space:normal">
    <span class="prompt">›</span>
    <span style="font-size:12px;line-height:1.5">${esc(text)}</span>
    <span style="margin-left:auto">${copyInline(text)}</span>
  </div>`;

const copyInline = (text) =>
  `<button class="btn btn--ghost btn--small" type="button" data-copy="${esc(text)}">Copy</button>`;

const hydrateHostPanel = async (container) => {
  const host = container.querySelector("#hostPanel");
  if (host === null) return;
  try {
    const response = await fetch("/api/readiness");
    if (!response.ok) throw new Error(`readiness ${response.status}`);
    const payload = await response.json();
    const checks = payload.doctor.report.checks ?? [];
    const engines = checks.filter((check) =>
      /hopper|ghidra|ida/.test(check.name),
    );
    const enginesReady = engines.filter((check) => check.ok);
    const staticPath = checks.filter((check) => check.ok);
    host.innerHTML = `
      <div class="readiness-hero">
        <div class="verdict" data-ok="${enginesReady.length > 0}">
          <span class="kicker">Native engines</span>
          <p class="verdict__state">${enginesReady.length} of ${engines.length} configured</p>
          <p class="muted small">
            ${
              enginesReady.length === 0
                ? "Deep native analysis needs Hopper, Ghidra or IDA. Everything static below still runs."
                : enginesReady.map((check) => check.name).join(", ") +
                  " detected."
            }
          </p>
          <div class="row">
            ${engines
              .map(
                (check) =>
                  `<span class="tag ${check.ok ? "tag--accent" : "tag--amber"}">${esc(check.name)} ${check.ok ? "ready" : "missing"}</span>`,
              )
              .join("")}
          </div>
          <a class="btn btn--small" href="#/readiness">Full readiness report</a>
        </div>
        <div class="panel stack">
          <p class="panel__title">Ready without an engine</p>
          <ul class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px">
            <li>JavaScript and Electron reconstruction — proven by the Live lab.</li>
            <li>Artifact inventory for packages, bundles and binaries.</li>
            <li>.NET metadata and CIL, Go build metadata, package inventory and digests.</li>
            <li>SQLite, WASM, EVM, HAR/SAZ captures when their caller-supplied tool is present.</li>
          </ul>
          <div class="row">
            ${staticPath
              .slice(0, 4)
              .map(
                (check) =>
                  `<span class="tag tag--accent">${esc(check.name)}</span>`,
              )
              .join("")}
          </div>
          <p class="panel__note">Checked ${esc(new Date(payload.at).toLocaleTimeString())} · cached for a minute.</p>
        </div>
      </div>`;
  } catch (error) {
    host.innerHTML = `<div class="callout callout--warn"><span class="callout__mark">!</span><div>The readiness report is unavailable: ${esc(error.message)}</div></div>`;
  }
};

const pipelineFigure = () => `
  <svg viewBox="0 0 920 220" role="img" aria-label="Target to provider to Evidence to agent">
    <defs>
      <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 0 8 4 0 8z" fill="var(--line-strong)" />
      </marker>
      <pattern id="ticks" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 16V0h16" fill="none" stroke="var(--line)" stroke-width="0.5" opacity="0.5" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="920" height="220" fill="url(#ticks)" opacity="0.35" />

    <g font-size="10" fill="var(--faint)" letter-spacing="2">
      <text x="16" y="22">LOCAL TARGET</text>
      <text x="286" y="22">PROVIDER / ANALYZER</text>
      <text x="556" y="22">EVIDENCE</text>
      <text x="812" y="22">CONSUMER</text>
    </g>

    <g>
      <rect x="16" y="44" width="210" height="120" fill="var(--panel-2)" stroke="var(--line-strong)" />
      <text x="30" y="70" font-size="14" fill="var(--ink)">binary · app · packet</text>
      <text x="30" y="92" font-size="11" fill="var(--muted)">ELF · Mach-O · PE · .NET</text>
      <text x="30" y="110" font-size="11" fill="var(--muted)">electron · asar · apk</text>
      <text x="30" y="128" font-size="11" fill="var(--muted)">har · pcap · sqlite · wasm</text>
      <text x="30" y="150" font-size="10" fill="var(--accent)">read locally, never uploaded</text>
    </g>

    <g>
      <rect x="258" y="44" width="240" height="120" fill="var(--panel-2)" stroke="var(--line-strong)" />
      <text x="272" y="70" font-size="14" fill="var(--ink)">Hopper · Ghidra · IDA</text>
      <text x="272" y="92" font-size="11" fill="var(--muted)">static parsers · pwntools</text>
      <text x="272" y="110" font-size="11" fill="var(--muted)">CDP / Playwright · tshark</text>
      <text x="272" y="128" font-size="11" fill="var(--muted)">jadx · apktool · adb · JEB</text>
      <text x="272" y="150" font-size="10" fill="var(--accent)">40 providers, selected per format</text>
    </g>

    <g>
      <rect x="530" y="44" width="220" height="120" fill="var(--panel-3)" stroke="var(--accent)" />
      <text x="544" y="70" font-size="14" fill="var(--ink)">one canonical record</text>
      <text x="544" y="92" font-size="11" fill="var(--muted)">observations + source ranges</text>
      <text x="544" y="110" font-size="11" fill="var(--muted)">relationship coverage</text>
      <text x="544" y="128" font-size="11" fill="var(--muted)">digests · limitations</text>
      <text x="544" y="150" font-size="10" fill="var(--accent)">residual unknowns stay labelled</text>
    </g>

    <g>
      <rect x="782" y="44" width="122" height="120" fill="var(--panel-2)" stroke="var(--line-strong)" />
      <text x="796" y="70" font-size="13" fill="var(--ink)">your agent</text>
      <text x="796" y="90" font-size="11" fill="var(--muted)">or the CLI</text>
      <text x="796" y="112" font-size="11" fill="var(--muted)">explain ·</text>
      <text x="796" y="128" font-size="11" fill="var(--muted)">implement ·</text>
      <text x="796" y="144" font-size="11" fill="var(--muted)">verify</text>
    </g>

    <g stroke="var(--line-strong)" stroke-width="1.2" fill="none">
      <path d="M226 104h26" marker-end="url(#arrow)" />
      <path d="M498 104h26" marker-end="url(#arrow)" />
      <path class="flow" d="M750 104h26" marker-end="url(#arrow)" stroke="var(--accent)" />
    </g>

    <g font-size="9.5" fill="var(--faint)" letter-spacing="1.2">
      <text x="16" y="192">MCP over stdio</text>
      <text x="258" y="192">one shared layer</text>
      <text x="530" y="192">complete or bounded</text>
      <text x="782" y="192">evidence in</text>
    </g>
  </svg>`;
