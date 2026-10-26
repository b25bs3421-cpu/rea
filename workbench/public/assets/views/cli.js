import {
  debounce,
  emptyState,
  esc,
  int,
  loadingState,
  pageHead,
  searchField,
} from "../ui.js";

const helpCache = new Map();

export const renderCli = async (container, ctx) => {
  const [data, tools] = await Promise.all([ctx.api("cli"), ctx.api("tools")]);
  const toolNames = new Set(tools.tools.map((tool) => tool.name));
  const state = { query: "", selected: ctx.params.cmd ?? null };

  container.innerHTML = `
    ${pageHead(
      "CLI reference",
      `${int(data.primaryCount)} commands`,
      `The CLI and the MCP server share one application layer, so a command and its tool return the same Evidence. Selecting a command runs <code class="mono">--help</code> against this checkout on demand; nothing here is hard-coded.`,
    )}
    <div class="split">
      <section class="stack">
        <div class="toolbar" style="margin-bottom:0">
          ${searchField("cliSearch", "Filter commands")}
          <p class="toolbar__count" id="cliCount"></p>
        </div>
        <div class="table-wrap" style="max-height:74vh">
          <table class="data data--fixed">
            <thead><tr><th style="width:44%">Command</th><th>Purpose</th></tr></thead>
            <tbody id="cliRows"></tbody>
          </table>
        </div>
      </section>
      <aside class="detail" id="cliDetail" aria-live="polite">
        ${emptyState("pick a command", "Choose a command to read its live help output.")}
      </aside>
    </div>
  `;

  const rows = container.querySelector("#cliRows");
  const counter = container.querySelector("#cliCount");
  const detail = container.querySelector("#cliDetail");

  const matches = (command) => {
    if (state.query === "") return true;
    const needle = state.query.toLowerCase();
    return `${command.name} ${command.description}`
      .toLowerCase()
      .includes(needle);
  };

  const draw = () => {
    const visible = data.commands.filter(matches);
    counter.textContent = `${int(visible.length)} shown`;
    rows.innerHTML = visible
      .map(
        (
          command,
        ) => `<tr data-cmd="${esc(command.name)}" class="${command.name === state.selected ? "is-selected" : ""}">
          <td class="name"><button class="row-button" type="button" data-cmd="${esc(command.name)}">${esc(command.name)}${
            command.aliases.length === 0
              ? ""
              : `<br /><span class="faint small">alias ${esc(command.aliases.join(", "))}</span>`
          }</button></td>
          <td class="cell-clamp" style="max-width:none">${esc(command.description || "—")}</td>
        </tr>`,
      )
      .join("");
  };

  const select = async (name, push = true) => {
    const command = data.commands.find((entry) => entry.name === name);
    if (command === undefined) return;
    state.selected = name;
    rows
      .querySelectorAll("tr[data-cmd]")
      .forEach((row) =>
        row.classList.toggle("is-selected", row.dataset.cmd === name),
      );
    if (push)
      history.replaceState(null, "", `#/cli?cmd=${encodeURIComponent(name)}`);
    const tool = command.name.replace(/-/g, "_");
    detail.scrollTop = 0;
    detail.innerHTML = `
      <div>
        <span class="tag tag--accent">cli</span>
        <h2 style="margin-top:10px">rea ${esc(command.name)}</h2>
        <p class="muted small" style="margin-top:4px">${esc(command.description || "No description in the CLI router.")}</p>
      </div>
      <div class="term-command"><span class="prompt">$</span><code>rea ${esc(command.name)} --help</code></div>
      ${loadingState("Reading help from this checkout…")}
      <div class="row">
        ${toolNames.has(tool) ? `<a class="btn btn--small" href="#/tools?tool=${encodeURIComponent(tool)}">MCP: ${esc(tool)}</a>` : ""}
        <a class="btn btn--small btn--ghost" href="#/docs?doc=cli">CLI guide</a>
      </div>
    `;
    try {
      const payload = await loadHelp(name);
      const loading = detail.querySelector(".loading");
      const block = document.createElement("pre");
      block.className = "term term--tall term--wrap";
      block.textContent = payload.help || "No help output.";
      if (loading === null) detail.append(block);
      else loading.replaceWith(block);
    } catch (error) {
      detail.innerHTML += `<div class="callout callout--warn"><span class="callout__mark">!</span><div>${esc(error.message)}</div></div>`;
    }
  };

  const loadHelp = async (name) => {
    if (helpCache.has(name)) return helpCache.get(name);
    const response = await fetch(`/api/cli/${encodeURIComponent(name)}/help`);
    if (!response.ok)
      throw new Error(`Help for ${name} failed (${response.status})`);
    const payload = await response.json();
    helpCache.set(name, payload);
    return payload;
  };

  rows.addEventListener("click", (event) => {
    const target = event.target.closest("[data-cmd]");
    if (target !== null) select(target.dataset.cmd);
  });
  container.querySelector("#cliSearch").addEventListener(
    "input",
    debounce(() => {
      state.query = container.querySelector("#cliSearch").value.trim();
      draw();
    }, 120),
  );

  draw();
  if (state.selected !== null) select(state.selected, false);
};
