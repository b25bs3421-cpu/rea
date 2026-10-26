/** Small DOM, formatting and clipboard helpers shared by every view. */

export const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const int = (value) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-US").format(value);

export const bytes = (value) => {
  if (value === null || value === undefined) return "—";
  const units = ["B", "KiB", "MiB", "GiB"];
  let size = Number(value);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
};

export const duration = (ms) =>
  ms === null || ms === undefined
    ? "—"
    : ms < 1000
      ? `${Math.round(ms)} ms`
      : `${(ms / 1000).toFixed(1)} s`;

export const shortHash = (value, length = 12) =>
  typeof value !== "string" ? "—" : value.replace(/^art_/, "").slice(0, length);

export const relTime = (iso) => {
  if (typeof iso !== "string") return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export const dateTime = (iso) => {
  if (typeof iso !== "string") return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toISOString().replace("T", " ").slice(0, 16) + "Z";
};

export const el = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};

export const toast = (message, kind = "ok") => {
  const host = document.getElementById("toasts");
  if (host === null) return;
  const node = el(
    `<div class="toast${kind === "error" ? " toast--error" : ""}" role="status">${esc(message)}</div>`,
  );
  host.append(node);
  setTimeout(() => node.remove(), 2600);
};

export const copy = async (text, label = "Copied") => {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    toast(ok ? label : "Copy failed", ok ? "ok" : "error");
    return ok;
  }
};

export const copyButton = (text, label = "Copy", size = "small") =>
  `<button class="btn btn--ghost btn--${size}" type="button" data-copy="${esc(text)}">${esc(label)}</button>`;

export const codeBlock = (code, label = "text") => `
  <div class="code-wrap">
    <div class="code-wrap__head"><span>${esc(label)}</span>${copyButton(code, "Copy")}</div>
    <pre class="code">${esc(code)}</pre>
  </div>`;

export const commandBlock = (command, label = "") => `
  <div class="term-command">
    <span class="prompt">$</span>
    <code>${esc(command)}</code>
    <span style="margin-left:auto">${copyButton(command, "Copy")}</span>
  </div>
  ${label === "" ? "" : `<p class="panel__note" style="margin-top:6px">${esc(label)}</p>`}`;

export const searchField = (id, placeholder, value = "") => `
  <label class="search">
    <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
    <input id="${esc(id)}" type="search" autocomplete="off" spellcheck="false"
      placeholder="${esc(placeholder)}" value="${esc(value)}" aria-label="${esc(placeholder)}" />
  </label>`;

export const kindTag = (kind) => {
  const tone =
    kind === "official-proxy" || kind === "enhanced"
      ? "accent"
      : kind === "session"
        ? "pink"
        : kind === "native-provider"
          ? "blue"
          : kind === "application"
            ? "accent"
            : "";
  return `<span class="tag${tone === "" ? "" : ` tag--${tone}`}">${esc(kind)}</span>`;
};

export const sectionHead = (index, title, hint = "") => `
  <div class="section__head">
    <h2 class="section__title"><span>${esc(index)}</span><span>${esc(title)}</span></h2>
    ${hint === "" ? "" : `<p class="section__hint">${esc(hint)}</p>`}
  </div>`;

export const pageHead = (kicker, title, lede) => `
  <header class="page-head">
    <span class="kicker">${esc(kicker)}</span>
    <h1>${title}</h1>
    <p>${lede}</p>
  </header>`;

export const emptyState = (mark, message, action = "") => `
  <div class="empty">
    <span class="empty__mark">${esc(mark)}</span>
    <p>${message}</p>
    ${action}
  </div>`;

export const loadingState = (message = "Reading the checkout…") => `
  <div class="loading">
    <span class="loading__bar"></span>
    <p>${esc(message)}</p>
  </div>`;

export const errorState = (message, detail = "") => `
  <div class="empty">
    <span class="empty__mark">request failed</span>
    <p>${esc(message)}</p>
    ${detail === "" ? "" : `<pre class="code" style="max-width:100%">${esc(detail)}</pre>`}
  </div>`;

export const debounce = (fn, wait = 140) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

export const clampText = (text, max) => {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

/** Convert a snake_case MCP tool name to its CLI spelling. */
export const toCliName = (name) => String(name).replace(/_/g, "-");

export const toSnakeName = (name) => String(name).replace(/-/g, "_");

export const download = (url, filename) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
};
