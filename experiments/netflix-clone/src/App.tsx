import { useEffect, useRef, useState } from 'react';
import { useApp } from './state/AppContext';
import { navigate, pathFor, useRoute, type Route } from './lib/router';
import { AppHeader } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { SiteFooter } from './components/Footer';
import { HoverProvider } from './components/HoverLayer';
import { ToastHost } from './components/ToastHost';
import { BrandIntro } from './components/BrandIntro';
import { FullPageLoader } from './components/Spinner';
import { Logo } from './components/Logo';
import { HomePage } from './pages/HomePage';
import { RowPage } from './pages/RowPage';
import { BrowsePage } from './pages/BrowsePage';
import { GenrePage } from './pages/GenrePage';
import { NewPopularPage } from './pages/NewPopularPage';
import { MyListPage } from './pages/MyListPage';
import { SearchPage } from './pages/SearchPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { AccountPage } from './pages/AccountPage';
import { TitleModalPage } from './pages/TitleModalPage';
import { ProfileGate } from './pages/ProfileGate';
import { ManageProfilesPage } from './pages/ManageProfilesPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { WatchPlayer } from './player/WatchPlayer';

function AppPage({ route }: { route: Route }) {
  switch (route.name) {
    case 'browse':
      return <BrowsePage />;
    case 'genre':
      return <GenrePage />;
    case 'new':
      return <NewPopularPage />;
    case 'my-list':
      return <MyListPage />;
    case 'search':
      return <SearchPage />;
    case 'downloads':
      return <DownloadsPage />;
    case 'account':
      return <AccountPage />;
    case 'row':
      return <RowPage />;
    case 'home':
    default:
      return <HomePage />;
  }
}

function Shell({ route }: { route: Route }) {
  const isHome = route.name === 'home';
  return (
    <HoverProvider>
      <AppHeader />
      <main id="main-content" tabIndex={-1} className={isHome ? 'app-main app-main--home' : 'app-main'}>
        <AppPage route={route} />
      </main>
      <SiteFooter compact={isHome} />
      <MobileNav />
    </HoverProvider>
  );
}

export default function App() {
  const { booting, bootError, retryBoot, session, activeProfile } = useApp();
  const route = useRoute();
  const lastContentRoute = useRef<Route>({ name: 'home' });
  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem('reelix.introSeen') === '1',
  );

  useEffect(() => {
    if (route.name !== 'title' && route.name !== 'watch') {
      lastContentRoute.current = route;
    }
  }, [route]);

  const finishIntro = () => {
    sessionStorage.setItem('reelix.introSeen', '1');
    setIntroDone(true);
  };

  if (booting) {
    return (
      <div className="boot-screen">
        <FullPageLoader label="Preparing REELIX" />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="boot-screen boot-screen--error">
        <Logo size="lg" asLink={false} />
        <h1>We couldn’t reach REELIX</h1>
        <p>{bootError}</p>
        <button type="button" className="btn btn--primary" onClick={retryBoot}>
          Try again
        </button>
        <span>If this is a fresh checkout, make sure the server is running on port 3000.</span>
      </div>
    );
  }

  const intro = !introDone ? <BrandIntro onDone={finishIntro} /> : null;

  if (!session) {
    if (route.name === 'login' || route.name === 'signup') {
      return (
        <>
          {route.name === 'login' ? <LoginPage /> : <SignupPage />}
          <ToastHost />
          {intro}
        </>
      );
    }
    return (
      <>
        <LandingPage />
        <ToastHost />
        {intro}
      </>
    );
  }

  if (session.profiles.length === 0) {
    return (
      <>
        <OnboardingPage />
        <ToastHost />
        {intro}
      </>
    );
  }

  if (route.name === 'onboarding') {
    return (
      <>
        <OnboardingPage />
        <ToastHost />
        {intro}
      </>
    );
  }

  if (!activeProfile) {
    if (route.name === 'manage-profiles') {
      return (
        <>
          <div className="standalone-top">
            <Logo size="sm" />
            <button type="button" className="btn btn--ghost btn--small" onClick={() => navigate('/profiles')}>
              Back to profiles
            </button>
          </div>
          <main className="app-main standalone-main">
            <ManageProfilesPage />
          </main>
          <ToastHost />
          <SiteFooter compact />
          {intro}
        </>
      );
    }
    return (
      <>
        <ProfileGate />
        <ToastHost />
        {intro}
      </>
    );
  }

  if (route.name === 'watch') {
    return (
      <>
        <WatchPlayer
          key={`${route.titleId}:${route.episodeId ?? 'default'}`}
          titleId={route.titleId}
          episodeId={route.episodeId}
          onExit={() => navigate(`/title/${route.titleId}`)}
        />
        <ToastHost />
      </>
    );
  }

  if (route.name === 'title') {
    return (
      <>
        <div className="app-main app-main--home modal-page-underlay" aria-hidden>
          <div className="modal-page-underlay__glow" />
        </div>
        <ToastHost />
        <TitleModalPage
          titleId={route.titleId}
          onClose={() => navigate(pathFor(lastContentRoute.current))}
        />
        {intro}
      </>
    );
  }

  if (route.name === 'profiles') {
    return (
      <>
        <ProfileGate />
        <ToastHost />
      </>
    );
  }

  if (route.name === 'manage-profiles') {
    return (
      <>
        <AppHeader />
        <main id="main-content" tabIndex={-1} className="app-main">
          <ManageProfilesPage />
        </main>
        <SiteFooter compact />
        <MobileNav />
        <ToastHost />
      </>
    );
  }

  if (route.name === 'login' || route.name === 'signup') {
    return (
      <>
        <ProfileGate />
        <ToastHost />
      </>
    );
  }

  return (
    <>
      <Shell route={route} />
      <ToastHost />
      {intro}
    </>
  );
}

