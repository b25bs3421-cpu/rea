import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../state/AppContext';
import { navigate } from '../lib/router';
import { clamp, cx, formatRuntime, percent, seasonEpisodeLabel } from '../lib/utils';
import { resumeLabel, watchPathFor } from '../lib/playback';
import type { TitleLite } from '../types';
import { WideArt } from './Artwork';
import { CheckIcon, ChevronDownIcon, PlayIcon, PlusIcon, ThumbUpIcon } from './Icons';

interface HoverEntry {
  title: TitleLite;
  rect: { left: number; top: number; width: number; height: number };
}

interface HoverContextValue {
  open: (title: TitleLite, element: HTMLElement) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  closeNow: () => void;
}

const HoverContext = createContext<HoverContextValue | null>(null);

export function useHover() {
  return useContext(HoverContext);
}

export function HoverProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<HoverEntry | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const open = useCallback(
    (title: TitleLite, element: HTMLElement) => {
      if (typeof window === 'undefined') return;
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      clearTimers();
      const rect = element.getBoundingClientRect();
      openTimer.current = window.setTimeout(() => {
        setEntry({
          title,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        });
      }, 420);
    },
    [clearTimers],
  );

  const scheduleClose = useCallback(() => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setEntry(null), 160);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const closeNow = useCallback(() => {
    clearTimers();
    setEntry(null);
  }, [clearTimers]);

  useEffect(() => {
    if (!entry) return;
    const close = () => closeNow();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNow();
    };
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [entry, closeNow]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <HoverContext.Provider value={{ open, scheduleClose, cancelClose, closeNow }}>
      {children}
      {entry && (
        <HoverPreview
          entry={entry}
          onEnter={cancelClose}
          onLeave={scheduleClose}
          onClose={closeNow}
        />
      )}
    </HoverContext.Provider>
  );
}

function HoverPreview({
  entry,
  onEnter,
  onLeave,
  onClose,
}: {
  entry: HoverEntry;
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const { title, rect } = entry;
  const { preferences, profileState, toggleList, rate } = useApp();
  const [playing, setPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const width = Math.min(366, window.innerWidth - 24);
  const heightGuess = title.type === 'film' ? 330 : 356;
  const left = clamp(rect.left + rect.width / 2 - width / 2, 12, window.innerWidth - width - 12);
  const top = clamp(rect.top - 96, 74, window.innerHeight - heightGuess - 16);
  const progress = profileState?.progress[title.id] ?? title.progress ?? null;
  const inList =
    profileState?.myList.some((item) => item.id === title.id) ?? Boolean(title.inList);
  const liked = profileState?.ratings[title.id] === 'like' || title.rating === 'like';

  useEffect(() => {
    if (!preferences.autoplayPreviews) return;
    const timer = window.setTimeout(() => setPlaying(true), 800);
    return () => window.clearTimeout(timer);
  }, [preferences.autoplayPreviews, title.id]);

  const goPlay = () => {
    const path = watchPathFor(title, progress);
    if (!path) return;
    onClose();
    navigate(path);
  };

  return createPortal(
    <div
      ref={cardRef}
      className="hover-card"
      style={{ left, top, width }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) onLeave();
      }}
      role="group"
      aria-label={`Preview of ${title.title}`}
    >
      <div className={cx('hover-card__art', playing && preferences.autoplayPreviews && 'is-playing')}>
        <WideArt title={title} showTitle={false} eager />
        <div className="hover-card__scrim" />
        <div className="hover-card__art-title">
          <span className="hover-card__kicker">REELIX</span>
          <strong>{title.title}</strong>
        </div>
        {playing && preferences.autoplayPreviews && (
          <span className="hover-card__preview-chip" aria-hidden>
            <i /> Preview
          </span>
        )}
      </div>
      <div className="hover-card__body">
        <div className="hover-card__actions">
          <button type="button" className="circle-btn circle-btn--light" onClick={goPlay} aria-label={`Play ${title.title}`}>
            <PlayIcon size={18} />
          </button>
          <button
            type="button"
            className="circle-btn"
            aria-label={inList ? `Remove ${title.title} from My List` : `Add ${title.title} to My List`}
            onClick={() => {
              void toggleList(title.id);
            }}
          >
            {inList ? <CheckIcon size={17} /> : <PlusIcon size={17} />}
          </button>
          <button
            type="button"
            className={cx('circle-btn', liked && 'is-active')}
            aria-label={liked ? `Remove like from ${title.title}` : `Like ${title.title}`}
            onClick={() => {
              void rate(title.id, liked ? null : 'like');
            }}
          >
            <ThumbUpIcon size={16} />
          </button>
          <button
            type="button"
            className="circle-btn circle-btn--info"
            aria-label={`More information about ${title.title}`}
            onClick={() => {
              onClose();
              navigate(`/title/${title.id}`);
            }}
          >
            <ChevronDownIcon size={18} />
          </button>
        </div>
        {progress && (
          <div className="hover-card__progress">
            <div className="progress-track">
              <span style={{ width: `${percent(progress.seconds, progress.duration)}%` }} />
            </div>
            <span>
              {resumeLabel(title, progress)}
              {progress.episodeId !== 'film' && /^s(\d)e(\d)$/.test(progress.episodeId) ? '' : ''}
            </span>
          </div>
        )}
        <div className="hover-card__meta">
          <span className="match">{title.match ?? title.matchSeed}% Match</span>
          <span className="maturity-chip">{title.maturity}</span>
          <span>{title.type === 'film' ? formatRuntime(title.runtimeMin) : `${title.seasonCount} Seasons`}</span>
          {title.isNew && <span className="pill pill--new">New</span>}
        </div>
        <div className="hover-card__genres">{title.genres.slice(0, 3).join(' · ')}</div>
      </div>
    </div>,
    document.body,
  );
}
