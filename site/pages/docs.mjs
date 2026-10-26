import { pagehead } from "../lib/shell.mjs";
import { h, list, n } from "../lib/html.mjs";

const docCard = (
  doc,
) => `      <a class="card card--link" href="${h(doc.url)}" rel="noreferrer"
        data-filter-item data-kind="${h(doc.slug)}"
        data-text="${h(`${doc.title} ${doc.summary} ${doc.headings.join(" ")}`)}">
        <span class="card__eyebrow">${n(doc.words)} words · ${doc.headings.length} sections</span>
        <h3>${h(doc.title)}</h3>
        <p class="small muted">${h(doc.summary)}</p>
        <span class="card__arrow">Read on GitHub ↗</span>
      </a>`;

export const docsPage = (data) => {
  const docs = data.docs.docs;
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]));

  const body = `
${pagehead({
  kicker: "Reference · documents",
  title: `${n(data.docs.counts.documents)} documents, ${n(data.docs.counts.words)} words`,
  lede: "The repository's prose is the contract: every guide ships next to the code and every page here links back to its source. Titles, summaries and section lists are read from the Markdown itself, so this index cannot go stale on its own.",
  crumbs: [
    { href: "/", label: "Home" },
    { href: "/reference/docs/", label: "Documents" },
  ],
})}

<div data-filter>
<section class="section section--flush" style="padding-bottom:0">
  <div class="wrap">
    <div class="filters">
      <input type="search" placeholder="Search titles, summaries, sections…" aria-label="Search documents" data-filter-search>
      <span class="counter" data-filter-count>${n(docs.length)} total</span>
    </div>
    <p class="empty" data-filter-empty hidden>No document matches that query.</p>
  </div>
</section>

${list(
  data.docs.areas,
  (
    area,
    index,
  ) => `<section class="section${index === 0 ? " section--flush" : ""}" style="padding-top:${index === 0 ? "0" : ""}">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">${String(index + 1).padStart(2, "0")} · ${h(area.id)}</p>
        <h2>${h(area.title)}</h2>
      </div>
      <p>${h(area.summary)} · ${n(area.slugs.length)} documents</p>
    </div>
    <div class="grid grid--3">
${list(area.slugs.map((slug) => bySlug.get(slug)).filter(Boolean), docCard)}
    </div>
  </div>
</section>`,
)}

</div>

<section class="section">
  <div class="wrap">
    <div class="section__head">
      <div>
        <p class="kicker">Prompts</p>
        <h2>Six guided investigations</h2>
      </div>
      <p>Registered as MCP prompts, so an agent can start from a known good
      sequence instead of improvising one.</p>
    </div>
    <div class="grid grid--3">
${list(
  data.prompts.prompts,
  (prompt) => `      <article class="card">
        <span class="card__eyebrow">prompt</span>
        <h3 class="mono" style="font-size:.95rem">${h(prompt.name)}</h3>
        <p class="small muted">${h(prompt.purpose)}</p>
      </article>`,
)}
    </div>
  </div>
</section>
`;

  return body;
};
