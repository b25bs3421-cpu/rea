/**
 * Build the graph datasets the explorer renders, from the captured Evidence
 * projections. Doing this at build time keeps the browser free of projection
 * logic: the page ships a ready list of nodes and edges.
 */

const contains = (label, needle) => label.toLowerCase().includes(needle);

const applicationKind = (label, roles) => {
  const role = roles.find((entry) => entry.label === label);
  if (role) return role.kind;
  if (label.startsWith("node:")) return "module";
  if (label.startsWith("electron")) return "api";
  return "symbol";
};

const relationLegend = (edges, artifact = false) => {
  const present = new Set(edges.map((edge) => edge.relation));
  const legend = [];
  if (present.has("contains"))
    legend.push({ kind: "contains", label: "contains" });
  if (present.has("imports") || present.has("loads"))
    legend.push({ kind: "imports", label: "imports / loads" });
  const control = [...present].filter(
    (relation) => !["contains", "imports", "loads"].includes(relation),
  );
  if (control.length > 0)
    legend.push({
      kind: "control",
      label: artifact ? "control" : control.join(" · "),
    });
  return legend;
};

export const buildExploreDatasets = ({ application, artifact }) => {
  const artifactProjection = artifact.projection;
  const manifest = artifactProjection.artifact.manifest;
  const rootFile = artifactProjection.files.find((file) => file.path === ".");
  const children = artifactProjection.files.filter((file) => file.path !== ".");

  const artifactNodes = [
    {
      id: "root",
      label: artifact.target,
      kind: "zip root",
      meta: {
        format: manifest.rootFormat,
        bytes: rootFile?.size ?? artifact.bytes,
        sha256: manifest.rootSha256,
        manifest: manifest.id,
        graph: manifest.graphSha256,
        occurrences: manifest.occurrences,
        edges: manifest.edges,
      },
    },
    ...children.map((file) => ({
      id: file.path,
      label: file.path,
      kind: file.format,
      meta: {
        path: file.path,
        format: file.format,
        bytes: file.size,
        hash: file.hashStatus,
        sha256: file.sha256,
        executable: file.executable,
        encrypted: file.encrypted,
      },
    })),
  ];

  const artifactEdges = children.map((file) => ({
    from: "root",
    to: file.path,
    relation: "contains",
    detail: `${file.format} · ${file.size} B`,
  }));

  const applicationProjection = application.projection;
  const labels = new Map();
  applicationProjection.edges.forEach((edge) => {
    labels.set(edge.from, true);
    labels.set(edge.to, true);
  });

  const degree = new Map();
  applicationProjection.edges.forEach((edge) => {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  });

  const groupOf = (kind) => {
    if (
      [
        "artifact",
        "package",
        "electron-main",
        "electron-preload",
        "electron-renderer",
      ].includes(kind)
    )
      return "files";
    if (
      [
        "context-bridge-api",
        "ipc-channel",
        "ipc-handler",
        "browser-window",
        "window",
      ].includes(kind)
    )
      return "interfaces";
    return "external";
  };

  const applicationNodes = [...labels.keys()].sort().map((label) => {
    const role = applicationProjection.roles.find(
      (entry) => entry.label === label,
    );
    const file = applicationProjection.files.find(
      (entry) => entry.path === label,
    );
    const meta = {};
    if (role) {
      meta.role = role.kind;
      if (role.location) meta.location = role.location;
      (role.facts ?? []).slice(0, 4).forEach((fact, index) => {
        meta[`fact ${index + 1}`] = fact;
      });
    }
    if (file) {
      meta.format = file.kind;
      meta.bytes = file.bytes;
      meta.sha256 = file.sha256?.slice(0, 32);
    }
    meta.relations = degree.get(label) ?? 0;
    const kind = applicationKind(label, applicationProjection.roles);
    return {
      id: label,
      label,
      kind,
      group: groupOf(kind),
      meta,
    };
  });

  const applicationEdges = applicationProjection.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
    detail: [edge.location, edge.confidence && `${edge.confidence} confidence`]
      .filter(Boolean)
      .join(" · "),
  }));

  void contains;

  return {
    artifact: {
      title: `${artifact.target} — artifact inventory`,
      subtitle:
        `${manifest.nodes} graded artifacts · ${manifest.edges} containment edges · ` +
        `${manifest.occurrences} occurrences · captured in ${artifact.durationMs} ms`,
      layout: "layered",
      nodes: artifactNodes,
      edges: artifactEdges,
      legend: relationLegend(artifactEdges, true),
      evidence: "/evidence/artifact.json",
      summary: [
        ["Root format", manifest.rootFormat],
        ["Root digest", manifest.rootSha256],
        ["Manifest", manifest.id],
        ["Graph digest", manifest.graphSha256],
        ["Coverage", artifactProjection.artifact.coverage.status],
        [
          "Contradictions",
          String(artifactProjection.artifact.contradictions ?? 0),
        ],
      ],
    },
    application: {
      title: `${application.target} — app reconstruction`,
      subtitle:
        `${applicationProjection.edges.length} relationship edges · ` +
        `${applicationNodes.length} nodes · ${applicationProjection.unknowns.total} retained unknowns · ` +
        `captured in ${application.durationMs} ms`,
      layout: "columns",
      nodes: applicationNodes,
      edges: applicationEdges,
      legend: relationLegend(applicationEdges),
      evidence: "/evidence/application.json",
      summary: [
        ["Files", String(applicationProjection.files.length)],
        [
          "Parsed JS",
          String(applicationProjection.statistics.parsed_javascript_files),
        ],
        [
          "AST nodes",
          String(applicationProjection.statistics.visited_ast_nodes),
        ],
        ["IPC channels", String(applicationProjection.ipcChannels.length)],
        [
          "Semantic graph",
          `${applicationProjection.semantic.nodes} nodes / ${applicationProjection.semantic.relations} relations`,
        ],
        ["Coverage", applicationProjection.coverage.status],
      ],
    },
  };
};
