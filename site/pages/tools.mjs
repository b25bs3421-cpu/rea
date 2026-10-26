import { pagehead } from "../lib/shell.mjs";
import { h, list, n } from "../lib/html.mjs";

const parameterRows = (tool) => {
  if ((tool.parameters ?? []).length === 0)
    return '<p class="small faint" style="margin:0">No arguments.</p>';
  return `<div class="table-scroll" style="border-radius:8px">
    <table class="data">
      <thead><tr><th scope="col">Argument</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Description</th></tr></thead>
      <tbody>
${list(
  tool.parameters ?? [],
  (parameter) => `        <tr>
          <td class="mono">${h(parameter.name)}</td>
          <td class="mono faint">${h(parameter.type)}</td>
          <td>${parameter.required ? '<span class="tag tag--accent">required</span>' : '<span class="faint small">optional</span>'}</td>
          <td class="small">${h(parameter.description || "—")}</td>
        </tr>`,
)}
      </tbody>
    </table>
  </div>`;
};

export const toolsPage = (data) => {
  const tools = data.tools.tools;
  const kinds = [...data.tools.kinds].sort(
    (left, right) => right.count - left.count,
  );

  const body = `
${pagehead({
  kicker: "Reference · MCP",
  title: `${n(tools.length)} tools, with their blast radius`,
  lede: "Generated from the same contract catalog the MCP server publishes. Each entry shows its arguments, side effects and the Evidence facets it returns — including which tools are read-only and which can mutate a target.",
  crumbs: [
    { href: "/", label: "Home" },
    { href: "/reference/tools/", label: "Tools" },
  ],
})}

<section class="section section--flush">
  <div class="wrap" data-filter>
    <div class="filters">
      <input type="search" placeholder="Search ${n(tools.length)} tools…" aria-label="Search tools" data-filter-search>
      <button class="chip" type="button" data-filter-kind="all" aria-pressed="true">All</button>
${list(
  kinds,
  (kind) =>
    `      <button class="chip" type="button" data-filter-kind="${h(kind.kind)}" aria-pressed="false">${h(kind.kind)} <span class="faint">${kind.count}</span></button>`,
)}
      <span class="counter" data-filter-count>${n(tools.length)} total</span>
    </div>

    <div class="entries">
${list(
  tools,
  (
    tool,
  ) => `      <details class="entry" data-filter-item data-kind="${h(tool.kind)}"
        data-text="${h(`${tool.name} ${tool.title} ${tool.kind} ${tool.description} ${(tool.parameters ?? []).map((parameter) => `${parameter.name} ${parameter.description}`).join(" ")}`)}">
        <summary>
          <span class="entry__name">${h(tool.name)}</span>
          <span class="row" style="gap:.35rem">
            ${tool.annotations.readOnly ? '<span class="tag tag--ok">read-only</span>' : ""}
            ${tool.annotations.destructive ? '<span class="tag tag--bad">destructive</span>' : ""}
            ${tool.session ? '<span class="tag tag--warn">session</span>' : ""}
            <span class="tag">${h(tool.kind)}</span>
          </span>
          <span class="entry__desc">${h(tool.description)}</span>
        </summary>
        <div class="entry__body">
          <dl class="definition">
            <dt>Title</dt><dd>${h(tool.title)}</dd>
            <dt>Kind</dt><dd class="mono">${h(tool.kind)}</dd>
            <dt>Side effects</dt><dd>${tool.effects.length ? tool.effects.map((effect) => `<span class="tag">${h(effect)}</span>`).join(" ") : '<span class="faint">none recorded</span>'}</dd>
            <dt>Annotations</dt><dd class="mono small">readOnly=${tool.annotations.readOnly} · destructive=${tool.annotations.destructive} · idempotent=${tool.annotations.idempotent} · openWorld=${tool.annotations.openWorld}</dd>
            <dt>Returns</dt><dd>${tool.output ? `${h(tool.output.kind)} · ${(tool.output.fields ?? []).map((field) => `<code>${h(field)}</code>`).join(" ")}` : '<span class="faint">not declared</span>'}</dd>
          </dl>
          <div>
            <p class="tiny faint" style="margin:0 0 .5rem">Arguments · ${(tool.parameters ?? []).length}</p>
            ${parameterRows(tool)}
          </div>
          <div>
            <p class="tiny faint" style="margin:0 0 .5rem">Call shape</p>
            <div class="term">
              <div class="term__head"><span class="term__dot term__dot--live"></span><span>tools/call</span>
                <button class="copy" type="button" data-copy="" style="margin-left:auto">Copy</button>
              </div>
              <pre><code>${h(JSON.stringify({ name: tool.name, arguments: Object.fromEntries((tool.parameters ?? []).filter((parameter) => parameter.required).map((parameter) => [parameter.name, `<${parameter.type}>`])) }, null, 2))}</code></pre>
            </div>
          </div>
        </div>
      </details>`,
)}
    </div>
    <p class="empty" data-filter-empty hidden>No tool matches that query.</p>
  </div>
</section>
`;

  return body;
};
