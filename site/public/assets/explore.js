/* Evidence explorer: lays out a captured graph and keeps an inspector in sync.
   The graphs themselves are built at build time (site/lib/explore-data.mjs);
   this file only positions, pans, zooms, selects and filters. */
(function () {
  "use strict";

  let mount = document.querySelector("[data-explorer]");
  let dataElement = document.getElementById("explorer-data");
  if (!mount || !dataElement) return;

  let datasets;
  try {
    datasets = JSON.parse(dataElement.textContent);
  } catch (error) {
    void error;
    return;
  }

  let svg = mount.querySelector("[data-graph]");
  let viewport = mount.querySelector("[data-graph-viewport]");
  let inspector = mount.querySelector("[data-inspector]");
  let search = mount.querySelector("[data-graph-search]");
  let buttons = Array.prototype.slice.call(
    mount.querySelectorAll("[data-dataset]"),
  );
  let titleNode = mount.querySelector("[data-graph-title]");
  let metaNode = mount.querySelector("[data-graph-meta]");
  let legend = mount.querySelector("[data-graph-legend]");

  let NS = "http://www.w3.org/2000/svg";
  let state = {
    dataset: "artifact",
    graph: null,
    positions: null,
    scale: 1,
    x: 0,
    y: 0,
  };
  let selected = null;

  let el = function (name, attributes) {
    let node = document.createElementNS(NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  };

  let textWidth = function (text, size) {
    return String(text).length * size * 0.6;
  };

  /* Assign a layer to every node. Roots are nodes nothing points at; the rest
     get the longest path from a root, capped so a cycle cannot spin forever. */
  let layout = function (graph) {
    let layers = new Map();
    let incoming = new Map();
    graph.nodes.forEach(function (node) {
      incoming.set(node.id, 0);
    });
    graph.edges.forEach(function (edge) {
      incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    });

    let queue = [];
    graph.nodes.forEach(function (node) {
      if ((incoming.get(node.id) || 0) === 0) {
        layers.set(node.id, 0);
        queue.push(node.id);
      }
    });
    if (queue.length === 0 && graph.nodes.length > 0) {
      queue.push(graph.nodes[0].id);
      layers.set(graph.nodes[0].id, 0);
    }

    let bySource = new Map();
    graph.edges.forEach(function (edge) {
      if (!bySource.has(edge.from)) bySource.set(edge.from, []);
      bySource.get(edge.from).push(edge.to);
    });

    let guard = 0;
    while (queue.length > 0 && guard < graph.nodes.length * 12) {
      guard += 1;
      let id = queue.shift();
      let depth = layers.get(id) || 0;
      (bySource.get(id) || []).forEach(function (target) {
        let next = depth + 1;
        if ((layers.get(target) || 0) < next && next < 24) {
          layers.set(target, next);
          queue.push(target);
        }
      });
    }
    graph.nodes.forEach(function (node) {
      if (!layers.has(node.id)) layers.set(node.id, 0);
    });

    let columns = new Map();
    graph.nodes.forEach(function (node) {
      let depth = layers.get(node.id);
      if (!columns.has(depth)) columns.set(depth, []);
      columns.get(depth).push(node);
    });

    let positions = new Map();
    let gapX = 250;
    let gapY = 54;
    columns.forEach(function (column, depth) {
      column.sort(function (left, right) {
        return left.label.localeCompare(right.label);
      });
      column.forEach(function (node, index) {
        positions.set(node.id, {
          x: depth * gapX,
          y: (index - (column.length - 1) / 2) * gapY,
        });
      });
    });
    return positions;
  };

  let nodeSize = function (node) {
    let width = Math.min(238, Math.max(132, textWidth(node.label, 11.5) + 26));
    return { width: width, height: 34 };
  };

  /* Grouped columns: files, interfaces, external symbols. A tidy, stable
     diagram reads better than a simulation for a graph this small. */
  let GROUPS = [
    { id: "files", label: "files & containers" },
    { id: "interfaces", label: "interfaces" },
    { id: "external", label: "external & symbols" },
  ];

  let columnsLayout = function (graph) {
    let positions = new Map();
    GROUPS.forEach(function (group, column) {
      let items = graph.nodes
        .filter(function (node) {
          return node.group === group.id;
        })
        .sort(function (left, right) {
          return left.label.localeCompare(right.label);
        });
      items.forEach(function (node, index) {
        positions.set(node.id, {
          x: column * 300,
          y: (index - (items.length - 1) / 2) * 52,
        });
      });
    });
    graph.nodes.forEach(function (node) {
      if (!positions.has(node.id)) positions.set(node.id, { x: 0, y: 0 });
    });
    return positions;
  };

  let draw = function () {
    let graph = state.graph;
    if (!graph) return;
    while (viewport.firstChild) viewport.removeChild(viewport.firstChild);
    state.positions =
      graph.layout === "columns" ? columnsLayout(graph) : layout(graph);

    let edges = el("g", { class: "edges" });
    let nodes = el("g", { class: "nodes" });

    graph.edges.forEach(function (edge, index) {
      let from = state.positions.get(edge.from);
      let to = state.positions.get(edge.to);
      if (!from || !to) return;
      let source = nodeSize(
        graph.nodes.find(function (n) {
          return n.id === edge.from;
        }),
      );
      let targetBox = nodeSize(
        graph.nodes.find(function (n) {
          return n.id === edge.to;
        }),
      );
      let x1 = from.x + source.width;
      let y1 = from.y + 17;
      let x2 = to.x;
      let y2 = to.y + 17;
      let mid = (x1 + x2) / 2;
      let path = el("path", {
        d:
          "M " +
          x1 +
          " " +
          y1 +
          " C " +
          mid +
          " " +
          y1 +
          ", " +
          mid +
          " " +
          y2 +
          ", " +
          x2 +
          " " +
          y2,
        class: "edge",
        "data-relation": edge.relation,
        "data-index": index,
        "data-from": edge.from,
        "data-to": edge.to,
      });
      path.appendChild(el("title", {})).textContent =
        edge.relation +
        ": " +
        edge.from +
        " → " +
        edge.to +
        (edge.detail ? " · " + edge.detail : "");
      edges.appendChild(path);
      void targetBox;
    });

    graph.nodes.forEach(function (node) {
      let position = state.positions.get(node.id);
      let size = nodeSize(node);
      let group = el("g", {
        class: "node",
        transform: "translate(" + position.x + " " + position.y + ")",
        tabindex: "0",
        role: "button",
        "aria-label": node.label + " — " + node.kind,
        "data-id": node.id,
      });
      group.appendChild(
        el("rect", {
          width: size.width,
          height: size.height,
          rx: 7,
          ry: 7,
        }),
      );
      let label = el("text", { x: 11, y: 15 });
      label.textContent =
        node.label.length > 32 ? node.label.slice(0, 31) + "…" : node.label;
      group.appendChild(label);
      let kind = el("text", { x: 11, y: 27, class: "node__kind" });
      kind.textContent = node.kind;
      group.appendChild(kind);
      group.addEventListener("click", function () {
        select(node.id);
      });
      group.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select(node.id);
        }
      });
      nodes.appendChild(group);
    });

    if (graph.layout === "columns") {
      let headers = el("g", { class: "columns" });
      GROUPS.forEach(function (group, column) {
        let present = graph.nodes.some(function (node) {
          return node.group === group.id;
        });
        if (!present) return;
        let caption = el("text", {
          x: column * 300,
          y: -170,
          class: "column__label",
        });
        caption.textContent = group.label;
        headers.appendChild(caption);
      });
      viewport.appendChild(headers);
    }

    viewport.appendChild(edges);
    viewport.appendChild(nodes);
    fit();
    if (selected) select(selected, true);
  };

  let fit = function () {
    if (!state.positions || state.graph.nodes.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    state.graph.nodes.forEach(function (node) {
      let position = state.positions.get(node.id);
      let size = nodeSize(node);
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    });
    let padding = 40;
    let width = svg.clientWidth || 800;
    let height = svg.clientHeight || 520;
    let scale = Math.min(
      (width - padding * 2) / Math.max(1, maxX - minX),
      (height - padding * 2) / Math.max(1, maxY - minY),
      1.2,
    );
    /* Keep labels readable on wide canvases; on narrow ones show the whole
       graph and let the zoom buttons take over. */
    let minScale = width < 640 ? 0.26 : 0.62;
    state.scale = Math.min(1.2, Math.max(minScale, scale));
    state.x = (width - (maxX - minX) * state.scale) / 2 - minX * state.scale;
    state.y = (height - (maxY - minY) * state.scale) / 2 - minY * state.scale;
    apply();
  };

  let apply = function () {
    viewport.setAttribute(
      "transform",
      "translate(" + state.x + " " + state.y + ") scale(" + state.scale + ")",
    );
  };

  let select = function (id, quiet) {
    selected = id;
    let graph = state.graph;
    let node = graph.nodes.find(function (entry) {
      return entry.id === id;
    });
    if (!node) return;

    viewport.querySelectorAll(".node").forEach(function (element) {
      element.dataset.selected = String(element.dataset.id === id);
    });

    let neighbours = new Set([id]);
    graph.edges.forEach(function (edge) {
      if (edge.from === id || edge.to === id) {
        neighbours.add(edge.from);
        neighbours.add(edge.to);
      }
    });
    viewport.querySelectorAll(".node").forEach(function (element) {
      element.dataset.dim = String(
        quiet !== true && !neighbours.has(element.dataset.id),
      );
    });
    viewport.querySelectorAll(".edge").forEach(function (element) {
      let active = element.dataset.from === id || element.dataset.to === id;
      element.dataset.active = String(active);
      element.dataset.dim = String(!active && quiet !== true);
    });

    let outgoing = graph.edges.filter(function (edge) {
      return edge.from === id;
    });
    let incoming = graph.edges.filter(function (edge) {
      return edge.to === id;
    });

    let escape = function (value) {
      return String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    };

    let rows = Object.keys(node.meta || {})
      .map(function (key) {
        return (
          "<div><dt>" +
          escape(key) +
          "</dt><dd>" +
          escape(node.meta[key]) +
          "</dd></div>"
        );
      })
      .join("");

    let edgeList = function (edges, direction) {
      if (edges.length === 0) return "";
      return (
        '<ul class="inspector__list">' +
        edges
          .slice(0, 12)
          .map(function (edge) {
            let other = direction === "out" ? edge.to : edge.from;
            return (
              '<li><span class="faint">' +
              escape(edge.relation) +
              "</span> " +
              escape(direction === "out" ? "→ " : "← ") +
              '<a href="#" data-jump="' +
              escape(other) +
              '">' +
              escape(other) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>"
      );
    };

    inspector.innerHTML =
      '<div class="between"><span class="kicker">Selected</span>' +
      '<span class="tag tag--accent">' +
      escape(node.kind) +
      "</span></div>" +
      '<h3 style="font-size:1rem;overflow-wrap:anywhere">' +
      escape(node.label) +
      "</h3>" +
      (rows ? "<dl>" + rows + "</dl>" : "") +
      (outgoing.length
        ? '<div><p class="tiny faint" style="margin:0 0 .4rem">Outgoing</p>' +
          edgeList(outgoing, "out") +
          "</div>"
        : "") +
      (incoming.length
        ? '<div><p class="tiny faint" style="margin:0 0 .4rem">Incoming</p>' +
          edgeList(incoming, "in") +
          "</div>"
        : "") +
      '<a class="small" href="#" data-clear>Clear selection</a>';

    inspector.querySelectorAll("[data-jump]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        select(link.dataset.jump);
      });
    });
    let clear = inspector.querySelector("[data-clear]");
    if (clear)
      clear.addEventListener("click", function (event) {
        event.preventDefault();
        selected = null;
        draw();
        inspector.innerHTML =
          '<div class="kicker">Inspector</div><p class="inspector__empty">' +
          "Pick any node to read the properties REA recorded for it — paths, " +
          "digests, roles and hash status — plus every relation that touches it.</p>";
      });
  };

  let show = function (name) {
    let dataset = datasets[name] || datasets.artifact;
    if (!dataset) return;
    state.dataset = name;
    state.graph = dataset;
    selected = null;
    buttons.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.dataset === name),
      );
    });
    if (titleNode) titleNode.textContent = dataset.title;
    if (metaNode) metaNode.textContent = dataset.subtitle;
    if (legend) {
      legend.innerHTML = dataset.legend
        .map(function (entry) {
          return (
            '<span><i data-kind="' +
            entry.kind +
            '"></i>' +
            entry.label +
            "</span>"
          );
        })
        .join("");
    }
    draw();
    if (search) search.value = "";
    history.replaceState(null, "", "?dataset=" + name);
    inspector.innerHTML =
      '<div class="kicker">Inspector</div><p class="inspector__empty">' +
      "Pick any node to read the properties REA recorded for it — paths, " +
      "digests, roles and hash status — plus every relation that touches it.</p>";
  };

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      show(button.dataset.dataset);
    });
  });

  if (search) {
    search.addEventListener("input", function () {
      let needle = search.value.trim().toLowerCase();
      viewport.querySelectorAll(".node").forEach(function (element) {
        let node = state.graph.nodes.find(function (entry) {
          return entry.id === element.dataset.id;
        });
        let matches =
          needle === "" ||
          (node &&
            (node.label + " " + node.kind).toLowerCase().indexOf(needle) !==
              -1);
        element.dataset.dim = String(!matches);
      });
    });
  }

  let dragging = null;
  svg.addEventListener("pointerdown", function (event) {
    if (event.target.closest(".node")) return;
    dragging = { x: event.clientX, y: event.clientY, tx: state.x, ty: state.y };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    state.x = dragging.tx + (event.clientX - dragging.x);
    state.y = dragging.ty + (event.clientY - dragging.y);
    apply();
  });
  svg.addEventListener("pointerup", function (event) {
    dragging = null;
    if (svg.hasPointerCapture(event.pointerId))
      svg.releasePointerCapture(event.pointerId);
  });
  svg.addEventListener(
    "wheel",
    function (event) {
      if (!event.ctrlKey && !event.metaKey && Math.abs(event.deltaY) < 6)
        return;
      event.preventDefault();
      let rect = svg.getBoundingClientRect();
      let px = event.clientX - rect.left;
      let py = event.clientY - rect.top;
      let factor = event.deltaY < 0 ? 1.12 : 0.89;
      let next = Math.min(3, Math.max(0.18, state.scale * factor));
      let ratio = next / state.scale;
      state.x = px - (px - state.x) * ratio;
      state.y = py - (py - state.y) * ratio;
      state.scale = next;
      apply();
    },
    { passive: false },
  );

  mount.querySelectorAll("[data-zoom]").forEach(function (button) {
    button.addEventListener("click", function () {
      let mode = button.dataset.zoom;
      if (mode === "fit") {
        fit();
        return;
      }
      let factor = mode === "in" ? 1.2 : 0.83;
      let rect = svg.getBoundingClientRect();
      let px = rect.width / 2;
      let py = rect.height / 2;
      let next = Math.min(3, Math.max(0.18, state.scale * factor));
      let ratio = next / state.scale;
      state.x = px - (px - state.x) * ratio;
      state.y = py - (py - state.y) * ratio;
      state.scale = next;
      apply();
    });
  });

  window.addEventListener("resize", function () {
    fit();
  });

  let initial = new URLSearchParams(window.location.search).get("dataset");
  show(initial && datasets[initial] ? initial : "artifact");
})();
