import type { Config } from "tailwindcss"

// every integer percentage, so hairline opacities like /12 and /18 exist
const opacity = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`]))

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        raised: "rgb(var(--raised-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        cite: "rgb(var(--cite-rgb) / <alpha-value>)",
        rule: "rgb(var(--rule-rgb) / <alpha-value>)",
        mark: "rgb(var(--mark-rgb) / <alpha-value>)",
        verify: "rgb(var(--verify-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Geist", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Instrument Serif", "Times New Roman", "serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: { page: "1200px", measure: "62ch", lead: "46ch" },
      transitionTimingFunction: { editorial: "cubic-bezier(.22,.7,.2,1)" },
      opacity,
    },
  },
  plugins: [],
} satisfies Config
