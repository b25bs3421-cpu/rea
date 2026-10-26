/**
 * Run the real REA CLI and project its Evidence into what the Workbench UI
 * needs. The projection never replaces the Evidence: the complete JSON stays
 * downloadable and every derived row points at its original observation.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const run = promisify(execFile);

export const ANALYSIS_COMMAND = "analyze-javascript-application";
export const ARTIFACT_COMMAND = "inspect-artifact";

/** Invoke `rea <command> … --json` from this checkout. */
export const runRea = async (root, args, { timeoutMs = 150_000 } = {}) => {
  const started = Date.now();
  const argv = ["scripts/rea.mjs", ...args];
  try {
    const { stdout, stderr } = await run(process.execPath, argv, {
      cwd: root,
      timeout: timeoutMs,
      maxBuffer: 96 * 1024 * 1024,
      env: { ...process.env, REA_LOG_LEVEL: "silent", NO_COLOR: "1" },
    });
    return {
      ok: true,
      code: 0,
      stdout,
      stderr,
      durationMs: Date.now() - started,
      argv,
    };
  } catch (error) {
    return {
      ok: false,
      code: typeof error.code === "number" ? error.code : 1,
      stdout: String(error.stdout ?? ""),
      stderr: String(error.stderr ?? ""),
      durationMs: Date.now() - started,
      argv,
      signal: error.signal ?? null,
      timedOut: error.killed === true || error.signal === "SIGTERM",
    };
  }
};

export const parseDiagnostic = (stdout) => {
  const text = stdout.trim();
  if (text === "") return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && "error" in parsed)
      return parsed;
    return null;
  } catch {
    return null;
  }
};

/**
 * Project one `analyze_javascript_application` Evidence record.
 * `sanitize` rewrites local absolute paths out of the displayed strings.
 */
export const projectAnalysis = ({
  evidence,
  raw,
  target,
  command,
  durationMs,
  sanitize = (value) => value,
}) => {
  const normalized = evidence.normalized_result ?? {};
  const graph = normalized.graph ?? { nodes: [], edges: [] };
  const semantic = normalized.semantic_graph ?? {};
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  const labels = new Map();
  for (const node of nodes) {
    const seen = [];
    for (const observation of node.observations ?? []) {
      const label = observation.label;
      if (typeof label === "string" && !seen.includes(label)) seen.push(label);
    }
    labels.set(node.node_id, seen.join(" · "));
  }
  const labelOf = (nodeId) => labels.get(nodeId) ?? nodeId.slice(-12);
  const firstObservation = (node) => node.observations?.[0] ?? {};
  const locationOf = (observation) => {
    const value = observation?.evidence?.location?.value;
    if (value === undefined || value === null) return null;
    if (value.kind === "source-range" && value.source !== undefined)
      return `${value.source}:${value.start?.line ?? "?"}`;
    if (value.path !== undefined) return value.path;
    return value.kind ?? null;
  };

  const seenFiles = new Set();
  const files = nodes
    .filter(
      (node) =>
        node.kind === "javascript-asset" ||
        (node.kind === "artifact" &&
          typeof node.observations?.[0]?.properties?.path === "string"),
    )
    .map((node) => {
      const properties = firstObservation(node).properties ?? {};
      return {
        path: properties.path ?? labelOf(node.node_id),
        bytes: properties.bytes ?? null,
        kind: properties.file_kind ?? "unknown",
        parseStatus: properties.parse_status ?? null,
        textStatus: properties.text_status ?? null,
        sha256:
          properties.inventory_artifact_id ?? node.identity?.sha256 ?? null,
      };
    })
    .filter((file) => {
      if (seenFiles.has(file.path)) return false;
      seenFiles.add(file.path);
      return true;
    })
    .sort((left, right) => String(left.path).localeCompare(String(right.path)));

  const modules = nodes
    .filter((node) => node.kind === "javascript-module")
    .map((node) => {
      const properties = firstObservation(node).properties ?? {};
      return {
        label: labelOf(node.node_id),
        specifier: properties.declared_specifier ?? null,
        role: properties.semantic_role ?? null,
        resolution: properties.resolution_status ?? null,
      };
    });

  const roleKinds = new Set([
    "electron-main",
    "electron-preload",
    "electron-renderer",
    "browser-window",
    "context-bridge-api",
    "ipc-handler",
    "ipc-channel",
    "package",
  ]);
  const roles = nodes
    .filter(
      (node) =>
        roleKinds.has(node.kind) ||
        (node.kind === "artifact" &&
          typeof node.observations?.[0]?.properties?.format === "string"),
    )
    .map((node) => {
      const observations = node.observations ?? [];
      const properties = observations.map((entry) => entry.properties ?? {});
      return {
        kind: node.kind,
        label: labelOf(node.node_id),
        location:
          locationOf(observations[0]) ??
          properties[0].source_path ??
          properties[0].path ??
          null,
        facts: describeRole(node.kind, properties),
      };
    })
    .sort((left, right) => left.kind.localeCompare(right.kind));

  const ipcChannels = [];
  for (const node of nodes.filter((entry) => entry.kind === "ipc-channel")) {
    const sides = (node.observations ?? []).map((observation) => {
      const properties = observation.properties ?? {};
      return {
        side: properties.side ?? "unknown",
        operation: properties.operation ?? properties.mode ?? "unknown",
        resolution: properties.resolution ?? "unknown",
        location: locationOf(observation),
      };
    });
    const channel =
      sides.length > 0 ? labelOf(node.node_id).split(" · ")[0] : "unlabelled";
    ipcChannels.push({ channel, sides });
  }
  const seenIpcEdges = new Set();
  const ipcEdges = edges
    .filter(
      (edge) => edge.relation === "invokes" || edge.relation === "handles",
    )
    .map((edge) => ({
      relation: edge.relation,
      channel: edge.properties?.channel ?? null,
      operation: edge.properties?.operation ?? null,
      side: edge.properties?.side ?? null,
      resolution: edge.properties?.resolution ?? null,
      confidence: edge.evidence?.confidence ?? null,
      location: edgeLocation(edge),
      from: labelOf(edge.source_node_id),
      to: labelOf(edge.target_node_id),
    }))
    .filter((edge) => {
      const key = [
        edge.relation,
        edge.channel,
        edge.side,
        edge.operation,
        edge.location,
      ].join("|");
      if (seenIpcEdges.has(key)) return false;
      seenIpcEdges.add(key);
      return true;
    });

  const relationCounts = new Map();
  for (const edge of edges)
    relationCounts.set(
      edge.relation,
      (relationCounts.get(edge.relation) ?? 0) + 1,
    );

  const projectedEdges = edges
    .map((edge) => ({
      relation: edge.relation,
      from: labelOf(edge.source_node_id),
      to: labelOf(edge.target_node_id),
      confidence: edge.evidence?.confidence ?? "unknown",
      state: edge.evidence?.state ?? "unknown",
      authority: edge.evidence?.authority ?? "unknown",
      location: edgeLocation(edge),
      detail: edgeDetail(edge.properties ?? {}),
    }))
    .sort((left, right) =>
      `${left.relation}${left.from}`.localeCompare(
        `${right.relation}${right.from}`,
      ),
    );

  const unknownItems = (semantic.unknowns ?? []).map((unknown) => ({
    family: unknown.family ?? "unclassified",
    reason: unknown.reason ?? "unknown",
    detail: unknown.detail ?? "",
    location: unknown.evidence?.location?.value
      ? `${unknown.evidence.location.value.source ?? "?"}:${unknown.evidence.location.value.start?.line ?? "?"}`
      : null,
  }));
  const unknownFamilies = new Map();
  for (const item of unknownItems)
    unknownFamilies.set(
      item.family,
      (unknownFamilies.get(item.family) ?? 0) + 1,
    );

  const semanticRelationKinds = new Map();
  for (const relation of semantic.relations ?? [])
    semanticRelationKinds.set(
      relation.relation,
      (semanticRelationKinds.get(relation.relation) ?? 0) + 1,
    );

  const rawText = typeof raw === "string" ? raw : JSON.stringify(evidence);
  const summary = normalized.summary ?? {};
  const statistics = normalized.statistics ?? {};

  return {
    workflow: "application",
    target,
    command,
    durationMs,
    evidence: {
      id: evidence.evidence_id,
      predicate: evidence.predicate_type,
      operation: evidence.operation,
      provider: evidence.provider,
      confidence: evidence.confidence,
      authority: evidence.authority,
      subject: {
        name: evidence.subject?.name ?? target.name,
        format: evidence.subject?.format ?? null,
        sha256: evidence.subject?.digest?.sha256 ?? null,
      },
      bytes: Buffer.byteLength(rawText),
      sha256: createHash("sha256").update(rawText).digest("hex"),
      limitations: (evidence.limitations ?? []).map(sanitize),
      locations: (evidence.locations ?? []).map((location) =>
        sanitize(String(location.path ?? location.kind ?? "")),
      ),
    },
    digests: {
      rootArtifact: normalized.root_artifact_sha256 ?? null,
      inventoryManifest: normalized.inventory_manifest_id ?? null,
      inventoryGraph: normalized.inventory_graph_sha256 ?? null,
      integrityContradictions: normalized.integrity_contradictions?.length ?? 0,
    },
    summary,
    statistics,
    files,
    modules,
    roles,
    ipcChannels,
    ipcEdges,
    relationCounts: [...relationCounts.entries()]
      .map(([relation, count]) => ({ relation, count }))
      .sort((left, right) => right.count - left.count),
    edges: projectedEdges.slice(0, 900),
    edgeTotal: projectedEdges.length,
    unknowns: {
      total: unknownItems.length,
      families: [...unknownFamilies.entries()]
        .map(([family, count]) => ({ family, count }))
        .sort((left, right) => right.count - left.count),
      items: unknownItems.slice(0, 80),
    },
    semantic: {
      nodes: semantic.nodes?.length ?? 0,
      relations: semantic.relations?.length ?? 0,
      fingerprints: semantic.fingerprints?.length ?? 0,
      relationKinds: [...semanticRelationKinds.entries()]
        .map(([relation, count]) => ({ relation, count }))
        .sort((left, right) => right.count - left.count),
    },
    limitations: (normalized.limitations ?? []).map(sanitize),
    coverage: graph.coverage ?? null,
    insights: buildInsights({
      summary,
      statistics,
      files,
      roles,
      ipcChannels,
      unknownItems,
      semantic,
    }),
  };
};

const edgeLocation = (edge) => {
  const value = edge.evidence?.location?.value;
  if (value === undefined || value === null) return null;
  if (value.kind === "source-range" && value.source !== undefined)
    return `${value.source}:${value.start?.line ?? "?"}`;
  return value.kind ?? null;
};

const edgeDetail = (properties) => {
  const parts = [];
  const channel = properties.channel ?? properties.entry ?? properties.path;
  if (typeof channel === "string") parts.push(channel);
  if (typeof properties.operation === "string")
    parts.push(properties.operation);
  if (typeof properties.specifier === "string")
    parts.push(properties.specifier);
  if (typeof properties.resolution === "string")
    parts.push(`resolution: ${properties.resolution}`);
  if (typeof properties.side === "string")
    parts.push(`side: ${properties.side}`);
  return parts.join(" · ");
};

const describeRole = (kind, properties) => {
  const facts = [];
  for (const entry of properties) {
    if (typeof entry.side === "string")
      facts.push(`${entry.side} ${entry.operation ?? entry.mode ?? ""}`.trim());
    if (typeof entry.channel === "string")
      facts.push(`channel ${entry.channel}`);
    if (typeof entry.api_key === "string") {
      const members = Array.isArray(entry.members) ? entry.members : [];
      facts.push(
        `window.${entry.api_key}${
          members.length > 0 ? ` → ${members.join(", ")}` : ""
        }`,
      );
    }
    if (typeof entry.mechanism === "string") facts.push(entry.mechanism);
    if (typeof entry.preload_path === "string")
      facts.push(`preload ${entry.preload_path}`);
    if (typeof entry.name === "string" && kind === "package")
      facts.push(`${entry.name}@${entry.version ?? "?"}`);
    if (typeof entry.main === "string") facts.push(`main ${entry.main}`);
    if (typeof entry.inventory_manifest_id === "string")
      facts.push(`manifest ${entry.inventory_manifest_id.slice(0, 14)}…`);
  }
  return [...new Set(facts)].slice(0, 4);
};

const buildInsights = ({
  summary,
  statistics,
  files,
  roles,
  ipcChannels,
  unknownItems,
  semantic,
}) => {
  const insights = [];
  const fileCount = files.length;
  insights.push(
    `${statistics.relevant_files ?? fileCount} relevant files, ${
      statistics.parsed_javascript_files ?? 0
    } parsed as JavaScript, ${statistics.visited_ast_nodes ?? 0} AST nodes visited.`,
  );
  const ipc = summary.ipc ?? {};
  if ((ipc.operations ?? 0) > 0) {
    insights.push(
      `IPC: ${ipc.operations} operations across ${
        ipc.literal_channels ?? 0
      } literal channels, ${ipc.paired_renderer_transmissions ?? 0} paired renderer transmissions, ${
        ipc.main_handlers ?? 0
      } main handlers.`,
    );
  } else {
    insights.push(
      "No Electron IPC operations were observed. This target analyses as a static web or Node application.",
    );
  }
  const bridge = roles.find((role) => role.kind === "context-bridge-api");
  if (bridge !== undefined)
    insights.push(`Context bridge exposes ${bridge.facts.join(", ")}.`);
  const preload = roles.find((role) => role.kind === "electron-preload");
  if (preload !== undefined)
    insights.push(
      `Preload entry resolved from ${preload.location ?? "the app"}.`,
    );
  if ((summary.native_addon_bindings ?? 0) > 0)
    insights.push(
      `${summary.native_addon_bindings} native add-on bindings, ${summary.resolved_native_addon_bindings} resolved.`,
    );
  if (unknownItems.length > 0)
    insights.push(
      `${unknownItems.length} residual unknowns were retained rather than guessed (${[
        ...new Set(unknownItems.map((item) => item.family)),
      ]
        .slice(0, 3)
        .join(", ")}).`,
    );
  if ((semantic.nodes ?? 0) > 0)
    insights.push(
      `Semantic graph: ${semantic.nodes} nodes, ${semantic.relations} relations, ${
        semantic.fingerprints?.length ?? 0
      } function fingerprints.`,
    );
  void ipcChannels;
  return insights;
};

/**
 * Project one `inspect_artifact` Evidence record: the artifact graph, its
 * occurrence tree, digests, coverage and retained unknowns. This workflow needs
 * no analysis engine and accepts any package format the provider recognizes.
 */
export const projectArtifact = ({
  evidence,
  raw,
  target,
  command,
  durationMs,
  sanitize = (value) => value,
}) => {
  const normalized = evidence.normalized_result ?? {};
  const substeps = normalized.substeps ?? [];
  const first = substeps[0]?.evidence?.normalized_result ?? {};
  const manifest = first.manifest ?? normalized.subject ?? {};
  const nodes = first.nodes ?? [];
  const occurrences = first.occurrences ?? [];
  const edges = first.edges ?? [];
  const artifactsById = new Map(nodes.map((node) => [node.artifact_id, node]));

  const files = occurrences
    .filter((occurrence) => occurrence.entry_kind !== "directory")
    .map((occurrence) => {
      const artifact = artifactsById.get(occurrence.artifact_id) ?? {};
      return {
        path: sanitize(String(occurrence.logical_path ?? ".")),
        kind: occurrence.entry_kind ?? "file",
        format: artifact.format ?? occurrence.artifact_format ?? "unknown",
        size: artifact.size ?? occurrence.declared_size ?? null,
        hashStatus: occurrence.hash_status ?? "unknown",
        executable: occurrence.executable === true,
        encrypted: occurrence.encrypted === true,
        sha256: artifact.sha256 ?? null,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const formatCounts = new Map();
  for (const file of files)
    formatCounts.set(file.format, (formatCounts.get(file.format) ?? 0) + 1);

  const rawText = typeof raw === "string" ? raw : JSON.stringify(evidence);
  const coverage = normalized.coverage ?? {};
  const hypotheses = (normalized.hypotheses ?? []).map((entry) => ({
    statement: sanitize(entry.statement ?? entry.summary ?? String(entry)),
    confidence: entry.confidence ?? "unknown",
  }));
  const probes = (normalized.next_probes ?? []).map((probe) => ({
    kind: probe.kind ?? "probe",
    detail: sanitize(probe.description ?? probe.detail ?? String(probe)),
  }));

  const insights = [];
  insights.push(
    `${manifest.node_count ?? nodes.length} graded artifacts and ${
      manifest.edge_count ?? edges.length
    } containment edges across ${files.length} file occurrences.`,
  );
  insights.push(
    `Root format ${manifest.root_format ?? "unknown"}; ${[
      ...formatCounts.entries(),
    ]
      .map(([format, count]) => `${format} ×${count}`)
      .join(", ")}.`,
  );
  const verified = files.filter(
    (file) => file.hashStatus === "verified",
  ).length;
  insights.push(
    `${verified} of ${files.length} occurrences verified by digest; ${
      first.integrity_contradictions?.length ?? 0
    } integrity contradictions.`,
  );
  if (hypotheses.length > 0)
    insights.push(
      `${hypotheses.length} hypothesis retained by the provider for follow-up.`,
    );
  if ((normalized.unexplored_branches ?? []).length > 0)
    insights.push(
      `${normalized.unexplored_branches.length} unexplored branches were recorded instead of silent omissions.`,
    );
  if (substeps.length > 0)
    insights.push(
      `Substeps: ${substeps
        .map((step) => `${step.operation} (${step.status})`)
        .join(", ")}.`,
    );

  return {
    workflow: "artifact",
    target,
    command,
    durationMs,
    evidence: {
      id: evidence.evidence_id,
      predicate: evidence.predicate_type,
      operation: evidence.operation,
      provider: evidence.provider,
      confidence: evidence.confidence,
      authority: evidence.authority,
      subject: {
        name: evidence.subject?.name ?? target.name,
        format: evidence.subject?.format ?? manifest.root_format ?? null,
        sha256:
          evidence.subject?.digest?.sha256 ?? manifest.root_sha256 ?? null,
      },
      bytes: Buffer.byteLength(rawText),
      sha256: createHash("sha256").update(rawText).digest("hex"),
      limitations: (evidence.limitations ?? []).map(sanitize),
      locations: (evidence.locations ?? []).map((location) =>
        sanitize(String(location.path ?? location.kind ?? "")),
      ),
    },
    artifact: {
      manifest: {
        id: manifest.manifest_id ?? null,
        rootArtifactId: manifest.root_artifact_id ?? null,
        rootSha256: manifest.root_sha256 ?? null,
        rootFormat: manifest.root_format ?? null,
        graphSha256: manifest.graph_sha256 ?? null,
        nodes: manifest.node_count ?? nodes.length,
        edges: manifest.edge_count ?? edges.length,
        occurrences: manifest.occurrence_count ?? occurrences.length,
      },
      coverage: {
        status: coverage.status ?? first.coverage_status ?? "unknown",
        substeps: coverage.substeps_completed ?? substeps.length,
        observations: coverage.observations_retained ?? 0,
        omitted: coverage.observations_omitted ?? 0,
      },
      contradictions: (first.integrity_contradictions ?? []).length,
      substeps: substeps.map((step) => ({
        operation: step.operation,
        status: step.status,
        evidenceId: step.evidence_id,
      })),
      formats: [...formatCounts.entries()]
        .map(([format, count]) => ({ format, count }))
        .sort((left, right) => right.count - left.count),
      hypotheses,
      probes,
      nodes: nodes.slice(0, 60).map((node) => ({
        id: node.artifact_id,
        format: node.format,
        size: node.size ?? null,
        state: node.content_state ?? null,
        sha256: node.sha256 ?? null,
        limitations: (node.limitations ?? []).map(sanitize),
      })),
    },
    files,
    limitations: (normalized.limitations ?? []).map(sanitize),
    insights,
  };
};
