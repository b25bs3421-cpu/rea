import { codeBlock, esc, int, pageHead } from "../ui.js";

export const renderSetup = async (container, ctx) => {
  const product = await ctx.api("product");
  const clients = product.setup_clients ?? [];
  const state = {
    selected: new Set(["claude_code"]),
    skill: true,
    dryRun: false,
    allDetected: false,
    accessible: false,
    yes: false,
  };

  container.innerHTML = `
    ${pageHead(
      "Setup builder",
      "Compose the setup command",
      `Setup writes agent registrations and the workflow skill, but only after showing the exact paths it will touch. This builder assembles the same flags the CLI accepts; it does not write anything itself.`,
    )}
    <div class="split">
      <section class="stack">
        <div class="panel stack">
          <div class="spread">
            <p class="panel__title">Agents</p>
            <div class="row">
              <button class="btn btn--small btn--ghost" id="selectNone" type="button">None</button>
              <button class="btn btn--small btn--ghost" id="selectAll" type="button">All</button>
            </div>
          </div>
          <div class="stack" id="clientList" style="gap:4px;max-height:430px;overflow:auto">
            ${clients
              .map(
                (
                  client,
                ) => `<button class="choice" type="button" data-client="${esc(client.id)}"
                  aria-pressed="${state.selected.has(client.id)}"
                  ${client.configuration === "detect-only" ? 'data-detect-only="true"' : ""}>
                  <strong>${esc(client.display_name)}</strong>
                  <span>${esc(client.id)} · ${esc(client.format)}${client.configuration === "detect-only" ? " · detect only" : ""}</span>
                </button>`,
              )
              .join("")}
          </div>
        </div>

        <div class="panel stack">
          <p class="panel__title">Options</p>
          <label class="switch"><input type="checkbox" id="optSkill" checked /> install workflow skill</label>
          <label class="switch"><input type="checkbox" id="optDryRun" /> dry run (--json plan)</label>
          <label class="switch"><input type="checkbox" id="optAllDetected" /> configure every detected agent</label>
          <label class="switch"><input type="checkbox" id="optAccessible" /> accessible prompts</label>
          <label class="switch"><input type="checkbox" id="optYes" /> non-interactive (--yes)</label>
          <p class="panel__note">A dry run returns the plan and a readiness projection without writing files. Without a scope flag, <code class="mono">--yes</code> only applies to existing REA registrations.</p>
        </div>
      </section>

      <section class="stack">
        <div class="panel stack panel--ticked">
          <div class="spread">
            <p class="panel__title">Command</p>
            <button class="btn btn--small" id="copyCommand" type="button">Copy</button>
          </div>
          <div class="term-command"><span class="prompt">$</span><code id="commandText"></code></div>
          <p class="panel__note" id="commandNote"></p>
        </div>

        <div class="panel stack">
          <p class="panel__title">What setup will show you before it writes</p>
          <ol class="stack" style="margin:0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.7">
            <li>The exact agent configuration paths it plans to change.</li>
            <li>The skill destination for each selected agent, or <code class="mono">~/.agents/skills</code> without one.</li>
            <li>Any engine it proposes to install or connect, with integrity evidence.</li>
            <li>Backups: an existing <code class="mono">.rea.backup</code> is preserved, with a recovery copy when the file drifted.</li>
          </ol>
          <p class="panel__note">Declining at the prompt, or pressing Ctrl-C, leaves configuration unchanged.</p>
        </div>

        <div class="panel stack">
          <p class="panel__title">Verify after setup</p>
          <div id="verifyList" class="stack" style="gap:6px"></div>
          <p class="panel__note">Restart any agent named in the completion message. Quit Claude Desktop fully before approving, or it may overwrite the registration from memory.</p>
        </div>

        <div class="panel stack">
          <p class="panel__title">Manual registration</p>
          <p class="muted small">For clients without managed setup, register the stdio server yourself. Client formats differ: Codex uses TOML, some clients add a <code class="mono">type</code> field.</p>
          ${codeBlock(
            JSON.stringify(
              {
                mcpServers: {
                  rea: {
                    command: "npx",
                    args: ["-y", "rea-agents@latest", "mcp"],
                    env: { REA_MCP_INPUT_SCHEMA_PROFILE: "compact" },
                  },
                },
              },
              null,
              2,
            ),
            "mcpServers.rea",
          )}
          <p class="panel__note">Drop the <code class="mono">env</code> entry unless a client needs the compact schema profile; see the client configuration guide.</p>
          <a class="btn btn--small btn--ghost" href="#/docs?doc=client-configuration">Client configuration guide</a>
        </div>
      </section>
    </div>
  `;

  const commandText = container.querySelector("#commandText");
  const note = container.querySelector("#commandNote");
  const verify = container.querySelector("#verifyList");

  const buildCommand = () => {
    const parts = ["npx rea-agents setup"];
    if (state.allDetected) parts.push("--all-detected");
    else
      for (const client of clients)
        if (state.selected.has(client.id)) parts.push(`--client ${client.id}`);
    if (!state.skill) parts.push("--skill=false");
    if (state.accessible) parts.push("--accessible");
    if (state.yes) parts.push("--yes");
    if (state.dryRun) parts.push("--dry-run --json");
    return parts.join(" ");
  };

  const draw = () => {
    const command = buildCommand();
    commandText.textContent = command;
    const selected = clients.filter((client) => state.selected.has(client.id));
    note.textContent = state.allDetected
      ? "Every detected agent is configured. Use --client flags instead when you want a narrower scope."
      : selected.length === 0
        ? "No agent selected: setup offers the workflow skill separately for CLI use."
        : `${int(selected.length)} agent${selected.length === 1 ? "" : "s"} selected${state.skill ? ", skill included" : ", skill skipped"}.`;
    verify.innerHTML =
      selected.length === 0
        ? '<p class="panel__note">Select an agent to see its verification command.</p>'
        : selected
            .map(
              (client) =>
                `<div class="term-command"><span class="prompt">$</span><code>rea doctor --client ${esc(client.id)} --json</code></div>`,
            )
            .join("");
    container.querySelectorAll("[data-client]").forEach((node) => {
      node.setAttribute(
        "aria-pressed",
        String(state.selected.has(node.dataset.client)),
      );
    });
  };

  container.querySelector("#clientList").addEventListener("click", (event) => {
    const node = event.target.closest("[data-client]");
    if (node === null) return;
    const id = node.dataset.client;
    if (state.selected.has(id)) state.selected.delete(id);
    else state.selected.add(id);
    state.allDetected = false;
    container.querySelector("#optAllDetected").checked = false;
    draw();
  });
  container.querySelector("#selectAll").addEventListener("click", () => {
    for (const client of clients)
      if (client.configuration !== "detect-only") state.selected.add(client.id);
    state.allDetected = false;
    container.querySelector("#optAllDetected").checked = false;
    draw();
  });
  container.querySelector("#selectNone").addEventListener("click", () => {
    state.selected.clear();
    draw();
  });

  const bindOption = (id, key, after = () => {}) => {
    container.querySelector(id).addEventListener("change", (event) => {
      state[key] = event.target.checked;
      after();
      draw();
    });
  };
  bindOption("#optSkill", "skill");
  bindOption("#optDryRun", "dryRun");
  bindOption("#optAccessible", "accessible");
  bindOption("#optYes", "yes");
  bindOption("#optAllDetected", "allDetected", () => {
    if (state.allDetected) {
      state.selected.clear();
    }
  });

  container.querySelector("#copyCommand").addEventListener("click", () => {
    navigator.clipboard.writeText(buildCommand()).then(() => {
      container.querySelector("#copyCommand").textContent = "Copied";
      setTimeout(
        () => (container.querySelector("#copyCommand").textContent = "Copy"),
        1500,
      );
    });
  });

  draw();
};
