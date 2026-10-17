import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, CATALOG_BY_ID } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, '.data');
const DB_PATH = path.join(DATA_DIR, 'reelix.json');
const SECRET_PATH = path.join(DATA_DIR, 'secret');

const AVATARS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];
const MAX_PROFILES = 5;
export const PLANS = {
  basic: { id: 'basic', name: 'Basic', price: 199, quality: '720p', screens: 1, downloads: 1 },
  standard: { id: 'standard', name: 'Standard', price: 499, quality: '1080p', screens: 2, downloads: 2 },
  premium: { id: 'premium', name: 'Premium', price: 649, quality: '4K + HDR', screens: 4, downloads: 6 },
};

function uid(prefix) {
  return `${prefix}_${randomBytes(9).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function loadSecret() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(SECRET_PATH)) {
    writeFileSync(SECRET_PATH, randomBytes(48).toString('hex'), { mode: 0o600 });
  }
  return readFileSync(SECRET_PATH, 'utf8').trim();
}

const SECRET = loadSecret();

export function signSession(userId, ttlDays = 30) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now(), exp: Date.now() + ttlDays * 86400000 }),
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function parseSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function defaultState() {
  return {
    myList: [],
    ratings: {},
    progress: {},
    searches: [],
    downloads: [],
    reminders: [],
    updatedAt: nowIso(),
  };
}

function seedDatabase() {
  const demoUser = {
    id: uid('user'),
    name: 'Demo Viewer',
    email: 'demo@reelix.app',
    plan: 'premium',
    createdAt: nowIso(),
    ...hashPassword('demo1234'),
    allDevicesSignedOutAt: null,
  };

  const makeProfile = (name, avatar, kids, extra = {}) => ({
    id: uid('prof'),
    userId: demoUser.id,
    name,
    avatar,
    kids,
    pin: null,
    language: 'English',
    createdAt: nowIso(),
    ...extra,
  });

  const aarav = makeProfile('Aarav', 'a1', false);
  const priya = makeProfile('Priya', 'a3', false, {
    ...(() => {
      const { salt, hash } = hashPassword('1234');
      return { pin: { salt, hash } };
    })(),
  });
  const kabir = makeProfile('Kabir', 'a6', true);

  const states = {
    [aarav.id]: {
      ...defaultState(),
      myList: ['neon-district', 'glasshouse', 'deep-signal', 'afterlight', 'palindrome'],
      ratings: {
        blackwater: 'like',
        'last-orbit': 'like',
        'paper-crown': 'like',
        'neon-district': 'like',
        karst: 'dislike',
        'midnight-market': 'like',
      },
      progress: {
        blackwater: { titleId: 'blackwater', episodeId: 's1e2', seconds: 1980, duration: 3120, completed: false, updatedAt: nowIso() },
        'neon-district': { titleId: 'neon-district', episodeId: 's1e1', seconds: 410, duration: 3120, completed: false, updatedAt: nowIso() },
        'last-orbit': { titleId: 'last-orbit', episodeId: 'film', seconds: 3350, duration: 8280, completed: false, updatedAt: nowIso() },
        'paper-crown': { titleId: 'paper-crown', episodeId: 's1e5', seconds: 3140, duration: 3360, completed: false, updatedAt: nowIso() },
        glasshouse: { titleId: 'glasshouse', episodeId: 's1e1', seconds: 2880, duration: 3240, completed: true, updatedAt: nowIso() },
      },
      searches: ['cyberpunk', 'paper crown', 'documentaries'],
      downloads: [
        { titleId: 'last-orbit', episodeId: 'film', quality: 'HD', sizeMb: 1840, createdAt: nowIso() },
        { titleId: 'neon-district', episodeId: 's1e1', quality: 'HD', sizeMb: 620, createdAt: nowIso() },
      ],
      reminders: ['palindrome'],
    },
    [priya.id]: {
      ...defaultState(),
      myList: ['paper-crown', 'borrowed-light', 'glasshouse', 'night-shift'],
      ratings: {
        'paper-crown': 'like',
        'second-summer': 'like',
        'borrowed-light': 'like',
        'the-long-way-home': 'like',
      },
      progress: {
        'second-summer': { titleId: 'second-summer', episodeId: 's1e1', seconds: 1560, duration: 2520, completed: false, updatedAt: nowIso() },
        'paper-crown': { titleId: 'paper-crown', episodeId: 's2e1', seconds: 900, duration: 3300, completed: false, updatedAt: nowIso() },
      },
      searches: ['romance', 'period dramas'],
    },
    [kabir.id]: {
      ...defaultState(),
      myList: ['little-kingdoms', 'wild-lines', 'second-summer'],
      ratings: { 'little-kingdoms': 'like', 'wild-lines': 'like' },
      progress: {
        'little-kingdoms': { titleId: 'little-kingdoms', episodeId: 'film', seconds: 900, duration: 5280, completed: false, updatedAt: nowIso() },
      },
      searches: ['animals', 'animation'],
    },
  };

  return {
    users: [demoUser],
    profiles: [aarav, priya, kabir],
    states,
    notifications: {
      [demoUser.id]: [
        {
          id: uid('note'),
          kind: 'new-season',
          title: 'Neon District: Season 2 is here',
          body: 'Zara is back in the Neon District. New episodes now streaming.',
          titleId: 'neon-district',
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          read: false,
        },
        {
          id: uid('note'),
          kind: 'new-release',
          title: 'Blackwater is now on REELIX',
          body: 'The complete third season is streaming now.',
          titleId: 'blackwater',
          createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
          read: false,
        },
        {
          id: uid('note'),
          kind: 'recommendation',
          title: 'Because you watched The Paper Crown',
          body: 'Try The Glasshouse — a family drama with an equally sharp edge.',
          titleId: 'glasshouse',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          read: false,
        },
        {
          id: uid('note'),
          kind: 'top10',
          title: 'Top 10 in India today',
          body: 'See what everyone is watching this week.',
          titleId: null,
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          read: true,
        },
      ],
    },
    meta: { version: 1, createdAt: nowIso() },
  };
}

let db;
let saveTimer = null;

function loadDatabase() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(DB_PATH)) {
    try {
      db = JSON.parse(readFileSync(DB_PATH, 'utf8'));
      db.users ??= [];
      db.profiles ??= [];
      db.states ??= {};
      db.notifications ??= {};
      return;
    } catch (error) {
      console.warn('[reelix] could not read database, reseeding:', error.message);
    }
  }
  db = seedDatabase();
  persistNow();
}

function persistNow() {
  try {
    const tmp = `${DB_PATH}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(db, null, 2));
    renameSync(tmp, DB_PATH);
  } catch (error) {
    console.error('[reelix] failed to persist database:', error.message);
  }
}

export function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 120);
}

loadDatabase();

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------

export function findUserByEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  return db.users.find((user) => user.email === normalized) ?? null;
}

export function findUserById(id) {
  return db.users.find((user) => user.id === id) ?? null;
}

export function createUser({ email, password, name }) {
  const normalized = String(email).trim().toLowerCase();
  if (findUserByEmail(normalized)) {
    const error = new Error('An account with this email already exists.');
    error.code = 'EMAIL_TAKEN';
    throw error;
  }
  const user = {
    id: uid('user'),
    name: String(name).trim().slice(0, 60),
    email: normalized,
    plan: 'standard',
    createdAt: nowIso(),
    ...hashPassword(password),
    allDevicesSignedOutAt: null,
  };
  db.users.push(user);
  db.notifications[user.id] = [
    {
      id: uid('note'),
      kind: 'welcome',
      title: 'Welcome to REELIX',
      body: 'Create a profile to make the service yours. Up to five profiles per account.',
      titleId: null,
      createdAt: nowIso(),
      read: false,
    },
  ];
  persist();
  return user;
}

export function verifyUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(String(password), user.salt, user.hash)) return null;
  return user;
}

export function updateUser(userId, patch) {
  const user = findUserById(userId);
  if (!user) return null;
  if (patch.plan && PLANS[patch.plan]) user.plan = patch.plan;
  if (typeof patch.name === 'string' && patch.name.trim()) user.name = patch.name.trim().slice(0, 60);
  persist();
  return user;
}

export function userIsCurrent(user) {
  return !user.allDevicesSignedOutAt || true;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function listProfiles(userId) {
  return db.profiles.filter((profile) => profile.userId === userId);
}

export function findProfile(userId, profileId) {
  return db.profiles.find((profile) => profile.id === profileId && profile.userId === userId) ?? null;
}

export function profileCount(userId) {
  return listProfiles(userId).length;
}

export function createProfile(userId, { name, avatar, kids = false, pin = null }) {
  if (profileCount(userId) >= MAX_PROFILES) {
    const error = new Error(`You can have up to ${MAX_PROFILES} profiles.`);
    error.code = 'PROFILE_LIMIT';
    throw error;
  }
  const cleanName = String(name ?? '').trim().slice(0, 24);
  if (!cleanName) {
    const error = new Error('Profile name is required.');
    error.code = 'INVALID_NAME';
    throw error;
  }
  const profile = {
    id: uid('prof'),
    userId,
    name: cleanName,
    avatar: AVATARS.includes(avatar) ? avatar : 'a2',
    kids: Boolean(kids),
    pin: pin ? hashPassword(String(pin)) : null,
    language: 'English',
    createdAt: nowIso(),
  };
  db.profiles.push(profile);
  db.states[profile.id] = defaultState();
  persist();
  return profile;
}

export function updateProfile(userId, profileId, patch) {
  const profile = findProfile(userId, profileId);
  if (!profile) return null;
  if (typeof patch.name === 'string' && patch.name.trim()) {
    profile.name = patch.name.trim().slice(0, 24);
    persist();
  }
  if (AVATARS.includes(patch.avatar)) {
    profile.avatar = patch.avatar;
    persist();
  }
  if (typeof patch.kids === 'boolean') {
    profile.kids = patch.kids;
    persist();
  }
  if (patch.pin === null) {
    profile.pin = null;
    persist();
  } else if (typeof patch.pin === 'string') {
    if (!/^\d{4}$/.test(patch.pin)) {
      const error = new Error('PIN must be exactly 4 digits.');
      error.code = 'INVALID_PIN';
      throw error;
    }
    profile.pin = hashPassword(patch.pin);
    persist();
  }
  if (typeof patch.language === 'string') {
    profile.language = patch.language.slice(0, 40);
    persist();
  }
  return profile;
}

export function verifyProfilePin(profile, pin) {
  if (!profile.pin) return true;
  return verifyPassword(String(pin ?? ''), profile.pin.salt, profile.pin.hash);
}

export function deleteProfile(userId, profileId) {
  const profile = findProfile(userId, profileId);
  if (!profile) return false;
  if (listProfiles(userId).length <= 1) {
    const error = new Error('You need at least one profile.');
    error.code = 'LAST_PROFILE';
    throw error;
  }
  db.profiles = db.profiles.filter((item) => item.id !== profileId);
  delete db.states[profileId];
  persist();
  return true;
}

export function publicProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    kids: profile.kids,
    language: profile.language,
    locked: Boolean(profile.pin),
    createdAt: profile.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Per-profile state
// ---------------------------------------------------------------------------

export function getState(profileId) {
  db.states[profileId] ??= defaultState();
  return db.states[profileId];
}

function touch(state) {
  state.updatedAt = nowIso();
  persist();
}

export function toggleList(profileId, titleId, add) {
  if (!CATALOG_BY_ID.has(titleId)) return null;
  const state = getState(profileId);
  const has = state.myList.includes(titleId);
  const shouldAdd = typeof add === 'boolean' ? add : !has;
  if (shouldAdd && !has) state.myList.unshift(titleId);
  if (!shouldAdd && has) state.myList = state.myList.filter((id) => id !== titleId);
  touch(state);
  return state.myList;
}

export function setRating(profileId, titleId, value) {
  if (!CATALOG_BY_ID.has(titleId)) return null;
  const state = getState(profileId);
  if (value === 'like' || value === 'dislike') state.ratings[titleId] = value;
  else delete state.ratings[titleId];
  touch(state);
  return state.ratings;
}

export function saveProgress(profileId, { titleId, episodeId, seconds, duration, completed }) {
  const title = CATALOG_BY_ID.get(titleId);
  if (!title) return null;
  const state = getState(profileId);
  const safeDuration = Math.max(1, Number(duration) || 1);
  const safeSeconds = Math.min(Math.max(0, Number(seconds) || 0), safeDuration);
  state.progress[titleId] = {
    titleId,
    episodeId: String(episodeId || 'film'),
    seconds: Math.round(safeSeconds),
    duration: Math.round(safeDuration),
    completed: Boolean(completed) || safeSeconds >= safeDuration * 0.97,
    updatedAt: nowIso(),
  };
  touch(state);
  return state.progress[titleId];
}

export function removeProgress(profileId, titleId) {
  const state = getState(profileId);
  delete state.progress[titleId];
  touch(state);
  return state.progress;
}

export function recordSearch(profileId, query) {
  const clean = String(query ?? '').trim().slice(0, 80);
  if (!clean) return [];
  const state = getState(profileId);
  state.searches = [clean, ...state.searches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
  touch(state);
  return state.searches;
}

export function clearSearches(profileId) {
  const state = getState(profileId);
  state.searches = [];
  touch(state);
  return state.searches;
}

export function updateDownload(profileId, { titleId, episodeId = 'film', quality = 'HD', action = 'add' }) {
  const title = CATALOG_BY_ID.get(titleId);
  if (!title) return null;
  const state = getState(profileId);
  if (action === 'remove') {
    state.downloads = state.downloads.filter(
      (download) => !(download.titleId === titleId && download.episodeId === episodeId),
    );
    touch(state);
    return state.downloads;
  }
  const existing = state.downloads.find(
    (download) => download.titleId === titleId && download.episodeId === episodeId,
  );
  if (existing) return state.downloads;
  const base = title.type === 'film' ? title.runtimeMin * 12 : (title.averageRuntime ?? 45) * 12;
  const factor = quality === '4K' ? 1.6 : quality === 'HD' ? 1 : 0.45;
  state.downloads.unshift({
    titleId,
    episodeId,
    quality: quality === '4K' ? '4K' : quality === 'SD' ? 'SD' : 'HD',
    sizeMb: Math.round(base * factor),
    createdAt: nowIso(),
  });
  touch(state);
  return state.downloads;
}

export function toggleReminder(profileId, titleId) {
  if (!CATALOG_BY_ID.has(titleId)) return null;
  const state = getState(profileId);
  if (state.reminders.includes(titleId)) {
    state.reminders = state.reminders.filter((id) => id !== titleId);
  } else {
    state.reminders.push(titleId);
  }
  touch(state);
  return state.reminders;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function notificationsFor(userId) {
  return db.notifications[userId] ?? [];
}

export function markNotificationsRead(userId, ids = null) {
  const list = notificationsFor(userId);
  for (const notification of list) {
    if (!ids || ids.includes(notification.id)) notification.read = true;
  }
  persist();
  return list;
}

export { AVATARS, MAX_PROFILES, uid };
