import { BRAND, COLOPHON, FOOTER_COLUMNS } from "@/lib/content"

export function Footer() {
  return (
    <footer className="border-t border-rule/12">
      <div className="shell py-12 sm:py-16">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-[16px] font-semibold tracking-[-0.02em]">{BRAND}</p>
            <p className="mt-3 max-w-[26ch] text-[13px] leading-[1.6] text-ink/55">
              Answers built from your documents, with the passage that proves them — and an honest
              silence when the proof is missing.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink/40">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[13.5px] text-ink/65 transition-colors duration-200 hover:text-ink"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="sm:col-span-2 lg:col-span-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink/40">Colophon</p>
            <ul className="mt-4 space-y-2.5">
              {COLOPHON.map((c) => (
                <li key={c} className="text-[12px] leading-[1.55] text-ink/50">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule/12 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink/40">
            © 2026 · PS-01 · Document-Grounded AI Research Assistant
          </p>
          <a
            href="#top"
            className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink/50 transition-colors hover:text-ink"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
