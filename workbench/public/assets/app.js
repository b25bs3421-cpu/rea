/** Workbench shell: routing, data access, theme, palette and shared events. */
import { copy, dateTime, el, esc, int } from "./ui.js";
import { renderDocs } from "./views/docs.js";
import { renderLab } from "./views/lab.js";
import { renderOverview } from "./views/overview.js";
import { renderCli } from "./views/cli.js";
import { renderReadiness } from "./views/readiness.js";
import { renderRepo } from "./views/repo.js";
import { renderSetup } from "./views/setup.js";
import { renderTools } from "./views/tools.js";

const ROUTES = [
  { id: "overview", label: "Overview", render: renderOverview },
  { id: "lab", label: "Live lab", render: renderLab },
  { id: "tools", label: "Tool catalog", render: renderTools },
  { id: "cli", label: "CLI reference", render: renderCli },
  { id: "readiness", label: "Readiness", render: renderReadiness },
  { id: "setup", label: "Setup builder", render: renderSetup },
  { id: "docs", label: "Documents", render: renderDocs },
  { id: "repo", label: "Repo map", render: renderRepo },
];

const cache = new Map();
let meta = null;
let routeToken = 0;
let paletteIndex = null;

const api = async (name) => {
  if (cache.has(name)) return cache.get(name);
  const response = await fetch(`/api/data/${name}`);
  if (!response.ok)
    throw new Error(`Dataset ${name} failed (${response.status})`);
  const value = await response.json();
  cache.set(name, value);
  return value;
};

const ctx = {
  api,
  navigate: (hash) => navigate(hash),
  get meta() {
    return meta;
  },
  async paletteIndex() {
    return paletteIndex ?? (paletteIndex = await buildPaletteIndex());
  },
};

/* ------------------------------------------------------------------- theme */

const THEME_KEY = "rea-workbench-theme";
const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  const button = document.getElementById("themeButton");
  if (button !== null) {
    button.setAttribute(
      "aria-label",
      `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
    );
    button.dataset.theme = theme;
  }
};

const initTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);
  applyTheme(stored === "light" || stored === "dark" ? stored : systemTheme());
  document.getElementById("themeButton").addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", () => {
      if (localStorage.getItem(THEME_KEY) === null) applyTheme(systemTheme());
    });
};

/* -------------------------------------------------------------------- boot */

const boot = async () => {
  initTheme();
  renderRail();
  bindPalette();
  bindCopy();
  window.addEventListener("hashchange", syncRoute);

  try {
    meta = await (await fetch("/api/meta")).json();
    describeShell(meta);
    renderRail();
    prefetchDatasets();
  } catch (error) {
    setStatus("offline");
    console.error(error);
  }
  syncRoute();
};

const describeShell = (payload) => {
  setStatus("online");
  const brandMeta = document.getElementById("brandMeta");
  if (brandMeta !== null)
    brandMeta.textContent = `v${payload.rea.version} · ${payload.rea.checkout.commit} · ${payload.counts.tools} tools`;
  const footerMeta = document.getElementById("footerMeta");
  if (footerMeta !== null)
    footerMeta.textContent = `catalog ${dateTime(payload.generatedAt)} · node ${payload.rea.node} · ${payload.rea.platform}`;
};

const setStatus = (state) => {
  const node = document.getElementById("hostStatus");
  if (node === null) return;
  node.dataset.state = state;
  node.querySelector(".status__label").textContent =
    state === "online"
      ? "local, live"
      : state === "offline"
        ? "offline"
        : "connecting";
};

const prefetchDatasets = () => {
  const load = () => {
    Promise.all([api("tools"), api("cli"), api("docs")]).catch(() => {});
  };
  if ("requestIdleCallback" in window)
    requestIdleCallback(load, { timeout: 2500 });
  else setTimeout(load, 600);
};

/* ----------------------------------------------------------------- navigation */

const renderRail = () => {
  const list = document.getElementById("rail");
  if (list === null) return;
  const counts = {
    tools: meta?.counts.tools,
    cli: meta?.counts.cliCommands,
    docs: meta?.counts.documents,
  };
  list.innerHTML = ROUTES.map(
    (route) => `
    <li class="rail__item">
      <a class="rail__link" href="#/${route.id}" data-route="${route.id}">
        <span>${esc(route.label)}</span>
        <span class="rail__count">${counts[route.id] === undefined ? "" : int(counts[route.id])}</span>
      </a>
    </li>`,
  ).join("");
};

const parseRoute = () => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const id = ROUTES.some((route) => route.id === path) ? path : "overview";
  return { id, params: Object.fromEntries(new URLSearchParams(query)) };
};

const navigate = (hash) => {
  if (window.location.hash === hash) {
    syncRoute();
    return;
  }
  window.location.hash = hash;
};

const syncRoute = async () => {
  const { id, params } = parseRoute();
  const route = ROUTES.find((entry) => entry.id === id) ?? ROUTES[0];
  const token = (routeToken += 1);
  document.querySelectorAll(".rail__link").forEach((link) => {
    if (link.dataset.route === route.id)
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${route.label} — REA Workbench`;
  const view = document.getElementById("view");
  view.innerHTML = "";
  try {
    await route.render(view, {
      ...ctx,
      params,
      isCurrent: () => token === routeToken,
    });
  } catch (error) {
    console.error(error);
    view.append(
      el(
        `<div class="empty"><span class="empty__mark">view failed</span><p>${esc(
          error.message ?? "Unknown error",
        )}</p></div>`,
      ),
    );
  }
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
  if (view.dataset.focus !== "off") view.focus?.();
};

window.addEventListener("error", (event) => {
  console.error(event.error);
});

/* -------------------------------------------------------------------- copy */

const bindCopy = () => {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-copy]");
    if (trigger === null) return;
    event.preventDefault();
    copy(trigger.dataset.copy, trigger.dataset.copyLabel ?? "Copied");
  });
};

/* ----------------------------------------------------------------- palette */

const buildPaletteIndex = async () => {
  const [tools, cli, docs] = await Promise.all([
    api("tools"),
    api("cli"),
    api("docs"),
  ]);
  const items = ROUTES.map((route) => ({
    group: "Sections",
    glyph: "§",
    label: route.label,
    hint: `#/${route.id}`,
    hash: `#/${route.id}`,
  }));
  for (const tool of tools.tools)
    items.push({
      group: "MCP tools",
      glyph: "⚙",
      label: tool.name,
      hint: tool.kind,
      hash: `#/tools?tool=${encodeURIComponent(tool.name)}`,
      search: `${tool.name} ${tool.title ?? ""} ${tool.description ?? ""} ${tool.kind}`,
    });
  for (const command of cli.commands)
    items.push({
      group: "CLI commands",
      glyph: "$",
      label: command.name,
      hint: command.description,
      hash: `#/cli?cmd=${encodeURIComponent(command.name)}`,
      search: `${command.name} ${command.description}`,
    });
  for (const doc of docs.docs)
    items.push({
      group: "Documents",
      glyph: "▤",
      label: doc.title,
      hint: doc.slug,
      hash: `#/docs?doc=${encodeURIComponent(doc.slug)}`,
      search: `${doc.title} ${doc.slug} ${doc.summary} ${doc.headings.join(" ")}`,
    });
  return items;
};

const bindPalette = () => {
  const dialog = document.getElementById("palette");
  const input = document.getElementById("paletteInput");
  const results = document.getElementById("paletteResults");
  const count = document.getElementById("paletteCount");
  let active = 0;
  let visible = [];

  const open = async () => {
    if (dialog.open) return;
    dialog.showModal();
    input.value = "";
    results.innerHTML = `<div class="loading"><span class="loading__bar"></span><p>Indexing the checkout…</p></div>`;
    input.focus();
    try {
      paletteIndex = await ctx.paletteIndex();
      render("");
    } catch {
      results.innerHTML = `<p class="palette__hint" style="padding:16px">The catalog is unavailable.</p>`;
    }
  };

  const close = () => dialog.close();

  const render = (query) => {
    const needle = query.trim().toLowerCase();
    const pool = paletteIndex ?? [];
    const scored = pool
      .map((item) => {
        if (needle === "") {
          return item.group === "Sections" ? { item, score: 0 } : null;
        }
        const label = item.label.toLowerCase();
        const haystack = (
          item.search ?? `${item.label} ${item.hint}`
        ).toLowerCase();
        if (!haystack.includes(needle)) return null;
        const score = label.startsWith(needle)
          ? 0
          : label.includes(needle)
            ? 1
            : 2;
        return { item, score };
      })
      .filter((entry) => entry !== null)
      .sort((left, right) => left.score - right.score)
      .slice(0, 40)
      .map((entry) => entry.item);
    visible = scored;
    active = 0;
    if (scored.length === 0) {
      results.innerHTML = `<p class="palette__hint" style="padding:16px 12px">No match for “${esc(query)}”.</p>`;
      count.textContent = "";
      return;
    }
    let currentGroup = "";
    results.innerHTML = scored
      .map((item, index) => {
        const header =
          item.group === currentGroup
            ? ""
            : ((currentGroup = item.group),
              `<div class="palette__group">${esc(item.group)}</div>`);
        return `${header}<button class="palette__item" role="option" data-index="${index}"
          data-active="${index === active}" data-hash="${esc(item.hash)}">
          <span class="palette__glyph">${esc(item.glyph)}</span>
          <span class="palette__label">${esc(item.label)}</span>
          <span class="palette__hint">${esc(item.hint ?? "")}</span>
        </button>`;
      })
      .join("");
    count.textContent = `${scored.length} result${scored.length === 1 ? "" : "s"}`;
  };

  const highlight = () => {
    results.querySelectorAll(".palette__item").forEach((node) => {
      node.dataset.active = String(Number(node.dataset.index) === active);
    });
    const node = results.querySelector(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  };

  const choose = (index) => {
    const item = visible[index];
    if (item === undefined) return;
    close();
    navigate(item.hash);
  };

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      active = Math.min(active + 1, visible.length - 1);
      highlight();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.max(active - 1, 0);
      highlight();
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    }
  });
  results.addEventListener("click", (event) => {
    const item = event.target.closest(".palette__item");
    if (item !== null) choose(Number(item.dataset.index));
  });
  results.addEventListener("mousemove", (event) => {
    const item = event.target.closest(".palette__item");
    if (item === null || Number(item.dataset.index) === active) return;
    active = Number(item.dataset.index);
    highlight();
  });
  document.getElementById("paletteButton").addEventListener("click", open);
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === "k") {
      event.preventDefault();
      if (dialog.open) close();
      else open();
    } else if (key === "escape" && dialog.open) {
      close();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  window.paletteOpen = open;
};

boot();
