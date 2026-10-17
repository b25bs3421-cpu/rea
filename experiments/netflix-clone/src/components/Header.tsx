import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppContext';
import { navigate, navigateRoute, useRoute } from '../lib/router';
import { useClickOutside, useScrolled } from '../lib/hooks';
import { cx, timeAgo } from '../lib/utils';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import {
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  GlobeIcon,
  SearchIcon,
} from './Icons';

const NAV = [
  { label: 'Home', path: '/', match: (name: string) => name === 'home' },
  { label: 'TV Shows', path: '/browse/tv', match: (name: string) => name === 'browse' },
  { label: 'Movies', path: '/browse/movies', match: (name: string) => name === 'browse' },
  { label: 'New & Popular', path: '/new', match: (name: string) => name === 'new' },
  { label: 'My List', path: '/my-list', match: (name: string) => name === 'my-list' },
];

export function AppHeader() {
  const {
    session,
    activeProfile,
    profileState,
    catalog,
    leaveProfile,
    logout,
    selectProfile,
    markNotificationsRead,
    home,
  } = useApp();
  const route = useRoute();
  const scrolled = useScrolled(20);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useClickOutside<HTMLFormElement>(() => setSearchOpen(false), searchOpen);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false), menuOpen);
  const notifRef = useClickOutside<HTMLDivElement>(() => setNotifOpen(false), notifOpen);
  const genreRef = useClickOutside<HTMLDivElement>(() => setGenreOpen(false), genreOpen);

  const notifications = session?.notifications ?? [];
  const unread = notifications.filter((item) => !item.read).length;

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const title of catalog.length ? catalog : home?.rows.flatMap((row) => row.items) ?? []) {
      for (const genre of title.genres) set.add(genre);
    }
    return [...set].sort();
  }, [catalog, home]);

  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
    setGenreOpen(false);
    setSearchOpen(false);
  }, [route]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) return;
    navigate(`/search/${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchValue('');
  };

  const isActive = (item: (typeof NAV)[number]) => {
    if (item.label === 'TV Shows') return route.name === 'browse' && route.kind === 'tv';
    if (item.label === 'Movies') return route.name === 'browse' && route.kind === 'movies';
    return item.match(route.name);
  };

  const switchToProfile = async (profileId: string) => {
    const profile = session?.profiles.find((candidate) => candidate.id === profileId);
    if (!profile) return;
    if (profile.locked) {
      navigate('/profiles');
      return;
    }
    try {
      await selectProfile(profile);
      navigate('/');
    } catch {
      navigate('/profiles');
    }
  };

  return (
    <>
      <header className={cx('site-header', scrolled && 'is-scrolled', searchOpen && 'is-searching')}>
        <div className="site-header__inner">
          <div className="site-header__left">
            <Logo size="md" variant={activeProfile?.kids ? 'kids' : 'default'} />
            {!activeProfile?.kids && (
              <nav className="main-nav" aria-label="Primary">
                {NAV.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={cx('main-nav__link', isActive(item) && 'is-active')}
                    onClick={() => navigate(item.path)}
                    aria-current={isActive(item) ? 'page' : undefined}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="main-nav__genres" ref={genreRef}>
                  <button
                    type="button"
                    className={cx('main-nav__link', route.name === 'genre' && 'is-active')}
                    onClick={() => setGenreOpen((value) => !value)}
                    aria-expanded={genreOpen}
                  >
                    Genres
                    <ChevronDownIcon size={13} />
                  </button>
                  {genreOpen && (
                    <div className="genre-menu">
                      <p className="genre-menu__label">Browse by genre</p>
                      <div className="genre-menu__grid">
                        {genres.map((genre) => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              setGenreOpen(false);
                              navigateRoute({ name: 'genre', genre });
                            }}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            )}
            {activeProfile?.kids && (
              <span className="kids-nav-label">Welcome back, {activeProfile.name}</span>
            )}
          </div>

          <div className="site-header__right">
            <form
              ref={searchWrapRef}
              className={cx('header-search', searchOpen && 'is-open')}
              onSubmit={submitSearch}
              role="search"
            >
              <input
                ref={searchInputRef}
                type="search"
                className="header-search__input"
                placeholder="Titles, people, genres"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                aria-label="Search titles, people and genres"
                tabIndex={searchOpen ? 0 : -1}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={searchOpen ? 'Close search' : 'Search'}
                onClick={() => {
                  if (window.matchMedia('(max-width: 860px)').matches) {
                    navigate('/search');
                    return;
                  }
                  setSearchOpen((value) => {
                    const next = !value;
                    if (next) window.setTimeout(() => searchInputRef.current?.focus(), 30);
                    return next;
                  });
                }}
              >
                {searchOpen ? <CloseIcon size={21} /> : <SearchIcon size={21} />}
              </button>
            </form>

            {!activeProfile?.kids && (
              <a className="header-text-link" href="#/profiles">
                Kids
              </a>
            )}
            <div className="notif-wrap" ref={notifRef}>
              <button
                type="button"
                className="icon-btn notif-btn"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                onClick={() => setNotifOpen((value) => !value)}
                aria-expanded={notifOpen}
              >
                <BellIcon size={21} />
                {unread > 0 && <span className="notif-dot">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel__head">
                    <strong>Notifications</strong>
                    {unread > 0 && (
                      <button type="button" onClick={() => void markNotificationsRead()}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 && <p className="notif-panel__empty">Nothing new right now.</p>}
                  <ul>
                    {notifications.map((item) => (
                      <li key={item.id} className={cx('notif-item', !item.read && 'is-unread')}>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            void markNotificationsRead();
                            navigate(item.titleId ? `/title/${item.titleId}` : '/new');
                          }}
                        >
                          <span className="notif-item__icon" aria-hidden>
                            {item.kind === 'top10' ? '10' : item.kind === 'new-season' ? 'S' : 'N'}
                          </span>
                          <span className="notif-item__copy">
                            <strong>{item.title}</strong>
                            <span>{item.body}</span>
                            <em>{timeAgo(item.createdAt)}</em>
                          </span>
                          {!item.read && <span className="unread-dot" aria-label="Unread" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="profile-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setMenuOpen((value) => !value)}
                onMouseEnter={() => {
                  if (window.matchMedia('(hover: hover)').matches) setMenuOpen(true);
                }}
                aria-expanded={menuOpen}
                aria-label="Account and profiles menu"
              >
                {activeProfile ? (
                  <Avatar avatar={activeProfile.avatar} name={activeProfile.name} size={32} />
                ) : (
                  <span className="profile-trigger__placeholder" />
                )}
                <ChevronDownIcon size={14} className={cx('profile-trigger__chevron', menuOpen && 'is-open')} />
              </button>
              {menuOpen && (
                <div className="profile-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <div className="profile-menu__profiles">
                    {session?.profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className={cx('profile-menu__profile', profile.id === activeProfile?.id && 'is-current')}
                        onClick={() => {
                          setMenuOpen(false);
                          if (profile.id === activeProfile?.id) return;
                          void switchToProfile(profile.id);
                        }}
                      >
                        <Avatar avatar={profile.avatar} size={30} />
                        <span>{profile.name}</span>
                        {profile.locked && <span className="profile-menu__lock">PIN</span>}
                        {profile.id === activeProfile?.id && <span className="profile-menu__current">Watching</span>}
                      </button>
                    ))}
                  </div>
                  <div className="profile-menu__links">
                    <button type="button" onClick={() => { setMenuOpen(false); navigate('/manage-profiles'); }}>
                      Manage Profiles
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); navigate('/account'); }}>
                      Account
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); setHelpOpen(true); }}>
                      Help Centre
                    </button>
                    {activeProfile?.kids && (
                      <button type="button" onClick={() => { setMenuOpen(false); leaveProfile(); }}>
                        Exit Kids Profile
                      </button>
                    )}
                    <button type="button" className="danger" onClick={() => { setMenuOpen(false); void logout(); }}>
                      Sign out of REELIX
                    </button>
                  </div>
                  {profileState && (
                    <p className="profile-menu__note">
                      <GlobeIcon size={13} /> {profileState.profile.language} · Demo account
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <Modal
        onClose={() => setHelpOpen(false)}
        className="help-modal"
        labelledBy="help-title"
        scrimClassName="modal-scrim--dim"
      >
        <button type="button" className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Close help">
          <CloseIcon size={20} />
        </button>
        <h2 id="help-title">Help Centre</h2>
        <p>
          REELIX is an independent, fictional streaming experience built as a reverse-engineering
          study. No payment is ever taken, and every title, poster, person and price on this
          service is invented for the demo.
        </p>
        <div className="help-grid">
          <div>
            <h3>Signing in</h3>
            <p>Use the demo account shown on the sign-in page, or create a free local account.</p>
          </div>
          <div>
            <h3>Profiles</h3>
            <p>Each profile keeps its own list, ratings and playback position. Profiles can be locked with a 4-digit PIN.</p>
          </div>
          <div>
            <h3>Playback</h3>
            <p>Films and episodes are rendered as original synthetic cinematics from the title's key art. The player supports seeking, skip intro, captions and next episode.</p>
          </div>
          <div>
            <h3>Your data</h3>
            <p>Everything is stored locally on this server in a JSON data file. Nothing is sent to a third party.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
