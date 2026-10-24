import * as React from "react"
import { Reveal } from "@/components/reveal"
import { BRIEF_LINES, PROBLEM } from "@/lib/content"

function briefLine(line: string, i: number) {
  if (i === 0) {
    return (
      <span key={i} className="block text-[12px] font-medium uppercase tracking-[0.08em] text-ink">
        {line}
      </span>
    )
  }
  if (/^[A-Z][A-Z &]+$/.test(line)) {
    return (
      <span key={i} className="mt-4 block text-[10px] uppercase tracking-[0.16em] text-ink/45 first:mt-0">
        {line}
      </span>
    )
  }
  if (line === "") return <span key={i} className="block h-2" aria-hidden="true" />
  return (
    <span key={i} className="block text-[11.5px] leading-[1.75] text-ink/75">
      {line}
    </span>
  )
}

export function Problem() {
  return (
    <section id="problem" className="section desk" aria-labelledby="problem-title">
      <div className="shell">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="eyebrow">{PROBLEM.eyebrow}</p>
              <h2 id="problem-title" className="display">
                <span className="block">{PROBLEM.line1}</span>
                <span className="accent mt-1 block text-ink/80">{PROBLEM.line2}</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pt-2">
            <Reveal delay={120}>
              <p className="lead">{PROBLEM.lead}</p>
            </Reveal>
          </div>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 lg:mt-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              {PROBLEM.notes.map((n, i) => (
                <Reveal key={n.n} delay={i * 55} className="h-full">
                  <article
                    className="sticky-note h-full"
                    style={{ "--rot": `${n.rotate}deg` } as React.CSSProperties}
                  >
                    <span className="caption">{n.n}</span>
                    <h3 className="mt-3 text-[15.5px] font-medium leading-snug tracking-[-0.015em]">
                      {n.note}
                    </h3>
                    <p className="mt-2 text-[13px] leading-[1.55] text-ink/60">{n.sub}</p>
                  </article>
                </Reveal>
              ))}
            </div>
            <Reveal delay={80}>
              <p className="mt-6 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                every note above maps to a line in the brief&nbsp;→
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={180}>
              <figure className="relative mt-3 rotate-[-0.6deg] border border-rule/20 bg-raised p-6 shadow-[0_18px_40px_-38px_rgb(21_21_20/0.9)] sm:p-7">
                <span className="tape" aria-hidden="true" />
                <figcaption className="mb-5 flex items-baseline justify-between gap-4 border-b border-rule/15 pb-3">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink/45">
                    {PROBLEM.briefLabel}
                  </span>
                  <span className="font-mono text-[9.5px] text-ink/30">PS-01</span>
                </figcaption>
                <div className="font-mono">
                  {BRIEF_LINES.map((l, i) => briefLine(l, i))}
                </div>
                <p className="mt-6 border-t border-rule/15 pt-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/40">
                  {PROBLEM.briefFooter}
                </p>
              </figure>
            </Reveal>
          </div>
        </div>

        <Reveal>
          <p className="mt-16 max-w-3xl border-t border-rule/12 pt-8 text-right font-serif text-[clamp(20px,2.6vw,30px)] italic leading-[1.3] text-ink/75 sm:ml-auto">
            {PROBLEM.closing}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
