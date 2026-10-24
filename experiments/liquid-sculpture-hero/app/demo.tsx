import { ArrowUpRight, Layers, MousePointer2, Sparkles } from "lucide-react";

import SculptureHero from "@/components/ui/liquid-sculpture-hero";

/** Matches the flat background baked into public/art/sculpture-*.webp so the
 *  colour-keyed sculpture dissolves into the page with no seam. */
const LIGHT_GROUND = "#ECEAE8";
const DARK_GROUND = "#0D0D0C";

/** This demo self-hosts the same two families the component would otherwise
 *  pull from Google Fonts, so it renders identically offline. Drop the three
 *  font props and `loadFonts={false}` to use the component's default. */
const HEADING_FONT =
  "'Geist Variable', 'Geist', 'Helvetica Neue', Arial, sans-serif";
const ACCENT_FONT = "'Instrument Serif', 'Times New Roman', serif";

const capabilities = [
  {
    icon: Sparkles,
    title: "100k particles",
    body: "The artwork is resampled from its own pixels — one particle per material pixel — so the sculpture is rebuilt rather than faked with a gradient mask.",
  },
  {
    icon: MousePointer2,
    title: "Liquid on contact",
    body: "A GPGPU flow field carries the cursor wake. Metal stretches into streaks, catches the light, then settles back into the crisp image.",
  },
  {
    icon: Layers,
    title: "Graceful fallback",
    body: "No WebGL2, a lost context, reduced motion, or an off-screen hero all drop back to the static image with no layout shift.",
  },
];

const works = [
  { year: "2025", name: "Atlas Ledger", kind: "Identity · Product · Web" },
  { year: "2024", name: "Meridian Kiln", kind: "Industrial design" },
  { year: "2024", name: "Slow Signal", kind: "Sound · Editorial" },
];

function Hero() {
  return (
    <SculptureHero
      // Artwork generated for this demo and normalised to a single flat
      // background per theme. Any CORS-enabled image works instead.
      src="/art/sculpture-light.webp"
      darkSrc="/art/sculpture-dark.webp"
      mobileSrc="/art/sculpture-light-portrait.webp"
      mobileDarkSrc="/art/sculpture-dark-portrait.webp"
      background={LIGHT_GROUND}
      darkBackground={DARK_GROUND}
      theme="light"
      loadFonts={false}
      headingFont={HEADING_FONT}
      bodyFont={HEADING_FONT}
      accentFont={ACCENT_FONT}
      intro
      headline={"Form that\nanswers back."}
      headlineAccent="answers back."
      body="We shape products, identities and spaces with the precision of engineering and the patience of craft — work that holds up under attention."
      eyebrow="Independent studio — Est. 2019"
      brand="Forma®"
      navLinks={[
        { label: "Work", href: "#work" },
        { label: "Approach", href: "#approach" },
      ]}
      navCta={{ label: "Contact", href: "#contact" }}
      primaryCta={{ label: "Start a project", href: "#contact" }}
      secondaryCta={{ label: "Selected work", href: "#work" }}
      backdropText="forma"
      strength={1.05}
    />
  );
}

function Approach() {
  return (
    <section id="approach" className="px-5 pt-20 pb-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
            A hero built from the artwork itself
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Move your cursor across the sculpture above. Press and drag to stir
            the material; the surface re-forms on its own.
          </p>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-background p-6">
              <Icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="mt-6 text-base font-medium tracking-tight">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className="px-5 pb-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <ul className="divide-y divide-border border-y border-border">
          {works.map((work) => (
            <li key={work.name}>
              <a
                href="#work"
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition-opacity hover:opacity-60"
              >
                <span className="w-12 text-xs tabular-nums text-muted-foreground">
                  {work.year}
                </span>
                <span>
                  <span className="block text-lg font-medium tracking-tight">
                    {work.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {work.kind}
                  </span>
                </span>
                <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="px-5 pb-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Sculpture hero component by{" "}
          <a
            className="underline underline-offset-4"
            href="https://guglielmogiannattasio.it"
            target="_blank"
            rel="noopener"
          >
            guglielmogiannattasio.it
          </a>
          . Demo page and artwork assembled for this repository.
        </p>
        <p>shadcn structure · Tailwind CSS v4 · React 19</p>
      </div>
    </footer>
  );
}

export default function Demo() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <Hero />
      <Approach />
      <Work />
      <Footer />
    </main>
  );
}
