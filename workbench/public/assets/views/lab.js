import {
  bytes,
  copyButton,
  duration,
  esc,
  int,
  pageHead,
  shortHash,
  toast,
} from "../ui.js";

const APP_TABS = [
  { id: "summary", label: "Summary" },
  { id: "ipc", label: "IPC and bridge" },
  { id: "files", label: "Files" },
  { id: "relations", label: "Relationships" },
  { id: "unknowns", label: "Unknowns" },
  { id: "limits", label: "Limitations" },
  { id: "evidence", label: "Evidence" },
];

const ARTIFACT_TABS = [
  { id: "summary", label: "Summary" },
  { id: "files", label: "Occurrences" },
  { id: "artifacts", label: "Artifacts" },
  { id: "coverage", label: "Coverage and limits" },
  { id: "evidence", label: "Evidence" },
];

const tabsFor = (workflow) =>
  workflow === "artifact" ? ARTIFACT_TABS : APP_TABS;

export const renderLab = async (container, ctx) => {
  const meta = ctx.meta;
  const samples = meta?.samples ?? [];
  const workflows = meta?.workflows ?? [
    { id: "application", label: "App reconstruction" },
    { id: "artifact", label: "Artifact inventory" },
  ];
  const state = {
    workflow: "application",
    source: "sample",
    sample: samples[0]?.id ?? "notes-electron",
    file: null,
    path: "",
    running: false,
    result: null,
    tab: "summary",
  };

  container.innerHTML = `
    ${pageHead(
      "Live lab",
      "Run a real analysis",
      `This is not a mock. The panel below starts <code class="mono">scripts/rea.mjs</code> in this checkout, parses the same Evidence your agent receives, and keeps the complete record for download. The target application is never executed.`,
    )}
    <div class="lab">
      <section class="lab__controls" aria-label="Analysis controls">
        <div class="lab__step">
          <span class="lab__step-label"><b>0</b> workflow</span>
          <div class="segmented" role="tablist" aria-label="Workflow">
            ${workflows
              .map(
                (
                  workflow,
                ) => `<button role="tab" data-workflow="${esc(workflow.id)}"
                  aria-selected="${workflow.id === state.workflow}">${esc(workflow.label)}</button>`,
              )
              .join("")}
          </div>
          <p class="panel__note" id="workflowNote"></p>
        </div>
        <div class="segmented" role="tablist" aria-label="Target source">
          <button role="tab" data-source="sample" aria-selected="true">Sample</button>
          <button role="tab" data-source="upload" aria-selected="false">Upload</button>
          <button role="tab" data-source="path" aria-selected="false">Local path</button>
        </div>

        <div class="lab__step" data-panel="sample">
          <span class="lab__step-label"><b>1</b> choose a bundled target</span>
          ${samples
            .map(
              (
                sample,
              ) => `<button class="choice" type="button" data-sample="${esc(sample.id)}" aria-pressed="${sample.id === state.sample}">
                <strong>${esc(sample.name)}</strong>
                <span>${esc(sample.description)} · ${int(sample.files)} files</span>
              </button>`,
            )
            .join("")}
        </div>

        <div class="lab__step" data-panel="upload" hidden>
          <span class="lab__step-label"><b>1</b> upload an app</span>
          <label class="dropzone" id="dropzone">
            <strong id="dropLabel">Drop a ZIP, ASAR or .js file</strong>
            <span>or click to pick · up to ${int(meta?.limits.uploadMb ?? 64)} MiB</span>
            <input id="fileInput" type="file" accept=".zip,.asar,.js,.mjs,.cjs,.json" hidden />
          </label>
          <p class="panel__note">The archive is unpacked into a temporary directory, analysed, then deleted. The complete Evidence stays downloadable for ${int(meta?.limits.evidenceRetentionMinutes ?? 30)} minutes.</p>
        </div>

        <div class="lab__step" data-panel="path" hidden>
          <span class="lab__step-label"><b>1</b> path on this machine</span>
          <input class="input" id="pathInput" type="text" spellcheck="false"
            placeholder="/Applications/Notes.app or D:/apps/example" aria-label="Absolute target path" />
          <p class="panel__note">Reads a path on the host that runs this server. Useful when you run the Workbench locally; in a hosted sandbox, upload instead.</p>
        </div>

        <div class="lab__step">
          <span class="lab__step-label"><b>2</b> run</span>
          <button class="btn btn--primary" id="runButton" type="button">Run analysis</button>
          <p class="panel__note" id="runHint">Static reconstruction · no native engine required.</p>
        </div>

        <div class="lab__step">
          <span class="lab__step-label"><b>3</b> reproduce it</span>
          <div class="term-command" id="commandPreview"></div>
        </div>
      </section>

      <section class="lab__result" id="result" aria-live="polite"></section>
    </div>
  `;

  const result = container.querySelector("#result");
  const preview = container.querySelector("#commandPreview");
  const runButton = container.querySelector("#runButton");

  const commandName = () =>
    state.workflow === "artifact"
      ? "inspect-artifact"
      : "analyze-javascript-application";

  const commandFor = () => {
    if (state.source === "sample") {
      const sample = samples.find((entry) => entry.id === state.sample);
      if (state.workflow === "artifact")
        return `node scripts/rea.mjs inspect-artifact <sample>/${state.sample}.zip --json`;
      return `node scripts/rea.mjs ${commandName()} ${sample?.command.split(" ").slice(1).join(" ") ?? "website/public/examples/notes-electron"} --json`;
    }
    if (state.source === "upload")
      return `node scripts/rea.mjs ${commandName()} <upload>/${
        state.workflow === "artifact"
          ? (state.file?.name ?? "package.zip")
          : "app"
      } --json`;
    return `node scripts/rea.mjs ${commandName()} ${state.path || "<path>"} --json`;
  };

  const setWorkflow = (workflow) => {
    state.workflow = workflow;
    container
      .querySelectorAll("[data-workflow]")
      .forEach((button) =>
        button.setAttribute(
          "aria-selected",
          String(button.dataset.workflow === workflow),
        ),
      );
    const note = container.querySelector("#workflowNote");
    if (note !== null) {
      const entry = workflows.find((item) => item.id === workflow);
      note.textContent =
        workflow === "artifact"
          ? `Inventories ${entry?.accepts ?? "a package"} without an engine: graded artifacts, containment edges, digests and coverage.`
          : `Reconstructs ${entry?.accepts ?? "an application"} statically: modules, IPC, roles and residual unknowns.`;
    }
    const hint = container.querySelector("#runHint");
    if (hint !== null)
      hint.textContent =
        workflow === "artifact"
          ? "Artifact graph · no native engine required."
          : "Static reconstruction · no native engine required.";
    const dropLabel = container.querySelector("#dropLabel");
    if (dropLabel !== null && state.file === null)
      dropLabel.textContent =
        workflow === "artifact"
          ? "Drop any package file"
          : "Drop a ZIP, ASAR or .js file";
    updatePreview();
  };

  const updatePreview = () => {
    preview.innerHTML = `<span class="prompt">$</span><code>${esc(commandFor())}</code><span style="margin-left:auto">${copyButton(commandFor())}</span>`;
  };

  const setSource = (source) => {
    state.source = source;
    container.querySelectorAll("[data-source]").forEach((button) => {
      if (button.classList.contains("segmented") === false)
        button.setAttribute(
          "aria-selected",
          String(button.dataset.source === source),
        );
    });
    container.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== source;
    });
    updatePreview();
  };

  container.querySelectorAll("[data-source]").forEach((button) => {
    button.addEventListener("click", () => setSource(button.dataset.source));
  });
  container.querySelectorAll("[data-workflow]").forEach((button) => {
    button.addEventListener("click", () =>
      setWorkflow(button.dataset.workflow),
    );
  });
  container.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sample = button.dataset.sample;
      container.querySelectorAll("[data-sample]").forEach((node) => {
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.sample === state.sample),
        );
      });
      updatePreview();
    });
  });

  const dropzone = container.querySelector("#dropzone");
  const fileInput = container.querySelector("#fileInput");
  const dropLabel = container.querySelector("#dropLabel");
  const chooseFile = (file) => {
    state.file = file ?? null;
    dropLabel.textContent =
      state.file === null
        ? "Drop a ZIP, ASAR or .js file"
        : `${state.file.name} · ${bytes(state.file.size)}`;
  };
  fileInput.addEventListener("change", () => chooseFile(fileInput.files[0]));
  ["dragenter", "dragover"].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.dataset.over = "true";
    }),
  );
  ["dragleave", "drop"].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.dataset.over = "false";
    }),
  );
  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file !== undefined) chooseFile(file);
  });

  container.querySelector("#pathInput").addEventListener("input", (event) => {
    state.path = event.target.value.trim();
    updatePreview();
  });

  const renderEmpty = () => {
    result.innerHTML = `
      <div class="empty" style="min-height:340px">
        <span class="empty__mark">no run yet</span>
        <p>Pick the bundled Electron sample and press <strong>Run analysis</strong>. It takes about two seconds and produces the same Evidence structure a real target does.</p>
        <p class="mono small faint">${esc(commandFor())}</p>
      </div>`;
  };

  const renderRunning = (startedAt) => {
    result.innerHTML = `
      <div class="panel--ticked panel stack" style="min-height:340px">
        <div class="spread">
          <p class="panel__title">analysis in progress</p>
          <span class="tag tag--amber" id="elapsed">0.0 s</span>
        </div>
        <div class="term" id="runLog">$ ${esc(commandFor())}
invoking the CLI entry point…
reading and hashing the artifact
building the application graph
resolving semantic relationships
sealing Evidence</div>
        <p class="panel__note">The server streams nothing until the record is sealed: REA returns one canonical result, not partial guesses.</p>
      </div>`;
    const timer = setInterval(() => {
      const node = result.querySelector("#elapsed");
      if (node !== null)
        node.textContent = `${((Date.now() - startedAt) / 1000).toFixed(1)} s`;
    }, 100);
    return () => clearInterval(timer);
  };

  const run = async () => {
    if (state.running) return;
    if (state.source === "upload" && state.file === null) {
      toast("Choose a ZIP, ASAR or .js file first.", "error");
      return;
    }
    if (state.source === "path" && state.path === "") {
      toast("Enter an absolute path first.", "error");
      return;
    }
    state.running = true;
    runButton.disabled = true;
    runButton.textContent = "Running…";
    const startedAt = Date.now();
    const stopTimer = renderRunning(startedAt);
    try {
      let response;
      if (state.source === "upload") {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "content-type": "application/octet-stream",
            "x-filename": state.file.name,
            "x-workflow": state.workflow,
          },
          body: state.file,
        });
      } else {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            state.source === "sample"
              ? {
                  mode: "sample",
                  sample: state.sample,
                  workflow: state.workflow,
                }
              : {
                  mode: "path",
                  path: state.path,
                  workflow: state.workflow,
                },
          ),
        });
      }
      const payload = await response.json().catch(() => null);
      stopTimer();
      if (payload === null)
        throw new Error(`The server returned ${response.status}.`);
      if (payload.ok !== true) {
        renderFailure(payload);
        return;
      }
      state.result = payload;
      state.tab = "summary";
      renderResult(payload);
    } catch (error) {
      stopTimer();
      result.innerHTML = `<div class="callout callout--warn"><span class="callout__mark">!</span><div><strong>Analysis did not run.</strong> ${esc(error.message)}</div></div>`;
    } finally {
      state.running = false;
      runButton.disabled = false;
      runButton.textContent = "Run analysis";
    }
  };

  const renderFailure = (payload) => {
    const error = payload.error ?? {};
    result.innerHTML = `
      <div class="panel stack" style="border-color:color-mix(in srgb, var(--red) 40%, var(--line))">
        <div class="spread">
          <p class="panel__title" style="color:var(--red)">analysis rejected</p>
          <span class="tag tag--red">${esc(error.code ?? "error")}</span>
        </div>
        <h2 style="font-size:1.2rem">${esc(error.message ?? "REA returned an error.")}</h2>
        <p class="muted small">${esc(error.detail ?? "")}</p>
        ${
          Array.isArray(error.issues) && error.issues.length > 0
            ? `<div class="table-wrap"><table class="data"><thead><tr><th>Argument</th><th>Reason</th><th>Message</th></tr></thead><tbody>${error.issues
                .map(
                  (issue) =>
                    `<tr><td class="name">${esc((issue.path ?? []).join("."))}</td><td>${esc(issue.reason ?? "")}</td><td>${esc(issue.message ?? "")}</td></tr>`,
                )
                .join("")}</tbody></table></div>`
            : ""
        }
        ${
          error.remediation === undefined || error.remediation === null
            ? ""
            : `<div class="callout"><span class="callout__mark">→</span><div>${esc(error.remediation.action ?? "")} ${esc(error.remediation.detail ?? "")}</div></div>`
        }
        <div class="term-command"><span class="prompt">$</span><code>${esc(payload.command ?? commandFor())}</code></div>
        <p class="panel__note">This is REA's canonical error diagnostic, returned by the CLI itself. Retried ${esc(String(payload.durationMs ?? 0))} ms after start.</p>
      </div>`;
  };

  const renderResult = (data) => {
    const statistics = data.statistics ?? {};
    result.innerHTML = `
      <div class="result-head">
        <div>
          <span class="kicker">${esc(data.evidence.provider?.id ?? "provider")}</span>
          <h2>${esc(data.target.name)}</h2>
          <div class="meta">
            <span>${duration(data.durationMs)}</span>
            <span>${bytes(data.evidence.bytes)} evidence</span>
            ${
              data.workflow === "artifact"
                ? `<span>${int(data.files?.length ?? 0)} occurrences</span><span>${int(data.artifact?.manifest?.nodes ?? 0)} artifacts</span>`
                : `<span>${int(statistics.relevant_files ?? 0)} files</span>`
            }
            <span>${esc(data.evidence.confidence)} confidence</span>
            <span>${esc(data.evidence.authority)} authority</span>
          </div>
        </div>
        <div class="row">
          <a class="btn btn--small" href="${esc(data.evidenceUrl)}" download>Download evidence</a>
          <button class="btn btn--small btn--ghost" type="button" data-copy="${esc(data.evidence.id)}">Copy evidence id</button>
        </div>
      </div>

      <div class="insights">
        ${data.insights
          .map(
            (insight) =>
              `<div class="insight"><span class="insight__mark">▸</span><span>${esc(insight)}</span></div>`,
          )
          .join("")}
      </div>

      <div class="tabs" role="tablist" aria-label="Result sections">
        ${tabsFor(data.workflow)
          .map(
            (tab) =>
              `<button role="tab" data-tab="${tab.id}" aria-selected="${tab.id === state.tab}">${esc(tab.label)}${
                tab.id === "unknowns" && (data.unknowns?.total ?? 0) > 0
                  ? `<span class="tabs__count">${int(data.unknowns.total)}</span>`
                  : ""
              }</button>`,
          )
          .join("")}
      </div>
      <div id="tabBody"></div>

      <div class="prompt-box">
        <div class="spread">
          <p class="panel__title">Hand this to your agent</p>
          <button class="btn btn--small" id="copyPrompt" type="button">Copy prompt</button>
        </div>
        <textarea readonly id="promptText" aria-label="Generated agent prompt">${esc(buildPrompt(data))}</textarea>
        <p class="panel__note">Generated from this Evidence: observed facts, counts and the retained unknowns. Paste it into an agent that has REA registered.</p>
      </div>

      <details class="accordion" style="margin-top:2px">
        <summary>Reproduce and inspect</summary>
        <div class="accordion__body stack">
          <div class="term-command"><span class="prompt">$</span><code>${esc(data.command)}</code></div>
          <dl class="definition">
            <dt>evidence</dt><dd class="mono">${esc(data.evidence.id)}</dd>
            <dt>sha256</dt><dd class="mono">${esc(data.evidence.sha256)}</dd>
            <dt>subject</dt><dd class="mono">${esc(data.evidence.subject.name)} · ${esc(data.evidence.subject.format ?? "unknown format")}</dd>
            <dt>predicate</dt><dd class="mono">${esc(data.evidence.predicate)}</dd>
            <dt>operation</dt><dd class="mono">${esc(data.evidence.operation)}</dd>
            <dt>target path</dt><dd class="mono">${esc(data.target.path ?? "—")}</dd>
          </dl>
          <p class="panel__note">The download button serves the exact bytes the CLI returned. Projection above is derived from the same record; nothing is recomputed from another source.</p>
        </div>
      </details>
    `;

    const body = result.querySelector("#tabBody");
    const drawTab = (id) => {
      state.tab = id;
      result
        .querySelectorAll("[data-tab]")
        .forEach((button) =>
          button.setAttribute(
            "aria-selected",
            String(button.dataset.tab === id),
          ),
        );
      body.innerHTML = renderTab(id, data);
      bindTab();
    };
    const bindTab = () => {
      const filter = body.querySelector("#relationFilter");
      if (filter !== null)
        filter.addEventListener("change", () =>
          drawRelations(data, filter.value),
        );
    };
    result
      .querySelectorAll("[data-tab]")
      .forEach((button) =>
        button.addEventListener("click", () => drawTab(button.dataset.tab)),
      );
    result.querySelector("#copyPrompt").addEventListener("click", () =>
      navigator.clipboard
        .writeText(result.querySelector("#promptText").value)
        .then(() => toast("Prompt copied"))
        .catch(() => toast("Copy failed", "error")),
    );
    drawTab(state.tab);
  };

  const renderTab = (id, data) => {
    if (data.workflow === "artifact") return renderArtifactTab(id, data);
    if (id === "summary") return renderSummary(data);
    if (id === "ipc") return renderIpc(data);
    if (id === "files") return renderFiles(data);
    if (id === "relations") return renderRelations(data);
    if (id === "unknowns") return renderUnknowns(data);
    if (id === "limits") return renderLimits(data);
    return renderEvidence(data);
  };

  const renderArtifactTab = (id, data) => {
    const artifact = data.artifact ?? {};
    const manifest = artifact.manifest ?? {};
    if (id === "summary")
      return `
        <div class="grid grid--4" style="margin-bottom:14px">
          ${tile(int(data.files?.length ?? 0), "occurrences")}
          ${tile(int(manifest.nodes ?? 0), "graded artifacts")}
          ${tile(int(manifest.edges ?? 0), "containment edges")}
          ${tile(int(artifact.contradictions ?? 0), "contradictions")}
        </div>
        <div class="grid grid--2">
          <div class="panel stack">
            <p class="panel__title">Artifact graph</p>
            <dl class="definition">
              <dt>manifest</dt><dd class="mono"><span class="digest" title="${esc(manifest.id ?? "")}">${esc(shortHash(manifest.id, 22))}</span></dd>
              <dt>root format</dt><dd>${esc(manifest.rootFormat ?? "unknown")}</dd>
              <dt>root digest</dt><dd class="mono"><span class="digest" title="${esc(manifest.rootSha256 ?? "")}">${esc(shortHash(manifest.rootSha256, 22))}</span></dd>
              <dt>graph digest</dt><dd class="mono"><span class="digest" title="${esc(manifest.graphSha256 ?? "")}">${esc(shortHash(manifest.graphSha256, 22))}</span></dd>
              <dt>coverage</dt><dd>${esc(artifact.coverage?.status ?? "unknown")} · substeps ${int(artifact.coverage?.substeps ?? 0)} · omitted ${int(artifact.coverage?.omitted ?? 0)}</dd>
            </dl>
          </div>
          <div class="panel stack">
            <p class="panel__title">Formats found</p>
            <div class="bars">
              ${(artifact.formats ?? [])
                .map(
                  (entry) => `<div class="bar">
                    <span class="bar__label">${esc(entry.format)}</span>
                    <span class="bar__track"><span class="bar__fill" style="width:${Math.max(4, (entry.count / Math.max(1, data.files?.length ?? 1)) * 100).toFixed(1)}%"></span></span>
                    <span class="bar__value">${int(entry.count)}</span>
                  </div>`,
                )
                .join("")}
            </div>
            <p class="panel__note">Substeps run by the provider:</p>
            <div class="row">
              ${(artifact.substeps ?? [])
                .map(
                  (step) =>
                    `<span class="tag ${step.status === "completed" ? "tag--accent" : "tag--amber"}">${esc(step.operation)} · ${esc(step.status)}</span>`,
                )
                .join("")}
            </div>
          </div>
        </div>`;

    if (id === "files")
      return `
        <div class="table-wrap" style="max-height:none">
          <table class="data">
            <thead><tr><th>Logical path</th><th>Format</th><th class="num">Bytes</th><th>Hash</th><th>Notes</th><th>Digest</th></tr></thead>
            <tbody>
              ${(data.files ?? [])
                .map(
                  (file) => `<tr>
                    <td class="name">${esc(file.path)}</td>
                    <td>${esc(file.format)}</td>
                    <td class="num">${file.size === null ? "—" : int(file.size)}</td>
                    <td><span class="tag ${file.hashStatus === "verified" ? "tag--accent" : ""}">${esc(file.hashStatus)}</span></td>
                    <td>${file.executable ? '<span class="tag tag--blue">executable</span> ' : ""}${file.encrypted ? '<span class="tag tag--amber">encrypted</span>' : ""}${file.executable || file.encrypted ? "" : "—"}</td>
                    <td class="mono"><span class="digest" title="${esc(file.sha256 ?? "")}">${esc(shortHash(file.sha256, 12))}</span></td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="panel__note" style="margin-top:8px">Every occurrence carries the digest of the artifact it points at, so a later comparison can prove the bytes did not change.</p>`;

    if (id === "artifacts")
      return `
        <div class="table-wrap" style="max-height:none">
          <table class="data">
            <thead><tr><th>Artifact</th><th>Format</th><th class="num">Bytes</th><th>State</th><th>Digest</th></tr></thead>
            <tbody>
              ${(artifact.nodes ?? [])
                .map(
                  (node) => `<tr>
                    <td class="mono">${esc(shortHash(node.id, 18))}</td>
                    <td>${esc(node.format)}</td>
                    <td class="num">${node.size === null ? "—" : int(node.size)}</td>
                    <td>${esc(node.state ?? "—")}</td>
                    <td class="mono"><span class="digest" title="${esc(node.sha256 ?? "")}">${esc(shortHash(node.sha256, 12))}</span></td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="panel__note" style="margin-top:8px">Graded artifacts are deduplicated by content: the same bytes appearing twice are one artifact with two occurrences.</p>`;

    if (id === "coverage")
      return `
        <div class="grid grid--2">
          <div class="panel stack">
            <p class="panel__title">Provider coverage</p>
            <dl class="definition">
              <dt>status</dt><dd>${esc(artifact.coverage?.status ?? "unknown")}</dd>
              <dt>substeps</dt><dd>${int(artifact.coverage?.substeps ?? 0)} completed</dd>
              <dt>observations</dt><dd>${int(artifact.coverage?.observations ?? 0)} retained, ${int(artifact.coverage?.omitted ?? 0)} omitted</dd>
              <dt>contradictions</dt><dd>${int(artifact.contradictions ?? 0)}</dd>
            </dl>
            <p class="panel__title" style="margin-top:6px">Limitations</p>
            <ol class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.6">
              ${
                [
                  ...(data.limitations ?? []),
                  ...(data.evidence.limitations ?? []),
                ]
                  .map((line) => `<li>${esc(line)}</li>`)
                  .join("") || "<li>None reported for this run.</li>"
              }
            </ol>
          </div>
          <div class="panel stack">
            <p class="panel__title">Hypotheses</p>
            ${
              (artifact.hypotheses ?? []).length === 0
                ? '<p class="panel__note">The provider kept no open hypotheses; the inventory was fully decided by observed bytes.</p>'
                : `<ul class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px">${artifact.hypotheses
                    .map((entry) => `<li>${esc(entry.statement)}</li>`)
                    .join("")}</ul>`
            }
            <p class="panel__title" style="margin-top:6px">Next probes</p>
            ${
              (artifact.probes ?? []).length === 0
                ? '<p class="panel__note">No follow-up probes were suggested for this artifact.</p>'
                : `<ul class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px">${artifact.probes
                    .map((probe) => `<li>${esc(probe.detail)}</li>`)
                    .join("")}</ul>`
            }
          </div>
        </div>`;

    return renderEvidence(data);
  };

  const renderSummary = (data) => {
    const s = data.statistics ?? {};
    const summary = data.summary ?? {};
    return `
      <div class="grid grid--4" style="margin-bottom:14px">
        ${tile(int(s.relevant_files), "files")}
        ${tile(int(s.parsed_javascript_files), "parsed JS")}
        ${tile(int(s.visited_ast_nodes), "AST nodes")}
        ${tile(int(data.unknowns?.total ?? 0), "unknowns")}
      </div>
      <div class="grid grid--2">
        <div class="panel stack">
          <p class="panel__title">Electron surface</p>
          <dl class="definition">
            <dt>browser windows</dt><dd>${int(summary.browser_windows ?? 0)}</dd>
            <dt>preload entry</dt><dd>${int(summary.preload_entrypoints ?? 0)}</dd>
            <dt>context bridge</dt><dd>${int(summary.context_bridge_apis ?? 0)} APIs, ${int(summary.exposed_api_members ?? 0)} members</dd>
            <dt>IPC operations</dt><dd>${int(summary.ipc?.operations ?? 0)} (${int(summary.ipc?.literal_channels ?? 0)} literal channels)</dd>
            <dt>main handlers</dt><dd>${int(summary.ipc?.main_handlers ?? 0)}</dd>
            <dt>native add-ons</dt><dd>${int(summary.native_addon_bindings ?? 0)}</dd>
            <dt>findings</dt><dd>${int(s.findings ?? 0)}</dd>
          </dl>
        </div>
        <div class="panel stack">
          <p class="panel__title">Evidence digests</p>
          <dl class="definition">
            <dt>root artifact</dt><dd class="mono"><span class="digest" title="${esc(data.digests.rootArtifact ?? "")}">${esc(shortHash(data.digests.rootArtifact, 20))}</span></dd>
            <dt>inventory</dt><dd class="mono"><span class="digest" title="${esc(data.digests.inventoryManifest ?? "")}">${esc(shortHash(data.digests.inventoryManifest, 22))}</span></dd>
            <dt>graph</dt><dd class="mono"><span class="digest" title="${esc(data.digests.inventoryGraph ?? "")}">${esc(shortHash(data.digests.inventoryGraph, 20))}</span></dd>
            <dt>contradictions</dt><dd>${int(data.digests.integrityContradictions)}</dd>
            <dt>semantic graph</dt><dd>${int(data.semantic.nodes)} nodes · ${int(data.semantic.relations)} relations · ${int(data.semantic.fingerprints)} fingerprints</dd>
          </dl>
        </div>
      </div>
      <div class="panel" style="margin-top:14px">
        <p class="panel__title" style="margin-bottom:10px">Resolved roles</p>
        <div class="table-wrap" style="max-height:none">
          <table class="data">
            <thead><tr><th>Role</th><th>Target</th><th>Resolved from</th><th>Facts</th></tr></thead>
            <tbody>
              ${(data.roles ?? [])
                .map(
                  (role) => `<tr>
                    <td class="name">${esc(role.kind)}</td>
                    <td>${esc(role.label)}</td>
                    <td class="mono">${esc(role.location ?? "—")}</td>
                    <td>${esc(role.facts.join(" · ") || "—")}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      ${
        (data.modules ?? []).length === 0
          ? ""
          : `<div class="panel" style="margin-top:14px">
              <p class="panel__title" style="margin-bottom:10px">Module references</p>
              <div class="table-wrap" style="max-height:none">
                <table class="data"><thead><tr><th>Module</th><th>Specifier</th><th>Resolution</th></tr></thead><tbody>
                  ${data.modules
                    .map(
                      (module) =>
                        `<tr><td class="name">${esc(module.label)}</td><td class="mono">${esc(module.specifier ?? "—")}</td><td><span class="tag ${module.resolution === "resolved" ? "tag--accent" : ""}">${esc(module.resolution ?? "unknown")}</span></td></tr>`,
                    )
                    .join("")}
                </tbody></table>
              </div>
            </div>`
      }`;
  };

  const renderIpc = (data) => {
    const channels = data.ipcChannels ?? [];
    const edges = data.ipcEdges ?? [];
    if (channels.length === 0 && edges.length === 0)
      return `<div class="callout"><span class="callout__mark">i</span><div><strong>No IPC was observed in this target.</strong> The summary still reports integrity digests and the full module/file inventory, which is the useful part for a plain web or Node application.</div></div>`;
    return `
      <div class="panel" style="margin-bottom:14px">
        <p class="panel__title" style="margin-bottom:10px">Channels</p>
        <div class="table-wrap" style="max-height:none">
          <table class="data">
            <thead><tr><th>Channel</th><th>Sides</th></tr></thead>
            <tbody>
              ${channels
                .map(
                  (channel) =>
                    `<tr><td class="name">${esc(channel.channel)}</td><td>${channel.sides
                      .map(
                        (side) =>
                          `<span class="tag ${side.side === "main" ? "tag--accent" : "tag--blue"}">${esc(side.side)} · ${esc(side.operation)}</span> <span class="mono faint small">${esc(side.location ?? "")}</span>`,
                      )
                      .join(" ")}</td></tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <p class="panel__title" style="margin-bottom:10px">Transmission and handler edges</p>
        <div class="table-wrap" style="max-height:none">
          <table class="data">
            <thead><tr><th>Relation</th><th>Channel</th><th>Side</th><th>Resolution</th><th>Location</th><th>Confidence</th></tr></thead>
            <tbody>
              ${edges
                .map(
                  (edge) => `<tr>
                    <td class="name">${esc(edge.relation)}</td>
                    <td class="mono">${esc(edge.channel ?? "dynamic")}</td>
                    <td>${esc(edge.side ?? "—")}</td>
                    <td>${esc(edge.resolution ?? "—")}</td>
                    <td class="mono">${esc(edge.location ?? "—")}</td>
                    <td>${esc(edge.confidence ?? "—")}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  const renderFiles = (data) => `
    <div class="panel" style="padding:0">
      <div class="table-wrap" style="border:0;max-height:none">
        <table class="data">
          <thead><tr><th>Path</th><th class="num">Bytes</th><th>Kind</th><th>Parse</th><th>Text</th><th>Digest</th></tr></thead>
          <tbody>
            ${(data.files ?? [])
              .map(
                (file) => `<tr>
                  <td class="name">${esc(file.path)}</td>
                  <td class="num">${file.bytes === null ? "—" : int(file.bytes)}</td>
                  <td>${esc(file.kind)}</td>
                  <td>${esc(file.parseStatus ?? "—")}</td>
                  <td>${esc(file.textStatus ?? "—")}</td>
                  <td class="mono faint">${esc(shortHash(file.sha256, 10))}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
    <p class="panel__note" style="margin-top:8px">Every entry is content-addressed. The same digest appears in the Evidence inventory manifest, so a reconstruction can be checked against the bytes that produced it.</p>`;

  const renderRelations = (data, relation = "all") => {
    const relations = data.relationCounts ?? [];
    const edges = (data.edges ?? []).filter(
      (edge) => relation === "all" || edge.relation === relation,
    );
    return `
      <div class="toolbar">
        <label class="field" style="min-width:220px">
          <span class="field__label">Relation</span>
          <select class="select" id="relationFilter">
            <option value="all">All relations (${int(data.edgeTotal)})</option>
            ${relations
              .map(
                (entry) =>
                  `<option value="${esc(entry.relation)}"${entry.relation === relation ? " selected" : ""}>${esc(entry.relation)} (${int(entry.count)})</option>`,
              )
              .join("")}
          </select>
        </label>
        <p class="toolbar__count">${int(edges.length)} of ${int(data.edgeTotal)} edges shown</p>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Relation</th><th>From</th><th>To</th><th>Detail</th><th>Where</th><th>Confidence</th></tr></thead>
          <tbody>
            ${edges
              .map(
                (edge) => `<tr>
                  <td class="name">${esc(edge.relation)}</td>
                  <td>${esc(edge.from)}</td>
                  <td>${esc(edge.to)}</td>
                  <td class="cell-clamp">${esc(edge.detail || "—")}</td>
                  <td class="mono">${esc(edge.location ?? "—")}</td>
                  <td><span class="tag ${edge.confidence === "high" || edge.confidence === "exact" ? "tag--accent" : ""}">${esc(edge.confidence)}</span></td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="panel__note" style="margin-top:8px">Static syntax proves that a relationship exists in the code, not that it executes. That distinction is carried in each edge's <code class="mono">state</code> and <code class="mono">confidence</code>.</p>`;
  };

  const drawRelations = (data, relation) => {
    const body = container.querySelector("#tabBody");
    body.innerHTML = renderRelations(data, relation);
    const filter = body.querySelector("#relationFilter");
    filter?.addEventListener("change", () => drawRelations(data, filter.value));
  };

  const renderUnknowns = (data) => {
    const unknowns = data.unknowns ?? { total: 0, families: [], items: [] };
    if (unknowns.total === 0)
      return `<div class="callout callout--note"><span class="callout__mark">✓</span><div><strong>No residual unknowns were retained.</strong> Every relationship this workflow attempted resolved within its coverage.</div></div>`;
    return `
      <div class="callout callout--note" style="margin-bottom:14px">
        <span class="callout__mark">i</span>
        <div><strong>Unknowns are output, not failure.</strong> REA keeps a relationship unknown when the static evidence cannot decide it. Guessing here would poison the reconstruction.</div>
      </div>
      <div class="panel" style="margin-bottom:14px">
        <p class="panel__title" style="margin-bottom:10px">Families</p>
        <div class="bars">
          ${unknowns.families
            .map(
              (family) => `<div class="bar">
                <span class="bar__label">${esc(family.family)}</span>
                <span class="bar__track"><span class="bar__fill bar__fill--amber" style="width:${Math.max(4, (family.count / unknowns.total) * 100).toFixed(1)}%"></span></span>
                <span class="bar__value">${int(family.count)}</span>
              </div>`,
            )
            .join("")}
        </div>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Family</th><th>Reason</th><th>Detail</th><th>Where</th></tr></thead>
          <tbody>
            ${unknowns.items
              .map(
                (item) => `<tr>
                  <td class="name">${esc(item.family)}</td>
                  <td>${esc(item.reason)}</td>
                  <td class="cell-clamp">${esc(item.detail)}</td>
                  <td class="mono">${esc(item.location ?? "—")}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="panel__note" style="margin-top:8px">Showing ${int(unknowns.items.length)} of ${int(unknowns.total)} retained unknowns. The complete list is in the downloaded Evidence.</p>`;
  };

  const renderLimits = (data) => `
    <div class="grid grid--2">
      <div class="panel stack">
        <p class="panel__title">Evidence limitations</p>
        <ol class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.6">
          ${(data.evidence.limitations ?? []).map((line) => `<li>${esc(line)}</li>`).join("")}
        </ol>
      </div>
      <div class="panel stack">
        <p class="panel__title">Result limitations</p>
        <ol class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.6">
          ${(data.limitations ?? []).map((line) => `<li>${esc(line)}</li>`).join("")}
        </ol>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
      <p class="panel__title" style="margin-bottom:10px">Coverage</p>
      <dl class="definition">
        <dt>graph coverage</dt><dd>${esc(data.coverage?.status ?? "unknown")} · truncated: ${esc(String(data.coverage?.truncated ?? false))} · omitted: ${int(data.coverage?.omitted_count ?? 0)}</dd>
        <dt>relationship coverage</dt><dd>${esc(data.coverage?.status === "complete" ? "complete for the observed graph" : "partial")}</dd>
        <dt>execution</dt><dd>No target code was executed. Values came from inert syntax and file bytes.</dd>
        <dt>locations</dt><dd class="mono">${esc((data.evidence.locations ?? []).join(", ") || "—")}</dd>
      </dl>
    </div>`;

  const renderEvidence = (data) => `
    <div class="panel stack">
      <p class="panel__title">Canonical record</p>
      <dl class="definition">
        <dt>evidence id</dt><dd class="mono">${esc(data.evidence.id)}</dd>
        <dt>bytes</dt><dd>${bytes(data.evidence.bytes)}</dd>
        <dt>sha256</dt><dd class="mono">${esc(data.evidence.sha256)}</dd>
        <dt>retained</dt><dd>${int((data.evidence.bytes ?? 0) > 0 ? Math.round(data.evidence.bytes / 1024) : 0)} KiB in this server's memory, for ${int(meta?.limits.evidenceRetentionMinutes ?? 30)} minutes</dd>
      </dl>
      <div class="row">
        <a class="btn btn--primary btn--small" href="${esc(data.evidenceUrl)}" download>Download complete JSON</a>
        <button class="btn btn--small btn--ghost" type="button" data-copy="${esc(data.command)}">Copy CLI command</button>
      </div>
      <div class="callout"><span class="callout__mark">i</span><div>The projection on the other tabs is bounded for reading. The download is the complete record, including every node, edge, semantic relation and observation the CLI produced.</div></div>
    </div>`;

  const tile = (value, label) => `
    <div class="metric">
      <span class="metric__value">${value}</span>
      <span class="metric__label">${esc(label)}</span>
    </div>`;

  setWorkflow(state.workflow);
  setSource(state.source);
  renderEmpty();
  runButton.addEventListener("click", run);
};

const buildPrompt = (data) => {
  if (data.workflow === "artifact") {
    const manifest = data.artifact?.manifest ?? {};
    const lines = [
      `I inventoried "${data.target.name}" with REA (${data.evidence.operation}, evidence ${data.evidence.id}).`,
      "",
      "What the Evidence shows:",
      ...data.insights.map((insight) => `- ${insight}`),
      `- Root artifact: ${manifest.rootFormat ?? "unknown"} ${manifest.rootSha256 ?? ""}`.trim(),
      `- Formats: ${(data.artifact?.formats ?? [])
        .map((entry) => `${entry.format} ×${entry.count}`)
        .join(", ")}.`,
      "",
      "Using this inventory, tell me what this package is, which entries are worth inspecting next, and which REA workflow to run on them. Cite the logical path and digest for each claim, and keep any unverified assumption labelled.",
    ];
    return lines.join("\n");
  }
  const lines = [];
  lines.push(
    `I analysed "${data.target.name}" with REA (${data.evidence.operation}, evidence ${data.evidence.id}).`,
  );
  lines.push("");
  lines.push("What the Evidence shows:");
  for (const insight of data.insights) lines.push(`- ${insight}`);
  const relations = (data.relationCounts ?? [])
    .slice(0, 5)
    .map((entry) => `${entry.relation} ×${entry.count}`)
    .join(", ");
  if (relations !== "") lines.push(`- Relationship counts: ${relations}.`);
  const channels = (data.ipcChannels ?? []).map((entry) => entry.channel);
  if (channels.length > 0)
    lines.push(`- IPC channels: ${channels.join(", ")}.`);
  lines.push("");
  if ((data.unknowns?.total ?? 0) > 0) {
    lines.push(
      `Retained unknowns (${data.unknowns.total}): ${data.unknowns.families
        .map((family) => `${family.family} ×${family.count}`)
        .join(", ")}.`,
    );
    lines.push("");
  }
  lines.push(
    "Using the observed relationships and source locations above, explain how this feature works and draft an equivalent implementation for my project. Cite file:line for each claim, separate observation from inference, and keep the remaining unknowns explicit instead of guessing.",
  );
  return lines.join("\n");
};
