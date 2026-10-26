import {
  dateTime,
  duration,
  esc,
  int,
  loadingState,
  pageHead,
  toast,
} from "../ui.js";

export const renderReadiness = async (container, ctx) => {
  const product = await ctx.api("product");

  container.innerHTML = `
    ${pageHead(
      "Readiness",
      "What this host can actually do",
      `Read live from <code class="mono">rea doctor --json</code> and <code class="mono">rea providers --json</code>. A healthy overall report is not required for a specific workflow: static JavaScript, .NET, Go and artifact inspection need no native engine at all.`,
    )}
    <div id="readinessBody">${loadingState("Running diagnostics…")}</div>
  `;

  const body = container.querySelector("#readinessBody");

  const load = async () => {
    body.innerHTML = loadingState("Running diagnostics…");
    try {
      const response = await fetch("/api/readiness");
      if (!response.ok)
        throw new Error(`Readiness failed (${response.status})`);
      const payload = await response.json();
      draw(payload);
    } catch (error) {
      body.innerHTML = `<div class="callout callout--warn"><span class="callout__mark">!</span><div>${esc(error.message)}</div></div>`;
    }
  };

  const draw = (payload) => {
    const report = payload.doctor.report ?? {};
    const checks = report.checks ?? [];
    const engines = checks.filter((check) =>
      /hopper|ghidra|ida/.test(check.name),
    );
    const ready = checks.filter((check) => check.ok);
    const blocked = checks.filter((check) => !check.ok);
    const providers = payload.providers.report ?? {};
    const live = providers.capabilities ?? [];

    body.innerHTML = `
      <div class="readiness-hero">
        <div class="verdict" data-ok="${report.environment_healthy === true}">
          <span class="kicker">environment</span>
          <p class="verdict__state">${report.environment_healthy === true ? "healthy" : "partially ready"}</p>
          <p class="muted small">
            ${int(ready.length)} of ${int(checks.length)} checks pass. Audit scope:
            <span class="mono">${esc(report.scope?.mode ?? "audit-wide")}</span>. The command exits
            ${payload.doctor.ok ? "0" : "1"} when the environment is not fully healthy — that is a report, not a crash.
          </p>
          <div class="row">
            <span class="tag">${duration(payload.doctor.durationMs)}</span>
            <span class="tag">${esc(dateTime(payload.at))}</span>
            <button class="btn btn--small" id="refreshReadiness" type="button">Re-run diagnostics</button>
          </div>
        </div>
        <div class="panel stack">
          <p class="panel__title">Workflow readiness</p>
          <ul class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.7">
            <li><strong style="color:var(--accent)">Static JavaScript / Electron</strong> — no engine. Proven under <a href="#/lab">Live lab</a>.</li>
            <li><strong style="color:var(--accent)">.NET, Go, packages, digests</strong> — no engine.</li>
            <li><strong style="color:var(--amber)">Native binaries</strong> — needs ${esc(engines.map((check) => check.name).join(", ") || "Hopper, Ghidra or IDA")}.</li>
            <li><strong style="color:var(--amber)">Runtime capture</strong> — needs a browser, adb, a PTY or a packet tool on this host.</li>
          </ul>
        </div>
      </div>

      <div class="grid grid--3" style="margin-top:14px">
        <div class="metric"><span class="metric__value">${int(ready.length)}</span><span class="metric__label">checks passing</span><span class="metric__hint">${esc(ready.map((check) => check.name).join(", ") || "none")}</span></div>
        <div class="metric"><span class="metric__value">${int(blocked.length)}</span><span class="metric__label">checks needing setup</span><span class="metric__hint">${esc(blocked.map((check) => check.name).join(", ") || "none")}</span></div>
        <div class="metric"><span class="metric__value">${int(live.length)}</span><span class="metric__label">providers reported now</span><span class="metric__hint">${int(product.providers.length)} declared in the catalog</span></div>
      </div>

      <div class="section">
        <div class="section__head">
          <h2 class="section__title"><span>01</span><span>Checks</span></h2>
          <p class="section__hint">Each row is one host assertion from the doctor report, including its remediation.</p>
        </div>
        <div class="checklist">
          ${checks
            .map(
              (check) => `<div class="check" data-ok="${check.ok}">
                <span class="check__mark">${check.ok ? "OK" : "!!"}</span>
                <span class="check__name">${esc(check.name)}</span>
                <span class="check__detail">${esc(check.detail ?? check.classification ?? "")}${
                  check.remediation === undefined
                    ? ""
                    : `<em>→ ${esc(check.remediation)}</em>`
                }</span>
                <span class="tag ${check.ok ? "tag--accent" : "tag--amber"}">${esc(check.classification ?? (check.ok ? "healthy" : "attention"))}</span>
              </div>`,
            )
            .join("")}
        </div>
      </div>

      <div class="section">
        <div class="section__head">
          <h2 class="section__title"><span>02</span><span>Native engine inspections</span></h2>
          <p class="section__hint">Provider-specific configuration read by the same report.</p>
        </div>
        ${
          (report.providerInspections ?? []).length === 0
            ? `<div class="callout"><span class="callout__mark">i</span><div>No native engine registration was inspected on this host. Install and configure Hopper, Ghidra or IDA to enable native analysis.</div></div>`
            : `<div class="grid grid--2">${report.providerInspections
                .map(
                  (inspection) => `<div class="panel stack">
                    <div class="spread">
                      <p class="panel__title">${esc(inspection.id)}</p>
                      <span class="tag ${inspection.available ? "tag--accent" : "tag--amber"}">${inspection.available ? "available" : inspection.configured ? "configured, unavailable" : "not configured"}</span>
                    </div>
                    <dl class="definition">
                      <dt>version</dt><dd class="mono">${esc(inspection.providerVersion ?? "—")}</dd>
                      ${(inspection.checks ?? [])
                        .map(
                          (check) =>
                            `<dt>${esc(check.name)}</dt><dd>${esc(check.detail ?? check.code ?? "")}${
                              check.remediation === undefined
                                ? ""
                                : `<br /><span class="faint small">→ ${esc(check.remediation)}</span>`
                            }</dd>`,
                        )
                        .join("")}
                    </dl>
                  </div>`,
                )
                .join("")}</div>`
        }
      </div>

      <div class="section">
        <div class="section__head">
          <h2 class="section__title"><span>03</span><span>Providers reported by this host</span></h2>
          <p class="section__hint">Live <code class="mono">rea providers --json</code> output, including the reason a group is unavailable.</p>
        </div>
        ${
          live.length === 0
            ? `<div class="callout callout--warn"><span class="callout__mark">!</span><div>No providers reported capabilities for this host right now.</div></div>`
            : `<div class="grid grid--2">${live
                .map((entry) => {
                  const groups = entry.groups ?? [];
                  const available = groups.filter(
                    (group) => group.available !== false,
                  );
                  return `<div class="panel stack">
                    <div class="spread">
                      <div>
                        <p class="panel__title">${esc(entry.provider?.name ?? entry.provider?.id ?? "provider")}</p>
                        <p class="faint small mono">${esc(entry.provider?.id ?? "")}</p>
                      </div>
                      <span class="tag ${available.length > 0 ? "tag--accent" : "tag--amber"}">${int(available.length)}/${int(groups.length)} groups</span>
                    </div>
                    <div class="stack" style="gap:6px">
                      ${groups
                        .map(
                          (
                            group,
                          ) => `<div class="effect" data-on="${group.available !== false}" style="justify-content:flex-start;flex-wrap:wrap">
                            <span class="effect__dot"></span>
                            <span>${esc(group.operations.join(", "))}</span>
                            ${group.available === false ? `<span class="faint">· ${esc(group.reason ?? group.availability_code ?? "unavailable")}</span>` : ""}
                          </div>`,
                        )
                        .join("")}
                    </div>
                    ${
                      (entry.shared_limitations ?? []).length === 0
                        ? ""
                        : `<p class="panel__note">${esc(entry.shared_limitations.join(" "))}</p>`
                    }
                  </div>`;
                })
                .join("")}</div>`
        }
      </div>

      <div class="section">
        <div class="section__head">
          <h2 class="section__title"><span>04</span><span>Declared provider inventory</span></h2>
          <p class="section__hint">Every provider the product catalog can select, with its operation count.</p>
        </div>
        <div class="provider-list">
          ${product.providers
            .map(
              (provider) => `<div class="provider">
                <strong>${esc(provider.name ?? provider.id)}</strong>
                <span class="mono">${esc(provider.id)}</span>
                <span>${int((provider.capabilities ?? []).length)} operations${provider.version === null || provider.version === undefined ? "" : ` · v${esc(String(provider.version))}`}</span>
              </div>`,
            )
            .join("")}
        </div>
      </div>
    `;

    body.querySelector("#refreshReadiness").addEventListener("click", () => {
      toast("Re-running doctor and providers…");
      load();
    });
  };

  await load();
};
