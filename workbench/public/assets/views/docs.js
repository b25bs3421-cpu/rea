import { debounce, esc, int, pageHead, searchField } from "../ui.js";

const CASE_STUDIES = [
  {
    title: "Aegis: login codes from an APK",
    blurb:
      "Recovering an Android login-code calculation and checking it against an adjustable clock.",
    href: "https://rea.tools/showcase/aegis/",
  },
  {
    title: "DX-Ball: sound panning",
    blurb: "Reconstructing a pan calculation from a DOS-era game binary.",
    href: "https://rea.tools/showcase/dx-ball/",
  },
  {
    title: "Notion: clipboard bridge",
    blurb: "Tracing an Electron context bridge from renderer to main process.",
    href: "https://rea.tools/showcase/notion/",
  },
  {
    title: "TH04: bullet patterns",
    blurb:
      "Rebuilding a bullet ring from recorded evidence and a written spec.",
    href: "https://rea.tools/showcase/th04/",
  },
  {
    title: "DownUnderCTF: flag checker",
    blurb: "Following a masked-squares checker to the accepted input.",
    href: "https://rea.tools/showcase/ctf/",
  },
];

export const renderDocs = async (container, ctx) => {
  const [data, prompts] = await Promise.all([
    ctx.api("docs"),
    ctx.api("prompts"),
  ]);
  const bySlug = new Map(data.docs.map((doc) => [doc.slug, doc]));
  const state = { query: "", open: ctx.params.doc ?? null };

  container.innerHTML = `
    ${pageHead(
      "Documents",
      `${int(data.counts.documents)} documents, ${int(data.counts.words)} words`,
      `The contracts behind every result: what a tool returns, which facet is unknown, how a provider behaves, and what a reconstruction obligation ledger must contain. Each entry links to the file in this checkout and lists its sections.`,
    )}
    <div id="docDetail"></div>
    <div class="section" id="docIndex">
      <div class="section__head">
        <h2 class="section__title"><span>01</span><span>Index</span></h2>
        <p class="section__hint" id="docCount"></p>
      </div>
      <div class="toolbar">
        ${searchField("docSearch", "Search titles, summaries and section names")}
      </div>
      <div id="docList" class="stack"></div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>02</span><span>Guided prompts</span></h2>
        <p class="section__hint">Six provider-neutral workflows exposed through MCP <code class="mono">prompts</code>.</p>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Prompt</th><th>Purpose</th><th></th></tr></thead>
          <tbody>
            ${prompts.prompts
              .map(
                (prompt) => `<tr>
                  <td class="name">${esc(prompt.name)}</td>
                  <td>${esc(prompt.purpose)}</td>
                  <td class="num"><button class="btn btn--ghost btn--small" type="button"
                    data-copy="${esc(`{"method":"prompts/get","params":{"name":"${prompt.name}","arguments":{}}}`)}">Copy request</button></td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>03</span><span>Worked case studies</span></h2>
        <p class="section__hint">Published investigations on rea.tools, each with its evidence scope and pinned versions.</p>
      </div>
      <div class="doc-grid">
        ${CASE_STUDIES.map(
          (
            study,
          ) => `<a class="doc-card" href="${esc(study.href)}" target="_blank" rel="noreferrer noopener">
            <h3>${esc(study.title)}</h3>
            <p>${esc(study.blurb)}</p>
            <span class="doc-card__meta">rea.tools · external</span>
          </a>`,
        ).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section__head">
        <h2 class="section__title"><span>04</span><span>Questions</span></h2>
        <p class="section__hint">From the repository README.</p>
      </div>
      <div class="accordion">
        ${data.faq
          .map(
            (entry) => `<details>
              <summary>${esc(entry.question)}</summary>
              <div class="accordion__body">${esc(entry.answer)}</div>
            </details>`,
          )
          .join("")}
      </div>
    </div>
  `;

  const detailHost = container.querySelector("#docDetail");
  const listHost = container.querySelector("#docList");
  const count = container.querySelector("#docCount");

  const drawDetail = () => {
    if (state.open === null) {
      detailHost.innerHTML = "";
      return;
    }
    const doc = bySlug.get(state.open);
    if (doc === undefined) {
      detailHost.innerHTML = "";
      return;
    }
    const citedBy = data.targets.filter((target) =>
      target.links.some((link) => link.href.endsWith(`doc=${doc.slug}`)),
    );
    detailHost.innerHTML = `
      <div class="panel panel--ticked stack" style="margin-bottom:22px" id="docPanel">
        <div class="spread">
          <span class="kicker">document</span>
          <div class="row">
            <a class="btn btn--small btn--ghost" href="#/docs">Close</a>
            <a class="btn btn--small" href="${esc(doc.url)}" target="_blank" rel="noreferrer noopener">Open on GitHub</a>
          </div>
        </div>
        <h2 style="font-size:var(--step-3)">${esc(doc.title)}</h2>
        <p class="muted">${esc(doc.summary)}</p>
        <div class="row">
          <span class="tag">${int(doc.words)} words</span>
          <span class="tag">${int(doc.headings.length)} sections</span>
          <span class="tag mono">${esc(doc.path)}</span>
          <button class="btn btn--ghost btn--small" type="button" data-copy="${esc(doc.path)}">Copy path</button>
        </div>
        ${
          doc.headings.length === 0
            ? ""
            : `<div>
                <p class="panel__title" style="margin-bottom:8px">Sections</p>
                <div class="outline"><ol>${doc.headings
                  .map(
                    (heading) =>
                      `<li><span class="tag">${esc(heading)}</span></li>`,
                  )
                  .join("")}</ol></div>
              </div>`
        }
        ${
          citedBy.length === 0
            ? ""
            : `<p class="panel__note">Linked from the analysis matrix for ${citedBy
                .map((target) => `<strong>${esc(target.target)}</strong>`)
                .join(", ")}.</p>`
        }
      </div>`;
  };

  const drawList = () => {
    const needle = state.query.toLowerCase();
    const matches = (doc) =>
      needle === "" ||
      `${doc.title} ${doc.slug} ${doc.summary} ${doc.headings.join(" ")}`
        .toLowerCase()
        .includes(needle);
    let shown = 0;
    listHost.innerHTML = data.areas
      .map((area) => {
        const docs = area.slugs
          .map((slug) => bySlug.get(slug))
          .filter((doc) => doc !== undefined && matches(doc));
        shown += docs.length;
        if (docs.length === 0) return "";
        return `<div class="stack">
          <div class="spread">
            <p class="panel__title">${esc(area.title)}</p>
            <p class="panel__note">${esc(area.summary)}</p>
          </div>
          <div class="doc-grid">
            ${docs
              .map(
                (
                  doc,
                ) => `<a class="doc-card" href="#/docs?doc=${encodeURIComponent(doc.slug)}">
                  <h3>${esc(doc.title)}</h3>
                  <p>${esc(doc.summary)}</p>
                  <span class="doc-card__meta">
                    <span>${esc(doc.slug)}</span>
                    <span>${int(doc.headings.length)} sections</span>
                    <span>${int(doc.words)} words</span>
                  </span>
                </a>`,
              )
              .join("")}
          </div>
        </div>`;
      })
      .join("");
    const rest = data.docs.filter(
      (doc) =>
        !data.areas.some((area) => area.slugs.includes(doc.slug)) &&
        matches(doc),
    );
    if (rest.length > 0) {
      listHost.innerHTML += `<div class="stack">
        <p class="panel__title">Additional documents</p>
        <div class="doc-grid">
          ${rest
            .map(
              (
                doc,
              ) => `<a class="doc-card" href="#/docs?doc=${encodeURIComponent(doc.slug)}">
                <h3>${esc(doc.title)}</h3>
                <p>${esc(doc.summary)}</p>
                <span class="doc-card__meta"><span>${esc(doc.slug)}</span></span>
              </a>`,
            )
            .join("")}
        </div>
      </div>`;
      shown += rest.length;
    }
    count.textContent = `${int(shown)} of ${int(data.counts.documents)} shown · ${int(data.counts.words)} words`;
    if (shown === 0)
      listHost.innerHTML = `<div class="empty"><span class="empty__mark">no match</span><p>No document mentions “${esc(state.query)}”. Try a tool name, a format or a phrase from a contract.</p></div>`;
  };

  container.querySelector("#docSearch").addEventListener(
    "input",
    debounce(() => {
      state.query = container.querySelector("#docSearch").value.trim();
      drawList();
    }, 120),
  );

  drawList();
  drawDetail();
  if (state.open !== null) detailHost.scrollIntoView({ block: "start" });
};
