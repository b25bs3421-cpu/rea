import { useCallback, useEffect, useRef, useState } from 'react';
import type { Row as RowType } from '../types';
import { cx } from '../lib/utils';
import { navigate } from '../lib/router';
import { TitleCard } from './TitleCard';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

function explorePath(row: RowType) {
  if (row.id === 'my-list') return '/my-list';
  if (row.id === 'new' || row.id === 'coming') return '/new';
  if (row.kind === 'top10') return '/new';
  return `/row/${row.id}`;
}

export function Row({ row, index = 0 }: { row: RowType; index?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setOverflowing(max > 8);
    setCanLeft(track.scrollLeft > 8);
    setCanRight(track.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    update();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(update);
    observer.observe(track);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update, row.items.length]);

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.86, behavior: 'smooth' });
  };

  if (!row.items.length) return null;

  return (
    <section className={cx('row', `row--${row.kind ?? 'standard'}`, `row--${row.id}`)} aria-labelledby={`row-${row.id}-${index}`}>
      <header className="row__head">
        <div>
          <h2 id={`row-${row.id}-${index}`} className="row__title">
            {row.title}
          </h2>
          {row.subtitle && <p className="row__subtitle">{row.subtitle}</p>}
        </div>
        <button type="button" className="row__explore" onClick={() => navigate(explorePath(row))}>
          Explore All
          <ChevronRightIcon size={14} />
        </button>
      </header>
      <div className="row__viewport">
        {overflowing && canLeft && (
          <button type="button" className="row__arrow row__arrow--left" onClick={() => page(-1)} aria-label={`Scroll ${row.title} left`}>
            <ChevronLeftIcon size={26} />
          </button>
        )}
        <div className="row__track" ref={trackRef} onScroll={update} tabIndex={-1}>
          {row.items.map((item, itemIndex) =>
            row.kind === 'top10' ? (
              <TitleCard key={item.id} title={item} variant="top10" rank={item.rank} eager={index < 2 && itemIndex < 6} />
            ) : row.kind === 'characters' ? (
              <TitleCard key={item.id} title={item} variant="character" eager={index < 2 && itemIndex < 6} />
            ) : (
              <TitleCard key={item.id} title={item} eager={index < 2 && itemIndex < 6} />
            ),
          )}
        </div>
        {overflowing && canRight && (
          <button type="button" className="row__arrow row__arrow--right" onClick={() => page(1)} aria-label={`Scroll ${row.title} right`}>
            <ChevronRightIcon size={26} />
          </button>
        )}
      </div>
    </section>
  );
}
