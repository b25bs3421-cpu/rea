import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { navigate } from '../lib/router';
import { cx, formatRuntime } from '../lib/utils';
import { watchPathFor } from '../lib/playback';
import { HeroArt } from './Artwork';
import { InfoIcon, PlayIcon } from './Icons';
import type { HomePayload, TitleLite } from '../types';

type BillboardTitle = HomePayload['billboard'][number];

export function Billboard({ titles }: { titles: BillboardTitle[] }) {
  const { profileState, preferences } = useApp();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeIndex = Math.min(index, Math.max(0, titles.length - 1));
  const active = titles[safeIndex];

  useEffect(() => {
    if (titles.length <= 1 || paused) return;
    if (preferences.autoplayPreviews === false) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % titles.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [paused, preferences.autoplayPreviews, titles.length]);

  useEffect(() => {
    if (index >= titles.length) setIndex(0);
  }, [index, titles.length]);

  if (!active) return null;

  const progress = profileState?.progress[active.id] ?? active.progress;
  const path = watchPathFor(active, progress);
  const tv = active.type === 'series';

  const play = () => {
    if (path) navigate(path);
    else navigate(`/title/${active.id}`);
  };

  return (
    <section
      className="billboard"
      ref={containerRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      {titles.map((title, titleIndex) => (
        <div
          key={title.id}
          className={cx('billboard__slide', titleIndex === safeIndex && 'is-active')}
          aria-hidden={titleIndex !== safeIndex}
        >
          <HeroArt title={title} eager={titleIndex === 0} />
          <div className="billboard__gradient billboard__gradient--bottom" />
          <div className="billboard__gradient billboard__gradient--left" />
          <div className="billboard__gradient billboard__gradient--right" />
        </div>
      ))}

      <div className="billboard__content">
        <div className="billboard__eyebrow">
          <span className="billboard__brand">R</span>
          {tv ? 'Series' : 'Film'}
          <span className="billboard__eyebrow-sep" />
          <span>{active.isNew ? 'New on REELIX' : 'REELIX Original'}</span>
        </div>
        <h1 className={cx('billboard__title', `billboard__title--${active.art.titleStyle}`)}>
          {active.title}
        </h1>
        {active.rank && active.rank <= 10 && (
          <p className="billboard__rank">
            <span className="billboard__rank-badge">TOP 10</span>
            #{active.rank} in India today
          </p>
        )}
        <div className="billboard__meta">
          <span className="match">{active.match ?? active.matchSeed}% Match</span>
          <span>{active.year}</span>
          <span className="maturity-chip">{active.maturity}</span>
          <span>{tv ? `${active.seasonCount} Season${active.seasonCount === 1 ? '' : 's'}` : formatRuntime(active.runtimeMin)}</span>
          <span className="quality-chip">HD</span>
        </div>
        <p className="billboard__copy">{active.logline}</p>
        <p className="billboard__genres">{active.genres.slice(0, 3).join(' · ')}</p>
        <div className="billboard__actions">
          <button type="button" className="btn btn--primary btn--large" onClick={play}>
            <PlayIcon size={22} />
            Play
          </button>
          <button type="button" className="btn btn--secondary btn--large" onClick={() => navigate(`/title/${active.id}`)}>
            <InfoIcon size={21} />
            More Info
          </button>
        </div>
      </div>

      <div className="billboard__side">
        <div className="billboard__rating">
          <span>{active.maturity}</span>
          <small>{active.maturity === 'TV-MA' || active.maturity === 'R' ? 'Adults' : 'Guidance'}</small>
        </div>
        <span className="billboard__quality">{active.type === 'film' ? '4K HDR' : 'HD'}</span>
      </div>

      {titles.length > 1 && (
        <div className="billboard__dots" role="tablist" aria-label="Featured titles">
          {titles.map((title: TitleLite, dotIndex) => (
            <button
              key={title.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === safeIndex}
              aria-label={title.title}
              className={cx('billboard__dot', dotIndex === safeIndex && 'is-active')}
              onClick={() => setIndex(dotIndex)}
            >
              <span
                className="billboard__dot-fill"
                style={{ animationDuration: '12s', animationPlayState: paused || dotIndex !== safeIndex ? 'paused' : 'running' }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
