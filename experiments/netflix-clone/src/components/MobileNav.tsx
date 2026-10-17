import { useRoute } from '../lib/router';
import { cx } from '../lib/utils';
import { DownloadIcon, FilmIcon, HomeIcon, SearchIcon, SparkIcon } from './Icons';

const ITEMS = [
  { path: '/', label: 'Home', match: 'home', Icon: HomeIcon },
  { path: '/search', label: 'Search', match: 'search', Icon: SearchIcon },
  { path: '/new', label: 'New', match: 'new', Icon: SparkIcon },
  { path: '/browse/movies', label: 'Movies', match: 'browse', Icon: FilmIcon },
  { path: '/downloads', label: 'Downloads', match: 'downloads', Icon: DownloadIcon },
];

export function MobileNav() {
  const route = useRoute();
  return (
    <nav className="mobile-nav" aria-label="Mobile primary">
      {ITEMS.map(({ path, label, match, Icon }) => {
        const active = route.name === match || (match === 'search' && route.name === 'search');
        return (
          <a key={path} href={`#${path}`} className={cx('mobile-nav__item', active && 'is-active')} aria-current={active ? 'page' : undefined}>
            <Icon size={22} />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
