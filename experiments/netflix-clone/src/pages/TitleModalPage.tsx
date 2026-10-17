import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Episode, TitleFull, TitleLite } from '../types';
import { api, ApiError } from '../lib/api';
import { useApp } from '../state/AppContext';
import { navigate } from '../lib/router';
import { Modal } from '../components/Modal';
import { HeroArt, EpisodeStill, WideArt } from '../components/Artwork';
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  ThumbDownIcon,
  ThumbUpIcon,
  BellIcon,
} from '../components/Icons';
import { Spinner } from '../components/Spinner';
import { cx, formatClock, formatDate, formatRuntime, percent, titleLabel } from '../lib/utils';
import { usePageTitle } from '../lib/hooks';
import { watchPathFor } from '../lib/playback';

interface Props {
  titleId: string;
  onClose: () => void;
}

export function TitleModalPage({ titleId, onClose }: Props) {
  const {
    activeProfile,
    profileState,
    toggleList,
    rate,
    addDownload,
    toggleReminder,
    notify,
  } = useApp();
  const [data, setData] = useState<{ title: TitleFull; similar: TitleLite[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState(1);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const load = useCallback(async () => {
    if (!activeProfile) return;
    setError(null);
    try {
      const payload = await api.title(titleId, activeProfile.id);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Could not load this title.');
    }
  }, [activeProfile, titleId]);

  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  const title = data?.title;
  usePageTitle(title ? `${title.title} — REELIX` : 'REELIX');

  const progress = useMemo(() => {
    if (!title) return null;
    return profileState?.progress[title.id] ?? title.progress ?? null;
  }, [profileState, title]);

  const selectedSeason = useMemo(() => {
    if (!title?.seasons.length) return null;
    return title.seasons.find((item) => item.n === season) ?? title.seasons[0];
  }, [season, title]);

  useEffect(() => {
    if (!title) return;
    const resumeSeason = progress?.episodeId?.match(/^s(\d+)e\d+$/);
    setSeason(resumeSeason ? Number(resumeSeason[1]) : title.seasons[0]?.n ?? 1);
    // Only jump to the resume season when switching titles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title?.id]);

  if (!activeProfile) return null;

  const play = (episodeId?: string) => {
    if (!title) return;
    if (title.status === 'coming-soon') return;
    const path =
      episodeId ? `/watch/${title.id}/${episodeId}` : watchPathFor(title, progress);
    if (path) {
      onClose();
      navigate(path);
    }
  };

  const inList = title
    ? profileState?.myList.some((item) => item.id === title.id) ?? title.inList
    : false;
  const currentRating = title
    ? profileState?.ratings[title.id] ?? title.rating ?? null
    : null;
  const reminded = title
    ? profileState?.reminders.includes(title.id) ?? title.reminder
    : false;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/#/title/${titleId}`);
      notify('Link copied to clipboard.', 'success');
    } catch {
      notify('Copy failed — this browser blocked clipboard access.', 'error');
    }
  };

  const playLabel = title && title.type === 'series' && progress && !progress.completed
    ? `Resume S${progress.episodeId.replace(/^s(\d+)e(\d+)$/, '$1:E$2')}`
    : 'Play';

  return (
    <Modal
      onClose={onClose}
      labelledBy="title-modal-heading"
      className="title-modal"
      scrimClassName="modal-scrim--title"
    >
      <div className="title-modal__close-wrap">
        <button type="button" className="title-modal__close" onClick={onClose} aria-label="Close title details">
          <CloseIcon size={22} />
        </button>
      </div>

      {!title && !error && (
        <div className="title-modal__loading">
          <Spinner size={40} label="Loading title" />
        </div>
      )}

      {error && (
        <div className="title-modal__error">
          <h2>We couldn’t open that title</h2>
          <p>{error}</p>
          <div className="title-modal__error-actions">
            <button type="button" className="btn btn--primary" onClick={() => void load()}>
              Try again
            </button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Go back
            </button>
          </div>
        </div>
      )}

      {title && (
        <>
          <div className="title-modal__hero">
            <HeroArt title={title} />
            <div className="title-modal__hero-gradients" />
            <div className="title-modal__hero-content">
              <p className="title-modal__eyebrow">
                <span className="billboard__brand">R</span>
                {title.isOriginal ? 'Reelix Original' : 'Reelix'}
                <span className="dot-sep" />
                {title.format}
              </p>
              <h1 id="title-modal-heading" className={cx('title-modal__title', `title-modal__title--${title.art.titleStyle}`)}>
                {title.title}
              </h1>
              <div className="title-modal__badges">
                <span className="match">{title.match ?? title.matchSeed}% Match</span>
                <span>{title.year}</span>
                <span className="maturity-chip">{title.maturity}</span>
                <span>{title.type === 'film' ? formatRuntime(title.runtimeMin) : titleLabel(title)}</span>
                <span className="quality-chip">HD</span>
              </div>

              <div className="title-modal__actions">
                {title.status === 'coming-soon' ? (
                  <button type="button" className="btn btn--primary btn--large" onClick={() => void toggleReminder(title.id)}>
                    {reminded ? <CheckIcon size={20} /> : <BellIcon size={20} />}
                    {reminded ? 'Reminder set' : 'Remind me'}
                  </button>
                ) : (
                  <button type="button" className="btn btn--primary btn--large" onClick={() => play()}>
                    <PlayIcon size={21} />
                    {playLabel}
                  </button>
                )}
                <button
                  type="button"
                  className="circle-btn circle-btn--large"
                  onClick={() => void toggleList(title.id)}
                  aria-label={inList ? 'Remove from My List' : 'Add to My List'}
                  title={inList ? 'Remove from My List' : 'Add to My List'}
                >
                  {inList ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
                </button>
                <button
                  type="button"
                  className={cx('circle-btn circle-btn--large', currentRating === 'like' && 'is-active')}
                  onClick={() => void rate(title.id, 'like')}
                  aria-label="Like this title"
                  aria-pressed={currentRating === 'like'}
                  title="Like"
                >
                  <ThumbUpIcon size={19} />
                </button>
                <button
                  type="button"
                  className={cx('circle-btn circle-btn--large circle-btn--dislike', currentRating === 'dislike' && 'is-active')}
                  onClick={() => void rate(title.id, 'dislike')}
                  aria-label="Not for me"
                  aria-pressed={currentRating === 'dislike'}
                  title="Not for me"
                >
                  <ThumbDownIcon size={19} />
                </button>
                <button type="button" className="circle-btn circle-btn--large" onClick={() => void share()} aria-label="Share title" title="Share">
                  <ShareIcon size={19} />
                </button>
                <div className="download-wrap">
                  <button
                    type="button"
                    className="circle-btn circle-btn--large"
                    onClick={() => setDownloadOpen((value) => !value)}
                    aria-label="Download title"
                    aria-expanded={downloadOpen}
                    title="Download"
                    disabled={title.status === 'coming-soon'}
                  >
                    <DownloadIcon size={19} />
                  </button>
                  {downloadOpen && title.status !== 'coming-soon' && (
                    <div className="download-menu">
                      <p>Download quality</p>
                      {(['SD', 'HD', '4K'] as const).map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => {
                            setDownloadOpen(false);
                            void addDownload(
                              title.id,
                              title.type === 'film' ? 'film' : progress?.episodeId ?? 's1e1',
                              quality,
                            );
                          }}
                        >
                          <span>{quality}</span>
                          <small>{quality === 'SD' ? 'Compact · 480p' : quality === 'HD' ? 'Balanced · 1080p' : 'Best · 2160p'}</small>
                        </button>
                      ))}
                      <p className="download-menu__note">Simulated download for this demo.</p>
                    </div>
                  )}
                </div>
              </div>

              {progress && !progress.completed && (
                <div className="title-modal__resume">
                  <div className="progress-track">
                    <span style={{ width: `${percent(progress.seconds, progress.duration)}%` }} />
                  </div>
                  <span>
                    {percent(progress.seconds, progress.duration) < 1
                      ? 'Not started'
                      : `${formatClock(progress.seconds)} watched of ${formatClock(progress.duration)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="title-modal__body">
            <div className="title-modal__main">
              <div className="title-modal__meta">
                <span className="match">{title.match ?? title.matchSeed}% Match</span>
                <span>{title.year}</span>
                <span>{title.type === 'film' ? formatRuntime(title.runtimeMin) : titleLabel(title)}</span>
                <span className="maturity-chip">{title.maturity}</span>
                <span className="quality-chip">HD</span>
                {title.status === 'coming-soon' && (
                  <span className="pill pill--soon">Arrives {formatDate(title.comingSoonDate ?? title.dateAdded)}</span>
                )}
              </div>
              <p className="title-modal__tagline">{title.tagline}</p>
              <p className="title-modal__synopsis">{title.synopsis}</p>
              {title.cast.length > 0 && (
                <p className="title-modal__castline">
                  <span>Starring</span> {title.cast.map((person) => person.name).join(', ')}
                </p>
              )}

              {title.type === 'series' && selectedSeason && (
                <section className="episodes-section">
                  <div className="episodes-head">
                    <h2>Episodes</h2>
                    <label className="select-label select-label--dark">
                      <span className="sr-only">Season</span>
                      <select
                        value={selectedSeason.n}
                        onChange={(event) => setSeason(Number(event.target.value))}
                      >
                        {title.seasons.map((item) => (
                          <option key={item.n} value={item.n}>
                            Season {item.n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <ul className="episode-list">
                    {selectedSeason.episodes.map((episode) => {
                      const episodeProgress =
                        progress && progress.episodeId === episode.id ? progress : null;
                      return (
                        <li key={episode.id}>
                          <button type="button" className="episode-row" onClick={() => play(episode.id)}>
                            <span className="episode-row__index">{String(episode.episode).padStart(2, '0')}</span>
                            <span className="episode-row__art">
                              <EpisodeStill title={title} episodeNumber={episode.episode} />
                              <span className="episode-row__play">
                                <PlayIcon size={20} />
                              </span>
                              {episodeProgress && (
                                <span className="card-progress">
                                  <span style={{ width: `${percent(episodeProgress.seconds, episodeProgress.duration)}%` }} />
                                </span>
                              )}
                            </span>
                            <span className="episode-row__copy">
                              <span className="episode-row__title-line">
                                <strong>{episode.title}</strong>
                                <span>{formatRuntime(episode.runtimeMin)}</span>
                              </span>
                              <span className="episode-row__synopsis">{episode.synopsis}</span>
                              {episodeProgress && (
                                <span className="episode-row__resume">
                                  {formatClock(episodeProgress.seconds)} of {formatRuntime(episode.runtimeMin)} watched
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="similar-section">
                <h2>More Like This</h2>
                <div className="similar-grid">
                  {(data?.similar ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="similar-card"
                      onClick={() => navigate(`/title/${item.id}`)}
                    >
                      <span className="similar-card__art">
                        <WideArt title={item} showTitle={false} />
                      </span>
                      <span className="similar-card__body">
                        <span className="similar-card__meta">
                          <span className="match">{item.match ?? item.matchSeed}% Match</span>
                          <span className="maturity-chip">{item.maturity}</span>
                          <span>{item.year}</span>
                        </span>
                        <strong>{item.title}</strong>
                        <span className="similar-card__synopsis">{item.logline}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <aside className="title-modal__about">
              <h2>About <span>{title.title}</span></h2>
              <dl>
                {title.type === 'film' ? (
                  title.director && (
                    <div>
                      <dt>Director</dt>
                      <dd>{title.director}</dd>
                    </div>
                  )
                ) : (
                  title.creator && (
                    <div>
                      <dt>Creator</dt>
                      <dd>{title.creator}</dd>
                    </div>
                  )
                )}
                <div>
                  <dt>Cast</dt>
                  <dd>
                    {title.cast.map((person) => (
                      <span key={person.name}>
                        {person.name} <em>as {person.role}</em>
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Genres</dt>
                  <dd>{title.genres.join(', ')}</dd>
                </div>
                <div>
                  <dt>Moods</dt>
                  <dd>{title.moods.join(', ')}</dd>
                </div>
                <div>
                  <dt>This {title.type === 'film' ? 'film' : 'series'} is</dt>
                  <dd>{title.moods.slice(0, 3).join(', ')}, and {title.isOriginal ? 'a REELIX Original' : 'streaming on REELIX'}.</dd>
                </div>
                <div>
                  <dt>Maturity rating</dt>
                  <dd>
                    <span className="maturity-chip">{title.maturity}</span> {title.maturityDescription}
                  </dd>
                </div>
                <div>
                  <dt>Audio</dt>
                  <dd>{title.audioLanguages.join(', ')}</dd>
                </div>
                <div>
                  <dt>Subtitles</dt>
                  <dd>{title.subtitleLanguages.join(', ')}</dd>
                </div>
              </dl>
              <p className="title-modal__demo-note">
                All titles, artwork and people here are fictional. Playback is a synthetic cinematic
                rendered from the title’s key art.
              </p>
            </aside>
          </div>
        </>
      )}
    </Modal>
  );
}
