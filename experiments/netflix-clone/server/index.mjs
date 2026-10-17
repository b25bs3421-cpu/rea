import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATALOG, CATALOG_BY_ID } from './catalog.mjs';
import {
  AVATARS,
  MAX_PROFILES,
  PLANS,
  createProfile,
  createUser,
  deleteProfile,
  findProfile,
  findUserById,
  getState,
  listProfiles,
  markNotificationsRead,
  notificationsFor,
  parseSession,
  persist,
  profileCount,
  publicProfile,
  recordSearch,
  removeProgress,
  saveProgress,
  setRating,
  signSession,
  toggleList,
  toggleReminder,
  updateDownload,
  updateProfile,
  updateUser,
  userIsCurrent,
  verifyProfilePin,
  verifyUser,
  findUserByEmail,
} from './store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IS_PRODUCTION = process.env.APP_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const COOKIE_NAME = 'reelix_session';
const MAX_SAFE = 5_000_000;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function setSessionCookie(req, res, token) {
  const secure = req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${secure ? '; Secure' : ''}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function fail(res, status, message, code = 'REQUEST_FAILED') {
  res.status(status).json({ error: message, code });
}

function requireUser(req, res, next) {
  const token = readCookie(req, COOKIE_NAME);
  const session = parseSession(token);
  if (!session) return fail(res, 401, 'Sign in to continue.', 'UNAUTHENTICATED');
  const user = findUserById(session.uid);
  if (!user) return fail(res, 401, 'Sign in to continue.', 'UNAUTHENTICATED');
  if (user.allDevicesSignedOutAt && session.iat < new Date(user.allDevicesSignedOutAt).getTime()) {
    return fail(res, 401, 'Your session has ended. Sign in again.', 'SESSION_ENDED');
  }
  req.user = user;
  next();
}

function requireProfile(req, res, next) {
  const profile = findProfile(req.user.id, req.params.profileId);
  if (!profile) return fail(res, 404, 'Profile not found.', 'PROFILE_NOT_FOUND');
  req.profile = profile;
  next();
}

function daysSince(dateString) {
  const then = new Date(dateString).getTime();
  if (!Number.isFinite(then)) return 9999;
  return (Date.now() - then) / 86400000;
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function toLite(title) {
  return {
    id: title.id,
    title: title.title,
    type: title.type,
    year: title.year,
    maturity: title.maturity,
    format: title.format,
    tagline: title.tagline,
    logline: title.logline,
    synopsis: title.synopsis,
    genres: title.genres,
    moods: title.moods,
    cast: title.cast,
    creator: title.creator ?? null,
    director: title.director ?? null,
    tags: title.tags,
    art: title.art,
    rank: title.rank ?? null,
    trend: title.trend,
    critics: title.critics,
    dateAdded: title.dateAdded,
    availableDate: title.availableDate,
    status: title.status,
    comingSoonDate: title.comingSoonDate ?? null,
    seasonCount: title.seasonCount,
    episodeCount: title.episodeCount,
    runtimeMin: title.runtimeMin ?? null,
    averageRuntime: title.averageRuntime,
    isOriginal: title.isOriginal,
    kidsSafe: title.kidsSafe,
    matchSeed: title.matchSeed,
    isNew: title.status !== 'coming-soon' && daysSince(title.dateAdded) < 45,
  };
}

function toFull(title) {
  return {
    ...toLite(title),
    seasons: title.seasons,
    dialogue: title.dialogue,
    audioLanguages: title.audioLanguages,
    subtitleLanguages: title.subtitleLanguages,
    maturityDescription: title.maturityDescription,
    accentAudio: title.accentAudio,
  };
}

function preferredGenres(state) {
  const counts = new Map();
  for (const [titleId, value] of Object.entries(state.ratings ?? {})) {
    if (value !== 'like') continue;
    const title = CATALOG_BY_ID.get(titleId);
    if (!title) continue;
    for (const genre of title.genres) counts.set(genre, (counts.get(genre) ?? 0) + 2);
  }
  for (const titleId of state.myList ?? []) {
    const title = CATALOG_BY_ID.get(titleId);
    if (!title) continue;
    for (const genre of title.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([genre]) => genre);
}

function matchFor(profile, state, title) {
  const seed = hashString(`${profile.id}:${title.id}`) % 12;
  const genres = preferredGenres(state);
  let score = title.matchSeed - 5 + seed;
  if (title.genres.some((genre) => genres.slice(0, 4).includes(genre))) score += 8;
  if ((state.myList ?? []).includes(title.id)) score += 3;
  if (state.ratings?.[title.id] === 'like') score += 4;
  return Math.max(55, Math.min(98, Math.round(score)));
}

function similarTitles(title, limit = 9) {
  return CATALOG.filter((candidate) => candidate.id !== title.id)
    .map((candidate) => {
      const sharedGenres = candidate.genres.filter((genre) => title.genres.includes(genre)).length;
      const sharedMoods = candidate.moods.filter((mood) => title.moods.includes(mood)).length;
      const score =
        sharedGenres * 5 + sharedMoods * 2 + (candidate.type === title.type ? 1 : 0) + candidate.trend / 40;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

function decorateForProfile(profile, state) {
  return (title) => ({
    ...toLite(title),
    match: matchFor(profile, state, title),
    inList: (state.myList ?? []).includes(title.id),
    rating: state.ratings?.[title.id] ?? null,
    progress: state.progress?.[title.id] ?? null,
    reminder: (state.reminders ?? []).includes(title.id),
  });
}

function buildHome(profile) {
  const state = getState(profile.id);
  const decorate = decorateForProfile(profile, state);
  const visible = CATALOG.filter(
    (title) => (!profile.kids || title.kidsSafe) && title.status !== 'coming-soon',
  );
  const comingSoon = CATALOG.filter(
    (title) => (!profile.kids || title.kidsSafe) && title.status === 'coming-soon',
  );
  const byTrend = [...visible].sort((a, b) => b.trend - a.trend);
  const byNew = [...visible].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  const byCritics = [...visible].sort((a, b) => b.critics - a.critics);
  const top10 = [...CATALOG]
    .filter((title) => title.rank && title.rank <= 10 && title.status !== 'coming-soon')
    .filter((title) => !profile.kids || title.kidsSafe)
    .sort((a, b) => a.rank - b.rank);

  const progressEntries = Object.values(state.progress ?? {})
    .filter((entry) => !entry.completed && entry.seconds / Math.max(entry.duration, 1) > 0.02)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 12);
  const continueItems = progressEntries
    .map((entry) => {
      const title = CATALOG_BY_ID.get(entry.titleId);
      if (!title || (profile.kids && !title.kidsSafe)) return null;
      return { ...decorate(title), progress: entry };
    })
    .filter(Boolean);

  const listItems = (state.myList ?? [])
    .map((id) => CATALOG_BY_ID.get(id))
    .filter((title) => title && (!profile.kids || title.kidsSafe))
    .map(decorate);

  const watchedIds = new Set(Object.keys(state.progress ?? {}));
  const latestWatched = Object.values(state.progress ?? {})
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((entry) => CATALOG_BY_ID.get(entry.titleId))
    .find((title) => title && (!profile.kids || title.kidsSafe));

  const excluded = new Set([...watchedIds, ...(state.myList ?? [])]);
  const becauseGenre = latestWatched?.genres?.[0];
  const becauseCandidates = [...visible]
    .filter((title) => !excluded.has(title.id))
    .filter((title) => (becauseGenre ? title.genres.includes(becauseGenre) : true))
    .sort((a, b) => b.trend - a.trend);

  const completed = Object.values(state.progress ?? {})
    .filter((entry) => entry.completed)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((entry) => CATALOG_BY_ID.get(entry.titleId))
    .filter((title) => title && (!profile.kids || title.kidsSafe));

  const comingSoonDecorated = comingSoon.sort(
    (a, b) => new Date(a.comingSoonDate ?? a.dateAdded) - new Date(b.comingSoonDate ?? b.dateAdded),
  ).map(decorate);

  const rows = [];
  const pushRow = (id, title, items, extra = {}) => {
    if (!items.length) return;
    rows.push({ id, title, items: items.slice(0, 18), ...extra });
  };

  if (profile.kids) {
    pushRow('continue', 'Continue Watching', continueItems);
    pushRow('kids-family', 'Kids & Family', byTrend.filter((t) => t.kidsSafe));
    pushRow(
      'characters',
      'Meet the characters',
      byTrend.filter((t) => t.kidsSafe).slice(0, 8),
      { kind: 'characters' },
    );
    pushRow('animation', 'Animated Adventures', visible.filter((t) => t.genres.includes('Animation')));
    pushRow('learn', 'Learn & Explore', visible.filter((t) => t.genres.includes('Documentary') || t.genres.includes('Nature')));
    pushRow('my-list', 'My List', listItems);
    pushRow('top10', 'Top 10 for Kids', top10, { kind: 'top10' });
    pushRow('because', becauseGenre ? `Because you watched ${latestWatched.title}` : 'Picked for you', becauseCandidates);
    pushRow('again', 'Watch It Again', completed);
    pushRow('coming', 'Coming Soon', comingSoonDecorated);
  } else {
    pushRow('continue', 'Continue Watching', continueItems, { kind: 'continue' });
    pushRow('trending', 'Trending Now', byTrend);
    pushRow(
      'top10',
      'Top 10 in India Today',
      top10,
      { kind: 'top10', subtitle: 'This week’s most-watched titles on REELIX.' },
    );
    pushRow('new', 'New Releases', byNew);
    pushRow('my-list', 'My List', listItems);
    pushRow(
      'because',
      latestWatched ? `Because you watched ${latestWatched.title}` : 'Critically Acclaimed',
      latestWatched ? becauseCandidates : byCritics,
    );
    pushRow('originals', 'Only on REELIX', visible.filter((t) => t.isOriginal));
    pushRow('critics', 'Critically Acclaimed', byCritics.filter((t) => t.critics >= 85));
    pushRow('crime', 'Crime & Mystery', visible.filter((t) => t.genres.includes('Crime') || t.genres.includes('Mystery')));
    pushRow('scifi', 'Sci-Fi & Fantasy', visible.filter((t) => t.genres.includes('Sci-Fi') || t.genres.includes('Fantasy')));
    pushRow('docs', 'Documentaries & Real Stories', visible.filter((t) => t.genres.includes('Documentary')));
    pushRow('feelgood', 'Feel-Good Favourites', visible.filter((t) => t.moods.some((mood) => ['Warm', 'Charming', 'Hopeful', 'Playful', 'Nostalgic', 'Tender'].includes(mood))));
    pushRow('again', 'Watch It Again', completed);
    pushRow('coming', 'Coming Soon', comingSoonDecorated, { kind: 'coming' });
  }

  const heroPool = byTrend.filter(
    (title) => !state.progress?.[title.id]?.completed && title.rank <= 8,
  );
  const billboard = (heroPool.length ? heroPool : byTrend).slice(0, 4).map((title) => ({
    ...decorate(title),
    details: toFull(title),
  }));

  return {
    rows,
    billboard,
    generatedAt: new Date().toISOString(),
    visibleCount: visible.length,
  };
}

function publicCatalog() {
  return CATALOG.filter((title) => title.status !== 'coming-soon').map(toLite);
}

// ---------------------------------------------------------------------------
// Auth routes (rate-limited, in memory)
// ---------------------------------------------------------------------------

const attempts = new Map();
function limited(req, res, next) {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(key) ?? { count: 0, resetAt: now + 15 * 60_000 };
  if (entry.resetAt < now) {
    entry.count = 0;
    entry.resetAt = now + 15 * 60_000;
  }
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > 40) return fail(res, 429, 'Too many attempts. Try again in a few minutes.', 'RATE_LIMITED');
  next();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    planDetails: PLANS[user.plan] ?? PLANS.standard,
    memberSince: user.createdAt,
  };
}

function sessionPayload(user) {
  return {
    user: publicUser(user),
    profiles: listProfiles(user.id).map(publicProfile),
    notifications: notificationsFor(user.id).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
    plans: PLANS,
    avatars: AVATARS,
    maxProfiles: MAX_PROFILES,
  };
}

app.post('/api/auth/login', limited, (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return fail(res, 400, 'Email and password are required.', 'MISSING_FIELDS');
  const user = verifyUser(email, password);
  if (!user) return fail(res, 401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  setSessionCookie(req, res, signSession(user.id));
  res.json(sessionPayload(user));
});

app.post('/api/auth/signup', limited, (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return fail(res, 400, 'Enter a valid email address.', 'INVALID_EMAIL');
  }
  if (!password || String(password).length < 8) {
    return fail(res, 400, 'Password must be at least 8 characters.', 'WEAK_PASSWORD');
  }
  if (!name || !String(name).trim()) return fail(res, 400, 'Enter your name.', 'MISSING_NAME');
  try {
    const user = createUser({ email, password: String(password), name });
    setSessionCookie(req, res, signSession(user.id));
    res.status(201).json(sessionPayload(user));
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') return fail(res, 409, error.message, error.code);
    throw error;
  }
});

app.post('/api/auth/demo', limited, (req, res) => {
  const user = findUserByEmail('demo@reelix.app');
  if (!user) return fail(res, 500, 'Demo account is not available.', 'DEMO_UNAVAILABLE');
  setSessionCookie(req, res, signSession(user.id));
  res.json(sessionPayload(user));
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/session', requireUser, (req, res) => {
  res.json(sessionPayload(req.user));
});

app.patch('/api/account', requireUser, (req, res) => {
  const { plan, name } = req.body ?? {};
  if (plan && !PLANS[plan]) return fail(res, 400, 'Unknown plan.', 'INVALID_PLAN');
  const user = updateUser(req.user.id, { plan, name });
  res.json({ user: publicUser(user) });
});

app.post('/api/account/signout-all', requireUser, (req, res) => {
  req.user.allDevicesSignedOutAt = new Date().toISOString();
  persist();
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/account/notifications', requireUser, (req, res) => {
  res.json({
    notifications: notificationsFor(req.user.id).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
  });
});

app.post('/api/account/notifications/read', requireUser, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => typeof id === 'string') : null;
  res.json({
    notifications: markNotificationsRead(req.user.id, ids).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
  });
});

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

app.get('/api/profiles', requireUser, (req, res) => {
  res.json({ profiles: listProfiles(req.user.id).map(publicProfile) });
});

app.post('/api/profiles', requireUser, (req, res) => {
  try {
    const profile = createProfile(req.user.id, {
      name: req.body?.name,
      avatar: req.body?.avatar,
      kids: req.body?.kids,
      pin: req.body?.pin,
    });
    res.status(201).json({ profile: publicProfile(profile), profiles: listProfiles(req.user.id).map(publicProfile) });
  } catch (error) {
    if (error.code === 'PROFILE_LIMIT' || error.code === 'INVALID_NAME') {
      return fail(res, 400, error.message, error.code);
    }
    throw error;
  }
});

app.patch('/api/profiles/:profileId', requireUser, (req, res) => {
  try {
    const profile = updateProfile(req.user.id, req.params.profileId, req.body ?? {});
    if (!profile) return fail(res, 404, 'Profile not found.', 'PROFILE_NOT_FOUND');
    res.json({ profile: publicProfile(profile), profiles: listProfiles(req.user.id).map(publicProfile) });
  } catch (error) {
    if (error.code === 'INVALID_PIN') return fail(res, 400, error.message, error.code);
    throw error;
  }
});

app.delete('/api/profiles/:profileId', requireUser, (req, res) => {
  try {
    const removed = deleteProfile(req.user.id, req.params.profileId);
    if (!removed) return fail(res, 404, 'Profile not found.', 'PROFILE_NOT_FOUND');
    res.json({ ok: true, profiles: listProfiles(req.user.id).map(publicProfile) });
  } catch (error) {
    if (error.code === 'LAST_PROFILE') return fail(res, 400, error.message, error.code);
    throw error;
  }
});

app.post('/api/profiles/:profileId/verify-pin', requireUser, requireProfile, (req, res) => {
  if (!req.profile.pin) return res.json({ ok: true });
  const ok = verifyProfilePin(req.profile, req.body?.pin);
  if (!ok) return fail(res, 401, 'Incorrect PIN. Try again.', 'INVALID_PIN');
  res.json({ ok: true });
});

app.get('/api/profiles/:profileId/state', requireUser, requireProfile, (req, res) => {
  const state = getState(req.profile.id);
  const decorate = decorateForProfile(req.profile, state);
  const downloads = (state.downloads ?? [])
    .map((download) => {
      const title = CATALOG_BY_ID.get(download.titleId);
      if (!title) return null;
      const episode =
        title.type === 'series'
          ? title.seasons.flatMap((season) => season.episodes).find((ep) => ep.id === download.episodeId)
          : null;
      return {
        ...download,
        title: toLite(title),
        episode: episode ? { id: episode.id, title: episode.title, season: episode.season, episode: episode.episode } : null,
      };
    })
    .filter(Boolean);
  res.json({
    profile: publicProfile(req.profile),
    myList: (state.myList ?? []).map((id) => CATALOG_BY_ID.get(id)).filter(Boolean).map(decorate),
    ratings: state.ratings ?? {},
    progress: state.progress ?? {},
    searches: state.searches ?? [],
    downloads,
    reminders: state.reminders ?? [],
    updatedAt: state.updatedAt,
  });
});

app.get('/api/profiles/:profileId/home', requireUser, requireProfile, (req, res) => {
  res.json(buildHome(req.profile));
});

app.post('/api/profiles/:profileId/list', requireUser, requireProfile, (req, res) => {
  const { titleId, add } = req.body ?? {};
  const list = toggleList(req.profile.id, titleId, add);
  if (!list) return fail(res, 400, 'Unknown title.', 'UNKNOWN_TITLE');
  res.json({ myList: list });
});

app.post('/api/profiles/:profileId/rating', requireUser, requireProfile, (req, res) => {
  const { titleId, value } = req.body ?? {};
  const ratings = setRating(req.profile.id, titleId, value);
  if (!ratings) return fail(res, 400, 'Unknown title.', 'UNKNOWN_TITLE');
  res.json({ ratings });
});

app.post('/api/profiles/:profileId/progress', requireUser, requireProfile, (req, res) => {
  const { titleId, episodeId, seconds, duration, completed } = req.body ?? {};
  const progress = saveProgress(req.profile.id, { titleId, episodeId, seconds, duration, completed });
  if (!progress) return fail(res, 400, 'Unknown title.', 'UNKNOWN_TITLE');
  res.json({ progress });
});

app.delete('/api/profiles/:profileId/progress/:titleId', requireUser, requireProfile, (req, res) => {
  res.json({ progress: removeProgress(req.profile.id, req.params.titleId) });
});

app.post('/api/profiles/:profileId/downloads', requireUser, requireProfile, (req, res) => {
  const { titleId, episodeId, quality, action } = req.body ?? {};
  const downloads = updateDownload(req.profile.id, { titleId, episodeId, quality, action });
  if (!downloads) return fail(res, 400, 'Unknown title.', 'UNKNOWN_TITLE');
  res.json({ downloads });
});

app.post('/api/profiles/:profileId/reminders', requireUser, requireProfile, (req, res) => {
  const reminders = toggleReminder(req.profile.id, req.body?.titleId);
  if (!reminders) return fail(res, 400, 'Unknown title.', 'UNKNOWN_TITLE');
  res.json({ reminders });
});

app.post('/api/profiles/:profileId/search-history', requireUser, requireProfile, (req, res) => {
  res.json({ searches: recordSearch(req.profile.id, req.body?.query) });
});

app.delete('/api/profiles/:profileId/search-history', requireUser, requireProfile, (req, res) => {
  const state = getState(req.profile.id);
  state.searches = [];
  persist();
  res.json({ searches: [] });
});

// ---------------------------------------------------------------------------
// Catalog, titles, search
// ---------------------------------------------------------------------------

app.get('/api/public/catalog', (req, res) => {
  res.json({ titles: publicCatalog(), plans: PLANS });
});

app.get('/api/catalog', requireUser, (req, res) => {
  const profile = req.query.profileId ? findProfile(req.user.id, String(req.query.profileId)) : null;
  const state = profile ? getState(profile.id) : null;
  const decorate = profile && state ? decorateForProfile(profile, state) : toLite;
  const titles = CATALOG.filter((title) => !profile?.kids || title.kidsSafe)
    .filter((title) => !req.query.type || title.type === req.query.type)
    .map(decorate);
  res.json({ titles });
});

app.get('/api/titles/:titleId', requireUser, (req, res) => {
  const title = CATALOG_BY_ID.get(req.params.titleId);
  if (!title) return fail(res, 404, 'Title not found.', 'TITLE_NOT_FOUND');
  const profile = req.query.profileId ? findProfile(req.user.id, String(req.query.profileId)) : null;
  if (profile?.kids && !title.kidsSafe) {
    return fail(res, 403, 'This title is not available in a kids profile.', 'KIDS_RESTRICTED');
  }
  const state = profile ? getState(profile.id) : null;
  const base = toFull(title);
  res.json({
    title: {
      ...base,
      match: profile && state ? matchFor(profile, state, title) : null,
      inList: state ? (state.myList ?? []).includes(title.id) : false,
      rating: state?.ratings?.[title.id] ?? null,
      progress: state?.progress?.[title.id] ?? null,
      reminder: state ? (state.reminders ?? []).includes(title.id) : false,
    },
    similar: similarTitles(title)
      .filter((candidate) => !profile?.kids || candidate.kidsSafe)
      .map((candidate) => (profile && state ? decorateForProfile(profile, state)(candidate) : toLite(candidate))),
  });
});

app.get('/api/search', requireUser, (req, res) => {
  const query = String(req.query.q ?? '').trim().toLowerCase().slice(0, 80);
  const profile = req.query.profileId ? findProfile(req.user.id, String(req.query.profileId)) : null;
  const state = profile ? getState(profile.id) : null;
  const decorate = profile && state ? decorateForProfile(profile, state) : toLite;
  const pool = CATALOG.filter((title) => !profile?.kids || title.kidsSafe);
  if (!query) {
    return res.json({
      titles: [],
      topSearches: [...pool].sort((a, b) => b.trend - a.trend).slice(0, 8).map(decorate),
      genres: [...new Set(pool.flatMap((title) => title.genres))].sort(),
    });
  }
  const scored = pool
    .map((title) => {
      const haystacks = [
        title.title,
        ...title.genres,
        ...title.tags,
        ...title.cast.map((person) => person.name),
        title.creator ?? '',
        title.director ?? '',
        title.format,
      ];
      const haystack = haystacks.join(' ').toLowerCase();
      let score = 0;
      if (title.title.toLowerCase() === query) score += 100;
      if (title.title.toLowerCase().startsWith(query)) score += 60;
      if (title.title.toLowerCase().includes(query)) score += 40;
      if (title.genres.some((genre) => genre.toLowerCase().includes(query))) score += 18;
      if (haystack.includes(query)) score += 8;
      return { title, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.title.trend - a.title.trend)
    .slice(0, 24);
  res.json({
    titles: scored.map((entry) => decorate(entry.title)),
    topSearches: [...pool].sort((a, b) => b.trend - a.trend).slice(0, 8).map(decorate),
    genres: [...new Set(pool.flatMap((title) => title.genres))].sort(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: IS_PRODUCTION ? 'production' : 'development',
    titles: CATALOG.length,
    uptime: Math.round(process.uptime()),
  });
});

// ---------------------------------------------------------------------------
// API 404 + error boundary
// ---------------------------------------------------------------------------

app.use('/api', (req, res) => fail(res, 404, 'Endpoint not found.', 'NOT_FOUND'));

app.use((error, req, res, next) => {
  console.error('[reelix] request error:', error);
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') return fail(res, 413, 'Request too large.', 'TOO_LARGE');
  if (error instanceof SyntaxError) return fail(res, 400, 'Malformed JSON body.', 'BAD_JSON');
  return fail(res, 500, 'Something went wrong on our side.', 'INTERNAL');
});

// ---------------------------------------------------------------------------
// Static app: Vite middleware in development, built assets in production
// ---------------------------------------------------------------------------

async function start() {
  if (IS_PRODUCTION) {
    const dist = path.join(ROOT, 'dist');
    if (!existsSync(path.join(dist, 'index.html'))) {
      console.error('[reelix] dist/index.html not found. Run `npm run build` first.');
      process.exit(1);
    }
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: ROOT,
      server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) return next();
      try {
        const template = await vite.transformIndexHtml(
          req.originalUrl,
          (await import('node:fs')).readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
        );
        res.status(200).set({ 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }).end(template);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[reelix] listening on http://0.0.0.0:${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
  });
}

start().catch((error) => {
  console.error('[reelix] failed to start:', error);
  process.exit(1);
});

// Keep MAX_SAFE referenced so future request limits have a single place to change.
void MAX_SAFE;
void userIsCurrent;
