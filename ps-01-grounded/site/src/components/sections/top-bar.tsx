import * as React from "react"
import { cn } from "@/lib/utils"
import { BRAND, NAV } from "@/lib/content"
import { MoonIcon, SunIcon } from "@/components/icons"

type TopBarProps = {
  mode: "light" | "dark"
  onToggleTheme: () => void
}

/**
 * Appears once the hero has scrolled away. Two palettes, one control:
 * whichever toggle is pressed, the hero and the page resolve to the same theme.
 */
export function TopBar({ mode, onToggleTheme }: TopBarProps) {
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.72)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-rule/12 bg-paper/90 backdrop-blur-md transition-[transform,visibility] duration-300 ease-editorial",
        shown ? "visible translate-y-0" : "invisible -translate-y-full"
      )}
      aria-hidden={!shown}
    >
      <div className="shell flex h-14 items-center justify-between gap-6">
        <a
          href="#top"
          className="text-[16px] font-semibold tracking-[-0.02em]"
          tabIndex={shown ? 0 : -1}
        >
          {BRAND}
        </a>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {NAV.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  tabIndex={shown ? 0 : -1}
                  className="text-[13px] text-ink/60 transition-colors duration-200 hover:text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            tabIndex={shown ? 0 : -1}
            aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-rule/25 text-ink/80 transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            {mode === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <a
            href="#evidence"
            tabIndex={shown ? 0 : -1}
            className="hidden rounded-full border border-rule/25 px-3.5 py-2 text-[13px] text-ink/80 transition-colors duration-200 hover:bg-ink hover:text-paper sm:inline-flex"
          >
            Try the demo
          </a>
        </div>
      </div>
    </header>
  )
}
