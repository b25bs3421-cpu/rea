import * as React from "react"
import SculptureHero from "@/components/ui/liquid-sculpture-hero"
import { TopBar } from "@/components/sections/top-bar"
import { Problem } from "@/components/sections/problem"
import { Solution } from "@/components/sections/solution"
import { HowItWorks } from "@/components/sections/how-it-works"
import { Evidence } from "@/components/sections/evidence"
import { Scope } from "@/components/sections/scope"
import { Faq } from "@/components/sections/faq"
import { Closing } from "@/components/sections/closing"
import { Footer } from "@/components/sections/footer"
import { BRAND, NAV } from "@/lib/content"

type Mode = "light" | "dark"

const STORAGE_KEY = "ps01-theme"

export default function App() {
  const [theme, setTheme] = React.useState<Mode>(() => {
    if (typeof window === "undefined") return "light"
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light"
  })
  const heroWrap = React.useRef<HTMLDivElement>(null)

  // one theme, two palettes: the page follows whatever the hero resolves to
  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // the hero owns its own switch — mirror it onto the page
  React.useEffect(() => {
    const wrap = heroWrap.current
    if (!wrap) return
    const section = wrap.querySelector<HTMLElement>("section.sh-root")
    if (!section) return
    const read = () => {
      const bg = section.style.getPropertyValue("--sh-bg").trim().toLowerCase()
      if (bg === "#111110") setTheme("dark")
      else if (bg === "#ebe9e5") setTheme("light")
    }
    const mo = new MutationObserver(read)
    mo.observe(section, { attributes: true, attributeFilter: ["style"] })
    return () => mo.disconnect()
  }, [])

  return (
    <div id="top">
      <a
        href="#problem"
        className="sr-only rounded-[2px] bg-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-paper focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to content
      </a>

      <TopBar mode={theme} onToggleTheme={() => setTheme((m) => (m === "dark" ? "light" : "dark"))} />

      <main>
      <div ref={heroWrap}>
        <SculptureHero
          brand={BRAND}
          navLinks={NAV}
          navCta={{ label: "Try the demo", href: "#demo" }}
          eyebrow="PS-01 · Document-Grounded AI Research Assistant"
          headline={"Every answer\ncites its source."}
          headlineAccent="cites its source."
          body="Upload the readings, reports and notes you already have. Ask anything. Get an answer built only from those documents — with the passage, page and section that proves it, and an honest “not in your sources” when the evidence is not there."
          primaryCta={{ label: "See a grounded answer", href: "#evidence" }}
          secondaryCta={{ label: "Read the problem statement", href: "#problem" }}
          hint="Move across the evidence"
          hintTouch="Touch the evidence"
          backdropText="evidence"
          src="/sculpture-light.png"
          darkSrc="/sculpture-dark.png"
          mobileSrc="/sculpture-light.png"
          mobileDarkSrc="/sculpture-dark.png"
          imageAlt="A cloud of fine metallic filaments resolving into a solid loop — the material of many documents, gathered into one answer"
          theme={theme}
          themeToggle
          background="#EBE9E5"
          darkBackground="#111110"
          headingFont="'Geist', 'Helvetica Neue', Arial, sans-serif"
          accentFont="'Instrument Serif', 'Times New Roman', serif"
          bodyFont="'Geist', 'Helvetica Neue', Arial, sans-serif"
          loadFonts
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
      </div>

        <Problem />
        <Solution />
        <HowItWorks />
        <Evidence />
        <Scope />
        <Faq />
        <Closing />
      </main>

      <Footer />
    </div>
  )
}
