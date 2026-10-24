/**
 * Every string on the page lives here.
 * Source of truth: PS-01 brief ("Document-Grounded AI Research Assistant").
 * No invented metrics: figures are targets from the scope table, never results.
 */

export type CitationStatus = "supports-1" | "supports-2" | "contradicts" | "nearest-not-used"

export type Citation = {
  id: number
  doc: string
  page: number
  section: string
  span: string
  status: CitationStatus
}

export type Sentence = { t: string; cites: number[] }
export type AnswerLine = { sentences: Sentence[]; tail?: string }

export type Criterion = { n: string; label: string; target: string }
export type Stage = { n: string; title: string; body: string; contract: string }
export type Note = { n: string; note: string; sub: string; rotate: number }

export const BRAND = "Grounded"

export const NAV = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Evidence", href: "#evidence" },
  { label: "Scope", href: "#scope" },
]

export const BRIEF_LINES = [
  "PS-01 | DOCUMENT-GROUNDED AI RESEARCH ASSISTANT",
  "",
  "CONTEXT & PROBLEM",
  "Students and teams often spend too much time searching",
  "across long documents and may receive answers without",
  "clear evidence.",
  "",
  "EXPECTED SOLUTION",
  "Build an assistant that accepts multiple documents,",
  "answers questions using their content, cites the",
  "relevant passages and indicates when the answer cannot",
  "be found in the supplied material.",
  "",
  "TECHNICAL FOCUS",
  "Document parsing  ·  Retrieval  ·  Source-grounded answers",
]

/* ── 01 · problem ─────────────────────────────────────────────── */

export const PROBLEM = {
  eyebrow: "01 — Problem",
  line1: "The answer was in the reading.",
  line2: "Finding it cost the afternoon.",
  lead: "A semester of readings, a folder of policy PDFs, four reports from last quarter. The information exists. What does not exist is a way to ask a question and get an answer you can check.",
  notes: [
    {
      n: "01",
      note: "“Where did I actually read that?”",
      sub: "Page 114 of a 300-page handbook. Ctrl+F needs the exact words.",
      rotate: -1.5,
    },
    {
      n: "02",
      note: "“It answered instantly. It was wrong.”",
      sub: "A fluent paragraph with no source is not an answer — it is a guess with good grammar.",
      rotate: 1,
    },
    {
      n: "03",
      note: "“Which version is current?”",
      sub: "Three handbooks, two revisions. The newest one contradicts the one everyone quotes.",
      rotate: -0.75,
    },
    {
      n: "04",
      note: "“The reading list is 47 files.”",
      sub: "Searching one document at a time is the whole problem.",
      rotate: 1.25,
    },
    {
      n: "05",
      note: "“Not in the reading list” is a valid answer.",
      sub: "Anything else is invention.",
      rotate: -1,
    },
    {
      n: "06",
      note: "“I need the paragraph, not the PDF.”",
      sub: "A filename is not a citation.",
      rotate: 0.75,
    },
  ] satisfies Note[],
  briefLabel: "Taped to the board · the brief",
  briefFooter: "Source: PS-01 brief · 3 sentences · 2 requirements · 1 non-negotiable (evidence)",
  closing: "Time lost to searching is the symptom. Unverifiable answers are the risk.",
}

/* ── 02 · solution ────────────────────────────────────────────── */

export const SOLUTION = {
  eyebrow: "02 — Solution",
  line1: "An assistant that",
  line2: "shows its work.",
  lead: "Four behaviours, each one a direct answer to a line in the brief. No feature on this page exists for any other reason.",
  pillars: [
    {
      n: "01",
      title: "Accepts many documents",
      body: "PDF, DOCX, TXT, Markdown and HTML, in one drop. A folder is the unit of work, not a file.",
      serves: "accepts multiple documents",
    },
    {
      n: "02",
      title: "Answers from their content",
      body: "Retrieval runs over your corpus only. If the passage is not in the index, it is not in the answer.",
      serves: "answers questions using their content",
    },
    {
      n: "03",
      title: "Cites the relevant passages",
      body: "Every factual sentence carries document, page, section and the quoted span. Click it; read it.",
      serves: "cites the relevant passages",
    },
    {
      n: "04",
      title: "Admits when it cannot",
      body: "Below the evidence threshold, the assistant abstains — and shows what it did find, nearest first.",
      serves: "indicates when the answer cannot be found",
    },
  ],
  ruleLabel: "The rule we do not break",
  rule: "No sentence in an answer is allowed to exist without a supporting span. When the span is missing, the sentence is deleted — not softened, not hedged.",
}

/* ── 03 · how it works ────────────────────────────────────────── */

export const STAGES: Stage[] = [
  {
    n: "1",
    title: "Parse",
    body: "Layout-aware extraction: headings, lists, tables, page numbers and reading order. OCR fallback for scans. Output: text blocks with stable anchors, so a citation can point at a place, not a vibe.",
    contract: "pdf → blocks { doc_id, page, section, char_range }",
  },
  {
    n: "2",
    title: "Index",
    body: "Structure-aware chunking, 400–700 tokens, bounded by headings, 15% overlap. Two indexes over the same chunks: dense embeddings for meaning, BM25 for names, codes and exact phrases. Metadata retained per chunk.",
    contract: "chunk → { embedding, bm25, doc_id, page, section }",
  },
  {
    n: "3",
    title: "Retrieve",
    body: "Hybrid search, cross-encoder rerank, a per-document diversity quota so one file cannot swallow the answer, and a relevance floor below which nothing is returned at all.",
    contract: "scores → top-k + floor τ",
  },
  {
    n: "4",
    title: "Ground",
    body: "The model may only use retrieved context. Each generated sentence is aligned to one or more chunk spans; unsupported sentences are dropped. If the best span scores below τ, the assistant abstains and lists nearest matches.",
    contract: "span alignment → citations ✓ | abstain",
  },
]

export const FOCUS = ["Document parsing", "Retrieval", "Source-grounded answers"]

/* ── 04 · evidence ────────────────────────────────────────────── */

export const EVIDENCE = {
  eyebrow: "04 — Evidence",
  line1: "Ask the corpus.",
  line2: "Then check it.",
  lead: "A working sample over 12 documents — 486 pages of course readings, policies and reports. No login. No generated source.",
  corpusNote: "Sample data · illustrative transcript · not a live model",
  threads: [
    {
      kind: "answered" as const,
      question: "How do withdrawal deadlines work for lab courses, and do all the handbooks agree?",
      meta: "answered · 3 citations · 2 documents agree · 1 contradiction",
      lines: [
        {
          sentences: [
            {
              t: "Lab courses follow the standard withdrawal window: the first ten working days of the term.",
              cites: [1],
            },
            {
              t: "Laboratory sessions are excluded from the late-withdrawal petition route.",
              cites: [2],
            },
          ],
        },
        {
          sentences: [
            { t: "Two of the three handbooks agree.", cites: [] },
            {
              t: "The 2022–23 edition states a five-day window",
              cites: [3],
            },
          ],
          tail: " and contradicts the current policy.",
        },
      ],
      summary: "3 citations · 2 documents agree · 1 contradiction surfaced",
    },
    {
      kind: "abstained" as const,
      question: "What is the stipend for the 2027 fellowship?",
      meta: "abstained · nearest evidence shown · no answer generated",
      verdict: "Not found in your 12 documents.",
      lines: [
        {
          sentences: [
            {
              t: "Nothing in the supplied material describes a 2027 stipend.",
              cites: [],
            },
            {
              t: "The closest material is a 2026 rate table",
              cites: [4],
            },
          ],
          tail: " — different academic year, so it is not used as an answer.",
        },
      ],
      summary: "No answer generated · nearest evidence shown instead",
    },
  ],
  citations: [
    {
      id: 1,
      doc: "student-handbook-2026.pdf",
      page: 14,
      section: "§3.2",
      span: "Laboratory courses follow the standard withdrawal window: the first ten working days of the term.",
      status: "supports-1",
    },
    {
      id: 2,
      doc: "lab-safety-policy.pdf",
      page: 9,
      section: "§2.1",
      span: "Laboratory sessions are excluded from the late-withdrawal petition route.",
      status: "supports-2",
    },
    {
      id: 3,
      doc: "student-handbook-2022.pdf",
      page: 61,
      section: "§4.5",
      span: "Students may withdraw from a laboratory course within five working days of the first session.",
      status: "contradicts",
    },
    {
      id: 4,
      doc: "fellowship-terms-2026.pdf",
      page: 31,
      section: "§7",
      span: "The 2026 fellowship stipend is disbursed in two instalments per academic year.",
      status: "nearest-not-used",
    },
    {
      id: 5,
      doc: "academic-regulations-2026.pdf",
      page: 7,
      section: "§2.4",
      span: "The withdrawal window for all courses is ten working days from the first scheduled session.",
      status: "supports-1",
    },
    {
      id: 6,
      doc: "registry-circular-14.pdf",
      page: 5,
      section: "§2",
      span: "Late-withdrawal petitions are reviewed only for lecture-based courses.",
      status: "supports-2",
    },
  ] satisfies Citation[],
}

export const STATUS_LABEL: Record<CitationStatus, string> = {
  "supports-1": "Supports sentence 1",
  "supports-2": "Supports sentence 2",
  contradicts: "Contradicts [1]",
  "nearest-not-used": "Nearest — not used",
}

/* ── 05 · scope ───────────────────────────────────────────────── */

export const SCOPE = {
  eyebrow: "05 — Scope",
  line1: "What “done” means.",
  line2: "Measured, not imagined.",
  lead: "Written as acceptance criteria, not aspirations. These are the numbers the build is measured against — targets, not results.",
  criteria: [
    {
      n: "01",
      label: "Documents per session, mixed formats",
      target: "≥ 10 docs · PDF / DOCX / TXT / MD / HTML",
    },
    { n: "02", label: "Corpus scale", target: "≥ 500 pages, re-indexed in < 60s" },
    { n: "03", label: "Factual sentences carrying ≥ 1 citation", target: "100% (hard requirement)" },
    {
      n: "04",
      label: "Citations resolving to the supporting span (100-question human audit)",
      target: "≥ 95% target",
    },
    {
      n: "05",
      label: "Correct abstention on unanswerable questions",
      target: "100% of the held-out unanswerable set",
    },
    { n: "06", label: "False refusal on answerable questions", target: "< 10% target" },
    { n: "07", label: "Answers containing zero unsupported claims", target: "≥ 90% target" },
    {
      n: "08",
      label: "Contradiction handling",
      target: "surfaced explicitly, never silently averaged",
    },
    {
      n: "09",
      label: "Provenance per citation",
      target: "document · page · section · quoted span",
    },
    { n: "10", label: "Time to first token (500-page corpus)", target: "< 3s target" },
    {
      n: "11",
      label: "Privacy",
      target: "local ingestion option; no training on uploaded documents",
    },
  ] satisfies Criterion[],
  inScope: [
    "Multi-document ingestion across five formats",
    "Question answering grounded in the uploaded corpus",
    "Passage-level citations with page and section anchors",
    "Explicit abstention when the corpus does not answer",
    "Contradictions between documents surfaced, not smoothed",
    "Per-document and cross-document queries",
    "A versioned evaluation set for every claim above",
  ],
  outScope: [
    "Web search as a primary source",
    "Essay or report writing from the corpus",
    "Handwriting OCR and scanned diagram understanding",
    "Replacing the reader's judgement",
    "Producing an answer the corpus does not support — ever",
  ],
}

/* ── 06 · FAQ ─────────────────────────────────────────────────── */

export const FAQ = {
  eyebrow: "Questions",
  line1: "The four questions",
  line2: "a jury always asks.",
  items: [
    {
      q: "How is this different from pasting a document into a chatbot?",
      a: "A chatbot answers from everything it has ever read. This one answers from the twelve files you gave it, and refuses outside them. The difference is not quality; it is the boundary.",
    },
    {
      q: "What happens when the corpus has no answer?",
      a: "It says so, shows the nearest evidence, and generates nothing. That state is designed, tested and part of the acceptance criteria (05–06).",
    },
    {
      q: "How are citations verified?",
      a: "Every citation is a span-level alignment between a generated sentence and an indexed chunk. A 100-question human audit checks that each citation actually supports its sentence; the target is ≥ 95%.",
    },
    {
      q: "Does it work offline, with private documents?",
      a: "Ingestion can run locally with a local embedding model. Uploaded documents are never used for training.",
    },
  ],
}

/* ── 07 · closing + footer ────────────────────────────────────── */

export const CLOSING = {
  line1: "Read less.",
  line2: "Check more.",
  body: "The brief asked for answers with evidence. This is what that looks like when it is built.",
  cta: { label: "Open the demo", href: "#evidence" },
  footerLine: "PS-01 · Document-Grounded AI Research Assistant · Problem statement website",
}

export const FOOTER_COLUMNS = [
  {
    title: "Project",
    links: [
      { label: "Problem", href: "#problem" },
      { label: "Solution", href: "#solution" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Evidence", href: "#evidence" },
    ],
  },
  {
    title: "Brief",
    links: [
      { label: "Context & problem", href: "#problem" },
      { label: "Expected solution", href: "#solution" },
      { label: "Technical focus", href: "#how-it-works" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Document parsing", href: "#how-it-works" },
      { label: "Retrieval", href: "#how-it-works" },
      { label: "Source-grounded answers", href: "#how-it-works" },
    ],
  },
]

export const COLOPHON = [
  "Hero: liquid sculpture by guglielmogiannattasio.it",
  "Type: Geist, Geist Mono, Instrument Serif (OFL)",
  "Sample data: illustrative, not live",
]

/* ── the justification layer (documentation, not rendered) ────── */

export const STATEMENT_BANK = [
  { statement: "The information exists. Access is the bottleneck.", justifies: "C1" },
  { statement: "A fluent paragraph with no source is a guess with good grammar.", justifies: "C2" },
  { statement: "A filename is not a citation.", justifies: "C3" },
  { statement: "Every factual sentence carries a span, or it does not ship.", justifies: "C3" },
  { statement: "“Not in your sources” is an answer, not an error.", justifies: "C4" },
  { statement: "Retrieval never leaves your corpus.", justifies: "C3" },
  { statement: "Contradictions are shown, not smoothed.", justifies: "C1 + C3" },
  { statement: "Search finds strings. This finds meaning — then proves it.", justifies: "C1" },
  {
    statement: "Ten documents, five hundred pages, one answer with three citations.",
    justifies: "C1 + C3",
  },
  {
    statement: "You should be able to check the answer faster than you could have found it.",
    justifies: "C1 + C2",
  },
  { statement: "Grounding is a constraint, not a feature.", justifies: "C2 + C3" },
  {
    statement: "The model is allowed to be unhelpful. It is not allowed to be unsupported.",
    justifies: "C2 + C4",
  },
]
