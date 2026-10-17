import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { Logo } from '../components/Logo';
import { Avatar, AVATAR_IDS, avatarLabel } from '../components/Avatar';
import { cx } from '../lib/utils';
import { playBrandChime } from '../player/audio';
import { navigate } from '../lib/router';
import { ApiError } from '../lib/api';
import { CheckIcon, ChevronLeftIcon, LockIcon, SparkIcon } from '../components/Icons';
import type { Plan } from '../types';

export function OnboardingPage() {
  const {
    session,
    updatePlan,
    createProfile,
    selectProfile,
    preferences,
    notify,
  } = useApp();
  const plans = useMemo(() => Object.values(session?.plans ?? {}), [session]);
  const [step, setStep] = useState<'plan' | 'profile'>('plan');
  const [selectedPlan, setSelectedPlan] = useState(session?.user.plan ?? 'standard');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('a1');
  const [kids, setKids] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const choosePlan = async () => {
    setBusy(true);
    try {
      await updatePlan(selectedPlan);
      setStep('profile');
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Give this profile a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const profile = await createProfile({ name: name.trim(), avatar, kids });
      await selectProfile(profile);
      playBrandChime(preferences.brandSound);
      navigate('/');
    } catch (creationError) {
      setError(creationError instanceof ApiError ? creationError.message : 'Could not create the profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding__bg" aria-hidden>
        <img src="/art/blackwater-hero.jpg" alt="" />
        <div />
      </div>
      <header className="onboarding__top">
        <Logo size="md" />
        <span>Step {step === 'plan' ? '1' : '2'} of 2</span>
      </header>

      <main className="onboarding__main">
        {step === 'plan' ? (
          <div className="onboarding__panel onboarding__panel--wide">
            <p className="onboarding__eyebrow">
              <SparkIcon size={15} /> Welcome, {session.user.name.split(' ')[0]}
            </p>
            <h1>Choose the plan that fits your screen.</h1>
            <p className="onboarding__lede">
              Every plan includes the full REELIX catalogue, My List, profiles and synthetic
              playback. This is a demo — no payment details are collected and nothing is charged.
            </p>
            <div className="plan-grid plan-grid--onboarding">
              {plans.map((plan: Plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={cx('plan-card', selectedPlan === plan.id && 'is-selected')}
                  onClick={() => setSelectedPlan(plan.id)}
                  aria-pressed={selectedPlan === plan.id}
                >
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
                    <li>No ads, ever</li>
                  </ul>
                  {selectedPlan === plan.id && (
                    <span className="plan-card__check">
                      <CheckIcon size={14} /> Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="onboarding__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep('profile')}>
                Skip for now
              </button>
              <button type="button" className="btn btn--primary btn--large" onClick={() => void choosePlan()} disabled={busy}>
                {busy ? 'Saving…' : 'Continue'}
              </button>
            </div>
            <p className="onboarding__fine">
              Demo prices are illustrative. No billing, no card and no real subscription is created.
            </p>
          </div>
        ) : (
          <div className="onboarding__panel">
            <button type="button" className="onboarding__back" onClick={() => setStep('plan')}>
              <ChevronLeftIcon size={16} /> Back to plans
            </button>
            <h1>Who’s watching?</h1>
            <p className="onboarding__lede">
              Add the first profile for this account. You can create up to five, each with its own
              taste and viewing history.
            </p>
            <div className="onboarding__profile">
              <div className="onboarding__preview">
                <Avatar avatar={avatar} name={name || 'New profile'} size={132} />
                {kids && (
                  <span className="pill pill--kids">
                    <LockIcon size={12} /> KIDS
                  </span>
                )}
              </div>
              <form onSubmit={create} className="onboarding__form">
                <label className="field">
                  <span>Profile name</span>
                  <input
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Aarav"
                    maxLength={24}
                  />
                </label>
                <fieldset className="avatar-picker avatar-picker--compact">
                  <legend>Choose an avatar</legend>
                  <div className="avatar-picker__grid">
                    {AVATAR_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={cx('avatar-picker__item', avatar === id && 'is-selected')}
                        onClick={() => setAvatar(id)}
                        aria-label={avatarLabel(id)}
                        aria-pressed={avatar === id}
                      >
                        <Avatar avatar={id} size={54} />
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="setting-row setting-row--inline">
                  <span>
                    <strong>Kids profile</strong>
                    <small>Only titles suitable for children.</small>
                  </span>
                  <span className={cx('switch', kids && 'is-on')}>
                    <input type="checkbox" checked={kids} onChange={(event) => setKids(event.target.checked)} />
                    <span className="switch__track" aria-hidden>
                      <span className="switch__thumb" />
                    </span>
                  </span>
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="onboarding__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => void selectOnboardingSkip()}>
                    Skip for now
                  </button>
                  <button type="submit" className="btn btn--primary btn--large" disabled={busy}>
                    {busy ? 'Creating…' : 'Start watching'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="onboarding__foot">
        <span>REELIX demo · {session.user.email}</span>
        <button type="button" onClick={() => notify('Plan changes and profiles are stored locally for this demo.')}>
          About this demo
        </button>
      </footer>
    </div>
  );

  async function selectOnboardingSkip() {
    if (session?.profiles.length) {
      notify('You can add another profile later from Manage Profiles.', 'default');
      navigate('/profiles');
    } else {
      setError('Create at least one profile to continue.');
    }
  }
}
