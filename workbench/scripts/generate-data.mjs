#!/usr/bin/env node
/**
 * Build the Workbench data snapshot from this checkout.
 *
 * The Workbench never invents an inventory: tool contracts, CLI commands,
 * providers and setup clients are projected from REA's own generated catalogs,
 * and documentation facts come from the Markdown sources in `docs/` and the
 * root README. Run this after `npm run build` (or `npm run docs:generate`)
 * whenever those sources change.
 *
 *   node workbench/scripts/generate-data.mjs
 *   node workbench/scripts/generate-data.mjs --check
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(here, "..", "data");
const checkOnly = process.argv.includes("--check");
const lineCountCache = new Map();

const DOC_AREAS = [
  {
    id: "start",
    title: "Start here",
    summary: "Installation, first commands and the shape of the product.",
    slugs: ["installation", "cli", "index", "roadmap", "migration-6.2"],
  },
  {
    id: "agent",
    title: "Agent and MCP",
    summary: "Contracts, guided prompts and client behaviour.",
    slugs: [
      "mcp-contracts",
      "mcp-prompts",
      "client-configuration",
      "client-verification",
      "tool-design",
    ],
  },
  {
    id: "native",
    title: "Native binaries",
    summary: "Provider semantics, formats and native investigation flows.",
    slugs: [
      "native-investigation",
      "ghidra-provider",
      "ida-provider",
      "ghidra-dos",
      "ghidra-mips",
      "ghidra-psp",
      "ghidra-riscv",
      "ghidra-nativeaot",
      "raw-binary",
      "windows-ghidra-p0",
      "binary-diagnostics",
      "recorded-crashes",
      "go-binaries",
    ],
  },
  {
    id: "javascript",
    title: "JavaScript, Electron and web",
    summary: "Static reconstruction, runtime attribution and captures.",
    slugs: [
      "javascript-artifact-reconstruction",
      "javascript-application-graph",
      "javascript-application-workflows",
      "javascript-recovery",
      "javascript-runtime-observation",
      "javascript-runtime-reconciliation",
      "electron-observation",
      "browser-observation",
      "browser-scenario-contract",
      "web-runtime",
      "web-source-location",
      "website-module-trace",
      "website-script-export",
      "web-network-captures",
      "http3-capture-lab",
    ],
  },
  {
    id: "artifacts",
    title: "Packages and artifacts",
    summary:
      "Managed code, Android, Apple, firmware, WASM, EVM, SQLite and signals.",
    slugs: [
      "managed-code-analysis",
      "android-analysis",
      "apktool-resource-analysis",
      "adb-device-analysis",
      "jeb-analysis",
      "flutter-analysis",
      "harmony-analysis",
      "apple-application-analysis",
      "firmware-analysis",
      "wasm-artifacts",
      "evm-bytecode",
      "sqlite-databases",
      "packet-captures",
      "pcap-analysis",
      "signal-recordings",
      "process-capture",
      "frida-instrumentation",
    ],
  },
  {
    id: "workflow",
    title: "Evidence workflow",
    summary: "Obligation ledgers, readiness and reconstruction checks.",
    slugs: [
      "reconstruction-obligation-ledgers",
      "reconstruction-readiness",
      "testing",
    ],
  },
];

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};
const digest = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 16);
const clamp = (text, max) => {
  const value = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

const packageJson = await readJson(join(root, "package.json"));
const toolCatalogPath = join(root, ".cache/mcp-tool-catalog.json");
const productPath = join(root, "docs/public/product-catalog.json");

for (const [path, command] of [
  [toolCatalogPath, "npm run artifacts:mcp-catalog"],
  [productPath, "npm run artifacts:product-catalog"],
]) {
  if (await exists(path)) continue;
  if (checkOnly) {
    console.error(`Missing ${relative(root, path)}. Run ${command}.`);
    process.exit(1);
  }
  console.log(`Generating ${relative(root, path)} …`);
  await run("npm", ["run", command.split(" ").slice(2).join(" ")], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  });
}

const toolCatalog = await readJson(toolCatalogPath);
const product = await readJson(productPath);
const git = await gitFacts();

/** Dereference the local `$defs` used by REA's advertised input schemas. */
const makeResolver = (schema) => {
  const resolve = (node, seen = new Set()) => {
    if (node === null || typeof node !== "object") return node;
    if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/")) {
      const key = node.$ref.slice("#/$defs/".length);
      if (seen.has(key)) return {};
      const target = schema.$defs?.[key];
      if (target === undefined) return {};
      return resolve(target, new Set([...seen, key]));
    }
    return node;
  };
  return resolve;
};

const describeType = (node) => {
  if (node === null || typeof node !== "object") return "unknown";
  if (node.type === "array") return `array<${describeType(node.items ?? {})}>`;
  if (Array.isArray(node.enum))
    return node.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (Array.isArray(node.anyOf))
    return node.anyOf.map((entry) => describeType(entry)).join(" | ");
  if (Array.isArray(node.oneOf))
    return node.oneOf.map((entry) => describeType(entry)).join(" | ");
  if (node.type === "object" && node.additionalProperties) return "object";
  return typeof node.type === "string" ? node.type : "unknown";
};

const projectParameters = (inputSchema) => {
  const resolve = makeResolver(inputSchema);
  const required = new Set(inputSchema?.required ?? []);
  const properties = inputSchema?.properties ?? {};
  return Object.entries(properties).map(([name, raw]) => {
    const node = resolve(raw) ?? {};
    const composed = node.description ?? raw?.description ?? "";
    return {
      name,
      type: describeType(node),
      required: required.has(name),
      description: clamp(composed, 320),
      default: node.default === undefined ? null : node.default,
    };
  });
};

const projectOutput = (outputSchema) => {
  const normalized = outputSchema?.properties?.normalized_result;
  if (normalized === undefined) return null;
  const resolve = makeResolver(outputSchema);
  const node = resolve(normalized) ?? {};
  return {
    kind: "evidence",
    fields: Object.keys(node.properties ?? {}).sort(),
  };
};

const tools = toolCatalog.catalog.map((tool) => {
  const effects = Object.entries(tool.effects ?? {})
    .filter(([, active]) => active === true)
    .map(([name]) => name);
  const description = clamp(tool.description, 1400);
  return {
    name: tool.name,
    title: tool.title,
    kind: tool.kind,
    description,
    descriptionTruncated:
      description.length !== clamp(tool.description, Infinity).length,
    session: tool.requiresSession === true,
    annotations: {
      readOnly: tool.annotations?.readOnlyHint === true,
      destructive: tool.annotations?.destructiveHint === true,
      idempotent: tool.annotations?.idempotentHint === true,
      openWorld: tool.annotations?.openWorldHint === true,
    },
    effects,
    parameters: projectParameters(tool.inputSchema),
    output: projectOutput(tool.outputSchema),
  };
});

const kindCounts = {};
for (const tool of tools)
  kindCounts[tool.kind] = (kindCounts[tool.kind] ?? 0) + 1;

const toolsSnapshot = {
  generatedFrom: ".cache/mcp-tool-catalog.json",
  package: product.package,
  checkout: git,
  total: tools.length,
  kinds: Object.entries(kindCounts)
    .map(([kind, count]) => ({ kind, count }))
    .sort((left, right) => right.count - left.count),
  families: product.tools.families.map((family) => ({
    id: family.id,
    surface: family.surface,
    count: family.count,
  })),
  tools,
};

/* ---------------------------------------------------------------- CLI facts */

const cliHelp = await runCliHelp();
const cliDescriptions = parseCliDescriptions(cliHelp);
const cliCommands = product.cli.commands.map((name) => ({
  name,
  description: cliDescriptions.get(name) ?? "",
  aliases: product.cli.aliases
    .filter((alias) => alias.target === name)
    .map((alias) => alias.name),
}));

const cliSnapshot = {
  generatedFrom: "product-catalog.json + `rea --help`",
  primaryCount: product.cli.primary_count,
  aliases: product.cli.aliases,
  commands: cliCommands,
};

/* ------------------------------------------------------------------- docs */

const docFiles = (await readdir(join(root, "docs"))).filter((name) =>
  name.endsWith(".md"),
);
const docs = [];
for (const name of docFiles.sort()) {
  const slug = name.replace(/\.md$/, "");
  const text = await readFile(join(root, "docs", name), "utf8");
  if (slug === "index" || slug === "releasing") continue;
  const lines = text.split("\n");
  const title = (lines.find((line) => line.startsWith("# ")) ?? `# ${slug}`)
    .replace(/^# /, "")
    .trim();
  const summary = firstParagraph(lines);
  const headings = lines
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^## /, "").trim())
    .filter((heading) => !heading.startsWith("<a"));
  docs.push({
    slug,
    title,
    summary,
    headings,
    words: text.split(/\s+/).filter(Boolean).length,
    path: `docs/${name}`,
    url: `${git.repository}/blob/${git.branch}/docs/${name}`,
  });
}

const readme = await readFile(join(root, "README.md"), "utf8");
const targets = parseTargets(readme, docs);
const faq = parseFaq(readme);

const docsSnapshot = {
  generatedFrom: "docs/*.md + README.md",
  counts: {
    documents: docs.length,
    words: docs.reduce((total, doc) => total + doc.words, 0),
  },
  areas: docAreas(docs),
  docs,
  targets,
  faq,
};

/* -------------------------------------------------------------- repo facts */

const repoSnapshot = await repoFacts();

/* ---------------------------------------------------------------- prompts */

const promptsDoc = await readFile(join(root, "docs/mcp-prompts.md"), "utf8");
const prompts = parsePromptTable(promptsDoc);

/* ------------------------------------------------------------------- write */

const datasets = {
  "tools.json": toolsSnapshot,
  "cli.json": cliSnapshot,
  "product.json": product,
  "docs.json": docsSnapshot,
  "repo.json": repoSnapshot,
  "prompts.json": { generatedFrom: "docs/mcp-prompts.md", prompts },
};

await mkdir(outDir, { recursive: true });
const sourceList = [
  ".cache/mcp-tool-catalog.json",
  "docs/public/product-catalog.json",
  "README.md",
  "docs/mcp-prompts.md",
  "package.json",
];
let newest = 0;
for (const source of sourceList) {
  const stats = await stat(join(root, source)).catch(() => null);
  if (stats !== null && stats.mtimeMs > newest) newest = stats.mtimeMs;
}
const manifest = {
  // Derived from the newest input file so `--check` is deterministic.
  generatedAt: new Date(newest || Date.now()).toISOString(),
  checkout: git,
  package: { name: packageJson.name, version: packageJson.version },
  sources: {},
  datasets: {},
};
let drifted = 0;
for (const [name, value] of Object.entries(datasets)) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const bytes = Buffer.byteLength(serialized);
  manifest.datasets[name] = { bytes, sha256: digest(serialized) };
  const path = join(outDir, name);
  if (checkOnly) {
    const current = await readFile(path, "utf8").catch(() => "");
    if (digest(current) !== digest(serialized)) {
      console.error(`drifted: workbench/data/${name}`);
      drifted += 1;
    }
  } else {
    await writeFile(path, serialized);
  }
}
for (const source of sourceList) {
  const text = await readFile(join(root, source), "utf8").catch(() => "");
  manifest.sources[source] = digest(text);
}
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
if (checkOnly) {
  const current = await readFile(join(outDir, "manifest.json"), "utf8").catch(
    () => "",
  );
  if (digest(current) !== digest(manifestText)) {
    console.error("drifted: workbench/data/manifest.json");
    drifted += 1;
  }
  if (drifted > 0) process.exit(1);
  console.log("Workbench data is current.");
} else {
  await writeFile(join(outDir, "manifest.json"), manifestText);
  console.log(
    `Wrote ${Object.keys(datasets).length} datasets to workbench/data ` +
      `(${tools.length} tools, ${cliCommands.length} CLI commands, ` +
      `${docs.length} documents).`,
  );
}

/* ------------------------------------------------------------- projections */

function firstParagraph(lines) {
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "" || line.startsWith("#") || line.startsWith("|")) continue;
    if (line.startsWith(">") || line.startsWith("```")) continue;
    const collected = [line];
    for (let next = index + 1; next < lines.length; next += 1) {
      const candidate = lines[next].trim();
      if (candidate === "" || candidate.startsWith("#")) break;
      if (candidate.startsWith("|") || candidate.startsWith("```")) break;
      collected.push(candidate);
      if (collected.join(" ").length > 220) break;
    }
    return clamp(stripMarkdown(collected.join(" ")), 260);
  }
  return "";
}

function stripMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[_*]([^_*]+)[_*]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTargets(text, docIndex) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith("| Target"));
  if (start === -1) return [];
  const rows = [];
  for (let index = start + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) break;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 3) continue;
    const links = [...cells[2].matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(
      ([, label, href]) => ({
        label,
        href: href.startsWith("docs/")
          ? `#/docs?doc=${href.replace(/^docs\//, "").replace(/\.md(#.*)?$/, "")}`
          : href,
      }),
    );
    if (links.length === 0) {
      const doc = docIndex.find((entry) =>
        cells[2].toLowerCase().includes(entry.title.toLowerCase()),
      );
      if (doc !== undefined)
        links.push({ label: doc.title, href: `#/docs?doc=${doc.slug}` });
    }
    rows.push({
      target: cells[0],
      returns: stripMarkdown(cells[1]),
      requirements: stripMarkdown(cells[2]),
      links,
    });
  }
  return rows;
}

function parseFaq(text) {
  const entries = [];
  const pattern =
    /<details>\s*<summary><strong>([\s\S]*?)<\/strong><\/summary>([\s\S]*?)<\/details>/g;
  for (const match of text.matchAll(pattern)) {
    const answer = stripMarkdown(match[2]).replace(/\s+/g, " ").trim();
    if (answer === "") continue;
    entries.push({ question: stripMarkdown(match[1]), answer });
  }
  return entries;
}

function parsePromptTable(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith("| Prompt"));
  if (start === -1) return [];
  const prompts = [];
  for (let index = start + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) break;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    prompts.push({
      name: cells[0].replace(/`/g, ""),
      purpose: stripMarkdown(cells[1]),
    });
  }
  return prompts;
}

async function runCliHelp() {
  const { stdout } = await run(
    process.execPath,
    ["scripts/rea.mjs", "--help"],
    {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  return stdout;
}

function parseCliDescriptions(help) {
  const descriptions = new Map();
  for (const line of help.split("\n")) {
    const match = /^ {2}([a-z0-9][a-z0-9-]*)\s{2,}(.+)$/.exec(line);
    if (match === null) continue;
    if (match[1] === "Usage") continue;
    descriptions.set(match[1], match[2].trim());
  }
  return descriptions;
}

async function gitFacts() {
  const attempt = async (args, fallback) => {
    try {
      const { stdout } = await run("git", args, { cwd: root });
      return stdout.trim();
    } catch {
      return fallback;
    }
  };
  const branch = await attempt(["rev-parse", "--abbrev-ref", "HEAD"], "main");
  const commit = await attempt(["rev-parse", "--short", "HEAD"], "unknown");
  const remote = await attempt(
    ["config", "--get", "remote.origin.url"],
    "https://github.com/morluto/rea.git",
  );
  const repository = remote
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");
  return { branch, commit, remote, repository };
}

async function repoFacts() {
  const modules = [];
  for (const name of await readdir(join(root, "src"))) {
    const dir = join(root, "src", name);
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    if (
      !entries.some(
        (entry) => entry.isDirectory() || entry.name.endsWith(".ts"),
      )
    )
      continue;
    const files = await walk(dir, (file) => file.endsWith(".ts"));
    const production = files.filter((file) => !file.endsWith(".test.ts"));
    const tests = files.filter((file) => file.endsWith(".test.ts"));
    let loc = 0;
    let testLoc = 0;
    for (const file of production) loc += await countLines(file);
    for (const file of tests) testLoc += await countLines(file);
    modules.push({
      name,
      files: production.length,
      tests: tests.length,
      loc,
      testLoc,
    });
  }
  modules.sort((left, right) => right.loc - left.loc);

  const testFiles = await walk(join(root, "tests"), (file) =>
    file.endsWith(".ts"),
  );
  let testLines = 0;
  for (const file of testFiles) testLines += await countLines(file);
  const scriptFiles = await walk(join(root, "scripts"), (file) =>
    /\.(mjs|py|ts|sh)$/.test(file),
  );
  const bridgeFiles = await walk(join(root, "bridge"), (file) =>
    /\.(py|java|swift|cjs)$/.test(file),
  );
  const docFilesInDocs = await walk(join(root, "docs"), (file) =>
    file.endsWith(".md"),
  );

  return {
    generatedFrom: "src/ tests/ scripts/ bridge/ docs/ package.json",
    package: {
      name: packageJson.name,
      version: packageJson.version,
      license: packageJson.license,
      engines: packageJson.engines,
      bin: packageJson.bin,
    },
    checkout: git,
    totals: {
      modules: modules.length,
      productionFiles: modules.reduce((sum, item) => sum + item.files, 0),
      productionLines: modules.reduce((sum, item) => sum + item.loc, 0),
      testFiles: testFiles.length,
      testLines,
      scripts: scriptFiles.length,
      bridgeSources: bridgeFiles.length,
      documents: docFilesInDocs.length,
    },
    modules,
    entryPoints: [
      {
        path: "scripts/rea.mjs",
        role: "Published bin entry (`rea`, `rea-agents`)",
      },
      { path: "src/main.ts", role: "CLI and MCP mode dispatch" },
      { path: "src/server/createServer.ts", role: "MCP stdio server wiring" },
      {
        path: "src/contracts/toolContracts.ts",
        role: "Ordered MCP tool inventory",
      },
      {
        path: "src/domain/evidence.ts",
        role: "Canonical Evidence record",
      },
      {
        path: "scripts/lib/product-catalog.mjs",
        role: "Generated product catalog used here",
      },
      {
        path: "website/public/index.html",
        role: "Public website (separate from this console)",
      },
      {
        path: "docs/.vitepress/config.ts",
        role: "VitePress documentation site",
      },
    ],
    scripts: Object.entries(packageJson.scripts ?? {})
      .map(([name, command]) => ({ name, command }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

async function walk(dir, predicate) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__snapshots__")
        continue;
      results.push(...(await walk(path, predicate)));
    } else if (predicate(path)) {
      results.push(path);
    }
  }
  return results;
}

async function countLines(path) {
  if (lineCountCache.has(path)) return lineCountCache.get(path);
  const text = await readFile(path, "utf8").catch(() => "");
  const lines = text === "" ? 0 : text.split("\n").length;
  lineCountCache.set(path, lines);
  return lines;
}

function docAreas(docs) {
  const slugs = new Set(docs.map((doc) => doc.slug));
  const assigned = new Set(DOC_AREAS.flatMap((area) => area.slugs));
  const rest = docs
    .filter((doc) => !assigned.has(doc.slug))
    .map((doc) => doc.slug);
  return DOC_AREAS.map((area) => ({
    id: area.id,
    title: area.title,
    summary: area.summary,
    slugs: area.slugs.filter((slug) => slugs.has(slug)),
    trailing: area.id === DOC_AREAS.at(-1).id ? rest : [],
  }));
}
