# BUILD PROMPT — PS-01 · Document-Grounded AI Research Assistant

**A paste-ready prompt for a website / UI generation agent.**

> **Built already?** Yes — the reference implementation of this prompt lives in [`site/`](./site): Vite + React + TypeScript + Tailwind, the hero integrated verbatim, all nine sections. Run `cd site && npm install && npm run dev`. Use this file to regenerate or extend it.
>
> **How to use this file:** paste everything from `## 0. BRIEF` down to `## 12. DEFINITION OF DONE` into your generator.
> At **STEP 2** you will paste the full `liquid-sculpture-hero.tsx` source that you already have — byte for byte, unmodified.
> Nothing else needs to be supplied.

---

## 0. BRIEF

You are a senior product designer + front-end engineer. Build the **official project website for problem statement PS-01, "Document-Grounded AI Research Assistant"** — the site a jury, a mentor and a fellow student land on before they ever open the app.

The site has one job: **make the problem undeniable, make the solution obvious, and prove both with the interface itself.** It is a *product narrative*, not a dashboard. It does not need a backend, a login or a real model. It needs to be beautiful, fast, honest and finished.

The site must *behave like the product it describes*: every claim on the page is anchored to a source, every section is traceable, and the page openly marks the one thing the assistant cannot answer — because that honesty **is** the product.

**Deliverable:** a production-quality Next.js (App Router) + TypeScript + Tailwind + shadcn-structure site, one long scroll, light + dark, mobile-first responsive.

### The problem statement (source of truth — never paraphrase away its meaning)

```
PS-01 | DOCUMENT-GROUNDED AI RESEARCH ASSISTANT

CONTEXT & PROBLEM
Students and teams often spend too much time searching across long documents and
may receive answers without clear evidence.

EXPECTED SOLUTION
Build an assistant that accepts multiple documents, answers questions using their
content, cites the relevant passages and indicates when the answer cannot be
found in the supplied material.

TECHNICAL FOCUS
Document parsing | Retrieval | Source-grounded answers
```

### The four load-bearing claims (everything on the page serves one of these)

| # | Claim | Must appear on the page as |
|---|-------|----------------------------|
| **C1** | Reading across many long documents is slow and fragmented | A concrete, recognisable cost — time, tabs, re-reading |
| **C2** | Answers currently arrive **without clear evidence** | A visible "unsourced answer" state that the site refuses to ship |
| **C3** | The fix is answers **built from** the uploaded corpus, with **passage-level citations** | A real citation chip: document → page → section → highlighted span |
| **C4** | When the corpus does not contain the answer, the assistant **says so** | A designed, non-apologetic "not found in your sources" state |

If a section, sentence, number or animation does not serve C1–C4, delete it.

---

## 1. HARD RULES

1. **The hero is untouchable.** The liquid-sculpture hero ships exactly as provided. Do not restyle its internals, re-tune its shaders, change its CSS block, swap its easing, or replace its layout `computeRect()` logic. Adapt it only through its **props** (Section 3) and its surrounding page chrome.
2. **Do not invent metrics.** Any number that is not defined in Section 6 is forbidden. Targets are written as targets ("target: ≥95%"), never as achievements. No "10×", no "99.9%", no fake user counts, no logos of companies who never used it.
3. **No emoji, no stock photography, no glassmorphism, no gradient blobs, no purple SaaS glow.** The aesthetic is *editorial research tooling*: paper, ink, hairlines, one moving sculpture.
4. **Every visual claim must be implementable.** If the page says "page, section and highlighted span", the demo transcript must show all three.
5. **The abstention state is a feature, not an error.** Style it as calmly as the success state — a thin rule, a label, a plain sentence. Never red, never a sad icon.
6. **Copy is final copy.** Write the real sentences given in Section 5 into the page. Do not fill with lorem ipsum, "Lorem", "Your text here", or generic AI-startup filler.
7. **Light and dark are both first-class.** The hero's theme toggle must drive the whole page, not just the hero.
8. **Accessibility is not optional.** WCAG AA contrast, visible focus rings, keyboard-operable toggles, `prefers-reduced-motion` honoured everywhere, semantic landmarks.

---

## 2. STACK SETUP (do this before writing components)

### 2.1 What the project must support

- **Next.js 14/15 App Router** (or an equivalent React + TypeScript + Vite setup)
- **TypeScript** — `strict: true`
- **Tailwind CSS v3.4+ or v4**
- **shadcn/ui project structure** with the `@/` path alias

### 2.2 If the repo is empty or does not meet the above

```bash
npx create-next-app@latest ps01-grounded --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"
cd ps01-grounded
npx shadcn@latest init
npx shadcn@latest add button separator badge tooltip
```

If Tailwind is missing:

```bash
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tsconfig.json` must contain:

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./*"] } } }
```

`tailwind.config.ts` must scan the component paths:

```ts
content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"]
```

### 2.3 Canonical paths (create them, even if empty at first)

```
/app
  layout.tsx                # fonts, metadata, theme class, <html lang="en">
  page.tsx                  # the single long-scroll page
  globals.css               # tokens, base type, focus styles, scroll behaviour
/components
  /ui                       # shadcn primitives + liquid-sculpture-hero.tsx  ← required
  /sections                 # the page sections you build
/lib
  content.ts                # all strings, data, citations, statement bank
  utils.ts                  # cn()
```

**Why `/components/ui` matters:** shadcn's CLI, its `components.json` aliases, and every future `npx shadcn add …` command resolve imports against `components/ui` and `lib/utils`. If the hero lives at `components/liquid-sculpture-hero.tsx`, `npx shadcn add` will keep generating files in a *different* folder, the project ends up with two competing conventions, and imports drift into `../../../components/`. Keep the primitive/hero layer in `components/ui`, keep page sections in `components/sections`, and import as `@/components/ui/liquid-sculpture-hero`.

If the project already uses a different default (e.g. `src/components/ui`), keep **that** default and mirror it consistently — do not create a second `ui` directory.

---

## 3. STEP 2 — INTEGRATE THE HERO

Copy the provided component **verbatim** to:

```
/components/ui/liquid-sculpture-hero.tsx
```

and create the demo entry:

```tsx
// /components/ui/demo.tsx   (reference only — the real usage is in app/page.tsx)
import SculptureHero from "@/components/ui/liquid-sculpture-hero"

export default function Demo() {
  return <SculptureHero />
}
```

### 3.1 Do not modify

- the WebGL2 GPGPU engine, shaders (`NOISE`, `ENERGY`, `QUAD_VS`, `FLOW_FS`, `SIM_FS`, `PART_VS`, `PART_FS`, `IMAGE_FS`)
- `LiquidEngine` (texture formats, `TEX_W`, settle logic, `requestAnimationFrame` loop, pointer handling)
- `computeRect()`, the embedded `CSS` string, `injectFonts()`, `renderHeadline()`
- prop names, defaults, clamping ranges, the fallback `<img>`, the reduced-motion paths

You may only: (a) pass props, (b) place the component on the page, (c) build sections around it.

### 3.2 Hero configuration for this project (the canonical call)

```tsx
<SculptureHero
  // ── brand + navigation ──────────────────────────────────────────────
  brand="Grounded"
  navLinks={[
    { label: "Problem", href: "#problem" },
    { label: "Solution", href: "#solution" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Evidence", href: "#evidence" },
    { label: "Scope", href: "#scope" },
  ]}
  navCta={{ label: "Try the demo", href: "#demo" }}
  eyebrow="PS-01 · Document-Grounded AI Research Assistant"
  headline={"Every answer\ncites its source."}
  headlineAccent="cites its source."
  body="Upload the readings, reports and notes you already have. Ask anything. Get an answer built only from those documents — with the passage, page and section that proves it, and an honest “not in your sources” when the evidence is not there."
  primaryCta={{ label: "See a grounded answer", href: "#demo" }}
  secondaryCta={{ label: "Read the problem statement", href: "#problem" }}
  hint="Move across the evidence"
  hintTouch="Touch the evidence"
  backdropText="evidence"
  // ── theme ───────────────────────────────────────────────────────────
  theme="light"
  themeToggle
  background="#EBE9E5"
  darkBackground="#111110"
  textColor="#151514"
  headingFont="'Geist', 'Helvetica Neue', Arial, sans-serif"
  accentFont="'Instrument Serif', 'Times New Roman', serif"
  bodyFont="'Geist', 'Helvetica Neue', Arial, sans-serif"
  loadFonts
  // ── sculpture ───────────────────────────────────────────────────────
  // Ship a cut-out (transparent) image: an interwoven filament loop on nothing.
  // A flat-background image also works, but it is keyed out by colour, so every
  // sub-pixel gap around the strands keeps a film of the old ground — visible as
  // a grey halo once the page background differs from the image's own ground.
  src="/sculpture-light.png"       // transparent background, ink-dark strands
  darkSrc="/sculpture-dark.png"    // transparent background, warm-light strands
  mobileSrc="/sculpture-light.png"
  mobileDarkSrc="/sculpture-dark.png"
  imageAlt="A cloud of fine metallic filaments resolving into a solid loop — the material of many documents, gathered into one answer"
  // ── interaction (defaults, tune only if a device test demands it) ────
  interactive
  strength={1}
  radius={220}
  particleDensity={1}
  dotSize={1}
  particleSpread={1}
  turbulence={1}
  liquid={1}
  streaks
  restStyle="image"
  returnSpeed={1}
  ambient={false}
  speed={1}
  intro
  height="100svh"
  showCredit
/>
```

Notes:

- `headline` uses a real newline (`"Every answer\ncites its source."`). The second line is the accent line — Instrument Serif italic. This is the single most important typographic moment on the site; do not shorten it to one line.
- `intro` is `true` here (the packaged default is `false`): the assembly animation doubles as a metaphor — loose fragments of many documents settling into one coherent form. It self-disables under `prefers-reduced-motion`.
- The sculpture image is part of the design and must stay a *loop of filaments*, never a stock photo,
  a 3D render, a product shot or a logo. Two acceptable forms:
  **cut-out PNG with real alpha (preferred)** or a flat-background image served same-origin with
  permissive CORS. Anything else and the hero either falls back to a static `<img>` or paints a halo.
- Produce the cut-out properly: key the ground out, then set the RGB of every fully transparent pixel
  to the strand colour (not black). A black-under-transparent PNG anti-aliases into grey speckle at
  the edges — visually identical to the "1.4 MB of grey mush" failure mode.
- Keep `showCredit` — the component is by guglielmogiannattasio.it.

### 3.3 Wiring the theme toggle to the whole page

The hero owns its own light/dark state. Do **not** rewrite it. Instead:

1. Let the hero keep its toggle (it is inside the component).
2. Mirror the page theme with a `MutationObserver`-free approach: put `class="dark"` on `<html>` from a tiny `ThemeProvider` used by the sections below the hero, and give the hero `theme` + `key` so it mounts in sync; **or** simply accept the hero's local toggle and add a second, page-level toggle in the sticky top bar for the sections below the fold.
3. Whichever you choose: both must resolve to the *same* two palettes in Section 4 — `#EBE9E5` / `#111110`. No third theme.

---

## 4. DESIGN SYSTEM

### 4.1 Palette (the hero sets the tone — everything else agrees with it)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#EBE9E5` | `#111110` | page background |
| `--paper-raised` | `#F4F2EE` | `#191918` | cards, chips, sticky notes |
| `--ink` | `#151514` | `#F1EFEA` | primary text |
| `--ink-70` | `rgba(21,21,20,.70)` | `rgba(241,239,234,.70)` | body copy |
| `--ink-45` | `rgba(21,21,20,.45)` | `rgba(241,239,234,.45)` | captions, labels |
| `--rule` | `rgba(21,21,20,.12)` | `rgba(241,239,234,.14)` | hairlines |
| `--cite` | `#6B6A66` | `#A5A29B` | monospaced citation text |
| `--mark` | `rgba(21,21,20,.07)` | `rgba(241,239,234,.10)` | citation highlight wash |

No accent hue beyond ink. Emphasis comes from **scale, serif italic, and hairlines** — not colour. The only permitted colour exception: a single, restrained `--verify` green `#3F6B4A` used *only* on the "supported ✓" tick inside the evidence section, and only in light mode as `#3F6B4A` / dark `#8FB79A`.

### 4.2 Type

- **Display / UI:** Geist (400/500/600), tracking `-0.02em`, optical size on headlines.
- **Accent:** Instrument Serif *italic* for one phrase per section maximum — never body copy.
- **Mono / citations:** Geist Mono, `11–12px`, `letter-spacing: 0.02em`, tabular.
- **Scale (desktop):** section eyebrow `12px / uppercase / 0.14em`; H2 `clamp(32px, 4.2vw, 60px)`; lead `clamp(17px, 1.35vw, 21px)`; body `16px / 1.6`; caption `13px`.
- **Measure:** body copy max `62ch`; lead max `46ch`.

### 4.3 Structure & rhythm

- Content column: `max-width: 1200px`, `padding-inline: clamp(20px, 4vw, 48px)`.
- Vertical rhythm: section padding `clamp(72px, 9vw, 140px)` top/bottom; hairline divider between every section, full-bleed, `1px solid var(--rule)`.
- Every section opens with a **numbered eyebrow**: `01 — PROBLEM`, `02 — SOLUTION`, `03 — HOW IT WORKS`, `04 — EVIDENCE`, `05 — SCOPE`.
- Grid: 12 columns on desktop, 6 on tablet, single column under 640px. Cards never exceed 3 per row.
- Corner radii: `2px` on cards and chips (paper, not bubbles). The only `999px` pills are nav CTA / hero buttons (already in the hero).

### 4.4 Motion (outside the hero)

- One gesture: `opacity 0 → 1`, `translateY(12px) → 0`, `420ms`, `cubic-bezier(.22,.7,.2,1)`, triggered once by `IntersectionObserver` at 15% visibility, staggered 60ms per child.
- Sticky notes may have a static `-1.5deg / +1deg` rotation — **not** animated.
- Hover on citation chips: underline the linked sentence in the transcript and lift the chip 1px. That is the whole interaction budget.
- `prefers-reduced-motion: reduce` → all of the above become instant, no `translateY`, no stagger, hero shaders already handle themselves.
- No parallax, no scroll-jacking, no cursor followers outside the hero, no auto-advancing carousels.

### 4.5 Signature visual: the "evidence trail"

Anywhere the page states a fact, it carries a citation chip:

```
[1]  admissions-policy-2026.pdf · p.14 · §3.2
```

Chip = mono text, 1px rule border, `--paper-raised` fill, 24px height, radius 2px, hover lifts. Clicking scrolls to the corresponding row in the Evidence section and applies a 1.2s `--mark` background wash to the exact quoted sentence. This single pattern is what makes the site feel like the product.

### 4.6 The whiteboard moment (Section 01)

The problem section is designed as a **research desk**, not a card grid:

- background: paper + a 24px dot grid at `rgba(21,21,20,.06)` (dark: `rgba(241,239,234,.06)`), masked to fade at the edges;
- six sticky notes, `220–260px` wide, `--paper-raised`, 1px rule, 2px radius, slight rotations, mono footnote numbers;
- one taped-on printout of the **verbatim PS-01 block** (Section 0) set in mono at `13–14px` — this is the only place the raw statement appears, and it must be *exactly* as given, including the `PS-01 |` prefix and the `CONTEXT & PROBLEM` / `EXPECTED SOLUTION` / `TECHNICAL FOCUS` labels;
- a hand-drawn-feeling connector: a 1px hairline with a small arrowhead, drawn in SVG (no scribble art, no clip-art hand);
- on mobile the notes stack, rotations go to 0, grid becomes 16px.

---

## 5. PAGE STRUCTURE + FINAL COPY

Nine sections. Copy below is final — use it as written, only fixing casing/spacing.

---

### 01 — PROBLEM  · `id="problem"`

**Eyebrow:** `01 — Problem`
**H2:** `The answer was in the reading.`
**H2 accent line:** *(Instrument Serif italic)* `Finding it cost the afternoon.`
**Lead:**
> A semester of readings, a folder of policy PDFs, four reports from last quarter. The information exists. What does not exist is a way to ask a question and get an answer you can *check*.

**Whiteboard notes (sticky cards, verbatim):**

| # | Note | Under it |
|---|------|----------|
| 01 | "Where did I actually read that?" | Page 114 of a 300-page handbook. Ctrl+F needs the exact words. |
| 02 | "It answered instantly. It was wrong." | A fluent paragraph with no source is not an answer — it is a guess with good grammar. |
| 03 | "Which version is current?" | Three handbooks, two revisions. The newest one contradicts the one everyone quotes. |
| 04 | "The reading list is 47 files." | Searching one document at a time is the whole problem. |
| 05 | "‘Not in the reading list’ is a valid answer." | Anything else is invention. |
| 06 | "I need the paragraph, not the PDF." | A filename is not a citation. |

**Printout card:** the verbatim PS-01 block (Section 0), labelled `TAPED TO THE BOARD · THE BRIEF`, with a mono footer:
`Source: PS-01 brief · 3 sentences · 2 requirements · 1 non-negotiable (evidence)`

**Closing line (right-aligned, serif italic):**
> *Time lost to searching is the symptom. Unverifiable answers are the risk.*

---

### 02 — SOLUTION  · `id="solution"`

**Eyebrow:** `02 — Solution`
**H2:** `An assistant that shows its work.`
**Lead:**
> Four behaviours, each one a direct answer to a line in the brief. No feature on this page exists for any other reason.

Four columns (number, title, one sentence, one citation to the brief line it serves):

1. **Accepts many documents** — *"PDF, DOCX, TXT, Markdown and HTML, in one drop. A folder is the unit of work, not a file."* → serves **"accepts multiple documents"**
2. **Answers from their content** — *"Retrieval runs over your corpus only. If the passage is not in the index, it is not in the answer."* → serves **"answers questions using their content"**
3. **Cites the relevant passages** — *"Every factual sentence carries document, page, section and the quoted span. Click it; read it."* → serves **"cites the relevant passages"**
4. **Admits when it cannot** — *"Below the evidence threshold, the assistant abstains — and shows what it did find, nearest first."* → serves **"indicates when the answer cannot be found"**

Under the columns, one full-width hairline band:

> **The rule we do not break:** no sentence in an answer is allowed to exist without a supporting span. When the span is missing, the sentence is deleted — not softened, not hedged.

---

### 03 — HOW IT WORKS  · `id="how-it-works"`

**Eyebrow:** `03 — How it works`
**H2:** `Four stages. One chain of custody.`
**Lead:** `Every stage can be inspected. Nothing is a black box that swallows your document and returns a mood.`

A horizontal stepper on desktop (vertical on mobile), each step expandable to a detail panel:

**1 · Parse** — layout-aware extraction: headings, lists, tables, page numbers, reading order. OCR fallback for scans. *Output: text blocks with stable anchors.*
`pdf → blocks {doc_id, page, section, char_range}`

**2 · Index** — structure-aware chunking (400–700 tokens, heading-bounded, 15% overlap); hybrid index = dense embeddings + BM25; metadata retained per chunk.
`chunk → {embedding, bm25, doc_id, page, section}`

**3 · Retrieve** — hybrid search, cross-encoder rerank, per-document diversity quota, top-k with a relevance floor.
`scores → top-k + floor τ`

**4 · Ground** — the model may only use retrieved context; each generated sentence is aligned to one or more chunk spans; unsupported sentences are dropped; if the best span score `< τ`, the assistant abstains and lists nearest matches.
`span alignment → citations ✓ | abstain`

Below the stepper, three mono "focus" chips — copied exactly from the brief:
`Document parsing` · `Retrieval` · `Source-grounded answers`

---

### 04 — EVIDENCE (LIVE DEMO)  · `id="demo"` / `id="evidence"`

**Eyebrow:** `04 — Evidence`
**H2:** `Ask the corpus. Then check it.`
**Lead:** `A working sample over 12 documents — 486 pages of course readings, policies and reports. No login. No generated source.`

**Transcript card** (paper-raised, 1px rule, sticky to the right on desktop):

```
YOU
How do withdrawal deadlines work for lab courses,
and do all the handbooks agree?

GROUNDED
Lab courses follow the standard withdrawal window: the first
ten working days of the term [1]. Laboratory sessions are
excluded from the late-withdrawal petition route [2].

Two of the three handbooks agree. The 2022–23 edition states
a five-day window [3] and contradicts the current policy.

[1] student-handbook-2026.pdf · p.14 · §3.2
[2] lab-safety-policy.pdf · p.9 · §2.1
[3] student-handbook-2022.pdf · p.61 · §4.5

✓ 3 citations · 2 documents agree · 1 contradiction surfaced
```

Interactive behaviour: hovering or focusing citation **`[1]`** highlights the quoted sentence above it and the matching row in the evidence list below. Keyboard accessible (`tabindex`, `:focus-visible`).

**The abstention card** (equal weight, immediately after — this is the point of the whole page):

```
YOU
What is the stipend for the 2027 fellowship?

GROUNDED
Not found in your 12 documents.

Nothing in the supplied material describes a 2027 stipend.
The closest material is a 2026 rate table [1] — different
academic year, so it is not used as an answer.

[1] fellowship-terms-2026.pdf · p.31 · §7

— No answer generated. Nearest evidence shown instead.
```

Label the pair honestly: `Sample data · illustrative transcript · not a live model`.

**Evidence table** (the part that proves C3): one row per citation, columns `#`, `Document`, `Page`, `Section`, `Quoted span`, `Status`. Six rows total, three matching the answered transcript, one matching the abstention's nearest evidence, and two extra. Status values: `Supports sentence 1`, `Supports sentence 2`, `Contradicts [1]`, `Nearest — not used`.
Quoted spans in mono, marked with `--mark`, each ≤ 140 characters.

**Do not** put a fake chat input that returns canned text on submit unless it *actually* reveals the pre-written transcript with a 700ms "retrieving" state, and that state explicitly says `sample`. A disabled, labelled input is more honest and looks better than a lying one.

---

### 05 — SCOPE  · `id="scope"`

**Eyebrow:** `05 — Scope`
**H2:** `What “done” means.`
**Lead:** `Written as acceptance criteria, not aspirations. These are the numbers the build is measured against — targets, not results.`

**Acceptance criteria table** (mono numerals, hairline rows):

| # | Criterion | Target |
|---|---|---|
| 01 | Documents per session, mixed formats | ≥ 10 docs · PDF / DOCX / TXT / MD / HTML |
| 02 | Corpus scale | ≥ 500 pages, re-indexed in < 60s |
| 03 | Factual sentences carrying ≥ 1 citation | 100% (hard requirement) |
| 04 | Citations resolving to the supporting span (100-question human audit) | ≥ 95% |
| 05 | Correct abstention on unanswerable questions | 100% of the held-out unanswerable set |
| 06 | False refusal on answerable questions | < 10% |
| 07 | Answers containing zero unsupported claims | ≥ 90% |
| 08 | Contradiction handling | surfaced explicitly, never silently averaged |
| 09 | Provenance per citation | document · page · section · quoted span |
| 10 | Time to first token (500-page corpus) | < 3s target |
| 11 | Privacy | local ingestion option; no training on uploaded documents |

**Two columns side by side:**

**In scope** — multi-document ingestion; grounded Q&A; passage citations with deep links; abstention; contradiction surfacing; per-document and cross-document queries; an evaluation set.

**Out of scope (stated, not hidden)** — web search as a primary source; essay or report writing; handwriting OCR; replacing the reader's judgement; producing an answer the corpus does not support. Ever.

---

### 06 — STATEMENT BANK (the reasoning behind the page)

Do not render this section as its own block. It is the **justification layer**: each sentence below is a pool of defensible statements for headlines, leads, captions, meta descriptions and the jury Q&A. Use them; keep their meaning intact.

| Statement (page-ready) | Justifies | Why it holds |
|---|---|---|
| "The information exists. Access is the bottleneck." | C1 | Restates the brief's "spend too much time searching" without exaggeration |
| "A fluent paragraph with no source is a guess with good grammar." | C2 | Concretises "answers without clear evidence" |
| "A filename is not a citation." | C3 | Sets the unit of proof at passage level, matching "cites the relevant passages" |
| "Every factual sentence carries a span, or it does not ship." | C3 | Makes the citation requirement enforceable, not aspirational |
| "‘Not in your sources' is an answer, not an error." | C4 | Direct restatement of the brief's final requirement |
| "Retrieval never leaves your corpus." | C3 | Defines scope of grounding ("using their content") |
| "Contradictions are shown, not smoothed." | C1 + C3 | Multi-document search is precisely where versions disagree; hiding it re-creates the trust problem |
| "Search finds strings. This finds meaning — then proves it." | C1 | Explains why Ctrl+F is insufficient, without claiming magic |
| "Ten documents, five hundred pages, one answer with three citations." | C1 + C3 | Concrete, checkable scale — matches acceptance criteria 01–02 |
| "You should be able to check the answer faster than you could have found it." | C1 + C2 | The product's success condition, stated as user benefit |
| "Grounding is a constraint, not a feature." | C2 + C3 | Frames abstention and citation as architecture |
| "The model is allowed to be unhelpful. It is not allowed to be unsupported." | C2 + C4 | The single sentence a jury will remember |

### What NOT to write (hallucination bait)

- "Revolutionary AI that understands any document." — unprovable, generic.
- "100% accurate answers." — contradicts abstention (C4) and is falsifiable in one question.
- "Trusted by 10,000 students." — fabricated traction.
- "Powered by GPT-4o / Claude / Gemini" as a headline claim — the brief is about grounding, not vendor.
- "Reads handwriting, images, spreadsheets" — outside scope; promising it undermines the scope table.
- Any benchmark number presented as a measured result. Only targets, only where the table says target.

---

### 07 — FAQ

**Eyebrow:** `Questions`
**H2:** `The four questions a jury always asks.`

1. **"How is this different from pasting a document into a chatbot?"** — A chatbot answers from everything it has ever read. This one answers from the twelve files you gave it, and refuses outside them. The difference is not quality; it is the boundary.
2. **"What happens when the corpus has no answer?"** — It says so, shows the nearest evidence, and generates nothing. That state is designed, tested and part of the acceptance criteria (05–06).
3. **"How are citations verified?"** — Every citation is a span-level alignment between a generated sentence and an indexed chunk. A 100-question human audit checks that each citation actually supports its sentence; the target is ≥ 95%.
4. **"Does it work offline / with private documents?"** — Ingestion can run locally with a local embedding model. Uploaded documents are never used for training.

Accordion: hairline rows, `+` / `−` glyphs drawn in CSS, one open at a time, animated height ≤ 240ms, keyboard accessible.

---

### 08 — CLOSING

A quiet full-width band on the hero's exact paper colour:

**H2 (serif italic on the second line):**
> Read less. *Check more.*

One line of body, one button:

> The brief asked for answers with evidence. This is what that looks like when it is built.

`Open the demo →` (primary, hidden if there is no demo — replace with `Read the technical notes →`)

Then a single mono line: `PS-01 · Document-Grounded AI Research Assistant · Problem statement website`

---

### 09 — FOOTER

Four columns, hairline top:
- **Project** — Problem · Solution · How it works · Evidence
- **Brief** — Context & problem · Expected solution · Technical focus
- **Build** — Document parsing · Retrieval · Source-grounded answers
- **Colophon** — `Hero: liquid sculpture by guglielmogiannattasio.it` · `Type: Geist, Instrument Serif (OFL)` · `Sample data: illustrative, not live`

Bottom row: `© 2026 · PS-01` and a `Back to top` link.

---

## 6. DATA + CONTENT MODEL

All copy and sample data live in `/lib/content.ts`. No strings hard-coded inside section components. Types:

```ts
export type Citation = {
  id: number
  doc: string
  page: number
  section: string
  span: string          // ≤ 140 chars, verbatim
  status: "supports-1" | "supports-2" | "contradicts" | "nearest-not-used"
}

export type Turn = {
  role: "you" | "grounded"
  text: string
  citations?: number[]  // ids from the evidence table
  outcome: "answered" | "abstained" | "contradiction"
}

export type Criterion = { n: string; label: string; target: string }
export type Stage = { n: string; title: string; body: string; contract: string }
export type Note = { n: string; note: string; sub: string; rotate: number }
```

Rules for this data:
- Exactly **6** evidence rows, **4** transcript turns across 2 questions, **4** stages, **11** criteria, **6** whiteboard notes, **12** statements in the bank (bank is documentation, not rendered).
- Every `span` must be plausible document prose — no `Lorem`, no `...`, no placeholder brackets.
- Document filenames are kebab-case, dated, and consistent everywhere they appear (`student-handbook-2026.pdf` is always spelled that way).

---

## 7. RESPONSIVE SPEC

| Width | Behaviour |
|---|---|
| ≥ 1280 | 12-col grid; hero at full viewport; stepper horizontal; transcript / evidence stacked in one right column |
| 1024–1279 | 8-col; stepper horizontal with tighter labels; evidence table becomes 4 columns (span wraps below) |
| 768–1023 | 6-col; stepper vertical; transcript card full width; notes 2-up |
| ≤ 639 | single column; notes stack with 0° rotation; dot grid 16px; section padding 64px; evidence table becomes stacked cards (`label / value` pairs); hero already has its own mobile sculpting logic — do nothing to it |

No horizontal scroll at any width. Test at 320px.

---

## 8. ACCESSIBILITY

- Landmarks: `<header>` (hero), `<main>`, `<section aria-labelledby>`, `<footer>`.
- One `<h1>` — inside the hero. Every section uses `<h2>`.
- Citation chips: `<a href="#evidence-row-1">` or `<button aria-controls>`, never a bare `<span onclick>`.
- Evidence table: real `<table>` with `<caption class="sr-only">`, `<th scope="col">`.
- Accordion: `<button aria-expanded aria-controls>` + region.
- Focus: `outline: 2px solid currentColor; outline-offset: 4px` — visible on `--paper` and `--paper-raised`.
- Colour contrast ≥ 4.5:1 for body, ≥ 3:1 for large display text and rules used as UI.
- The hero canvas is `aria-hidden`; its alt text is already supplied via a visually hidden span by the component.
- Motion: everything outside the hero collapses under `prefers-reduced-motion: reduce`.

---

## 9. PERFORMANCE

- The hero is client-only. In Next.js, `next/dynamic` it with `ssr: false` and a static `<img>` poster fallback that uses the same `src` and the same rect logic — or simply `<SculptureHero />` in a `"use client"` page section; the component already guards `document`.
- Fonts: `next/font/google` for Geist + Instrument Serif, `display: swap`, subset latin. Do not load a second copy — set `loadFonts={false}` **only** if you have verified the `next/font` family names match the component's CSS variables and re-measure the layout.
- No animation libraries. `IntersectionObserver` + CSS transitions only.
- Target: LCP < 2.5s on a mid-range laptop, CLS ≈ 0 (reserve every card's height).
- Sample data ships in the bundle; no API calls, no fake `fetch`.

---

## 10. QUALITY BAR — what "beautiful" means here

1. **One idea per screen.** Generous whitespace; nothing competes with the hero.
2. **Typography does the work.** Large, tight, confident headlines; a single serif italic accent; mono only for evidence.
3. **Hairlines, not boxes.** Sections separate with 1px rules, not shadows. Shadows appear only when a card is lifted 1px on hover.
4. **The citations are the ornament.** No decorative graphics. The repeating mono chip is the site's visual motif.
5. **Honest asymmetry.** The hero is centred and monumental; the sections below are left-aligned and editorial. That contrast is the composition.
6. **Nothing moves unless it means something.** One fade-up. One hover lift. One assembly animation — and that one belongs to the sculpture.
7. **It survives a screenshot.** At 1440×900, the first fold is: nav, sculpture, eyebrow, "Every answer / cites its source.", one paragraph, two CTAs. Nothing else.

---

## 11. BUILD ORDER

1. Scaffold + tokens + fonts (Section 2, 4).
2. Hero integrated exactly (Section 3) — verify: intro plays once, pointer disturbs the material, it settles, theme toggle works, no console errors, fallback image appears when WebGL2 is unavailable.
3. `lib/content.ts` with every string from Section 5.
4. Sections 01 → 08 in order, each with its numbered eyebrow and hairline divider.
5. Evidence interaction: chip ⇄ row ⇄ span highlight, keyboard included.
6. Theme parity across hero and page.
7. Responsive pass at 1440 / 1024 / 768 / 390 / 320.
8. A11y pass: tab through the whole page, axe clean.
9. Performance pass: Lighthouse ≥ 90 performance, 100 accessibility on desktop.
10. Final copy audit against Section 5 — diff every sentence.

---

## 12. DEFINITION OF DONE

- [ ] `components/ui/liquid-sculpture-hero.tsx` is byte-identical to the supplied source.
- [ ] Site runs with `npm run dev` and builds with `npm run build` (zero type errors, zero ESLint errors).
- [ ] All nine sections present, in order, with the exact copy from Section 5.
- [ ] The verbatim PS-01 block appears once, unaltered, in section 01.
- [ ] Four claims C1–C4 are each visibly present, with the citation format `doc · page · section · span`.
- [ ] The abstention state is rendered with the same visual weight as the answered state.
- [ ] No fabricated statistic, testimonial, logo or benchmark anywhere on the page.
- [ ] Light and dark both pass contrast checks; no unstyled flash on load.
- [ ] Works at 320px with no horizontal scroll.
- [ ] Keyboard-only user can reach and operate: nav, theme toggle, every citation, every accordion, both CTAs.
- [ ] `prefers-reduced-motion: reduce` → no intro, no fades, no hover translation.
- [ ] First fold at 1440×900 matches Section 10.7 exactly.
- [ ] Hero credit link intact.

---

## 13. WHAT TO ASK ME BEFORE STARTING

Only if genuinely blocked — otherwise make the call and keep going:

1. Is there an existing demo/API, or should "Open the demo" point at `#evidence`? *(Default: `#evidence`.)*
2. Is the brand name "Grounded" or something else? *(Default: "Grounded".)*
3. Should browser-only local storage be used to persist theme? *(Default: yes, `localStorage`, no flash.)*

Everything else: decide, document the decision in a one-line code comment, and ship.
