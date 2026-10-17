import { useRef, useState } from 'react';
import { clamp, formatClock } from '../lib/utils';

interface TimelineProps {
  time: number;
  duration: number;
  buffer: number;
  onSeek: (seconds: number) => void;
}

export function Timeline({ time, duration, buffer, onSeek }: TimelineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [hover, setHover] = useState<{ pct: number; seconds: number } | null>(null);
  const playedPct = duration ? clamp((time / duration) * 100, 0, 100) : 0;
  const bufferPct = duration ? clamp((buffer / duration) * 100, 0, 100) : 0;

  const pointerSeek = (clientX: number) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    onSeek(pct * duration);
    return pct;
  };

  return (
    <div
      ref={ref}
      className="timeline"
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onSeek(Math.max(0, time - 10));
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onSeek(Math.min(duration, time + 10));
        }
        if (event.key === 'Home') {
          event.preventDefault();
          onSeek(0);
        }
        if (event.key === 'End') {
          event.preventDefault();
          onSeek(duration);
        }
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        draggingRef.current = true;
        pointerSeek(event.clientX);
      }}
      onPointerMove={(event) => {
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const pct = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        setHover({ pct, seconds: pct * duration });
        if (draggingRef.current) {
          onSeek(pct * duration);
        }
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* pointer already released */
        }
      }}
      onPointerLeave={() => setHover(null)}
    >
      <span className="timeline__buffer" style={{ width: `${bufferPct}%` }} />
      <span className="timeline__played" style={{ width: `${playedPct}%` }} />
      <span className="timeline__thumb" style={{ left: `${playedPct}%` }} />
      {hover && (
        <span className="timeline__tooltip" style={{ left: `${hover.pct * 100}%` }}>
          {formatClock(hover.seconds)}
        </span>
      )}
    </div>
  );
}
