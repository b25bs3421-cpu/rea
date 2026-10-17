export type TitleType = 'series' | 'film';
export type TitleStatus = 'available' | 'coming-soon';
export type Rating = 'like' | 'dislike' | null;

export interface Art {
  poster: string | null;
  backdrop: string | null;
  /** Clean 16:9 artwork without baked-in typography, used behind hero copy. */
  hero?: string | null;
  colors: string[];
  titleStyle: 'serif' | 'display' | 'wide' | 'sans';
}

export interface Person {
  name: string;
  role: string;
}

export interface Episode {
  id: string;
  season: number;
  episode: number;
  title: string;
  synopsis: string;
  runtimeMin: number;
}

export interface Season {
  n: number;
  episodes: Episode[];
}

export interface Progress {
  titleId: string;
  episodeId: string;
  seconds: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

export interface TitleLite {
  id: string;
  title: string;
  type: TitleType;
  year: number;
  maturity: string;
  format: string;
  tagline: string;
  logline: string;
  synopsis: string;
  genres: string[];
  moods: string[];
  cast: Person[];
  creator: string | null;
  director: string | null;
  tags: string[];
  art: Art;
  rank: number | null;
  trend: number;
  critics: number;
  dateAdded: string;
  availableDate: string;
  status: TitleStatus;
  comingSoonDate: string | null;
  seasonCount: number;
  episodeCount: number;
  runtimeMin: number | null;
  averageRuntime: number;
  isOriginal: boolean;
  kidsSafe: boolean;
  matchSeed: number;
  isNew: boolean;
  match?: number | null;
  inList?: boolean;
  rating?: Rating;
  progress?: Progress | null;
  reminder?: boolean;
}

export interface TitleFull extends TitleLite {
  seasons: Season[];
  dialogue: string[];
  audioLanguages: string[];
  subtitleLanguages: string[];
  maturityDescription: string;
  accentAudio: number;
  match: number | null;
  inList: boolean;
  rating: Rating;
  progress: Progress | null;
  reminder: boolean;
}

export type RowKind = 'standard' | 'top10' | 'continue' | 'characters' | 'coming';

export interface Row {
  id: string;
  title: string;
  subtitle?: string;
  kind?: RowKind;
  items: TitleLite[];
}

export interface HomePayload {
  rows: Row[];
  billboard: (TitleLite & { details: TitleFull })[];
  generatedAt: string;
  visibleCount: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  kids: boolean;
  language: string;
  locked: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  quality: string;
  screens: number;
  downloads: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  planDetails: Plan;
  memberSince: string;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  titleId: string | null;
  createdAt: string;
  read: boolean;
}

export interface SessionPayload {
  user: User;
  profiles: Profile[];
  notifications: NotificationItem[];
  plans: Record<string, Plan>;
  avatars: string[];
  maxProfiles: number;
}

export interface DownloadEntry {
  titleId: string;
  episodeId: string;
  quality: string;
  sizeMb: number;
  createdAt: string;
  title: TitleLite;
  episode: { id: string; title: string; season: number; episode: number } | null;
}

export interface ProfileState {
  profile: Profile;
  myList: TitleLite[];
  ratings: Record<string, Rating>;
  progress: Record<string, Progress>;
  searches: string[];
  downloads: DownloadEntry[];
  reminders: string[];
  updatedAt: string;
}

export interface TitleResponse {
  title: TitleFull;
  similar: TitleLite[];
}

export interface SearchResponse {
  titles: TitleLite[];
  topSearches: TitleLite[];
  genres: string[];
}
