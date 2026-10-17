import type {
  HomePayload,
  Plan,
  Profile,
  ProfileState,
  SearchResponse,
  SessionPayload,
  TitleLite,
  TitleResponse,
} from '../types';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'REQUEST_FAILED') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const data = payload as { error?: string; code?: string } | null;
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(data?.error ?? 'Something went wrong.', response.status, data?.code);
  }

  return payload as T;
}

function post<T>(path: string, body: unknown = {}) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export const api = {
  session: () => request<SessionPayload>('/api/auth/session'),
  login: (email: string, password: string) =>
    post<SessionPayload>('/api/auth/login', { email, password }),
  signup: (name: string, email: string, password: string) =>
    post<SessionPayload>('/api/auth/signup', { name, email, password }),
  demo: () => post<SessionPayload>('/api/auth/demo'),
  logout: () => post<{ ok: boolean }>('/api/auth/logout'),
  updateAccount: (patch: { plan?: string; name?: string }) =>
    request<{ user: SessionPayload['user'] }>('/api/account', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  signOutAll: () => post<{ ok: boolean }>('/api/account/signout-all'),
  notifications: () => request<{ notifications: SessionPayload['notifications'] }>('/api/account/notifications'),
  readNotifications: (ids: string[] | null) =>
    post<{ notifications: SessionPayload['notifications'] }>('/api/account/notifications/read', { ids }),

  publicCatalog: () =>
    request<{ titles: TitleLite[]; plans: Record<string, Plan> }>('/api/public/catalog'),
  catalog: (profileId: string | null) =>
    request<{ titles: TitleLite[] }>(`/api/catalog${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`),

  home: (profileId: string) => request<HomePayload>(`/api/profiles/${profileId}/home`),
  state: (profileId: string) => request<ProfileState>(`/api/profiles/${profileId}/state`),

  createProfile: (input: { name: string; avatar: string; kids: boolean; pin?: string | null }) =>
    post<{ profile: Profile; profiles: Profile[] }>('/api/profiles', input),
  updateProfile: (profileId: string, input: Partial<{ name: string; avatar: string; kids: boolean; pin: string | null }>) =>
    request<{ profile: Profile; profiles: Profile[] }>(`/api/profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteProfile: (profileId: string) =>
    request<{ ok: boolean; profiles: Profile[] }>(`/api/profiles/${profileId}`, { method: 'DELETE' }),
  verifyPin: (profileId: string, pin: string) =>
    post<{ ok: boolean }>(`/api/profiles/${profileId}/verify-pin`, { pin }),

  title: (titleId: string, profileId: string | null) =>
    request<TitleResponse>(`/api/titles/${titleId}${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`),
  search: (query: string, profileId: string | null) =>
    request<SearchResponse>(
      `/api/search?q=${encodeURIComponent(query)}${profileId ? `&profileId=${encodeURIComponent(profileId)}` : ''}`,
    ),

  toggleList: (profileId: string, titleId: string, add: boolean) =>
    post<{ myList: string[] }>(`/api/profiles/${profileId}/list`, { titleId, add }),
  rate: (profileId: string, titleId: string, value: 'like' | 'dislike' | null) =>
    post<{ ratings: Record<string, 'like' | 'dislike'> }>(`/api/profiles/${profileId}/rating`, {
      titleId,
      value,
    }),
  saveProgress: (
    profileId: string,
    input: { titleId: string; episodeId: string; seconds: number; duration: number; completed?: boolean },
  ) => post<{ progress: ProfileState['progress'][string] }>(`/api/profiles/${profileId}/progress`, input),
  removeProgress: (profileId: string, titleId: string) =>
    request<{ progress: ProfileState['progress'] }>(`/api/profiles/${profileId}/progress/${titleId}`, {
      method: 'DELETE',
    }),
  download: (profileId: string, input: { titleId: string; episodeId?: string; quality?: string; action?: string }) =>
    post<{ downloads: ProfileState['downloads'] }>(`/api/profiles/${profileId}/downloads`, input),
  toggleReminder: (profileId: string, titleId: string) =>
    post<{ reminders: string[] }>(`/api/profiles/${profileId}/reminders`, { titleId }),
  recordSearch: (profileId: string, query: string) =>
    post<{ searches: string[] }>(`/api/profiles/${profileId}/search-history`, { query }),
  clearSearches: (profileId: string) =>
    request<{ searches: string[] }>(`/api/profiles/${profileId}/search-history`, { method: 'DELETE' }),
};
