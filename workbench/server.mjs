#!/usr/bin/env node
/**
 * REA Workbench — a local operator console for this REA checkout.
 *
 * The server has one job: expose the repository's own facts and let a person
 * run real REA workflows without a terminal. It shells out to the published CLI
 * entry (`scripts/rea.mjs`) for analyses, provider listings and diagnostics,
 * and serves the generated catalogs captured in `workbench/data`.
 *
 *   node workbench/server.mjs            # http://localhost:5180
 *   PORT=6000 node workbench/server.mjs
 *
 * Everything is local: no telemetry, no remote API, no credentials.
 */
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { promisify } from "node:util";

import {
  ANALYSIS_COMMAND,
  ARTIFACT_COMMAND,
  parseDiagnostic,
  projectAnalysis,
  projectArtifact,
  runRea,
} from "./lib/analyse.mjs";
import { createZip, extractZip } from "./lib/zip.mjs";

const run = promisify(execFile);
const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..");
const publicDir = join(here, "public");
const dataDir = join(here, "data");
const port = Number(process.env.PORT ?? 5180);
const host = process.env.HOST ?? "0.0.0.0";

const UPLOAD_LIMIT =
  Number(process.env.REA_WORKBENCH_UPLOAD_MB ?? 64) * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = Number(
  process.env.REA_WORKBENCH_ANALYSIS_TIMEOUT_MS ?? 150_000,
);
const MAX_CONCURRENT_ANALYSES = 2;

/**
 * Two real CLI workflows share one endpoint. Both are static: neither executes
 * the target. `application` reconstructs JavaScript/Electron code; `artifact`
 * inventories any package the safe artifact graph provider recognizes.
 */
const WORKFLOWS = {
  application: {
    id: "application",
    label: "App reconstruction",
    command: ANALYSIS_COMMAND,
    project: projectAnalysis,
    accepts: "a directory, an .asar, or a single .js/.json file",
  },
  artifact: {
    id: "artifact",
    label: "Artifact inventory",
    command: ARTIFACT_COMMAND,
    project: projectArtifact,
    accepts: "a ZIP, .asar, .apk, .dmg, .app, binary, or any package file",
  },
};

const workflowFor = (value) =>
  WORKFLOWS[value] === undefined ? WORKFLOWS.application : WORKFLOWS[value];
const EVIDENCE_RETENTION_MS = 30 * 60 * 1000;

const samples = [
  {
    id: "notes-electron",
    name: "Notes — Electron sample",
    path: "website/public/examples/notes-electron",
    description:
      "Desktop notes app with a main process, a preload bridge and one IPC channel.",
  },
  {
    id: "notes-web",
    name: "Notes — web sample",
    path: "website/public/examples/notes-web",
    description:
      "The same notes UI as a static web page with an export script.",
  },
];

const state = {
  data: {},
  analyses: new Map(),
  running: 0,
  readiness: { at: 0, payload: null },
  cliHelp: new Map(),
  version: "unknown",
  engines: null,
  checkout: { branch: "unknown", commit: "unknown" },
};

/* ------------------------------------------------------------------ startup */

await loadData();
await loadPackageFacts();
const server = createServer((request, response) => {
  const started = Date.now();
  response.gzipOk = /gzip/.test(
    String(request.headers["accept-encoding"] ?? ""),
  );
  handle(request, response)
    .catch((error) => {
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) console.error("request failed", error);
      sendJson(response, status, {
        error: {
          message:
            status >= 500
              ? "The Workbench could not complete this request."
              : String(error.message),
          detail: status >= 500 ? String(error?.message ?? error) : undefined,
        },
      });
    })
    .finally(() => {
      const stamp = new Date().toISOString().slice(11, 19);
      console.log(
        `${stamp} ${request.method} ${request.url} → ${response.statusCode} (${Date.now() - started}ms)`,
      );
    });
});

server.listen(port, host, () => {
  console.log(
    `REA Workbench ${state.version} listening on http://${host}:${port}`,
  );
  console.log(`checkout ${state.checkout.branch}@${state.checkout.commit}`);
  console.log(
    `${state.data.tools?.total ?? 0} MCP tools · ${state.data.cli?.primaryCount ?? 0} CLI commands · ${state.data.docs?.docs?.length ?? 0} documents`,
  );
});

async function loadData() {
  const names = [
    "tools",
    "cli",
    "docs",
    "repo",
    "prompts",
    "product",
    "manifest",
  ];
  for (const name of names) {
    const text = await readFile(join(dataDir, `${name}.json`), "utf8").catch(
      (error) => {
        if (error.code !== "ENOENT") throw error;
        console.error(
          `Missing workbench/data/${name}.json. Run: node workbench/scripts/generate-data.mjs`,
        );
        process.exit(1);
      },
    );
    state.data[name] = JSON.parse(text);
  }
}

async function loadPackageFacts() {
  const packageJson = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  );
  state.version = packageJson.version;
  state.engines = packageJson.engines ?? null;
  try {
    const [{ stdout: branch }, { stdout: commit }] = await Promise.all([
      run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root }),
      run("git", ["rev-parse", "--short", "HEAD"], { cwd: root }),
    ]);
    state.checkout = { branch: branch.trim(), commit: commit.trim() };
  } catch {
    state.checkout = { branch: "unknown", commit: "unknown" };
  }
  state.samples = [];
  for (const sample of samples) {
    const exists = await access(join(root, sample.path))
      .then(() => true)
      .catch(() => false);
    if (exists)
      state.samples.push({
        id: sample.id,
        name: sample.name,
        description: sample.description,
        path: sample.path,
        files: (await listFiles(join(root, sample.path))).length,
        command: `${ANALYSIS_COMMAND} ${sample.path}`,
      });
  }
}

/* ------------------------------------------------------------------ routing */

async function handle(request, response) {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "local"}`,
  );
  const path = url.pathname;

  if (path === "/api/health") {
    return sendJson(response, 200, { ok: true, uptime: process.uptime() });
  }
  if (path === "/api/meta") return sendJson(response, 200, metaPayload());
  if (path.startsWith("/api/data/"))
    return sendJson(response, 200, dataset(path.slice("/api/data/".length)));
  if (path === "/api/readiness" && request.method === "GET")
    return sendJson(response, 200, await readiness());
  if (path.startsWith("/api/cli/") && path.endsWith("/help"))
    return sendJson(response, 200, await cliHelp(path.slice(9, -5)));
  if (path === "/api/analyze" && request.method === "POST")
    return sendJson(response, 200, await analyse(request));
  const evidenceMatch = /^\/api\/analyses\/([\w-]+)\/evidence$/.exec(path);
  if (evidenceMatch !== null && request.method === "GET")
    return downloadEvidence(response, evidenceMatch[1]);
  if (path.startsWith("/api/")) {
    return sendJson(response, 404, {
      error: { message: `Unknown API route: ${path}` },
    });
  }
  return serveStatic(request, response, path);
}

function metaPayload() {
  const tools = state.data.tools ?? {};
  return {
    rea: {
      version: state.version,
      engines: state.engines,
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      checkout: state.checkout,
    },
    counts: {
      tools: tools.total ?? 0,
      cliCommands: state.data.cli?.primaryCount ?? 0,
      providers: state.data.product?.providers?.length ?? 0,
      documents: state.data.docs?.docs?.length ?? 0,
      prompts: state.data.prompts?.prompts?.length ?? 0,
      setupClients: state.data.product?.setup_clients?.length ?? 0,
      scripts: state.data.repo?.scripts?.length ?? 0,
    },
    families: tools.families ?? [],
    kinds: tools.kinds ?? [],
    generatedAt: state.data.manifest?.generatedAt ?? null,
    datasetBytes: Object.values(state.data.manifest?.datasets ?? {}).reduce(
      (sum, entry) => sum + (entry.bytes ?? 0),
      0,
    ),
    samples: state.samples ?? [],
    workflows: Object.values(WORKFLOWS).map(
      ({ id, label, command, accepts }) => ({ id, label, command, accepts }),
    ),
    limits: {
      uploadMb: Math.round(UPLOAD_LIMIT / (1024 * 1024)),
      analysisTimeoutMs: ANALYSIS_TIMEOUT_MS,
      evidenceRetentionMinutes: EVIDENCE_RETENTION_MS / 60000,
    },
    capabilities: {
      pathAnalysis: process.env.REA_WORKBENCH_ALLOW_PATHS !== "0",
      uploads: true,
    },
  };
}

function dataset(name) {
  const value = state.data[name];
  if (value === undefined) throw new HttpError(404, `Unknown dataset: ${name}`);
  return value;
}

/* ---------------------------------------------------------------- readiness */

async function readiness() {
  const now = Date.now();
  if (state.readiness.payload !== null && now - state.readiness.at < 60_000)
    return state.readiness.payload;
  const [doctor, providers] = await Promise.all([
    runRea(root, ["doctor", "--json"], { timeoutMs: 90_000 }),
    runRea(root, ["providers", "--json"], { timeoutMs: 90_000 }),
  ]);
  const report = safeJson(doctor.stdout);
  const providerReport = safeJson(providers.stdout);
  const payload = {
    at: new Date().toISOString(),
    doctor: {
      ok: doctor.ok,
      durationMs: doctor.durationMs,
      report: report ?? {
        healthy: false,
        environment_healthy: false,
        scope_checks: [],
        informational_checks: [],
        error: doctor.stderr.slice(0, 2000),
      },
    },
    providers: {
      ok: providers.ok,
      durationMs: providers.durationMs,
      report: providerReport ?? { open: false, capabilities: [] },
    },
  };
  state.readiness = { at: now, payload };
  return payload;
}

/* --------------------------------------------------------------------- CLI */

async function cliHelp(rawName) {
  const name = decodeURIComponent(rawName);
  const known = new Set(
    (state.data.cli?.commands ?? []).map((entry) => entry.name),
  );
  if (!known.has(name))
    throw new HttpError(404, "That command is not in this checkout's CLI.");
  if (state.cliHelp.has(name)) return state.cliHelp.get(name);
  const help = await runRea(root, [name, "--help"], { timeoutMs: 60_000 });
  const payload = {
    name,
    help: help.stdout.trim(),
    ok: help.ok,
  };
  state.cliHelp.set(name, payload);
  return payload;
}

/* ---------------------------------------------------------------- analyses */

async function analyse(request) {
  if (state.running >= MAX_CONCURRENT_ANALYSES)
    throw new HttpError(
      429,
      "Two analyses are already running. Wait for one to finish and retry.",
    );
  const contentType = String(request.headers["content-type"] ?? "");
  const isBinary = !contentType.includes("application/json");
  state.running += 1;
  try {
    if (isBinary) return await analyseUpload(request);
    const body = await readJsonBody(request);
    return await analyseTarget(body);
  } finally {
    state.running -= 1;
  }
}

async function analyseTarget(body) {
  const mode = body?.mode ?? "sample";
  const workflow = workflowFor(body?.workflow);
  if (mode === "sample") {
    const sample =
      (state.samples ?? []).find((entry) => entry.id === body.sample) ??
      state.samples?.[0];
    if (sample === undefined)
      throw new HttpError(404, "The bundled sample is not present.");
    if (workflow.id === "artifact") {
      const workDir = await mkdtemp(join(tmpdir(), "rea-workbench-"));
      const zipPath = join(workDir, "notes-electron.zip");
      await writeFile(
        zipPath,
        await zipDirectory(join(root, sample.path), sample.id),
      );
      return executeAnalysis({
        workflow,
        targetPath: zipPath,
        displayPath: `<sample>/${sample.id}.zip`,
        target: {
          name: `${sample.id}.zip`,
          kind: "sample",
          path: `<sample>/${sample.id}.zip`,
          files: sample.files,
        },
        cleanup: () => rm(workDir, { recursive: true, force: true }),
      });
    }
    const targetPath = join(root, sample.path);
    return executeAnalysis({
      workflow,
      targetPath,
      target: {
        name: sample.name,
        kind: "sample",
        path: sample.path,
        files: sample.files,
      },
      cleanup: async () => {},
    });
  }
  if (mode === "path") {
    if (process.env.REA_WORKBENCH_ALLOW_PATHS === "0")
      throw new HttpError(403, "Path analysis is disabled by configuration.");
    const requested = typeof body.path === "string" ? body.path.trim() : "";
    if (requested === "")
      throw new HttpError(400, "Provide an absolute path to analyse.");
    if (!isAbsolutePath(requested))
      throw new HttpError(400, "The path must be absolute.");
    const stats = await stat(requested).catch(() => null);
    if (stats === null)
      throw new HttpError(404, `Nothing exists at ${requested}`);
    return executeAnalysis({
      workflow,
      targetPath: requested,
      target: {
        name: requested.split(/[\\/]/).filter(Boolean).at(-1) ?? "target",
        kind: "path",
        path: redactPath(requested),
        files: stats.isDirectory() ? await countFiles(requested) : null,
      },
      cleanup: async () => {},
    });
  }
  throw new HttpError(400, `Unknown analysis mode: ${mode}`);
}

async function analyseUpload(request) {
  const workflow = workflowFor(request.headers["x-workflow"]);
  const filename = sanitizeFilename(
    String(request.headers["x-filename"] ?? "upload.bin"),
  );
  const buffer = await readBinaryBody(request);
  const workDir = await mkdtemp(join(tmpdir(), "rea-workbench-"));
  const cleanup = async () => {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  };
  try {
    let targetPath;
    let files = null;
    const lower = filename.toLowerCase();
    if (workflow.id === "artifact") {
      // The artifact provider unpacks containers itself: hand it the bytes.
      await mkdir(join(workDir, "upload"), { recursive: true });
      targetPath = join(workDir, "upload", filename);
      await writeFile(targetPath, buffer);
      return await executeAnalysis({
        workflow,
        targetPath,
        displayPath: `<upload>/${filename}`,
        target: {
          name: filename,
          kind: "upload",
          path: filename,
          files: null,
          bytes: buffer.length,
        },
        cleanup,
        sanitizeRoots: [workDir],
        keepWorkDir: false,
      });
    }
    if (lower.endsWith(".zip")) {
      const written = await extractZip(buffer, join(workDir, "app"));
      if (written.length === 0)
        throw new HttpError(400, "The archive contains no files.");
      targetPath = join(workDir, "app");
      files = written.length;
    } else if (lower.endsWith(".asar")) {
      await mkdir(join(workDir, "app"), { recursive: true });
      targetPath = join(workDir, "app", filename);
      await writeFile(targetPath, buffer);
    } else if (/\.(js|mjs|cjs|json)$/.test(lower)) {
      await mkdir(join(workDir, "app"), { recursive: true });
      targetPath = join(workDir, "app", filename);
      await writeFile(targetPath, buffer);
      files = 1;
    } else {
      throw new HttpError(
        400,
        "Upload a ZIP of an extracted app, an .asar, or a single .js/.json file.",
      );
    }
    return await executeAnalysis({
      workflow,
      targetPath,
      displayPath: lower.endsWith(".asar")
        ? `<upload>/${filename}`
        : "<upload>/app",
      target: {
        name: filename,
        kind: "upload",
        path: filename,
        files,
        bytes: buffer.length,
      },
      cleanup,
      sanitizeRoots: [workDir],
      keepWorkDir: false,
    });
  } finally {
    await cleanup();
  }
}

async function executeAnalysis({
  targetPath,
  target,
  cleanup,
  sanitizeRoots = [],
  keepWorkDir = true,
  displayPath = null,
  workflow = WORKFLOWS.application,
}) {
  const args = [workflow.command, targetPath, "--json"];
  const result = await runRea(root, args, { timeoutMs: ANALYSIS_TIMEOUT_MS });
  const command = `node scripts/rea.mjs ${workflow.command} ${
    displayPath ?? redactPath(targetPath)
  } --json`;
  const sanitize = makeSanitizer([...sanitizeRoots, tmpdir()]);
  try {
    if (!result.ok) {
      const diagnostic = parseDiagnostic(result.stdout);
      return {
        ok: false,
        command,
        durationMs: result.durationMs,
        target,
        error:
          diagnostic === null
            ? {
                message: result.timedOut
                  ? "The analysis exceeded its deadline."
                  : "REA returned an error.",
                detail: sanitize(
                  (result.stderr || result.stdout).slice(-4000) || "No output.",
                ),
              }
            : {
                message: sanitize(
                  String(diagnostic.error ?? "Analysis failed"),
                ),
                code: diagnostic.code ?? null,
                category: diagnostic.category ?? null,
                detail: sanitize(String(diagnostic.message ?? "")),
                issues: (diagnostic.details?.issues ?? []).map((issue) => ({
                  path: issue.path ?? [],
                  reason: issue.reason ?? null,
                  message: sanitize(String(issue.message ?? "")),
                })),
                remediation: diagnostic.remediation ?? null,
              },
      };
    }
    const evidence = JSON.parse(result.stdout);
    const projection = workflow.project({
      evidence,
      raw: result.stdout,
      target,
      command,
      durationMs: result.durationMs,
      sanitize,
    });
    const id = randomUUID();
    state.analyses.set(id, {
      raw: result.stdout,
      createdAt: Date.now(),
      name: sanitizeFilename(target.name),
      evidenceId: evidence.evidence_id,
    });
    pruneAnalyses();
    return {
      ok: true,
      analysisId: id,
      evidenceUrl: `/api/analyses/${id}/evidence`,
      stderrTail: sanitize(result.stderr.slice(-1200)),
      command,
      workflow: workflow.id,
      ...projection,
    };
  } finally {
    if (keepWorkDir === false) await cleanup();
  }
}

function downloadEvidence(response, id) {
  const entry = state.analyses.get(id);
  if (entry === undefined)
    throw new HttpError(404, "That Evidence is no longer retained.");
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-disposition": `attachment; filename="rea-${entry.name}-evidence.json"`,
    "content-length": Buffer.byteLength(entry.raw),
    "cache-control": "no-store",
  });
  response.end(entry.raw);
}

function pruneAnalyses() {
  const now = Date.now();
  for (const [id, entry] of state.analyses) {
    if (now - entry.createdAt > EVIDENCE_RETENTION_MS)
      state.analyses.delete(id);
  }
  while (state.analyses.size > 6) {
    const oldest = [...state.analyses.entries()].sort(
      (left, right) => left[1].createdAt - right[1].createdAt,
    )[0];
    state.analyses.delete(oldest[0]);
  }
}

/* ------------------------------------------------------------------ helpers */

function makeSanitizer(roots) {
  const home = process.env.HOME ?? "";
  const strip = [
    ...roots.filter((entry) => typeof entry === "string" && entry.length > 1),
    root,
  ];
  return (value) => {
    if (typeof value !== "string") return value;
    let text = value;
    for (const entry of strip) text = text.split(entry).join("");
    text = text.replace(/\/{2,}/g, "/");
    if (home.length > 1) text = text.split(home).join("~");
    return text;
  };
}

const isAbsolutePath = (path) =>
  path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path);

const sanitizeFilename = (name) =>
  name
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "target";

const redactPath = (path) =>
  path
    .replace(root, ".")
    .replace(process.env.HOME ?? "\u0000", "~")
    .replace(/\/{2,}/g, "/") || "/";

const safeJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** Package a directory into a store-only ZIP for the artifact workflow. */
async function zipDirectory(dir, prefix) {
  const files = await listFiles(dir);
  const entries = [];
  const directories = new Set();
  for (const file of files) {
    const parts = file.slice(dir.length + 1).split(/[\\/]/);
    entries.push({
      path: `${prefix}/${parts.join("/")}`,
      data: await readFile(file),
    });
    for (let depth = 1; depth < parts.length; depth += 1)
      directories.add(parts.slice(0, depth).join("/"));
  }
  const directoryEntries = [...directories]
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({ path: `${prefix}/${path}/`, data: Buffer.alloc(0) }));
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return createZip([...directoryEntries, ...entries]);
}

async function countFiles(dir) {
  return (await listFiles(dir)).length;
}

async function listFiles(dir, depth = 0) {
  if (depth > 12) return [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      results.push(...(await listFiles(path, depth + 1)));
    else results.push(path);
  }
  return results;
}

function readBody(request, limit) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let overflow = false;
    request.on("data", (chunk) => {
      if (overflow) return;
      size += chunk.length;
      if (size > limit) {
        overflow = true;
        rejectBody(
          new HttpError(
            413,
            `Request body exceeds the ${Math.round(limit / (1024 * 1024))} MiB limit.`,
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", rejectBody);
  });
}

const readJsonBody = async (request) => {
  const buffer = await readBody(request, 1024 * 1024);
  if (buffer.length === 0) return {};
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new HttpError(400, "The request body is not valid JSON.");
  }
};

const readBinaryBody = async (request) => {
  const buffer = await readBody(request, UPLOAD_LIMIT);
  if (buffer.length === 0) throw new HttpError(400, "The upload is empty.");
  return buffer;
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* -------------------------------------------------------------------- static */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function serveStatic(request, response, path) {
  const requested = path === "/" ? "/index.html" : path;
  const normalized = normalize(decodeURIComponent(requested)).replace(
    /^(\.\.[\\/])+/,
    "",
  );
  const filePath = join(publicDir, normalized);
  if (!filePath.startsWith(publicDir))
    throw new HttpError(403, "Path escapes the public directory.");
  const fileStat = await stat(filePath).catch(() => null);
  if (fileStat === null || !fileStat.isFile())
    throw new HttpError(404, `Not found: ${requested}`);
  response.writeHead(200, {
    "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
    "content-length": fileStat.size,
    "cache-control": "no-cache",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  if (request.method === "HEAD") return response.end();
  createReadStream(filePath).pipe(response);
}

function sendJson(response, status, payload) {
  if (response.headersSent) return;
  const body = Buffer.from(JSON.stringify(payload));
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  let outgoing = body;
  if (response.gzipOk === true && body.length > 2048) {
    outgoing = gzipSync(body);
    headers["content-encoding"] = "gzip";
    headers.vary = "accept-encoding";
  }
  headers["content-length"] = outgoing.length;
  response.writeHead(status, headers);
  response.end(outgoing);
}

process.on("unhandledRejection", (error) => {
  if (error instanceof HttpError) return;
  console.error("unhandled rejection", error);
});
process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

export { server };
