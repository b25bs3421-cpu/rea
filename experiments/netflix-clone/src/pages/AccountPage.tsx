import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { PageHeader } from '../components/Layout';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { usePageTitle } from '../lib/hooks';
import { useRoute } from '../lib/router';
import { cx, formatDate } from '../lib/utils';
import type { Plan } from '../types';
import {
  CheckIcon,
  DevicesIcon,
  GlobeIcon,
  LockIcon,
  PencilIcon,
  TrashIcon,
} from '../components/Icons';

export function AccountPage() {
  const {
    session,
    activeProfile,
    preferences,
    setPreferences,
    updatePlan,
    signOutAll,
    logout,
    leaveProfile,
  } = useApp();
  const route = useRoute();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [planBusy, setPlanBusy] = useState<string | null>(null);
  usePageTitle('Account — REELIX');
  void route;

  if (!session) return null;
  const plan: Plan = session.user.planDetails;
  const plans = Object.values(session.plans);

  const selectPlan = async (planId: string) => {
    if (planId === session.user.plan) return;
    setPlanBusy(planId);
    try {
      await updatePlan(planId);
    } finally {
      setPlanBusy(null);
    }
  };

  return (
    <div className="page page--padded account-page">
      <PageHeader
        eyebrow="Your account"
        title="Account"
        description={`Signed in as ${session.user.name}. Everything here belongs to this demo account.`}
        actions={
          <button type="button" className="btn btn--secondary" onClick={() => void logout()}>
            Sign out
          </button>
        }
      />

      <div className="account-identity">
        <div className="account-identity__avatar">
          {activeProfile && <Avatar avatar={activeProfile.avatar} name={activeProfile.name} size={74} />}
        </div>
        <div className="account-identity__copy">
          <h2>{session.user.name}</h2>
          <p>{session.user.email}</p>
          <p className="account-identity__since">
            Member since {formatDate(session.user.memberSince)} ·{' '}
            {session.profiles.length} profile{session.profiles.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="account-identity__plan">
          <span>{plan.name} plan</span>
          <strong>₹{plan.price}/month</strong>
          <em>{plan.quality}</em>
        </div>
      </div>

      <section className="account-section">
        <div className="account-section__head">
          <h2>Membership & plan</h2>
          <p>Change your demo plan at any time. No payment is collected.</p>
        </div>
        <div className="account-plan-grid">
          {plans.map((item) => {
            const current = item.id === session.user.plan;
            return (
              <article key={item.id} className={cx('account-plan', current && 'is-current')}>
                <div className="account-plan__head">
                  <h3>{item.name}</h3>
                  {current ? (
                    <span className="pill pill--brand">
                      <CheckIcon size={12} /> Current
                    </span>
                  ) : (
                    <span className="account-plan__price">₹{item.price}/mo</span>
                  )}
                </div>
                <p>{item.quality} · {item.screens} screen{item.screens === 1 ? '' : 's'} · {item.downloads} downloads</p>
                <ul>
                  <li>All REELIX titles</li>
                  <li>No ads</li>
                  <li>Profiles & kids mode</li>
                </ul>
                <button
                  type="button"
                  className={cx('btn', current ? 'btn--ghost' : 'btn--secondary', 'btn--block')}
                  onClick={() => void selectPlan(item.id)}
                  disabled={current || planBusy !== null}
                >
                  {planBusy === item.id ? 'Changing…' : current ? 'Your current plan' : `Switch to ${item.name}`}
                </button>
              </article>
            );
          })}
        </div>
        <p className="account-note">
          This demo treats plan changes as a local preference. There is no billing cycle, no card on
          file, and no way to be charged.
        </p>
      </section>

      <section className="account-section">
        <div className="account-section__head">
          <h2>Profiles</h2>
          <p>Each profile keeps its own list, ratings and playback position.</p>
          <a className="btn btn--secondary btn--tiny" href="#/manage-profiles">
            <PencilIcon size={14} /> Manage profiles
          </a>
        </div>
        <div className="account-profiles">
          {session.profiles.map((profile) => (
            <a key={profile.id} href="#/profiles" className={cx('account-profile', profile.id === activeProfile?.id && 'is-current')}>
              <Avatar avatar={profile.avatar} name={profile.name} size={54} />
              <span>
                <strong>{profile.name}</strong>
                <small>
                  {profile.kids ? 'Kids profile' : 'Standard profile'}
                  {profile.locked && ' · PIN'}
                </small>
              </span>
              {profile.locked && <LockIcon size={15} />}
            </a>
          ))}
          {session.profiles.length < session.maxProfiles && (
            <a className="account-profile account-profile--add" href="#/manage-profiles">
              <span className="account-profile__plus">+</span>
              <span>
                <strong>Add profile</strong>
                <small>{session.profiles.length} of {session.maxProfiles} used</small>
              </span>
            </a>
          )}
        </div>
      </section>

      <section className="account-section">
        <div className="account-section__head">
          <h2>Playback settings</h2>
          <p>These preferences apply to this browser and the current profile.</p>
        </div>
        <div className="settings-list">
          <label className="setting-row">
            <span>
              <strong>Autoplay next episode</strong>
              <small>Start the next episode automatically when one finishes.</small>
            </span>
            <span className={cx('switch', preferences.autoplayNext && 'is-on')}>
              <input
                type="checkbox"
                checked={preferences.autoplayNext}
                onChange={(event) => setPreferences({ autoplayNext: event.target.checked })}
              />
              <span className="switch__track" aria-hidden><span className="switch__thumb" /></span>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Autoplay previews</strong>
              <small>Play a short motion preview when you hover over a title.</small>
            </span>
            <span className={cx('switch', preferences.autoplayPreviews && 'is-on')}>
              <input
                type="checkbox"
                checked={preferences.autoplayPreviews}
                onChange={(event) => setPreferences({ autoplayPreviews: event.target.checked })}
              />
              <span className="switch__track" aria-hidden><span className="switch__thumb" /></span>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Brand sound</strong>
              <small>Play REELIX’s original two-note signature when a profile opens.</small>
            </span>
            <span className={cx('switch', preferences.brandSound && 'is-on')}>
              <input
                type="checkbox"
                checked={preferences.brandSound}
                onChange={(event) => setPreferences({ brandSound: event.target.checked })}
              />
              <span className="switch__track" aria-hidden><span className="switch__thumb" /></span>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Data usage</strong>
              <small>How much bandwidth the demo player may use. Applies to this browser.</small>
            </span>
            <span className="select-inline">
              <select
                value={preferences.dataUsage}
                onChange={(event) =>
                  setPreferences({ dataUsage: event.target.value as typeof preferences.dataUsage })
                }
                aria-label="Data usage"
              >
                <option value="auto">Auto</option>
                <option value="low">Low — save data</option>
                <option value="medium">Medium</option>
                <option value="high">High — best quality</option>
              </select>
            </span>
          </label>
        </div>
        <p className="account-note">
          Playback audio is an original synthesized ambient score. Subtitles can be turned on in the
          player with the CC button; the demo provides English captions.
        </p>
      </section>

      <section className="account-section">
        <div className="account-section__head">
          <h2>Devices</h2>
          <p>Devices where this demo account is currently active.</p>
        </div>
        <div className="device-list">
          <article className="device-card is-current">
            <DevicesIcon size={22} />
            <div>
              <strong>This browser</strong>
              <span>{window.navigator.userAgent.includes('Mac') ? 'Desktop · macOS' : 'Desktop · Web'} · Active now</span>
            </div>
            <span className="pill pill--brand">Current</span>
          </article>
          <article className="device-card">
            <DevicesIcon size={22} />
            <div>
              <strong>Living room TV</strong>
              <span>Demo device · Last active yesterday</span>
            </div>
            <span className="pill pill--muted">Demo</span>
          </article>
        </div>
        <div className="account-danger">
          <div>
            <h3>Sign out of all devices</h3>
            <p>Ends every session for this account. You will need to sign in again.</p>
          </div>
          <button type="button" className="btn btn--danger" onClick={() => setConfirmSignOut(true)}>
            <TrashIcon size={15} /> Sign out of all devices
          </button>
        </div>
      </section>

      <section className="account-section account-section--meta">
        <h2>About this account</h2>
        <p>
          REELIX is an independent reverse-engineering study. This account and every profile are
          stored locally on the demo server in <code>.data/reelix.json</code>. Nothing is shared with
          a third party and no real streaming content is delivered. Plan prices, devices and billing
          dates are illustrative only.
        </p>
        <div className="account-section__actions">
          {activeProfile && (
            <button type="button" className="btn btn--secondary" onClick={leaveProfile}>
              Switch profile
            </button>
          )}
          <a className="btn btn--ghost" href="#/">Back to REELIX</a>
        </div>
      </section>

      {confirmSignOut && (
        <Modal onClose={() => setConfirmSignOut(false)} className="confirm-modal" labelledBy="signout-title" scrimClassName="modal-scrim--dim">
          <h2 id="signout-title">Sign out everywhere?</h2>
          <p>This ends all active sessions for {session.user.email}, including this one. Local demo data stays intact.</p>
          <div className="confirm-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmSignOut(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn--danger" onClick={() => void signOutAll()}>
              Sign out everywhere
            </button>
          </div>
        </Modal>
      )}

      <p className="account-footnote">
        <GlobeIcon size={14} /> Demo build · REELIX {new Date().getFullYear()} · No payment method is
        associated with this account.
      </p>
    </div>
  );
}
