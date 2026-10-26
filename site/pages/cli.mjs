import { codeBlock, pagehead } from "../lib/shell.mjs";
import { h, list, n, plural } from "../lib/html.mjs";

export const cliPage = (data) => {
  const commands = data.cli.commands;
  const aliases = commands.filter((command) => command.aliases.length > 0);

  const body = `
${pagehead({
  kicker: "Reference · CLI",
  title: `${n(data.cli.primaryCount)} commands, one binary`,
  lede: "The terminal surface mirrors the MCP tools: the same workflows, the same Evidence, scriptable. Search the list, copy a command, and add --json when you want the record instead of the rendering.",
  crumbs: [
    { href: "/", label: "Home" },
    { href: "/reference/cli/", label: "Commands" },
  ],
})}

<section class="section section--flush">
  <div class="wrap">
    <div class="grid grid--2" style="align-items:start;margin-bottom:2rem">
      <div class="stack">
        ${codeBlock({
          headLabel: "the shape of every command",
          code: `rea <command> [target] [flags]

# machine-readable output
rea inspect-artifact ./app.apk --json

# discover the surface
rea --help
rea inspect-artifact --help`,
        })}
      </div>
      <div class="card">
        <span class="card__eyebrow">Notes</span>
        <ul class="list-clean">
          <li><code>--json</code> prints the Evidence document; without it you get the human rendering of the same record.</li>
          <li>${plural(aliases.length, "command")} keep ${plural(
            aliases.reduce(
              (total, command) => total + command.aliases.length,
              0,
            ),
            "historical alias",
            "historical aliases",
          )} so scripts keep working.</li>
          <li>Local console runs the same entry point, <code>scripts/rea.mjs</code>, so its results cannot drift from the CLI.</li>
        </ul>
      </div>
    </div>

    <div data-filter>
      <div class="filters">
        <input type="search" placeholder="Search ${n(commands.length)} commands…" aria-label="Search commands" data-filter-search>
        <button class="chip" type="button" data-filter-kind="all" aria-pressed="true">All</button>
        <button class="chip" type="button" data-filter-kind="alias" aria-pressed="false">Has alias</button>
        <span class="counter" data-filter-count>${n(commands.length)} total</span>
      </div>

      <div class="table-scroll">
        <table class="data">
          <thead><tr><th scope="col">Command</th><th scope="col">Purpose</th><th scope="col">Aliases</th><th scope="col"></th></tr></thead>
          <tbody>
${list(
  commands,
  (
    command,
  ) => `            <tr data-filter-item data-kind="${command.aliases.length ? "alias" : "primary"}" data-text="${h(`${command.name} ${command.description} ${command.aliases.join(" ")}`)}">
              <td class="mono">rea ${h(command.name)}</td>
              <td class="small">${h(command.description)}</td>
              <td class="mono faint small">${command.aliases.length ? command.aliases.map((alias) => h(alias)).join(", ") : "—"}</td>
              <td style="text-align:right"><button class="copy" type="button" data-copy-text="rea ${h(command.name)}">Copy</button></td>
            </tr>`,
)}
          </tbody>
        </table>
      </div>
      <p class="empty" data-filter-empty hidden>No command matches that query.</p>
    </div>
  </div>
</section>
`;

  return body;
};
