#!/usr/bin/env node
/**
 * Render the site into `site/public`.
 *
 * Inputs, all local: `workbench/data/*.json` (the catalog snapshot) and
 * `site/data/*` (two captured Evidence records). Output: plain HTML, CSS, JS
 * and JSON files that work on any static host.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadData } from "./lib/data.mjs";
import { buildExploreDatasets } from "./lib/explore-data.mjs";
import { h, n } from "./lib/html.mjs";
import { page, pagehead } from "./lib/shell.mjs";
import { aboutPage } from "./pages/about.mjs";
import { cliPage } from "./pages/cli.mjs";
import { docsPage } from "./pages/docs.mjs";
import { explorePage } from "./pages/explore.mjs";
import { homePage } from "./pages/home.mjs";
import { toolsPage } from "./pages/tools.mjs";
import { workflowsPage } from "./pages/workflows.mjs";

const root = new URL("../", import.meta.url).pathname;
const out = join(root, "site", "public");
const data = await loadData(root);
const datasets = buildExploreDatasets(data);

const pages = [
  {
    path: "/",
    file: "index.html",
    title: `REA ${data.version} — every answer arrives with its evidence`,
    description: `A generated field guide to ${data.packageName} ${data.version}: ${n(data.stats.tools)} MCP tools, ${n(data.stats.commands)} CLI commands, ${n(data.stats.documents)} documents and two Evidence workflows you can inspect node by node.`,
    body: homePage(data),
  },
  {
    path: "/workflows/",
    file: "workflows/index.html",
    title: "The two engine-free workflows",
    description:
      "App reconstruction and artifact inventory, explained with the real captures from this checkout: files, roles, IPC channels, artifact graphs and digests.",
    body: workflowsPage(data),
  },
  {
    path: "/explore/",
    file: "explore/index.html",
    title: "Evidence explorer",
    description:
      "Walk a real artifact graph and a real application graph: pan, zoom, inspect nodes, read relations and download the Evidence.",
    body: explorePage(data, datasets),
    scripts: ["/assets/explore.js"],
  },
  {
    path: "/reference/tools/",
    file: "reference/tools/index.html",
    title: `${n(data.stats.tools)} MCP tools`,
    description:
      "Every tool in the contract catalog with its arguments, side effects, annotations and returned Evidence facets.",
    body: toolsPage(data),
  },
  {
    path: "/reference/cli/",
    file: "reference/cli/index.html",
    title: `${n(data.stats.commands)} CLI commands`,
    description:
      "The terminal surface: every primary command, its purpose and its retained aliases.",
    body: cliPage(data),
  },
  {
    path: "/reference/docs/",
    file: "reference/docs/index.html",
    title: `${n(data.stats.documents)} documents`,
    description:
      "The documentation index, grouped by area with summaries, section lists and links to the Markdown sources.",
    body: docsPage(data),
  },
  {
    path: "/about/",
    file: "about/index.html",
    title: "How this site is generated",
    description:
      "The pipeline, the catalog digests, the two captures and the deliberate limits behind this site.",
    body: aboutPage(data),
  },
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of pages) {
  const html = page({
    data,
    path: entry.path,
    title: entry.title,
    description: entry.description,
    body: entry.body,
    scripts: entry.scripts ?? [],
  });
  const target = join(out, entry.file);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, html);
  console.log(
    `rendered ${entry.path} → site/public/${entry.file} (${(html.length / 1024).toFixed(0)} KiB)`,
  );
}

const notFound = page({
  data,
  path: "/404",
  title: "Not found",
  description:
    "This page is not part of the REA Workbench site. Every route that exists is linked from here.",
  body: `${pagehead({
    kicker: "404",
    title: "There is no record here",
    lede: "The page you asked for is not part of this site. Everything that is lives in six places.",
  })}
<section class="section section--flush">
  <div class="wrap">
    <div class="grid grid--3">
      <a class="card card--link" href="/"><span class="card__eyebrow">Start</span><h3>Home</h3><p class="small muted">What REA is, what it returns and how to run it.</p></a>
      <a class="card card--link" href="/explore/"><span class="card__eyebrow">Captures</span><h3>Explorer</h3><p class="small muted">Two real Evidence graphs, node by node.</p></a>
      <a class="card card--link" href="/reference/tools/"><span class="card__eyebrow">Reference</span><h3>Tools &amp; commands</h3><p class="small muted">The full MCP and CLI surface.</p></a>
    </div>
  </div>
</section>`,
});
await writeFile(join(out, "404.html"), notFound);

await cp(join(root, "site", "assets"), join(out, "assets"), {
  recursive: true,
});

await mkdir(join(out, "data"), { recursive: true });
await cp(
  join(root, "site", "data", "notes-electron.zip"),
  join(out, "data", "notes-electron.zip"),
);

await mkdir(join(out, "evidence"), { recursive: true });
for (const name of ["application", "artifact"]) {
  await cp(
    join(root, "site", "data", `evidence-${name}.json`),
    join(out, "evidence", `${name}.json`),
  );
}

const meta = {
  site: "REA Workbench",
  package: data.manifest.package,
  checkout: data.manifest.checkout,
  generatedAt: data.manifest.generatedAt,
  counts: data.stats,
  captures: {
    application: {
      target: data.application.target,
      capturedAt: data.application.capturedAt,
      durationMs: data.application.durationMs,
      evidenceId: data.application.projection.evidence.id,
    },
    artifact: {
      target: data.artifact.target,
      capturedAt: data.artifact.capturedAt,
      durationMs: data.artifact.durationMs,
      evidenceId: data.artifact.projection.evidence.id,
    },
  },
  datasets: data.manifest.datasets,
};
await mkdir(join(out, "api"), { recursive: true });
await writeFile(join(out, "api", "meta.json"), JSON.stringify(meta, null, 2));

/* Absolute URLs are required in a sitemap. When the site is built for a real
   host, REA_SITE_ORIGIN is set; otherwise the preview origin is used. */
const origin =
  process.env.REA_SITE_ORIGIN ?? `http://localhost:${process.env.PORT ?? 5181}`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (entry) => `  <url>
    <loc>${h(origin)}${entry.path}</loc>
    <lastmod>${data.manifest.generatedAt.slice(0, 10)}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
await writeFile(join(out, "sitemap.xml"), sitemap);
await writeFile(
  join(out, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
);

console.log(
  `\nsite/public ready · ${pages.length + 1} pages · ${n(data.stats.tools)} tools indexed`,
);
