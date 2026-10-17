import { useState } from 'react';
import { Logo } from './Logo';
import { ChevronDownIcon, GlobeIcon } from './Icons';

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const [langOpen, setLangOpen] = useState(false);
  return (
    <footer className={compact ? 'site-footer site-footer--compact' : 'site-footer'}>
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <Logo size="sm" asLink={false} />
          {!compact && <p>Stories that stay with you.</p>}
        </div>
        <div className="site-footer__links">
          <a href="#/new">New & Popular</a>
          <a href="#/browse/tv">TV Shows</a>
          <a href="#/browse/movies">Movies</a>
          <a href="#/my-list">My List</a>
          <a href="#/search">Search</a>
          <a href="#/account">Account</a>
          <a href="#/manage-profiles">Profiles</a>
        </div>
        <div className="site-footer__lang">
          <button type="button" onClick={() => setLangOpen((value) => !value)} aria-expanded={langOpen}>
            <GlobeIcon size={16} />
            English
            <ChevronDownIcon size={14} />
          </button>
          {langOpen && (
            <div className="site-footer__lang-menu">
              <span className="is-selected">English</span>
              <span>हिन्दी — not available in demo</span>
              <span>தமிழ் — not available in demo</span>
            </div>
          )}
        </div>
        <p className="site-footer__fine">
          REELIX is a fictional streaming service built for a reverse-engineering case study. It is
          not affiliated with, endorsed by, or connected to Netflix or any other streaming provider.
          All titles, key art, cast names, prices and playback are original or synthetic. No payment
          is taken and no real content is streamed.
        </p>
        <p className="site-footer__code">REELIX · India · Demo build 1.0 · Service code 4K-7B-2026</p>
      </div>
    </footer>
  );
}
