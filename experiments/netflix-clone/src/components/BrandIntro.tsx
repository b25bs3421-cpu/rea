import { useEffect, useState } from 'react';
import { Logo } from './Logo';

export function BrandIntro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold = reduce ? 300 : 1500;
    const leaveTimer = window.setTimeout(() => setLeaving(true), hold);
    const doneTimer = window.setTimeout(onDone, hold + 450);
    const skip = () => {
      setLeaving(true);
      window.setTimeout(onDone, 200);
    };
    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);

  return (
    <div className={`brand-intro ${leaving ? 'is-leaving' : ''}`} aria-hidden>
      <div className="brand-intro__glow" />
      <div className="brand-intro__logo">
        <Logo size="xl" asLink={false} />
      </div>
      <div className="brand-intro__line" />
      <p className="brand-intro__tag">Stories that stay with you</p>
    </div>
  );
}
