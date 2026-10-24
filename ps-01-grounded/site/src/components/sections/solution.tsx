import { Reveal } from "@/components/reveal"
import { SOLUTION } from "@/lib/content"

export function Solution() {
  return (
    <section id="solution" className="section" aria-labelledby="solution-title">
      <div className="shell">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="eyebrow">{SOLUTION.eyebrow}</p>
              <h2 id="solution-title" className="display">
                <span className="block">{SOLUTION.line1}</span>
                <span className="accent mt-1 block">{SOLUTION.line2}</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pt-2">
            <Reveal delay={120}>
              <p className="lead">{SOLUTION.lead}</p>
            </Reveal>
          </div>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {SOLUTION.pillars.map((p, i) => (
            <Reveal key={p.n} delay={i * 70} className="h-full">
              <article className="flex h-full flex-col border-t border-rule/25 pt-5">
                <span className="font-mono text-[11px] tracking-[0.08em] text-ink/40">{p.n}</span>
                <h3 className="mt-3 text-[18.5px] font-medium leading-[1.25] tracking-[-0.02em]">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-ink/60">{p.body}</p>
                <p className="mt-auto pt-6 font-mono text-[10px] uppercase leading-[1.6] tracking-[0.1em] text-ink/40">
                  → serves&nbsp;“{p.serves}”
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={80}>
          <div className="mt-16 bg-ink px-6 py-10 text-paper sm:px-10 sm:py-12 lg:mt-20 lg:px-14">
            <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
              <span className="block h-px w-7 bg-paper/40" aria-hidden="true" />
              {SOLUTION.ruleLabel}
            </p>
            <p className="mt-5 max-w-4xl text-[clamp(19px,2.5vw,31px)] font-medium leading-[1.32] tracking-[-0.03em]">
              No sentence in an answer is allowed to exist without a supporting span.{" "}
              <span className="font-serif font-normal italic tracking-[-0.01em] text-paper/60">
                When the span is missing, the sentence is deleted — not softened, not hedged.
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
