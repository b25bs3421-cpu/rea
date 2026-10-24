import { Reveal } from "@/components/reveal"
import { CLOSING } from "@/lib/content"
import { ArrowRight } from "@/components/icons"

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="border-t border-rule/12 bg-ink text-paper">
      <div className="shell py-[76px] sm:py-[104px] lg:py-[136px]">
        <Reveal>
          <h2
            id="closing-title"
            className="text-[clamp(38px,7vw,92px)] font-medium leading-[0.94] tracking-[-0.045em]"
          >
            <span className="block">{CLOSING.line1}</span>
            <span className="block font-serif font-normal italic tracking-[-0.02em] text-paper/75">
              {CLOSING.line2}
            </span>
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-9 flex flex-col gap-7 sm:mt-11 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-lead text-[15.5px] leading-[1.6] text-paper/65">{CLOSING.body}</p>
            <a
              href={CLOSING.cta.href}
              className="inline-flex w-fit items-center gap-2.5 rounded-full bg-paper px-6 py-3.5 text-[14.5px] font-medium text-ink transition-transform duration-300 ease-editorial hover:-translate-y-px"
            >
              {CLOSING.cta.label}
              <ArrowRight />
            </a>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <p className="mt-14 border-t border-paper/15 pt-5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper/40 sm:mt-16">
            {CLOSING.footerLine}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
