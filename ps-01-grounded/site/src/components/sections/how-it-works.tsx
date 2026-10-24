import * as React from "react"
import { Reveal } from "@/components/reveal"
import { FOCUS, STAGES } from "@/lib/content"
import { cn } from "@/lib/utils"

export function HowItWorks() {
  const [active, setActive] = React.useState(0)
  const stage = STAGES[active]

  return (
    <section id="how-it-works" className="section" aria-labelledby="how-title">
      <div className="shell">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="eyebrow">03 — How it works</p>
              <h2 id="how-title" className="display">
                <span className="block">Four stages.</span>
                <span className="accent mt-1 block">One chain of custody.</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pt-2">
            <Reveal delay={120}>
              <p className="lead">
                Every stage can be inspected. Nothing is a black box that swallows your document and
                returns a mood.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={60}>
          <div className="mt-14 border-t border-rule/15 lg:mt-20">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {STAGES.map((s, i) => {
                const isActive = i === active
                return (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-expanded={isActive}
                    aria-controls="stage-panel"
                    className={cn(
                      "group relative flex flex-col items-start gap-2 border-b border-rule/12 px-4 py-5 text-left transition-colors duration-300 ease-editorial sm:px-6 sm:py-6",
                      "md:border-l md:first:border-l-0",
                      isActive ? "bg-raised" : "hover:bg-raised/60"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 top-0 h-px transition-colors duration-300",
                        isActive ? "bg-ink" : "bg-transparent"
                      )}
                    />
                    <span className="font-mono text-[10px] tracking-[0.1em] text-ink/40">
                      STEP {s.n}
                    </span>
                    <span
                      className={cn(
                        "text-[17px] font-medium tracking-[-0.02em] transition-opacity duration-300",
                        isActive ? "text-ink" : "text-ink/70 group-hover:text-ink"
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </Reveal>

        <div
          id="stage-panel"
          role="region"
          aria-live="polite"
          aria-label={`Stage ${stage.n}: ${stage.title}`}
          className="grid gap-x-10 gap-y-8 border-b border-rule/15 bg-raised px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-12 lg:px-10"
        >
          <div className="md:col-span-7">
            <h3 className="text-[clamp(20px,2.2vw,26px)] font-medium tracking-[-0.03em]">
              <span className="font-mono text-[13px] tracking-[0.04em] text-ink/40">
                {stage.n} / 4&nbsp;&nbsp;
              </span>
              {stage.title}
            </h3>
            <p className="mt-3 max-w-measure text-[14.5px] leading-[1.65] text-ink/65">{stage.body}</p>
          </div>
          <div className="md:col-span-5 md:border-l md:border-rule/12 md:pl-8">
            <p className="caption">contract</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.7] text-ink/70">
              {stage.contract}
            </pre>
            <p className="mt-5 font-mono text-[10px] uppercase leading-[1.7] tracking-[0.1em] text-ink/35">
              deterministic shape at every hand-off
            </p>
          </div>
        </div>

        <Reveal delay={40}>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
              Technical focus
            </span>
            {FOCUS.map((f) => (
              <span
                key={f}
                className="rounded-[2px] border border-rule/25 bg-raised px-2.5 py-1.5 font-mono text-[11px] text-cite"
              >
                {f}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
