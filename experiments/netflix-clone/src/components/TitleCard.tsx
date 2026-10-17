import { useRef } from 'react';
import type { Progress, TitleLite } from '../types';
import { useApp } from '../state/AppContext';
import { useHover } from './HoverLayer';
import { WideArt, PosterArt } from './Artwork';
import { formatRuntime, cx, percent } from '../lib/utils';
import { navigate } from '../lib/router';

interface TitleCardProps {
  title: TitleLite;
  variant?: 'landscape' | 'grid' | 'top10' | 'character';
  rank?: number | null;
  eager?: boolean;
  caption?: boolean;
}

export function TitleCard({ title, variant = 'landscape', rank, eager = false, caption }: TitleCardProps) {
  const hover = useHover();
  const { profileState } = useApp();
  const ref = useRef<HTMLButtonElement>(null);
  const progress: Progress | null = profileState?.progress[title.id] ?? title.progress ?? null;
  const partial = progress && !progress.completed && progress.seconds / Math.max(progress.duration, 1) > 0.01;
  const episodeMatch = progress?.episodeId?.match(/^s(\d+)e(\d+)$/);
  const inList = profileState?.myList.some((item) => item.id === title.id) ?? Boolean(title.inList);

  const open = () => {
    hover?.closeNow();
    navigate(`/title/${title.id}`);
  };

  if (variant === 'character') {
    return (
      <button
        ref={ref}
        type="button"
        className="character-card"
        onClick={open}
        onMouseEnter={() => ref.current && hover?.open(title, ref.current)}
        onMouseLeave={() => hover?.scheduleClose()}
        onFocus={() => ref.current && hover?.open(title, ref.current)}
        onBlur={() => hover?.scheduleClose()}
        aria-label={`${title.title}${title.format ? `, ${title.format}` : ''}`}
      >
        <span className="character-card__art">
          <WideArt title={title} showTitle={false} eager={eager} />
        </span>
        <span className="character-card__name">{title.title}</span>
      </button>
    );
  }

  if (variant === 'top10') {
    return (
      <button
        ref={ref}
        type="button"
        className="top10-card"
        onClick={open}
        onMouseEnter={() => ref.current && hover?.open(title, ref.current)}
        onMouseLeave={() => hover?.scheduleClose()}
        onFocus={() => ref.current && hover?.open(title, ref.current)}
        onBlur={() => hover?.scheduleClose()}
        aria-label={`Rank ${rank ?? title.rank}. ${title.title}`}
      >
        <span className="top10-card__rank" aria-hidden>
          {rank ?? title.rank}
        </span>
        <span className="top10-card__art">
          <PosterArt title={title} eager={eager} showTitle />
        </span>
        <span className="top10-card__badge" aria-hidden>
          Top 10
        </span>
      </button>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cx('grid-card-wrap', caption !== false && 'has-caption')}>
        <button
          ref={ref}
          type="button"
          className="grid-card"
          onClick={open}
          onMouseEnter={() => ref.current && hover?.open(title, ref.current)}
          onMouseLeave={() => hover?.scheduleClose()}
          onFocus={() => ref.current && hover?.open(title, ref.current)}
          onBlur={() => hover?.scheduleClose()}
          aria-label={`${title.title}. ${title.genres.join(', ')}. ${title.match ?? title.matchSeed}% match.`}
        >
          <span className="grid-card__art">
            <WideArt title={title} showTitle={false} eager={eager} />
            <span className="grid-card__scrim" />
            {title.status === 'coming-soon' && <span className="badge-soon">Coming Soon</span>}
            {partial && (
              <span className="card-progress">
                <span style={{ width: `${percent(progress!.seconds, progress!.duration)}%` }} />
              </span>
            )}
            {inList && (
              <span className="grid-card__list" aria-label="In My List">
                <span className="dot" />
              </span>
            )}
          </span>
          {caption !== false && (
            <span className="grid-card__caption">
              <span className="grid-card__title-row">
                <strong>{title.title}</strong>
                <span className="grid-card__meta">{title.year}</span>
              </span>
              <span className="grid-card__sub">
                {title.match ?? title.matchSeed}% Match · {title.type === 'film' ? formatRuntime(title.runtimeMin) : `${title.seasonCount} Seasons`}
                {title.isNew ? ' · New' : ''}
              </span>
            </span>
          )}
        </button>
        {title.progress && !partial && title.progress.completed && (
          <span className="grid-card__watched">Watched</span>
        )}
      </div>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cx('title-card', partial && 'has-progress', title.status === 'coming-soon' && 'is-soon')}
      onClick={open}
      onMouseEnter={() => ref.current && hover?.open(title, ref.current)}
      onMouseLeave={() => hover?.scheduleClose()}
      onFocus={() => ref.current && hover?.open(title, ref.current)}
      onBlur={() => hover?.scheduleClose()}
      aria-label={`${title.title}. ${title.format}. ${title.year}. ${title.match ?? title.matchSeed}% match.`}
    >
      <span className="title-card__art">
        <WideArt title={title} eager={eager} />
        <span className="title-card__scrim" />
        <span className="title-card__badges">
          {title.status === 'coming-soon' && <span className="badge badge--soon">Coming Soon</span>}
          {title.isNew && title.status !== 'coming-soon' && <span className="badge badge--new">New</span>}
          {title.isOriginal && <span className="badge badge--brand">REELIX</span>}
        </span>
        {partial && (
          <>
            {episodeMatch && (
              <span className="title-card__episode">
                S{episodeMatch[1]}:E{episodeMatch[2]}
              </span>
            )}
            <span className="card-progress">
              <span style={{ width: `${percent(progress!.seconds, progress!.duration)}%` }} />
            </span>
          </>
        )}
      </span>
    </button>
  );
}
