/** Shared page shell: head, top bar, footer. */
import { h, n } from "./html.mjs";

const NAV = [
  { href: "/workflows/", label: "Workflows" },
  { href: "/explore/", label: "Explorer" },
  { href: "/reference/tools/", label: "Tools" },
  { href: "/reference/cli/", label: "Commands" },
  { href: "/reference/docs/", label: "Documents" },
  { href: "/about/", label: "About" },
];

export const mark = (
  size = 26,
) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
    <path d="M5 11V5h6M21 5h6v6M27 21v6h-6M11 27H5v-6"/>
    <path d="M12 22V10h5.2a3.6 3.6 0 0 1 0 7.2H12"/>
    <path d="M18.4 17.2 22 22"/>
  </g>
</svg>`;

const themeScript = `(function(){try{var t=localStorage.getItem("rea-site-theme");var d=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.dataset.theme=t||(d?"light":"dark");}catch(e){document.documentElement.dataset.theme="dark";}})();`;

const topbar = (path) => `<header class="topbar">
  <div class="topbar__inner">
    <a class="brand" href="/" aria-label="REA Workbench, home">
      <span style="color:var(--accent);display:flex">${mark()}</span>
      <span>REA Workbench<small>repository field guide</small></span>
    </a>
    <button class="iconbtn navtoggle" type="button" data-nav-toggle aria-expanded="false" aria-label="Toggle navigation">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
    </button>
    <nav class="nav" data-nav aria-label="Primary" hidden>
      ${NAV.map(
        (item) =>
          `<a href="${item.href}"${item.href === path ? ' aria-current="page"' : ""}>${item.label}</a>`,
      ).join("\n      ")}
      <span class="nav__group">
        <a href="https://github.com/b25bs3421-cpu/rea" rel="noreferrer">GitHub</a>
        <a href="http://localhost:5180" rel="noreferrer" title="The local console, when it is running">Console ↗</a>
      </span>
    </nav>
    <button class="iconbtn theme-toggle" type="button" data-theme-toggle aria-label="Switch theme">
      <svg data-theme-icon="sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M12.8 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4"/></svg>
      <svg data-theme-icon="moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true" hidden><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z"/></svg>
    </button>
  </div>
</header>`;

const footer = (data) => `<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div>
        <a class="brand" href="/">${mark(22)}<span>REA Workbench</span></a>
        <p class="small muted" style="margin:.8rem 0 0;max-width:34ch">
          A static site generated from the ${h(data.packageName)} checkout:
          its catalogs, its documents and two captured Evidence records.
        </p>
        <p class="small" style="margin:.9rem 0 0">
          <span class="tag tag--accent">${h(data.version)}</span>
          <span class="tag">${h(data.commit)}</span>
        </p>
      </div>
      <div>
        <h4>Product</h4>
        <ul>
          <li><a href="/workflows/">Two workflows</a></li>
          <li><a href="/explore/">Evidence explorer</a></li>
          <li><a href="/reference/tools/">Tool catalog</a></li>
          <li><a href="/reference/cli/">Command reference</a></li>
          <li><a href="/reference/docs/">Documents</a></li>
        </ul>
      </div>
      <div>
        <h4>Repository</h4>
        <ul>
          <li><a href="https://github.com/b25bs3421-cpu/rea" rel="noreferrer">Source on GitHub</a></li>
          <li><a href="https://rea.tools" rel="noreferrer">rea.tools</a></li>
          <li><a href="https://github.com/b25bs3421-cpu/rea/tree/main/docs" rel="noreferrer">docs/</a></li>
          <li><a href="https://github.com/b25bs3421-cpu/rea/blob/main/README.md" rel="noreferrer">README</a></li>
        </ul>
      </div>
      <div>
        <h4>This site</h4>
        <ul>
          <li><a href="/about/">Provenance</a></li>
          <li><a href="/sitemap.xml">Sitemap</a></li>
          <li><a href="/api/meta.json">Build metadata</a></li>
          <li><a href="/explore/?dataset=artifact">Sample artifact</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>Generated ${h(data.generatedAt.slice(0, 10))} from ${h(data.branch)}@${h(data.commit)} · ${n(data.stats.tools)} tools · ${n(data.stats.commands)} commands · ${n(data.stats.documents)} documents</span>
      <span>No trackers · no cookies · static files only</span>
    </div>
  </div>
</footer>`;

export const page = ({
  data,
  path,
  title,
  description,
  body,
  bodyClass = "",
  scripts = [],
  head = "",
}) => {
  const origin = process.env.REA_SITE_ORIGIN ?? "";
  const fullTitle = path === "/" ? title : `${title} · REA Workbench`;
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(fullTitle)}</title>
<meta name="description" content="${h(description)}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#08090b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="REA Workbench">
<meta property="og:title" content="${h(fullTitle)}">
<meta property="og:description" content="${h(description)}">
<meta name="twitter:card" content="summary_large_image">
${origin ? `<link rel="canonical" href="${h(origin + path)}">\n<meta property="og:url" content="${h(origin + path)}">\n<meta property="og:image" content="${h(origin)}/assets/og.svg">` : ""}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<script>${themeScript}</script>
${head}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
${topbar(path)}
<main id="main">
${body}
</main>
${footer(data)}
<script src="/assets/site.js" defer></script>
${scripts.map((src) => `<script src="${src}" defer></script>`).join("\n")}
</body>
</html>
`;
};

export const pagehead = ({
  kicker,
  title,
  lede,
  crumbs = [],
  actions = "",
}) => `
<section class="pagehead">
  <div class="wrap">
    ${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((crumb, index) => `${index > 0 ? "<span>/</span>" : ""}<a href="${crumb.href}">${h(crumb.label)}</a>`).join("")}</nav>` : ""}
    <p class="kicker">${h(kicker)}</p>
    <h1>${h(title)}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ""}
    ${actions ? `<div class="hero__actions">${actions}</div>` : ""}
  </div>
</section>`;

export const codeBlock = ({ code, lang = "", headLabel = "", copy = true }) => `
<div class="term">
  <div class="term__head">
    <span class="term__dot"></span><span class="term__dot"></span><span class="term__dot term__dot--live"></span>
    <span style="margin-left:.35rem">${h(headLabel)}</span>
    ${copy ? `<button class="copy" type="button" data-copy="" style="margin-left:auto">Copy</button>` : ""}
  </div>
  <pre><code${lang ? ` class="language-${lang}"` : ""}>${h(code.trim())}</code></pre>
</div>`;
