import type { Progress, TitleLite } from '../types';

export function firstEpisodeId(title: TitleLite) {
  return title.type === 'series' ? 's1e1' : 'film';
}

/** Where "Play" should take the viewer, respecting a saved resume point. */
export function watchPathFor(title: TitleLite, progress?: Progress | null) {
  if (title.status === 'coming-soon') return null;
  if (title.type === 'film') return `/watch/${title.id}`;
  const resumable =
    progress?.episodeId && /^s\d+e\d+$/.test(progress.episodeId) && !progress.completed
      ? progress.episodeId
      : null;
  return `/watch/${title.id}/${resumable ?? 's1e1'}`;
}

export function resumeLabel(title: TitleLite, progress?: Progress | null) {
  if (!progress) return null;
  const pct = Math.round((progress.seconds / Math.max(progress.duration, 1)) * 100);
  if (pct < 1) return null;
  if (progress.completed) return title.type === 'film' ? 'Watch again' : 'Watch again';
  if (title.type === 'film') return `Resume · ${pct}%`;
  const match = /^s(\d+)e(\d+)$/.exec(progress.episodeId);
  if (!match) return `Resume · ${pct}%`;
  return `Resume · S${match[1]}:E${match[2]}`;
}
