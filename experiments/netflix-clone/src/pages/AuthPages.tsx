import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { Logo } from '../components/Logo';
import { navigate } from '../lib/router';
import { ApiError } from '../lib/api';
import { usePageTitle } from '../lib/hooks';
import { Spinner } from '../components/Spinner';
import { ArrowLeftIcon, PlayIcon } from '../components/Icons';

function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="auth">
      <div className="auth__visual" aria-hidden>
        <img src="/art/blackwater-hero.jpg" alt="" />
        <div className="auth__visual-gradients" />
        <div className="auth__visual-copy">
          <Logo size="lg" />
          <h2>Stories that stay with you.</h2>
          <p>One catalogue. Five profiles. Every kind of night.</p>
          <div className="auth__quote">
            <span className="auth__quote-mark">“</span>
            <p>There’s a difference between surviving and getting away.</p>
            <cite>Blackwater · S1:E7</cite>
          </div>
        </div>
      </div>
      <div className="auth__panel">
        <div className="auth__panel-top">
          <button type="button" className="auth__back" onClick={() => navigate('/')}>
            <ArrowLeftIcon size={16} /> Back to REELIX
          </button>
          <Logo size="sm" className="auth__mobile-logo" asLink={false} />
        </div>
        <div className="auth__form-wrap">
          <p className="auth__eyebrow">REELIX</p>
          <h1>{title}</h1>
          <p className="auth__subtitle">{subtitle}</p>
          {children}
        </div>
        <footer className="auth__foot">
          <span>Demo service · no payment is ever taken.</span>
          <span>© 2026 REELIX Demo Studios</span>
        </footer>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, loginDemo, notify } = useApp();
  const [email, setEmail] = useState('demo@reelix.app');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  usePageTitle('Sign in — REELIX');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = await login(email.trim(), password);
      notify(`Welcome back, ${payload.user.name.split(' ')[0]}.`, 'success');
      navigate(payload.profiles.length ? '/profiles' : '/onboarding');
    } catch (loginError) {
      setError(loginError instanceof ApiError ? loginError.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setError(null);
    setDemoBusy(true);
    try {
      const payload = await loginDemo();
      navigate(payload.profiles.length ? '/profiles' : '/onboarding');
    } catch (demoError) {
      setError(demoError instanceof ApiError ? demoError.message : 'Could not start the demo.');
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Pick up where you left off. Your profiles and My List are waiting.">
      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <span className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block btn--large" disabled={busy || demoBusy}>
          {busy ? <Spinner size={20} /> : <PlayIcon size={19} />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="auth-divider"><span>or</span></div>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => void demo()} disabled={demoBusy || busy}>
          {demoBusy ? <Spinner size={18} /> : null}
          {demoBusy ? 'Opening demo…' : 'Continue with the demo account'}
        </button>
        <p className="auth-demo-hint">
          Demo credentials are pre-filled: <code>demo@reelix.app</code> / <code>demo1234</code>.
          The demo account has three profiles and a full viewing history.
        </p>
      </form>
      <p className="auth-switch">
        New to REELIX? <button type="button" onClick={() => navigate('/signup')}>Create an account</button>
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  const { signup, notify } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => sessionStorage.getItem('reelix.signupEmail') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  usePageTitle('Create your account — REELIX');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = await signup(name.trim(), email.trim(), password);
      sessionStorage.removeItem('reelix.signupEmail');
      notify(`Welcome to REELIX, ${payload.user.name.split(' ')[0]}.`, 'success');
      navigate('/onboarding');
    } catch (signupError) {
      setError(signupError instanceof ApiError ? signupError.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Unlimited films, series and documentaries. One account, up to five profiles."
    >
      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
            placeholder="What should we call you?"
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <span className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block btn--large" disabled={busy}>
          {busy ? <Spinner size={20} /> : null}
          {busy ? 'Creating your account…' : 'Get started'}
        </button>
        <p className="auth-legal">
          By creating an account you agree to this demo’s{' '}
          <span>Terms of Use</span> and <span>Privacy Statement</span>. No real payment method is
          requested, and all data stays on this server.
        </p>
      </form>
      <p className="auth-switch">
        Already a member? <button type="button" onClick={() => navigate('/login')}>Sign in</button>
      </p>
    </AuthLayout>
  );
}

