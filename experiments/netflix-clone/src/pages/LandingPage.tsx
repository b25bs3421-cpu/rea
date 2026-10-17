import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useApp } from '../state/AppContext';
import { navigate } from '../lib/router';
import { Logo } from '../components/Logo';
import { PosterArt, WideArt } from '../components/Artwork';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/Spinner';
import { usePageTitle } from '../lib/hooks';
import { cx } from '../lib/utils';
import type { Plan, TitleLite } from '../types';
import {
  ChevronDownIcon,
  DownloadIcon,
  GlobeIcon,
  PlayIcon,
  SparkIcon,
} from '../components/Icons';

const FAQ = [
  {
    q: 'What is REELIX?',
    a: 'REELIX is a fictional streaming service built as a reverse-engineering case study. It recreates the product patterns of a modern subscription video app — profiles, a billboard, hover previews, a Top 10, My List, downloads, a custom player and more — using an entirely original catalogue of invented films and series.',
  },
  {
    q: 'Is this Netflix?',
    a: 'No. REELIX is an independent demo. It is not affiliated with, endorsed by or connected to Netflix or any other streaming provider. No Netflix code, trademarks, artwork, catalogue data or video is used. The experience is inspired by widely observed UX patterns, and the brand, titles, copy and artwork are original.',
  },
  {
    q: 'What can I actually watch?',
    a: 'Everything in the catalogue is playable. Each film and episode is rendered by a custom canvas engine from the title’s original key art, with a synthetic score, captions, a title sequence and rolling credits. You can seek, skip intros, change speed, switch episodes and resume where you left off.',
  },
  {
    q: 'Do profiles really keep separate lists?',
    a: 'Yes. Each profile has its own My List, likes and dislikes, viewing progress, search history and downloads. Profiles can be locked with a 4-digit PIN, and kids profiles only see titles suitable for younger viewers.',
  },
  {
    q: 'Does it cost anything?',
    a: 'Nothing. Plan prices are illustrative, no payment form exists, and no real subscription is created. Accounts, profiles and viewing data live in a local JSON file on the demo server.',
  },
  {
    q: 'Can I sign in without creating an account?',
    a: 'Yes — use “Explore the demo” anywhere on this page. It signs you into a pre-populated demo account with three profiles, a viewing history, My List items and downloads so you can see every feature immediately.',
  },
];

export function LandingPage() {
  const { loginDemo, preferences } = useApp();
  const [titles, setTitles] = useState<TitleLite[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  usePageTitle('REELIX — Stories that stay with you');

  useEffect(() => {
    let cancelled = false;
    api
      .publicCatalog()
      .then((payload) => {
        if (cancelled) return;
        setTitles(payload.titles);
        setPlans(Object.values(payload.plans));
      })
      .catch(() => {
        /* the landing page still renders without the strip */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trending = useMemo(
    () => [...titles].sort((a, b) => b.trend - a.trend).slice(0, 8),
    [titles],
  );
  const heroTitle = useMemo(
    () => titles.find((title) => title.id === 'blackwater') ?? trending[0],
    [titles, trending],
  );

  const startSignup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address to get started.');
      return;
    }
    setError(null);
    sessionStorage.setItem('reelix.signupEmail', email.trim());
    navigate('/signup');
  };

  const explore = async () => {
    setDemoBusy(true);
    setError(null);
    try {
      await loginDemo();
      navigate('/profiles');
    } catch {
      setError('The demo could not start. Please try signing in.');
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div className="landing">
      <header className="landing-header">
        <Logo size="md" />
        <div className="landing-header__right">
          <span className="landing-lang">
            <GlobeIcon size={16} />
            English
            <ChevronDownIcon size={13} />
          </span>
          <button type="button" className="btn btn--primary btn--small" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__bg" aria-hidden>
          <img src="/art/blackwater-hero.jpg" alt="" />
          <div className="landing-hero__wash" />
          <div className="landing-hero__glow" />
        </div>
        <div className="landing-hero__content">
          <p className="landing-kicker">
            <span className="billboard__brand">R</span>
            A REELIX ORIGINAL
          </p>
          <h1>
            Stories that
            <br />
            stay with you.
          </h1>
          <p className="landing-sub">
            Films that follow you home. Series you finish at 2 a.m. Documentaries that change the
            way you look at a map. One membership. Five profiles. No ads.
          </p>
          <form className="landing-email" onSubmit={startSignup}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              aria-invalid={Boolean(error)}
            />
            <button type="submit" className="btn btn--primary btn--large">
              Get Started
              <span aria-hidden>›</span>
            </button>
          </form>
          {error && <p className="landing-error" role="alert">{error}</p>}
          <p className="landing-fine">
            Ready to watch? Enter your email to create a free demo membership. No payment details,
            ever.
          </p>
          <button type="button" className="landing-demo" onClick={() => void explore()} disabled={demoBusy}>
            {demoBusy ? <Spinner size={16} /> : <PlayIcon size={15} />}
            {demoBusy ? 'Opening the demo…' : 'Explore the demo instantly'}
          </button>
        </div>

        <div className="landing-hero__posters" aria-hidden>
          {trending.slice(0, 3).map((title, index) => (
            <div className={`landing-poster landing-poster--${index + 1}`} key={title.id}>
              <PosterArt title={title} showTitle />
              {title.rank && <span className="landing-poster__rank">TOP {title.rank}</span>}
            </div>
          ))}
        </div>

        <div className="landing-hero__meta">
          <span className="maturity-chip">TV-MA</span>
          <span>Crime · Drama · Mystery</span>
          <span className="dot-sep" />
          <span>{heroTitle ? `Now streaming: ${heroTitle.title}` : 'Now streaming'}</span>
        </div>
        <div className="landing-hero__fade" aria-hidden />
      </section>

      <section className="landing-strip" aria-labelledby="landing-trending-title">
        <div className="landing-section-head">
          <h2 id="landing-trending-title">Trending on REELIX</h2>
          <p>What India is watching this week.</p>
        </div>
        <div className="landing-strip__track">
          {trending.length
            ? trending.map((title, index) => (
                <button
                  type="button"
                  key={title.id}
                  className="landing-trend-card"
                  onClick={() => navigate('/login')}
                >
                  <span className="landing-trend-card__art">
                    <WideArt title={title} showTitle={false} eager={index < 4} />
                    <span className="landing-trend-card__play">
                      <PlayIcon size={18} />
                    </span>
                    <span className="landing-trend-card__rank">{String(index + 1).padStart(2, '0')}</span>
                  </span>
                  <span className="landing-trend-card__title">{title.title}</span>
                  <span className="landing-trend-card__meta">
                    {title.type === 'film' ? 'Film' : `${title.seasonCount} seasons`} · {title.genres[0]}
                  </span>
                </button>
              ))
            : [0, 1, 2, 3, 4, 5].map((index) => <span key={index} className="landing-trend-card landing-trend-card--skeleton" />)}
        </div>
      </section>

      <section className="landing-features" aria-labelledby="landing-features-title">
        <div className="landing-section-head">
          <h2 id="landing-features-title">More reasons to join</h2>
          <p>A small service with very large feelings.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-card--tv">
            <div className="feature-card__copy">
              <h3>Enjoy on your TV</h3>
              <p>Smart TVs, consoles, streaming sticks and a very patient laptop. The whole catalogue, one click away.</p>
            </div>
            <div className="feature-device feature-device--tv" aria-hidden>
              <div className="feature-device__screen">
                <img src="/art/blackwater-hero.jpg" alt="" />
                <span className="feature-device__brand">REELIX</span>
                <span className="feature-device__play"><PlayIcon size={22} /></span>
              </div>
              <span className="feature-device__stand" />
            </div>
          </article>

          <article className="feature-card feature-card--download">
            <div className="feature-card__copy">
              <h3>Download to watch offline</h3>
              <p>Save films and episodes for the flight, the commute, or the wifi-free cabin at the end of the road.</p>
            </div>
            <div className="feature-device feature-device--phone" aria-hidden>
              <span className="feature-device__notch" />
              <div className="feature-device__phone-row">
                <span className="feature-device__thumb">
                  <WideArt title={trending[1] ?? trending[0] ?? { id: 'neon', title: 'Neon District', art: { poster: null, backdrop: null, colors: ['#1b1035', '#ff2e88', '#16e0d0'], titleStyle: 'display' } }} showTitle={false} />
                </span>
                <span>
                  <strong>Downloading…</strong>
                  <em>Neon District · S1:E1</em>
                </span>
                <DownloadIcon size={18} />
              </div>
              <div className="feature-device__bar"><span /></div>
            </div>
          </article>

          <article className="feature-card feature-card--profiles">
            <div className="feature-card__copy">
              <h3>Create profiles for kids</h3>
              <p>Send the little ones on adventures with their favourite characters, in a space made just for them.</p>
            </div>
            <div className="feature-profile-stack" aria-hidden>
              <Avatar avatar="a6" size={92} className="feature-avatar feature-avatar--1" />
              <Avatar avatar="a2" size={104} className="feature-avatar feature-avatar--2" />
              <Avatar avatar="a7" size={88} className="feature-avatar feature-avatar--3" />
              <span className="feature-profile-plus">+1</span>
            </div>
          </article>

          <article className="feature-card feature-card--everywhere">
            <div className="feature-card__copy">
              <h3>Watch everywhere</h3>
              <p>Start on the train, finish on the sofa. Your place is saved across every screen in the account.</p>
            </div>
            <div className="feature-everywhere" aria-hidden>
              <span className="feature-everywhere__laptop">
                <WideArt title={trending[2] ?? trending[0] ?? { id: 'last-orbit', title: 'The Last Orbit', art: { poster: null, backdrop: null, colors: ['#0a1433', '#f0a35e', '#7fc8ff'], titleStyle: 'wide' } }} showTitle={false} />
              </span>
              <span className="feature-everywhere__tablet">
                <WideArt title={trending[3] ?? trending[1] ?? { id: 'deep-signal', title: 'Deep Signal', art: { poster: null, backdrop: null, colors: ['#041b2d', '#0aa6a6', '#ffb86b'], titleStyle: 'wide' } }} showTitle={false} />
              </span>
              <span className="feature-everywhere__phone">
                <WideArt title={trending[4] ?? trending[2] ?? { id: 'paper-crown', title: 'The Paper Crown', art: { poster: null, backdrop: null, colors: ['#2b1810', '#c9a227', '#123a2c'], titleStyle: 'serif' } }} showTitle={false} />
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-plans" aria-labelledby="landing-plans-title">
        <div className="landing-section-head">
          <h2 id="landing-plans-title">Pick your plan</h2>
          <p>No contracts, no ads, no card. Cancel whenever — though there is nothing to cancel.</p>
        </div>
        <div className="plan-grid plan-grid--landing">
          {plans.map((plan) => (
            <article key={plan.id} className={cx('plan-card plan-card--landing', plan.id === 'standard' && 'is-featured')}>
              {plan.id === 'standard' && <span className="plan-card__ribbon">Most popular</span>}
              <span className="plan-card__name">{plan.name}</span>
              <span className="plan-card__price">
                ₹{plan.price}
                <small>/month</small>
              </span>
              <span className="plan-card__quality">{plan.quality}</span>
              <ul>
                <li>{plan.screens} screen{plan.screens === 1 ? '' : 's'} at a time</li>
                <li>{plan.downloads} download{plan.downloads === 1 ? '' : 's'} on 1 device</li>
                <li>All REELIX Originals</li>
                <li>Ad-free, always</li>
              </ul>
              <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/signup')}>
                Choose {plan.name}
              </button>
            </article>
          ))}
          {!plans.length && (
            <article className="plan-card plan-card--landing">
              <span className="plan-card__name">Standard</span>
              <span className="plan-card__price">₹499<small>/month</small></span>
              <span className="plan-card__quality">1080p · 2 screens</span>
              <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/signup')}>
                Get started
              </button>
            </article>
          )}
        </div>
        <p className="landing-plans__note">Illustrative pricing. This demo never asks for payment information.</p>
      </section>

      <section className="landing-reasons" aria-labelledby="landing-reasons-title">
        <div className="landing-section-head">
          <h2 id="landing-reasons-title">Built like the real thing</h2>
          <p>Every interaction is implemented, not mocked.</p>
        </div>
        <div className="reason-grid">
          <article>
            <SparkIcon size={22} />
            <h3>Original Top 10</h3>
            <p>A weekly chart, ranked across the catalogue, with the giant numeral treatment.</p>
          </article>
          <article>
            <PlayIcon size={22} />
            <h3>A real custom player</h3>
            <p>Seeking, skip intro, captions, speed, next episode and resume — all working.</p>
          </article>
          <article>
            <GlobeIcon size={22} />
            <h3>Five profiles, one account</h3>
            <p>Separate lists, ratings and PIN-protected profiles, plus a dedicated kids experience.</p>
          </article>
          <article>
            <DownloadIcon size={22} />
            <h3>Downloads that remember</h3>
            <p>Pick a quality, manage storage, delete and watch offline — simulated end to end.</p>
          </article>
        </div>
      </section>

      <section className="landing-faq" aria-labelledby="landing-faq-title">
        <div className="landing-section-head">
          <h2 id="landing-faq-title">Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {FAQ.map((item, index) => (
            <article key={item.q} className={cx('faq-item', faqOpen === index && 'is-open')}>
              <button
                type="button"
                onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                aria-expanded={faqOpen === index}
              >
                <span>{item.q}</span>
                <span className="faq-plus" aria-hidden>+</span>
              </button>
              {faqOpen === index && <p>{item.a}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <p className="landing-kicker">Ready when you are</p>
        <h2>One good story can change an evening.</h2>
        <form className="landing-email" onSubmit={startSignup}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            aria-label="Email address"
          />
          <button type="submit" className="btn btn--primary btn--large">
            Get Started <span aria-hidden>›</span>
          </button>
        </form>
        <button type="button" className="landing-demo landing-demo--light" onClick={() => void explore()} disabled={demoBusy}>
          <PlayIcon size={15} /> Explore the demo instantly
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__top">
          <Logo size="sm" asLink={false} />
          <div className="landing-footer__lang">
            <GlobeIcon size={15} /> English
          </div>
        </div>
        <div className="landing-footer__grid">
          <button type="button" onClick={() => document.getElementById('landing-faq-title')?.scrollIntoView({ behavior: 'smooth' })}>
            Frequently asked questions
          </button>
          <button type="button" onClick={() => document.getElementById('landing-plans-title')?.scrollIntoView({ behavior: 'smooth' })}>
            Plans and pricing
          </button>
          <a href="#/login">Sign in</a>
          <a href="#/signup">Create account</a>
          <span>Media centre</span>
          <span>Investor relations</span>
          <span>Ways to watch</span>
          <span>Terms of use</span>
          <span>Privacy</span>
          <span>Cookie preferences</span>
          <span>Corporate information</span>
          <span>Contact us</span>
        </div>
        <p className="landing-footer__note">
          REELIX is a fictional streaming service built as a reverse-engineering case study. It is
          not affiliated with Netflix or any other provider. Every title, person, price, poster and
          frame of playback here is original or synthetic. No payment is collected. No real film or
          television content is streamed.
        </p>
        <p className="landing-footer__code">REELIX · India · Demo build 1.0 · {preferences.brandSound ? 'Sound on' : 'Sound off'}</p>
      </footer>
    </div>
  );
}
