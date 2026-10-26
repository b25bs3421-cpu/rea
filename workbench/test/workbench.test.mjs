/**
 * Self-tests for the Workbench plumbing. Run with `npm run workbench:test`.
 * These cover the parts that are easy to break and cheap to verify: the ZIP
 * reader/writer used for uploads and the bundled sample, and the two Evidence
 * projectors that turn a CLI document into the shapes the UI renders.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { projectAnalysis, projectArtifact } from "../lib/analyse.mjs";
import {
  createZip,
  extractZip,
  readZipEntries,
  ZipError,
} from "../lib/zip.mjs";

const applicationEvidence = {
  evidence_id: "ev_test_application",
  predicate_type: "rea.javascript-application-analysis",
  operation: "analyze_javascript_application",
  provider: { id: "rea-javascript-application", name: "test", version: "1" },
  subject: {
    name: "example",
    digest: { sha256: "a".repeat(64) },
    format: "directory",
  },
  confidence: "derived",
  authority: "shipped-artifact",
  limitations: ["Synthetic fixture."],
  locations: [{ kind: "artifact-path", path: "/tmp/example" }],
  normalized_result: {
    root_artifact_sha256: "b".repeat(64),
    inventory_manifest_id: "agm_test",
    inventory_graph_sha256: "c".repeat(64),
    integrity_contradictions: [],
    graph: {
      coverage: { status: "complete", truncated: false, omitted_count: 0 },
      nodes: [
        {
          node_id: "node-preload",
          kind: "javascript-asset",
          identity: { sha256: "d".repeat(64) },
          observations: [
            {
              label: "preload.js",
              properties: {
                path: "preload.js",
                bytes: 120,
                file_kind: "javascript",
                parse_status: "complete",
                text_status: "included",
              },
              evidence: {
                location: {
                  value: {
                    kind: "source-range",
                    source: "preload.js",
                    start: { line: 1 },
                  },
                },
              },
            },
          ],
        },
        {
          node_id: "node-bridge",
          kind: "context-bridge-api",
          observations: [
            {
              label: "notes",
              properties: { api_key: "notes", members: ["exportCsv"] },
              evidence: {
                location: {
                  value: {
                    kind: "source-range",
                    source: "preload.js",
                    start: { line: 3 },
                  },
                },
              },
            },
          ],
        },
        {
          node_id: "node-channel",
          kind: "ipc-channel",
          observations: [
            {
              label: "notes:export",
              properties: {
                side: "renderer",
                operation: "invoke",
                resolution: "literal",
              },
            },
            {
              label: "notes:export",
              properties: {
                side: "main",
                operation: "handle",
                resolution: "literal",
              },
            },
          ],
        },
      ],
      edges: [
        {
          source_node_id: "node-preload",
          target_node_id: "node-channel",
          relation: "invokes",
          properties: {
            channel: "notes:export",
            side: "renderer",
            operation: "invoke",
            resolution: "literal",
          },
          evidence: {
            confidence: "high",
            state: "inferred",
            authority: "static-relationship-inference",
          },
        },
      ],
    },
    summary: { ipc: { operations: 1, literal_channels: 1, main_handlers: 1 } },
    statistics: {
      relevant_files: 2,
      parsed_javascript_files: 2,
      visited_ast_nodes: 20,
    },
    limitations: ["Static only."],
    semantic_graph: {
      nodes: [{}, {}],
      relations: [{}],
      fingerprints: [],
      unknowns: [
        {
          family: "object-flow",
          reason: "ambiguous-target",
          detail: "receiver unresolved",
        },
      ],
    },
  },
};

const artifactEvidence = {
  evidence_id: "ev_test_artifact",
  predicate_type: "rea.analysis",
  operation: "inspect_artifact",
  provider: { id: "rea-artifact-graph", name: "test", version: "1" },
  subject: {
    name: "example.zip",
    digest: { sha256: "e".repeat(64) },
    format: "zip",
  },
  confidence: "observed",
  authority: "shipped-artifact",
  limitations: ["Synthetic fixture."],
  locations: [],
  normalized_result: {
    subject: {
      manifest_id: "agm_test",
      root_sha256: "e".repeat(64),
      root_format: "zip",
    },
    substeps: [
      {
        operation: "inventory_artifact",
        status: "completed",
        evidence_id: "ev_substep",
        evidence: {
          normalized_result: {
            manifest: {
              manifest_id: "agm_test",
              root_sha256: "e".repeat(64),
              root_format: "zip",
              graph_sha256: "f".repeat(64),
              node_count: 2,
              edge_count: 1,
              occurrence_count: 2,
            },
            nodes: [
              {
                artifact_id: "art_root",
                format: "zip",
                size: 512,
                content_state: "materialized",
                sha256: "e".repeat(64),
                limitations: [],
              },
              {
                artifact_id: "art_file",
                format: "file",
                size: 42,
                content_state: "embedded",
                sha256: "1".repeat(64),
                limitations: [],
              },
            ],
            occurrences: [
              {
                occurrence_id: "occ_root",
                artifact_id: "art_root",
                logical_path: ".",
                entry_kind: "file",
                hash_status: "verified",
                executable: false,
                encrypted: false,
              },
              {
                occurrence_id: "occ_file",
                artifact_id: "art_file",
                logical_path: "app/main.js",
                entry_kind: "file",
                hash_status: "verified",
                executable: false,
                encrypted: false,
              },
            ],
            edges: [
              {
                edge_id: "edge_1",
                parent_artifact_id: "art_root",
                relation: "contains",
              },
            ],
            integrity_contradictions: [],
            coverage_status: "complete",
          },
        },
      },
    ],
    observations: [{ observation_id: "aio_1", kind: "root-manifest" }],
    hypotheses: [],
    unexplored_branches: [],
    next_probes: [],
    coverage: {
      status: "complete-within-substeps",
      substeps_completed: 1,
      observations_retained: 1,
      observations_omitted: 0,
    },
    limitations: [],
  },
};

test("ZIP round-trip keeps paths, bytes and CRCs", async () => {
  const zip = createZip([
    { path: "app/", data: Buffer.alloc(0) },
    { path: "app/main.js", data: "console.log(1);\n" },
    { path: "app/nested/data.json", data: '{"a":1}' },
  ]);
  const entries = readZipEntries(zip);
  assert.deepEqual(
    entries.map((entry) => entry.path),
    ["app", "app/main.js", "app/nested/data.json"],
  );
  const main = entries.find((entry) => entry.path === "app/main.js");
  assert.equal(main.data.toString("utf8"), "console.log(1);\n");
  assert.equal(entries[0].directory, true);
});

test("ZIP writer output is readable by a strict inflate path", async () => {
  const zip = createZip([{ path: "a.txt", data: "hello" }]);
  const [entry] = readZipEntries(zip);
  assert.equal(entry.data.toString("utf8"), "hello");
});

test("ZIP reader drops traversal and junk paths instead of extracting them", () => {
  const zip = createZip([
    { path: "../escape.txt", data: "x" },
    { path: "/absolute.txt", data: "y" },
    { path: "__MACOSX/._x", data: "z" },
    { path: "app/kept.txt", data: "keep" },
  ]);
  const entries = readZipEntries(zip);
  assert.deepEqual(
    entries.map((entry) => entry.path),
    ["app/kept.txt"],
  );
  assert.ok(!entries.some((entry) => entry.path.includes("..")));
});

test("ZIP reader refuses unsupported compression methods", () => {
  const zip = createZip([{ path: "a.txt", data: Buffer.from("compressed") }]);
  // Claim deflate in both headers without deflating the payload: the reader
  // must surface a ZipError instead of returning garbage.
  const local = zip.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const central = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  zip.writeUInt16LE(9, local + 8);
  zip.writeUInt16LE(9, central + 10);
  assert.throws(
    () => readZipEntries(zip),
    (error) =>
      error instanceof ZipError &&
      /Compression method 9 is not supported/.test(error.message),
  );
});

test("extractZip writes files under the destination only", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "workbench-test-"));
  try {
    const written = await extractZip(
      createZip([
        { path: "app/", data: Buffer.alloc(0) },
        { path: "app/index.js", data: "export {};\n" },
      ]),
      dir,
    );
    assert.deepEqual(written, ["app/index.js"]);
    assert.equal(
      await readFile(join(dir, "app/index.js"), "utf8"),
      "export {};\n",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("application projection surfaces IPC, roles and unknowns", () => {
  const projection = projectAnalysis({
    evidence: applicationEvidence,
    raw: JSON.stringify(applicationEvidence),
    target: { name: "example", kind: "sample", path: "examples/example" },
    command:
      "node scripts/rea.mjs analyze-javascript-application examples/example --json",
    durationMs: 12,
    sanitize: (value) => value,
  });
  assert.equal(projection.workflow, "application");
  assert.equal(projection.evidence.id, "ev_test_application");
  assert.equal(projection.ipcChannels.length, 1);
  assert.equal(projection.ipcChannels[0].channel, "notes:export");
  assert.equal(projection.ipcChannels[0].sides.length, 2);
  assert.equal(projection.files.length, 1);
  assert.deepEqual(projection.unknowns.families, [
    { family: "object-flow", count: 1 },
  ]);
  assert.ok(
    projection.roles.some((role) => role.kind === "context-bridge-api"),
  );
  assert.ok(projection.insights.length > 0);
});

test("artifact projection surfaces the graded inventory", () => {
  const projection = projectArtifact({
    evidence: artifactEvidence,
    raw: JSON.stringify(artifactEvidence),
    target: { name: "example.zip", kind: "upload", path: "example.zip" },
    command: "node scripts/rea.mjs inspect-artifact example.zip --json",
    durationMs: 8,
    sanitize: (value) => value,
  });
  assert.equal(projection.workflow, "artifact");
  assert.equal(projection.artifact.manifest.nodes, 2);
  assert.equal(projection.artifact.coverage.status, "complete-within-substeps");
  assert.equal(projection.files.length, 2);
  assert.equal(projection.artifact.substeps[0].operation, "inventory_artifact");
});
