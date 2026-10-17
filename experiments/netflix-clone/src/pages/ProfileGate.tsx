import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { useRoute } from '../lib/router';
import { Avatar } from '../components/Avatar';
import { Logo } from '../components/Logo';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { playBrandChime } from '../player/audio';
import { cx } from '../lib/utils';
import type { Profile } from '../types';
import { LockIcon, PencilIcon, PlusIcon } from '../components/Icons';

export function ProfileGate() {
  const {
    session,
    activeProfile,
    selectProfile,
    logout,
    preferences,
    loadingProfile,
    notify,
  } = useApp();
  const route = useRoute();
  const [pinProfile, setPinProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const manageMode = route.name === 'manage-profiles';
  const profiles = session?.profiles ?? [];
  const maxProfiles = session?.maxProfiles ?? 5;

  const pick = async (profile: Profile) => {
    if (activeProfile?.id === profile.id) {
      window.location.hash = '#/';
      return;
    }
    if (profile.locked) {
      setPinProfile(profile);
      setPin('');
      setPinError(null);
      return;
    }
    setSelecting(profile.id);
    try {
      await selectProfile(profile);
      playBrandChime(preferences.brandSound);
      window.location.hash = '#/';
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not open this profile.', 'error');
    } finally {
      setSelecting(null);
    }
  };

  const submitPin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pinProfile) return;
    if (pin.length !== 4) {
      setPinError('Enter the 4-digit PIN.');
      return;
    }
    setPinBusy(true);
    setPinError(null);
    try {
      await selectProfile(pinProfile, pin);
      playBrandChime(preferences.brandSound);
      setPinProfile(null);
      window.location.hash = '#/';
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Incorrect PIN.');
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="profile-gate">
      <div className="profile-gate__bg" aria-hidden>
        <img src="/art/neon-district-hero.jpg" alt="" />
        <div className="profile-gate__wash" />
      </div>
      <header className="profile-gate__top">
        <Logo size="lg" variant={activeProfile?.kids ? 'kids' : 'default'} />
        {manageMode && <span className="profile-gate__manage-label">Manage Profiles</span>}
      </header>

      <main className="profile-gate__main">
        <div className="profile-gate__heading">
          <h1>{manageMode ? 'Manage profiles' : 'Who’s watching?'}</h1>
          {manageMode && <p>Choose a profile to edit its name, avatar, PIN or kids setting.</p>}
        </div>

        {loadingProfile && (
          <div className="profile-gate__loading">
            <Spinner size={26} /> Loading profile…
          </div>
        )}

        <div className="profile-grid">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={cx(
                'profile-tile',
                activeProfile?.id === profile.id && 'is-current',
                selecting === profile.id && 'is-loading',
              )}
              onClick={() => {
                if (manageMode) {
                  window.location.hash = '#/manage-profiles';
                  setPinProfile(null);
                  return;
                }
                void pick(profile);
              }}
              disabled={Boolean(selecting) || pinBusy}
              aria-label={`${profile.name}${profile.locked ? ', PIN protected' : ''}${profile.kids ? ', kids profile' : ''}`}
            >
              <span className="profile-tile__avatar">
                <Avatar avatar={profile.avatar} name={profile.name} size={148} />
                {manageMode && (
                  <span className="profile-tile__edit">
                    <PencilIcon size={22} />
                  </span>
                )}
                {selecting === profile.id && (
                  <span className="profile-tile__spinner">
                    <Spinner size={28} />
                  </span>
                )}
                {profile.locked && !manageMode && (
                  <span className="profile-tile__lock" aria-hidden>
                    <LockIcon size={15} />
                  </span>
                )}
              </span>
              <span className="profile-tile__name">{profile.name}</span>
              <span className="profile-tile__badges">
                {profile.kids && <span className="pill pill--kids">KIDS</span>}
                {profile.locked && <span className="pill pill--muted">PIN</span>}
                {activeProfile?.id === profile.id && <span className="pill pill--brand">Watching</span>}
              </span>
            </button>
          ))}
          {profiles.length < maxProfiles && (
            <button
              type="button"
              className="profile-tile profile-tile--add"
              onClick={() => {
                sessionStorage.setItem('reelix.newProfileRequested', '1');
                window.location.hash = '#/manage-profiles';
              }}
              aria-label="Add a profile"
            >
              <span className="profile-tile__avatar profile-tile__avatar--add">
                <PlusIcon size={46} />
              </span>
              <span className="profile-tile__name">Add profile</span>
              <span className="profile-tile__badges">
                <span className="pill pill--muted">{profiles.length}/{maxProfiles}</span>
              </span>
            </button>
          )}
        </div>

        {!manageMode && (
          <div className="profile-gate__actions">
            <button type="button" className="btn btn--ghost" onClick={() => { window.location.hash = '#/manage-profiles'; }}>
              <PencilIcon size={16} /> Manage Profiles
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        )}
        {manageMode && (
          <div className="profile-gate__actions">
            <button type="button" className="btn btn--ghost" onClick={() => { window.location.hash = '#/profiles'; }}>
              Done
            </button>
          </div>
        )}
      </main>

      <footer className="profile-gate__foot">
        <span>REELIX demo · {session?.user.email}</span>
        <span>All profiles and viewing data are stored locally.</span>
      </footer>

      {pinProfile && (
        <Modal
          onClose={() => setPinProfile(null)}
          className="pin-modal"
          labelledBy="pin-title"
          scrimClassName="modal-scrim--dim"
        >
          <form onSubmit={submitPin}>
            <Avatar avatar={pinProfile.avatar} name={pinProfile.name} size={72} />
            <h2 id="pin-title">Profile locked</h2>
            <p>Enter the 4-digit PIN for {pinProfile.name}.</p>
            <input
              autoFocus
              className="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 4));
                setPinError(null);
              }}
              aria-label="4-digit profile PIN"
              placeholder="••••"
            />
            {pinError && <p className="form-error" role="alert">{pinError}</p>}
            {session?.user.email === 'demo@reelix.app' && pinProfile.name === 'Priya' && (
              <p className="pin-hint">Demo hint: the PIN for Priya is 1234.</p>
            )}
            <div className="pin-modal__actions">
              <button type="button" className="btn btn--secondary" onClick={() => setPinProfile(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={pinBusy}>
                {pinBusy ? <Spinner size={18} /> : 'Unlock profile'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
