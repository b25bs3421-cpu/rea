#!/usr/bin/env node
/**
 * Capture the two Evidence records the site ships as fixtures.
 *
 * `site/data/sample-application.json` and `site/data/sample-artifact.json` are
 * produced here by running the real CLI in this checkout; `npm run site:build`
 * only *reads* them. Keeping capture separate makes the site build hermetic and
 * keeps the published pages honest: every figure on the site comes from a real
 * run, not a mock.
 *
 *   node site/scripts/capture-evidence.mjs
 */
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import {
  ANALYSIS_COMMAND,
  ARTIFACT_COMMAND,
  projectAnalysis,
  projectArtifact,
  runRea,
} from "../../workbench/lib/analyse.mjs";
import { createZip } from "../../workbench/lib/zip.mjs";

const root = new URL("../../", import.meta.url).pathname;
const outputDir = join(root, "site", "data");
const sampleDir = join(root, "website", "public", "examples", "notes-electron");

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
};

const zipSample = async (directory, prefix) => {
  const files = await listFiles(directory);
  const directories = new Set();
  const entries = [];
  for (const file of files) {
    const parts = relative(directory, file).split(sep);
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
  return createZip([...directoryEntries, ...entries]);
};

const write = async (name, value) => {
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
  const bytes = (await stat(join(outputDir, name))).size;
  console.log(`wrote site/data/${name} (${(bytes / 1024).toFixed(1)} KiB)`);
};

const run = async ({ command, target, targetLabel, zip }) => {
  const started = Date.now();
  const result = await runRea(root, [command, target, "--json"]);
  if (!result.ok) {
    console.error(result.stdout || result.stderr);
    throw new Error(`${command} failed`);
  }
  return {
    evidence: JSON.parse(result.stdout),
    durationMs: Date.now() - started,
    targetLabel,
    command: `node scripts/rea.mjs ${command} ${targetLabel} --json`,
    zip,
  };
};

const application = await run({
  command: ANALYSIS_COMMAND,
  target: sampleDir,
  targetLabel: "website/public/examples/notes-electron",
});

const artifactZip = await zipSample(sampleDir, "notes-electron");
const artifactPath = join(outputDir, "notes-electron.zip");
await writeFile(artifactPath, artifactZip);

const artifact = await run({
  command: ARTIFACT_COMMAND,
  target: artifactPath,
  targetLabel: "notes-electron.zip",
});

const capturedAt = new Date().toISOString().slice(0, 10);
const sanitize = (value) =>
  String(value).split(root).join("").split("//").join("/").replace(/^\//, "");

await write("sample-application.json", {
  kind: "application",
  capturedAt,
  command: application.command.replace(root, ""),
  durationMs: application.durationMs,
  target: "website/public/examples/notes-electron",
  projection: projectAnalysis({
    evidence: application.evidence,
    raw: "",
    target: { name: "notes-electron", kind: "sample" },
    command: application.command,
    durationMs: application.durationMs,
    sanitize,
  }),
});
await writeFile(
  join(outputDir, "evidence-application.json"),
  JSON.stringify(application.evidence),
);

await write("sample-artifact.json", {
  kind: "artifact",
  capturedAt,
  command: artifact.command.replace(root, ""),
  durationMs: artifact.durationMs,
  target: "notes-electron.zip",
  bytes: artifactZip.length,
  projection: projectArtifact({
    evidence: artifact.evidence,
    raw: "",
    target: { name: "notes-electron.zip", kind: "sample" },
    command: artifact.command,
    durationMs: artifact.durationMs,
    sanitize,
  }),
});
await writeFile(
  join(outputDir, "evidence-artifact.json"),
  JSON.stringify(artifact.evidence),
);
