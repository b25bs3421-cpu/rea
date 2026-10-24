import * as React from "react"
import { cn } from "@/lib/utils"

type RevealProps = {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: "div" | "li" | "tr"
}

/** One gesture only: a 12px rise and a fade, once, at 15% visibility. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [seen, setSeen] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -4% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      data-in={seen ? "true" : "false"}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
