import { useEffect, useState } from 'react';
import { parseHash } from './utils';

export type Route =
  | { name: 'home' }
  | { name: 'browse'; kind: 'tv' | 'movies' }
  | { name: 'genre'; genre: string }
  | { name: 'new' }
  | { name: 'row'; rowId: string }
  | { name: 'my-list' }
  | { name: 'search'; query?: string }
  | { name: 'downloads' }
  | { name: 'account' }
  | { name: 'title'; titleId: string }
  | { name: 'watch'; titleId: string; episodeId?: string }
  | { name: 'profiles' }
  | { name: 'manage-profiles' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'onboarding' };

export function pathFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'browse':
      return `/browse/${route.kind}`;
    case 'genre':
      return `/genre/${encodeURIComponent(route.genre.toLowerCase())}`;
    case 'new':
      return '/new';
    case 'my-list':
      return '/my-list';
    case 'search':
      return route.query ? `/search/${encodeURIComponent(route.query)}` : '/search';
    case 'row':
      return `/row/${route.rowId}`;
    case 'downloads':
      return '/downloads';
    case 'account':
      return '/account';
    case 'title':
      return `/title/${route.titleId}`;
    case 'watch':
      return `/watch/${route.titleId}${route.episodeId ? `/${route.episodeId}` : ''}`;
    case 'profiles':
      return '/profiles';
    case 'manage-profiles':
      return '/manage-profiles';
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'onboarding':
      return '/onboarding';
    default:
      return '/';
  }
}

export function parseRoute(hash: string): Route {
  const path = parseHash(hash);
  if (!path) return { name: 'home' };
  const [head, second, third] = path.split('/');
  switch (head) {
    case 'browse':
      return { name: 'browse', kind: second === 'movies' ? 'movies' : 'tv' };
    case 'genre':
      return { name: 'genre', genre: decodeURIComponent(second ?? '') };
    case 'new':
      return { name: 'new' };
    case 'row':
      return second ? { name: 'row', rowId: second } : { name: 'home' };
    case 'my-list':
      return { name: 'my-list' };
    case 'search':
      return { name: 'search', query: second ? decodeURIComponent(second) : '' };
    case 'downloads':
      return { name: 'downloads' };
    case 'account':
      return { name: 'account' };
    case 'title':
      return second ? { name: 'title', titleId: second } : { name: 'home' };
    case 'watch':
      return second
        ? { name: 'watch', titleId: second, episodeId: third || undefined }
        : { name: 'home' };
    case 'profiles':
      return { name: 'profiles' };
    case 'manage-profiles':
      return { name: 'manage-profiles' };
    case 'login':
      return { name: 'login' };
    case 'signup':
      return { name: 'signup' };
    case 'onboarding':
      return { name: 'onboarding' };
    default:
      return { name: 'home' };
  }
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return;
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (opts.replace) {
    window.history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

export function navigateRoute(route: Route, opts: { replace?: boolean } = {}) {
  navigate(pathFor(route), opts);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window === 'undefined' ? '' : window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
