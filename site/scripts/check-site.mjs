#!/usr/bin/env node
/**
 * Post-build checks for `site/public`: every internal link resolves, every page
 * has a title and description, and no template placeholder leaked into the
 * output. Exits non-zero on the first class of failure it finds.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const dist = join(root, "site", "public");
const problems = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
};

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const files = await walk(dist);
const html = files.filter((file) => file.endsWith(".html"));
const pages = new Set(
  html.map((file) => {
    const page = relative(dist, file).split("\\").join("/");
    return page === "index.html" ? "/" : `/${page.replace(/index\.html$/, "")}`;
  }),
);

for (const file of html) {
  const page = `/${relative(dist, file).split("\\").join("/")}`;
  const source = await readFile(file, "utf8");

  if (!/<title>[^<]{10,}<\/title>/.test(source))
    problems.push(`${page}: missing or short <title>`);
  if (!/<meta name="description" content="[^"]{40,}"/.test(source))
    problems.push(`${page}: missing description`);
  if (!/<h1[ >]/.test(source)) problems.push(`${page}: missing <h1>`);

  for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (
      target.startsWith("http") ||
      target.startsWith("mailto:") ||
      target.startsWith("#") ||
      target.startsWith("data:")
    )
      continue;
    const [path] = target.split("#")[0].split("?");
    const resolved = path.endsWith("/")
      ? join(dist, path, "index.html")
      : join(dist, path);
    if (!(await exists(resolved)) && !pages.has(path))
      problems.push(`${page}: broken link → ${target}`);
  }

  const body = source.replace(
    /<script type="application\/json"[\s\S]*?<\/script>/g,
    "",
  );
  for (const [label, pattern] of [
    ["undefined", />\s*undefined\s*</g],
    ["NaN", />\s*NaN\s*</g],
    ["[object Object]", /\[object Object\]/g],
    ["unrendered interpolation", /\$\{/g],
  ]) {
    if (pattern.test(body)) problems.push(`${page}: leaked token "${label}"`);
  }
}

for (const required of [
  "sitemap.xml",
  "robots.txt",
  "404.html",
  "api/meta.json",
  "evidence/artifact.json",
  "evidence/application.json",
  "data/notes-electron.zip",
  "assets/site.css",
  "assets/site.js",
  "assets/explore.js",
  "assets/favicon.svg",
]) {
  if (!(await exists(join(dist, required))))
    problems.push(`missing required file: ${required}`);
}

if (problems.length > 0) {
  console.error(`site check failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `site check passed · ${pages.size} pages · links, metadata and required files verified`,
);
