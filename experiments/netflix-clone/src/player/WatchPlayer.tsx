import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Episode, TitleFull } from '../types';
import { api, ApiError } from '../lib/api';
import { useApp } from '../state/AppContext';
import { navigate } from '../lib/router';
import { clamp, formatClock, formatRuntime, percent } from '../lib/utils';
import { preloadArt, drawFrame, INTRO_END, CREDITS_LENGTH } from './renderer';
import { AmbientScore } from './audio';
import { Timeline } from './Timeline';
import { Spinner } from '../components/Spinner';
import { EpisodeStill, WideArt } from '../components/Artwork';
import {
  ArrowLeftIcon,
  CaptionsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  EpisodesIcon,
  Forward10Icon,
  FullscreenExitIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  Replay10Icon,
  SpeedIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
} from '../components/Icons';

interface WatchPlayerProps {
  titleId: string;
  episodeId?: string;
  onExit: () => void;
}

interface SessionInfo {
  start: number;
  duration: number;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function readStoredVolume() {
  const stored = Number(localStorage.getItem('reelix.volume'));
  return Number.isFinite(stored) && stored >= 0 ? clamp(stored, 0, 1) : 0.6;
}

export function WatchPlayer({ titleId, episodeId, onExit }: WatchPlayerProps) {
  const {
    activeProfile,
    profileState,
    saveProgress,
    preferences,
    notify,
  } = useApp();
  const [payload, setPayload] = useState<TitleFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(() => localStorage.getItem('reelix.captions') !== 'off');
  const [speed, setSpeed] = useState(1);
  const [speedMenu, setSpeedMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoNextIn, setAutoNextIn] = useState<number | null>(null);
  const [nextDismissed, setNextDismissed] = useState(false);
  const [resumeNotice, setResumeNotice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(true);
  const endedRef = useRef(false);
  const speedRef = useRef(1);
  const audioRef = useRef<AmbientScore | null>(null);
  const hideTimer = useRef<number | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);

  const flatEpisodes = useMemo<Episode[]>(
    () => payload?.seasons.flatMap((season) => season.episodes) ?? [],
    [payload],
  );
  const currentEpisode = useMemo(() => {
    if (!payload || payload.type !== 'series') return null;
    return flatEpisodes.find((episode) => episode.id === episodeId) ?? flatEpisodes[0] ?? null;
  }, [episodeId, flatEpisodes, payload]);
  const currentIndex = currentEpisode ? flatEpisodes.findIndex((episode) => episode.id === currentEpisode.id) : -1;
  const nextEpisode =
    currentEpisode && currentIndex >= 0 && currentIndex < flatEpisodes.length - 1
      ? flatEpisodes[currentIndex + 1]
      : null;
  const effectiveEpisodeId = payload?.type === 'film' ? 'film' : currentEpisode?.id ?? 'film';

  useEffect(() => {
    if (!activeProfile) return;
    let cancelled = false;
    setPayload(null);
    setError(null);
    setSession(null);
    api
      .title(titleId, activeProfile.id)
      .then((result) => {
        if (!cancelled) setPayload(result.title);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof ApiError ? loadError.message : 'Playback could not start.');
      });
    return () => {
      cancelled = true;
    };
  }, [activeProfile, titleId]);

  useEffect(() => {
    if (!payload) return;
    preloadArt(payload.art);
    const duration = Math.max(
      60,
      (payload.type === 'film' ? payload.runtimeMin ?? 90 : currentEpisode?.runtimeMin ?? 45) * 60,
    );
    const previous = profileState?.progress[payload.id];
    const resume =
      previous &&
      previous.episodeId === effectiveEpisodeId &&
      !previous.completed &&
      previous.seconds > 20 &&
      previous.seconds < duration - 30
        ? previous.seconds
        : 0;
    const nextSession = { start: resume, duration };
    sessionRef.current = nextSession;
    durationRef.current = duration;
    timeRef.current = resume;
    playingRef.current = true;
    endedRef.current = false;
    setSession(nextSession);
    setTime(resume);
    setPlaying(true);
    setEnded(false);
    setNextDismissed(false);
    setDrawerSeason(payload.seasons[0]?.n ?? 1);
    if (resume > 30) {
      setResumeNotice(true);
      window.setTimeout(() => setResumeNotice(false), 4200);
    }
    // Resolve against the latest progress when the player opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, currentEpisode?.id, effectiveEpisodeId]);

  useEffect(() => {
    playingRef.current = playing;
    if (playing) {
      audioRef.current?.resume();
    } else {
      audioRef.current?.suspend();
    }
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    endedRef.current = ended;
  }, [ended]);

  // Create the ambient score once the player is ready.
  useEffect(() => {
    if (!session || !payload) return;
    const score = new AmbientScore();
    audioRef.current = score;
    score.setVolume(volume);
    score.setMuted(muted);
    void score.start(payload.accentAudio);
    const resumeAudio = () => score.resume();
    window.addEventListener('pointerdown', resumeAudio);
    return () => {
      window.removeEventListener('pointerdown', resumeAudio);
      score.dispose();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.duration, payload?.id]);

  useEffect(() => {
    audioRef.current?.setVolume(volume);
    localStorage.setItem('reelix.volume', String(volume));
  }, [volume]);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('reelix.captions', captionsOn ? 'on' : 'off');
  }, [captionsOn]);

  const persist = useCallback(
    (completed = false) => {
      if (!payload || !activeProfile || !sessionRef.current) return;
      const current = timeRef.current;
      if (!Number.isFinite(current)) return;
      saveProgress({
        titleId: payload.id,
        episodeId: effectiveEpisodeId,
        seconds: current,
        duration: durationRef.current,
        completed,
      });
    },
    [activeProfile, effectiveEpisodeId, payload, saveProgress],
  );
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Playback clock + canvas render loop.
  useEffect(() => {
    if (!session || !payload) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const loop = (now: number) => {
      const delta = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (playingRef.current && !endedRef.current) {
        timeRef.current = Math.min(durationRef.current, timeRef.current + delta * speedRef.current);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        drawFrame(canvas, {
          title: payload,
          episode: currentEpisode ? { season: currentEpisode.season, episode: currentEpisode.episode, title: currentEpisode.title } : null,
          time: timeRef.current,
          duration: durationRef.current,
        });
      }
      if (now - lastUi > 180) {
        setTime(timeRef.current);
        lastUi = now;
      }
      if (timeRef.current >= durationRef.current - 0.15 && !endedRef.current) {
        endedRef.current = true;
        playingRef.current = false;
        setEnded(true);
        setPlaying(false);
        persistRef.current(true);
        setControlsVisible(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [currentEpisode, payload, session]);

  // Periodic progress save.
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => {
      if (playingRef.current) persistRef.current(false);
    }, 8000);
    return () => {
      window.clearInterval(timer);
      persistRef.current(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.duration, effectiveEpisodeId]);

  useEffect(() => {
    const onBeforeUnload = () => persistRef.current(false);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  const bump = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playingRef.current) setControlsVisible(false);
    }, 3200);
  }, []);

  useEffect(() => {
    bump();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [bump, playing]);

  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    }
  }, [playing]);

  const seek = useCallback((seconds: number) => {
    const clamped = clamp(seconds, 0, durationRef.current);
    timeRef.current = clamped;
    setTime(clamped);
    if (endedRef.current) {
      endedRef.current = false;
      setEnded(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!session) return;
    if (endedRef.current) {
      seek(0);
      endedRef.current = false;
      setEnded(false);
      setNextDismissed(false);
      playingRef.current = true;
      setPlaying(true);
      bump();
      return;
    }
    const next = !playingRef.current;
    playingRef.current = next;
    setPlaying(next);
    if (!next) persistRef.current(false);
    bump();
  }, [bump, seek, session]);

  const goNext = useCallback(() => {
    if (!nextEpisode || !payload) return;
    persistRef.current(false);
    playingRef.current = false;
    navigate(`/watch/${payload.id}/${nextEpisode.id}`);
  }, [nextEpisode, payload]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await wrapperRef.current?.requestFullscreen();
      }
    } catch {
      notify('Fullscreen is unavailable in this browser context.', 'error');
    }
  }, [notify]);

  const exit = useCallback(() => {
    persistRef.current(false);
    onExit();
  }, [onExit]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      switch (event.key.toLowerCase()) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          event.preventDefault();
          seek(timeRef.current - 10);
          bump();
          break;
        case 'arrowright':
        case 'l':
          event.preventDefault();
          seek(timeRef.current + 10);
          bump();
          break;
        case 'arrowup':
          event.preventDefault();
          setVolume((value) => clamp(value + 0.1, 0, 1));
          setMuted(false);
          bump();
          break;
        case 'arrowdown':
          event.preventDefault();
          setVolume((value) => clamp(value - 0.1, 0, 1));
          bump();
          break;
        case 'm':
          setMuted((value) => !value);
          bump();
          break;
        case 'f':
          void toggleFullscreen();
          break;
        case 'c':
          setCaptionsOn((value) => !value);
          bump();
          break;
        case 'escape':
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else if (drawerOpen) {
            setDrawerOpen(false);
          } else if (speedMenu) {
            setSpeedMenu(false);
          }
          break;
        default:
          if (/^[0-9]$/.test(event.key)) {
            seek((Number(event.key) / 10) * durationRef.current);
            bump();
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bump, drawerOpen, seek, speedMenu, toggleFullscreen, togglePlay]);

  useEffect(() => {
    if (!ended || !nextEpisode || !preferences.autoplayNext || nextDismissed) {
      setAutoNextIn(null);
      return;
    }
    let remaining = 10;
    setAutoNextIn(remaining);
    const timer = window.setInterval(() => {
      remaining -= 1;
      setAutoNextIn(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        goNext();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ended, goNext, nextDismissed, nextEpisode, preferences.autoplayNext]);

  useEffect(() => {
    document.title = payload ? `${payload.title} — REELIX` : 'REELIX';
    return () => {
      document.title = 'REELIX';
    };
  }, [payload]);

  const captionSchedule = useMemo(() => {
    if (!payload || !session) return [];
    const lines = payload.dialogue;
    if (!lines.length) return [];
    const start = INTRO_END + 4;
    const end = session.duration - CREDITS_LENGTH - 4;
    const repeats = session.duration > 2400 ? 3 : 2;
    const count = lines.length * repeats;
    const step = Math.max(22, (end - start) / Math.max(1, count));
    const schedule: Array<{ start: number; end: number; text: string }> = [];
    for (let i = 0; i < count; i += 1) {
      const line = lines[i % lines.length];
      const lineStart = start + i * step;
      schedule.push({
        start: lineStart,
        end: lineStart + Math.min(7, Math.max(3.4, step * 0.55)),
        text: line,
      });
    }
    return schedule;
  }, [payload, session]);

  const activeCaption = useMemo(() => {
    if (!captionsOn) return null;
    return captionSchedule.find((line) => time >= line.start && time <= line.end) ?? null;
  }, [captionSchedule, captionsOn, time]);

  const showSkipIntro =
    payload?.type === 'series' && !ended && time > 3 && time < INTRO_END - 0.4;
  const showNextPanel =
    Boolean(nextEpisode) &&
    !nextDismissed &&
    (ended || (session ? time > session.duration - 34 : false));
  const percentPlayed = session ? percent(time, session.duration) : 0;
  const buffered = session ? Math.min(session.duration, time + 220) : 0;
  const currentSeason = payload?.seasons.find((season) => season.n === drawerSeason) ?? payload?.seasons[0];
  const resumePct = session && session.duration ? Math.round((session.start / session.duration) * 100) : 0;

  if (!activeProfile) return null;

  if (!payload) {
    return (
      <div className="player player--loading">
        <div className="player__loading-scrim">
          {error ? (
            <div className="player__error">
              <h1>Playback interrupted</h1>
              <p>{error}</p>
              <div className="player__error-actions">
                <button type="button" className="btn btn--primary" onClick={onExit}>
                  Go back
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => window.location.reload()}>
                  Reload
                </button>
              </div>
            </div>
          ) : (
            <>
              <Spinner size={44} label="Preparing playback" />
              <p>Preparing your synthetic cinematic…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`player ${controlsVisible ? 'is-ui-visible' : 'is-ui-hidden'} ${fullscreen ? 'is-fullscreen' : ''}`}
      ref={wrapperRef}
      onMouseMove={bump}
      onTouchStart={bump}
      onClick={() => {
        if (ended) return;
        togglePlay();
      }}
    >
      <canvas ref={canvasRef} className="player__canvas" aria-hidden />
      <p className="sr-only">
        Playing {payload.title}
        {currentEpisode ? `, season ${currentEpisode.season}, episode ${currentEpisode.episode}, ${currentEpisode.title}` : ''}.
        This is synthetic footage rendered from original key art. Playback controls are available below.
      </p>

      <div className="player__top" onClick={(event) => event.stopPropagation()}>
        <div className="player__top-bar">
          <button type="button" className="player__icon-btn player__back" onClick={exit} aria-label="Back to title details">
            <ArrowLeftIcon size={26} />
          </button>
          <div className="player__heading">
            <strong>{payload.title}</strong>
            <span>
              {currentEpisode
                ? `S${currentEpisode.season}:E${currentEpisode.episode} · ${currentEpisode.title}`
                : `${payload.year} · ${payload.format}`}
            </span>
          </div>
          <div className="player__top-right">
            <span className="player__demo-chip">DEMO · SYNTHETIC FOOTAGE</span>
          </div>
        </div>
      </div>

      {!playing && !ended && (
        <div className="player__center" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="player__skip" onClick={() => seek(timeRef.current - 10)} aria-label="Back 10 seconds">
            <Replay10Icon size={38} />
          </button>
          <button type="button" className="player__big-toggle" onClick={togglePlay} aria-label="Play">
            <PlayIcon size={38} />
          </button>
          <button type="button" className="player__skip" onClick={() => seek(timeRef.current + 10)} aria-label="Forward 10 seconds">
            <Forward10Icon size={38} />
          </button>
        </div>
      )}

      {playing && controlsVisible && !ended && (
        <div className="player__center player__center--playing" aria-hidden>
          <button type="button" className="player__skip player__skip--small" onClick={(event) => { event.stopPropagation(); seek(timeRef.current - 10); }} aria-label="Back 10 seconds">
            <Replay10Icon size={28} />
          </button>
          <button type="button" className="player__skip player__skip--small" onClick={(event) => { event.stopPropagation(); seek(timeRef.current + 10); }} aria-label="Forward 10 seconds">
            <Forward10Icon size={28} />
          </button>
        </div>
      )}

      {resumeNotice && session && (
        <div className="player__resume" role="status">
          Resuming from {formatClock(session.start)} · {resumePct}% watched
        </div>
      )}

      {showSkipIntro && (
        <button
          type="button"
          className="player__skip-intro"
          onClick={(event) => {
            event.stopPropagation();
            seek(INTRO_END);
          }}
        >
          Skip Intro
        </button>
      )}

      {activeCaption && (
        <div className="player__captions" aria-live="polite">
          <span>{activeCaption.text}</span>
        </div>
      )}

      {showNextPanel && nextEpisode && (
        <div className="player__next" onClick={(event) => event.stopPropagation()}>
          <p className="player__next-label">{ended ? 'Next episode' : 'Up next'}</p>
          <div className="player__next-card">
            <span className="player__next-art">
              <EpisodeStill title={payload} episodeNumber={nextEpisode.episode} />
            </span>
            <div className="player__next-copy">
              <strong>{nextEpisode.title}</strong>
              <span>
                S{nextEpisode.season}:E{nextEpisode.episode} · {formatRuntime(nextEpisode.runtimeMin)}
              </span>
              <button type="button" className="btn btn--primary btn--tiny" onClick={goNext}>
                <PlayIcon size={14} />
                {autoNextIn !== null ? `Play in ${autoNextIn}s` : 'Play next episode'}
              </button>
            </div>
            <button
              type="button"
              className="player__next-close"
              aria-label="Dismiss next episode"
              onClick={() => setNextDismissed(true)}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {ended && !nextEpisode && (
        <div className="player__ended" onClick={(event) => event.stopPropagation()}>
          <p>You’ve finished</p>
          <h2>{payload.title}</h2>
          <div className="player__ended-actions">
            <button type="button" className="btn btn--primary" onClick={togglePlay}>
              <PlayIcon size={18} /> Play again
            </button>
            <button type="button" className="btn btn--secondary" onClick={onExit}>
              Back to details
            </button>
          </div>
        </div>
      )}

      {showNextPanel && ended && nextEpisode && (
        <div className="player__credits-hint" aria-hidden>
          Credits are rolling · Next episode starts automatically
        </div>
      )}

      <div className="player__bottom" onClick={(event) => event.stopPropagation()}>
        <div className="player__timeline-wrap">
          <Timeline time={time} duration={session?.duration ?? 0} buffer={buffered} onSeek={seek} />
        </div>
        <div className="player__controls">
          <div className="player__controls-left">
            <button type="button" className="player__icon-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseIcon size={23} /> : <PlayIcon size={23} />}
            </button>
            <button type="button" className="player__icon-btn" onClick={() => seek(timeRef.current - 10)} aria-label="Back 10 seconds">
              <Replay10Icon size={24} />
            </button>
            <button type="button" className="player__icon-btn" onClick={() => seek(timeRef.current + 10)} aria-label="Forward 10 seconds">
              <Forward10Icon size={24} />
            </button>
            <div className="player__volume">
              <button
                type="button"
                className="player__icon-btn"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? <VolumeMuteIcon size={22} /> : <VolumeHighIcon size={22} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                className="volume-slider"
                aria-label="Volume"
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setVolume(value);
                  setMuted(value === 0);
                }}
              />
            </div>
            <span className="player__time">
              {formatClock(time)} <span>/ {formatClock(session?.duration ?? 0)}</span>
            </span>
          </div>
          <div className="player__controls-right">
            <button
              type="button"
              className={`player__icon-btn ${captionsOn ? 'is-active' : ''}`}
              onClick={() => setCaptionsOn((value) => !value)}
              aria-label={captionsOn ? 'Turn subtitles off' : 'Turn subtitles on'}
              aria-pressed={captionsOn}
              title="Subtitles"
            >
              <CaptionsIcon size={22} />
            </button>
            {payload.type === 'series' && (
              <button
                type="button"
                className="player__icon-btn"
                onClick={() => {
                  setDrawerOpen(true);
                  setControlsVisible(true);
                }}
                aria-label="Episodes"
                title="Episodes"
              >
                <EpisodesIcon size={22} />
              </button>
            )}
            <div className="player__speed-wrap">
              <button
                type="button"
                className="player__icon-btn"
                onClick={() => setSpeedMenu((value) => !value)}
                aria-label="Playback speed"
                aria-expanded={speedMenu}
                title="Playback speed"
              >
                <SpeedIcon size={22} />
                <span className="player__speed-label">{speed}x</span>
              </button>
              {speedMenu && (
                <div className="speed-menu">
                  <p>Playback Speed</p>
                  {SPEEDS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={value === speed ? 'is-active' : ''}
                      onClick={() => {
                        setSpeed(value);
                        setSpeedMenu(false);
                      }}
                    >
                      {value === 1 ? 'Normal' : `${value}x`}
                      {value === speed && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="player__icon-btn" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {fullscreen ? <FullscreenExitIcon size={22} /> : <FullscreenIcon size={22} />}
            </button>
          </div>
        </div>
      </div>

      {drawerOpen && payload.type === 'series' && (
        <div className="player-drawer-scrim" onClick={() => setDrawerOpen(false)}>
          <aside className="player-drawer" onClick={(event) => event.stopPropagation()} aria-label="Episodes">
            <header>
              <div>
                <p>Episodes</p>
                <strong>{payload.title}</strong>
              </div>
              <button type="button" className="player__icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close episodes">
                <CloseIcon size={22} />
              </button>
            </header>
            <label className="player-drawer__season">
              <span>Season</span>
              <select value={drawerSeason} onChange={(event) => setDrawerSeason(Number(event.target.value))}>
                {payload.seasons.map((season) => (
                  <option key={season.n} value={season.n}>
                    Season {season.n} ({season.episodes.length} episodes)
                  </option>
                ))}
              </select>
            </label>
            <ul>
              {(currentSeason?.episodes ?? []).map((episode) => {
                const isCurrent = episode.id === currentEpisode?.id;
                const progress = profileState?.progress[payload.id];
                const episodeProgress = progress && progress.episodeId === episode.id ? progress : null;
                return (
                  <li key={episode.id}>
                    <button
                      type="button"
                      className={`player-drawer__episode ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => {
                        if (isCurrent) {
                          setDrawerOpen(false);
                          return;
                        }
                        navigate(`/watch/${payload.id}/${episode.id}`);
                      }}
                    >
                      <span className="player-drawer__art">
                        <EpisodeStill title={payload} episodeNumber={episode.episode} />
                        {isCurrent && <span className="player-drawer__now">Now playing</span>}
                        {episodeProgress && (
                          <span className="card-progress">
                            <span style={{ width: `${percent(episodeProgress.seconds, episodeProgress.duration)}%` }} />
                          </span>
                        )}
                      </span>
                      <span className="player-drawer__copy">
                        <span className="player-drawer__title-line">
                          <strong>
                            {episode.episode}. {episode.title}
                          </strong>
                          <span>{formatRuntime(episode.runtimeMin)}</span>
                        </span>
                        <span>{episode.synopsis}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <footer>
              <span className="player__demo-chip">Synthetic episode stills</span>
            </footer>
          </aside>
        </div>
      )}

      <div className="player__progress-sr" aria-hidden>
        <span>{percentPlayed.toFixed(0)}%</span>
      </div>
    </div>
  );
}
