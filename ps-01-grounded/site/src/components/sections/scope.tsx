import { Reveal } from "@/components/reveal"
import { SCOPE } from "@/lib/content"

export function Scope() {
  return (
    <section id="scope" className="section" aria-labelledby="scope-title">
      <div className="shell">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="eyebrow">{SCOPE.eyebrow}</p>
              <h2 id="scope-title" className="display">
                <span className="block">{SCOPE.line1}</span>
                <span className="accent mt-1 block">{SCOPE.line2}</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pt-2">
            <Reveal delay={120}>
              <p className="lead">{SCOPE.lead}</p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={60}>
          <div className="mt-14 lg:mt-20">
            {/* phones: one criterion per row, stacked */}
            <ul className="border-t border-rule/25 sm:hidden">
              {SCOPE.criteria.map((c) => (
                <li key={c.n} className="border-b border-rule/12 py-3.5">
                  <span className="font-mono text-[9.5px] tracking-[0.08em] text-ink/35">{c.n}</span>
                  <p className="mt-1 text-[14px] leading-[1.45] tracking-[-0.01em] text-ink/85">
                    {c.label}
                  </p>
                  <p className="mt-1.5 font-mono text-[10.5px] leading-[1.55] text-cite">{c.target}</p>
                </li>
              ))}
            </ul>

            {/* wider: a real table, so the targets line up and stay scannable */}
            <table className="hidden w-full table-fixed border-collapse sm:table">
              <caption className="sr-only">
                Acceptance criteria for the Document-Grounded AI Research Assistant. Each row states a
                measurable target, not a measured result.
              </caption>
              <thead>
                <tr className="border-b border-rule/30 text-left">
                  <th
                    scope="col"
                    className="w-14 pb-2.5 font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-ink/40"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="pb-2.5 font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-ink/40"
                  >
                    Criterion
                  </th>
                  <th
                    scope="col"
                    className="w-[44%] pb-2.5 text-right font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-ink/40 lg:w-[42%]"
                  >
                    Target
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCOPE.criteria.map((c) => (
                  <tr key={c.n} className="row-lift border-b border-rule/12 hover:bg-raised">
                    <td className="py-3.5 align-top font-mono text-[10.5px] text-ink/35">{c.n}</td>
                    <td className="py-3.5 pr-4 align-top text-[14px] leading-[1.5] tracking-[-0.01em] text-ink/85">
                      {c.label}
                    </td>
                    <td className="py-3.5 pl-4 text-right align-top font-mono text-[11px] leading-[1.55] text-cite">
                      {c.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 font-mono text-[9.5px] uppercase leading-[1.7] tracking-[0.12em] text-ink/35">
              targets, not results · measured against a versioned 100-question evaluation set
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-10 border-t border-rule/12 pt-10 md:grid-cols-2 lg:mt-20">
          <Reveal>
            <h3 className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/50">
              In scope
              <span className="h-px flex-1 bg-rule/15" aria-hidden="true" />
            </h3>
            <ul className="mt-5 space-y-3">
              {SCOPE.inScope.map((s) => (
                <li key={s} className="flex gap-3 text-[14.5px] leading-[1.55] text-ink/75">
                  <span aria-hidden="true" className="mt-[9px] block h-px w-3 shrink-0 bg-ink/40" />
                  {s}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80}>
            <h3 className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/50">
              Out of scope — stated, not hidden
              <span className="h-px flex-1 bg-rule/15" aria-hidden="true" />
            </h3>
            <ul className="mt-5 space-y-3">
              {SCOPE.outScope.map((s) => (
                <li key={s} className="flex gap-3 text-[14.5px] leading-[1.55] text-ink/45">
                  <span
                    aria-hidden="true"
                    className="mt-[1px] block w-3 shrink-0 font-mono text-[12px] leading-[1.55]"
                  >
                    —
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
