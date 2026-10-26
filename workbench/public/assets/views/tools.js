import {
  clampText,
  debounce,
  emptyState,
  esc,
  int,
  kindTag,
  pageHead,
  searchField,
} from "../ui.js";

export const renderTools = async (container, ctx) => {
  const [data, cli] = await Promise.all([ctx.api("tools"), ctx.api("cli")]);
  const cliNames = new Set(cli.commands.map((entry) => entry.name));
  const state = {
    query: "",
    kind: "all",
    readOnly: false,
    session: false,
    selected: ctx.params.tool ?? null,
  };

  container.innerHTML = `
    ${pageHead(
      "Tool catalog",
      `${int(data.total)} MCP tools`,
      `Every tool is generated from a contract in this checkout, so the inventory, the input schema and the declared side effects match what the server advertises. Read-only tools are safe to explore first; session tools change the server's retained state.`,
    )}
    <div class="split">
      <section class="stack">
        <div class="toolbar" style="margin-bottom:0">
          ${searchField("toolSearch", "Filter by name, argument or text")}
          <div class="switch-row">
            <label class="switch"><input type="checkbox" id="readOnlyToggle" /> read-only</label>
            <label class="switch"><input type="checkbox" id="sessionToggle" /> session</label>
          </div>
          <p class="toolbar__count" id="toolCount"></p>
        </div>
        <div class="chips" id="kindChips">
          <button class="chip is-active" data-kind="all" aria-pressed="true">all <span class="chip__count">${int(data.total)}</span></button>
          ${data.kinds
            .map(
              (entry) =>
                `<button class="chip" data-kind="${esc(entry.kind)}" aria-pressed="false">${esc(entry.kind)} <span class="chip__count">${int(entry.count)}</span></button>`,
            )
            .join("")}
        </div>
        <div class="table-wrap" style="max-height:74vh">
          <table class="data data--fixed">
            <thead><tr><th style="width:52%">Tool</th><th>Kind</th><th style="width:78px">Flags</th></tr></thead>
            <tbody id="toolRows"></tbody>
          </table>
        </div>
      </section>
      <aside class="detail" id="toolDetail" aria-live="polite"></aside>
    </div>
  `;

  const rows = container.querySelector("#toolRows");
  const counter = container.querySelector("#toolCount");
  const detail = container.querySelector("#toolDetail");

  const matches = (tool) => {
    if (state.kind !== "all" && tool.kind !== state.kind) return false;
    if (state.readOnly && !tool.annotations.readOnly) return false;
    if (state.session && !tool.session) return false;
    if (state.query === "") return true;
    const needle = state.query.toLowerCase();
    const haystack = [
      tool.name,
      tool.title,
      tool.description,
      tool.kind,
      ...tool.parameters.map((parameter) => parameter.name),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  };

  const FLAGS = [
    ["readOnly", "R", "read-only", "tag--accent"],
    ["session", "S", "session state", "tag--pink"],
    ["destructive", "D", "destructive", "tag--red"],
    ["openWorld", "W", "open world", "tag--amber"],
  ];

  const flags = (tool) => {
    const marks = FLAGS.filter(([key]) =>
      key === "session" ? tool.session : tool.annotations[key],
    );
    const chips = marks
      .map(
        ([, glyph, label, tone]) =>
          `<span class="flag ${tone}" title="${esc(label)}" aria-label="${esc(label)}">${glyph}</span>`,
      )
      .join("");
    return `<div class="row" style="gap:4px">${chips || '<span class="flag">·</span>'}${
      tool.effects.length === 0
        ? ""
        : `<span class="flag-count" title="${esc(tool.effects.join(", "))}">${int(tool.effects.length)}e</span>`
    }</div>`;
  };

  const drawRows = () => {
    const visible = data.tools.filter(matches);
    counter.textContent = `${int(visible.length)} shown`;
    rows.innerHTML =
      visible.length === 0
        ? `<tr><td colspan="3">${emptyState("no match", "Nothing matches this filter. Clear the search or pick another kind.")}</td></tr>`
        : visible
            .map(
              (
                tool,
              ) => `<tr data-tool="${esc(tool.name)}" class="${tool.name === state.selected ? "is-selected" : ""}">
              <td class="name"><button class="row-button" type="button" data-tool="${esc(tool.name)}">${esc(tool.name)}<br /><span class="faint small">${esc(tool.title ?? "")}</span></button></td>
              <td>${kindTag(tool.kind)}</td>
              <td><div class="row">${flags(tool)}</div></td>
            </tr>`,
            )
            .join("");
    if (state.selected === null && visible.length > 0)
      select(visible[0].name, false);
  };

  const select = (name, push = true) => {
    const tool = data.tools.find((entry) => entry.name === name);
    if (tool === undefined) return;
    state.selected = tool.name;
    rows
      .querySelectorAll("tr[data-tool]")
      .forEach((row) =>
        row.classList.toggle("is-selected", row.dataset.tool === tool.name),
      );
    detail.innerHTML = renderDetail(tool, cliNames);
    detail.scrollTop = 0;
    if (push)
      history.replaceState(
        null,
        "",
        `#/tools?tool=${encodeURIComponent(tool.name)}`,
      );
  };

  rows.addEventListener("click", (event) => {
    const target = event.target.closest("[data-tool]");
    if (target !== null) select(target.dataset.tool);
  });

  const onSearch = debounce(() => {
    state.query = container.querySelector("#toolSearch").value.trim();
    drawRows();
  }, 120);
  container.querySelector("#toolSearch").addEventListener("input", onSearch);

  container.querySelectorAll("[data-kind]").forEach((chip) =>
    chip.addEventListener("click", () => {
      state.kind = chip.dataset.kind;
      container.querySelectorAll("[data-kind]").forEach((node) => {
        const active = node.dataset.kind === state.kind;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-pressed", String(active));
      });
      drawRows();
    }),
  );

  container
    .querySelector("#readOnlyToggle")
    .addEventListener("change", (event) => {
      state.readOnly = event.target.checked;
      drawRows();
    });
  container
    .querySelector("#sessionToggle")
    .addEventListener("change", (event) => {
      state.session = event.target.checked;
      drawRows();
    });

  drawRows();
  if (state.selected !== null) select(state.selected, false);
};

const renderDetail = (tool, cliNames) => {
  const cliName = tool.name.replace(/_/g, "-");
  const hasCli = cliNames.has(cliName);
  const argumentsSample = Object.fromEntries(
    tool.parameters
      .slice(0, 4)
      .map((parameter) => [
        parameter.name,
        parameter.required
          ? parameter.type.startsWith("array")
            ? ["<value>"]
            : parameter.type.startsWith("object")
              ? {}
              : `<${parameter.type}>`
          : null,
      ]),
  );
  const call = JSON.stringify(
    { name: tool.name, arguments: argumentsSample },
    null,
    2,
  );
  return `
    <div>
      <span class="tag">${esc(tool.kind)}</span>
      <h2 style="margin-top:10px">${esc(tool.title ?? tool.name)}</h2>
      <p class="detail__name">${esc(tool.name)}</p>
    </div>
    <div class="row">
      ${tool.annotations.readOnly ? '<span class="tag tag--accent">read-only</span>' : ""}
      ${tool.session ? '<span class="tag tag--pink">session</span>' : ""}
      ${tool.annotations.destructive ? '<span class="tag tag--red">destructive</span>' : ""}
      ${tool.annotations.idempotent ? '<span class="tag">idempotent</span>' : ""}
      ${tool.annotations.openWorld ? '<span class="tag tag--amber">open world</span>' : ""}
    </div>
    <p class="detail__desc">${esc(tool.description)}${tool.descriptionTruncated ? " …" : ""}</p>

    <div>
      <p class="panel__title" style="margin-bottom:8px">Arguments</p>
      ${
        tool.parameters.length === 0
          ? '<p class="panel__note">This tool takes no arguments.</p>'
          : `<div class="args">
              ${tool.parameters
                .map(
                  (parameter) => `<div class="arg">
                    <div class="arg__head">
                      <span class="arg__name">${esc(parameter.name)}</span>
                      ${parameter.required ? '<span class="tag tag--accent">required</span>' : '<span class="tag">optional</span>'}
                      <span class="arg__type">${esc(clampText(parameter.type, 60))}</span>
                    </div>
                    <p class="arg__desc">${esc(parameter.description || "No description in the contract.")}</p>
                  </div>`,
                )
                .join("")}
            </div>`
      }
    </div>

    ${
      tool.output === null
        ? ""
        : `<div>
            <p class="panel__title" style="margin-bottom:8px">Returns Evidence</p>
            <div class="row">${tool.output.fields
              .map((field) => `<span class="tag">${esc(field)}</span>`)
              .join("")}</div>
          </div>`
    }

    <div>
      <p class="panel__title" style="margin-bottom:8px">Declared effects</p>
      <div class="effects">
        ${[
          "accessesNetwork",
          "changesUiState",
          "executesForeignCode",
          "idempotent",
          "launchesProcess",
          "mayDiscardData",
          "mutatesDevice",
          "mutatesSession",
          "mutatesTarget",
          "writesFilesystem",
        ]
          .map(
            (
              effect,
            ) => `<div class="effect" data-on="${tool.effects.includes(effect)}">
              <span>${esc(effect.replace(/([A-Z])/g, " $1").toLowerCase())}</span>
              <span class="effect__dot"></span>
            </div>`,
          )
          .join("")}
      </div>
    </div>

    <div class="code-wrap">
      <div class="code-wrap__head">
        <span>MCP tools/call</span>
        <button class="btn btn--ghost btn--small" type="button" data-copy="${esc(JSON.stringify(call))}">Copy</button>
      </div>
      <pre class="code">${esc(call)}</pre>
    </div>

    <div class="row">
      ${
        hasCli
          ? `<a class="btn btn--small" href="#/cli?cmd=${encodeURIComponent(cliName)}">CLI: rea ${esc(cliName)}</a>`
          : '<span class="tag">MCP only</span>'
      }
      <a class="btn btn--small btn--ghost" href="#/docs?doc=tool-design">Tool design notes</a>
    </div>
  `;
};
