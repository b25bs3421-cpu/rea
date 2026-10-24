import SculptureHero from "@/components/ui/liquid-sculpture-hero";

/**
 * `components/demo.tsx` shows the canonical usage — `<SculptureHero />`, which
 * pulls the studio artwork from the 21st.dev CDN. This preview points the hero
 * at the two artwork files in `preview/public` instead, so the page also renders
 * in environments without outbound CDN access.
 */
export default function App() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <SculptureHero
        src="/sculpture-light.jpg"
        darkSrc="/sculpture-dark.jpg"
        mobileSrc="/sculpture-light.jpg"
        mobileDarkSrc="/sculpture-dark.jpg"
      />
    </main>
  );
}
