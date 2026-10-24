import * as React from "react"
import { Reveal } from "@/components/reveal"
import { EVIDENCE, STATUS_LABEL, type AnswerLine, type CitationStatus } from "@/lib/content"
import { cn } from "@/lib/utils"

type Thread = (typeof EVIDENCE.threads)[number]

const statusTone: Record<CitationStatus, string> = {
  "supports-1": "text-verify",
  "supports-2": "text-verify",
  contradicts: "text-ink/75",
  "nearest-not-used": "text-ink/40",
}

const statusMark: Record<CitationStatus, string> = {
  "supports-1": "✓",
  "supports-2": "✓",
  contradicts: "≠",
  "nearest-not-used": "○",
}

const byId = (id: number) => EVIDENCE.citations.find((c) => c.id === id)!

/* ── one answer sentence + its citation chip ──────────────────── */

function Sentence({
  text,
  cites,
  active,
  setActive,
}: {
  text: string
  cites: number[]
  active: number | null
  setActive: (v: number | null) => void
}) {
  const lit = active !== null && cites.includes(active)
  return (
    <span className="q-sentence" data-lit={lit ? "true" : "false"}>
      {text}
      {cites.map((id) => (
        <sup key={id} className="ml-0.5 inline-block align-super">
          <button
            type="button"
            onMouseEnter={() => setActive(id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(id)}
            onBlur={() => setActive(null)}
            onClick={() => {
              setActive(id)
              const row = document.getElementById(`evidence-row-${id}`)
              if (row && window.matchMedia("(max-width: 1023px)").matches) {
                row.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            }}
            aria-label={`Citation ${id}: ${byId(id).doc}, page ${byId(id).page}, ${
              byId(id).section
            }`}
            className={cn(
              // cite-hit: an invisible 8px halo, so the chip stays small and is still tappable
              "cite-hit relative rounded-[2px] border px-[3px] py-[2px] font-mono text-[9px] leading-none transition-colors duration-200",
              active === id
                ? "border-ink bg-ink text-paper"
                : "border-rule/30 bg-raised text-cite hover:border-rule/60 hover:text-ink"
            )}
          >
            {id}
          </button>
        </sup>
      ))}
    </span>
  )
}

/* ── the transcript card ──────────────────────────────────────── */

function ThreadCard({
  thread,
  index,
  active,
  setActive,
}: {
  thread: Thread
  index: number
  active: number | null
  setActive: (v: number | null) => void
}) {
  const abstained = thread.kind === "abstained"

  return (
    <article
      className={cn(
        "relative border",
        abstained ? "border-rule/20 bg-paper" : "border-rule/20 bg-raised"
      )}
    >
      <header className="flex items-center justify-between gap-4 border-b border-rule/12 px-5 py-2.5 sm:px-6">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink/40">
          {abstained ? "Question 02" : "Question 01"}
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink/45">
          <span
            aria-hidden="true"
            className={cn(
              "block h-1.5 w-1.5 rounded-full",
              abstained ? "border border-ink/45 bg-transparent" : "bg-verify"
            )}
          />
          {abstained ? "abstained" : "answered"}
        </span>
      </header>

      <div className="px-5 py-5 sm:px-6">
        <p className="caption mb-2.5">You</p>
        <p className="text-[15.5px] leading-[1.45] tracking-[-0.01em] text-ink">{thread.question}</p>
      </div>

      <div className={cn("border-t px-5 py-5 sm:px-6", abstained ? "border-rule/12" : "border-rule/12")}>
        <div className="mb-3 flex items-center gap-2">
          <span className="caption">Grounded</span>
          <span className="h-px flex-1 bg-rule/12" aria-hidden="true" />
          <span className="font-mono text-[9px] tracking-[0.1em] text-ink/30">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {"verdict" in thread && thread.verdict ? (
          <p className="mb-2 text-[16px] font-medium tracking-[-0.02em]">{thread.verdict}</p>
        ) : null}

        <div className="space-y-3.5">
          {thread.lines.map((line: AnswerLine, li: number) => (
            <p key={li} className="text-[15px] leading-[1.6] text-ink/85">
              {line.sentences.map((s, si) => (
                <React.Fragment key={si}>
                  {si > 0 ? " " : null}
                  <Sentence text={s.t} cites={s.cites} active={active} setActive={setActive} />
                </React.Fragment>
              ))}
              {line.tail ?? ""}
            </p>
          ))}
        </div>

        <ul className="mt-5 space-y-1.5 border-t border-rule/12 pt-3.5">
          {Array.from(new Set(thread.lines.flatMap((l: AnswerLine) => l.sentences.flatMap((s) => s.cites)))).map(
            (id) => {
              const c = byId(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(id)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(id)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      "flex w-full items-baseline gap-2 rounded-[2px] py-0.5 text-left font-mono text-[10.5px] transition-colors duration-200",
                      active === id ? "text-ink" : "text-cite hover:text-ink"
                    )}
                  >
                    <span className="w-4 shrink-0 text-ink/40">[{id}]</span>
                    <span className="truncate">
                      {c.doc} · p.{c.page} · {c.section}
                    </span>
                  </button>
                </li>
              )
            }
          )}
        </ul>

        <p className="mt-3 flex items-start gap-2 font-mono text-[9.5px] uppercase leading-[1.7] tracking-[0.1em] text-ink/40">
          <span aria-hidden="true">{abstained ? "—" : "✓"}</span>
          {thread.summary}
        </p>
      </div>
    </article>
  )
}

/* ── the evidence list ────────────────────────────────────────── */

function EvidenceList({
  active,
  setActive,
}: {
  active: number | null
  setActive: (v: number | null) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 border-b border-rule/25 pb-2.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/50">
          Evidence · 6 spans
        </h3>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink/30">
          12 docs · 486 pp
        </span>
      </div>

      <ol className="mt-1">
        {EVIDENCE.citations.map((c) => {
          const isActive = active === c.id
          return (
            <li
              key={c.id}
              id={`evidence-row-${c.id}`}
              onMouseEnter={() => setActive(c.id)}
              onMouseLeave={() => setActive(null)}
              tabIndex={-1}
              className={cn(
                "border-b border-rule/12 px-1 py-3.5 transition-colors duration-200",
                isActive ? "bg-mark/[0.055]" : "bg-transparent"
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-[10px] text-ink/40">[{c.id}]</span>
                  <span className="truncate font-mono text-[10.5px] text-ink/80">{c.doc}</span>
                </span>
                <span className="shrink-0 font-mono text-[9.5px] text-ink/40">
                  p.{c.page} · {c.section}
                </span>
              </div>
              <p className="mt-2 pl-6 font-mono text-[11px] leading-[1.65] text-cite">
                <span className="span-quote" data-flash={isActive ? "true" : "false"}>
                  {c.span}
                </span>
              </p>
              <p
                className={cn(
                  "mt-2 flex items-center gap-1.5 pl-6 font-mono text-[9.5px] uppercase tracking-[0.1em]",
                  statusTone[c.status]
                )}
              >
                <span aria-hidden="true">{statusMark[c.status]}</span>
                {STATUS_LABEL[c.status]}
              </p>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 space-y-2 border-t border-rule/15 pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink/35">Legend</p>
        <p className="font-mono text-[10px] leading-relaxed text-ink/50">
          <span className="text-verify">✓</span> supports a sentence &nbsp;·&nbsp;{" "}
          <span className="text-ink/70">≠</span> contradicts &nbsp;·&nbsp;{" "}
          <span>○</span> nearest, not used
        </p>
      </div>
    </div>
  )
}

/* ── section ──────────────────────────────────────────────────── */

export function Evidence() {
  const [active, setActive] = React.useState<number | null>(null)

  return (
    <section id="evidence" className="section" aria-labelledby="evidence-title">
      <span id="demo" className="sr-only" />
      <div className="shell">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="eyebrow">{EVIDENCE.eyebrow}</p>
              <h2 id="evidence-title" className="display">
                <span className="block">{EVIDENCE.line1}</span>
                <span className="accent mt-1 block">{EVIDENCE.line2}</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pt-2">
            <Reveal delay={120}>
              <p className="lead">{EVIDENCE.lead}</p>
            </Reveal>
          </div>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-12 lg:mt-20 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            {EVIDENCE.threads.map((t, i) => (
              <Reveal key={t.question} delay={i * 90}>
                <ThreadCard thread={t} index={i} active={active} setActive={setActive} />
              </Reveal>
            ))}
            <Reveal delay={60}>
              <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink/40">
                <span aria-hidden="true" className="block h-px w-5 bg-ink/30" />
                {EVIDENCE.corpusNote}
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <EvidenceList active={active} setActive={setActive} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
