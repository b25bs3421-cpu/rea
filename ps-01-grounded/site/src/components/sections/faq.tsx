import * as React from "react"
import { Reveal } from "@/components/reveal"
import { FAQ } from "@/lib/content"
import { PlusMinus } from "@/components/icons"
import { cn } from "@/lib/utils"

export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0)

  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="shell">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal>
              <p className="eyebrow">{FAQ.eyebrow}</p>
              <h2 id="faq-title" className="display">
                <span className="block">{FAQ.line1}</span>
                <span className="accent mt-1 block">{FAQ.line2}</span>
              </h2>
            </Reveal>
          </div>

          <div className="lg:col-span-6 lg:pt-2">
            <div className="border-t border-rule/25">
              {FAQ.items.map((item, i) => {
                const isOpen = open === i
                return (
                  <div key={item.q} className="border-b border-rule/15">
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${i}`}
                        id={`faq-button-${i}`}
                        className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors duration-200 hover:text-ink"
                      >
                        <span className="flex gap-4 text-[15.5px] font-medium leading-[1.45] tracking-[-0.015em]">
                          <span className="mt-[3px] font-mono text-[10px] font-normal tracking-[0.08em] text-ink/35">
                            0{i + 1}
                          </span>
                          {item.q}
                        </span>
                        <span className="mt-1 text-ink/50">
                          <PlusMinus open={isOpen} />
                        </span>
                      </button>
                    </h3>
                    <div
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-button-${i}`}
                      className={cn(
                        "grid transition-all duration-300 ease-editorial",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-measure pb-5 pl-8 pr-8 text-[14.5px] leading-[1.65] text-ink/65">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
