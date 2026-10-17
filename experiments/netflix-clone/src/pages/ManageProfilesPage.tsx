import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useRoute } from '../lib/router';
import { PageHeader } from '../components/Layout';
import { Avatar, AVATAR_IDS, avatarLabel } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { usePageTitle } from '../lib/hooks';
import { cx } from '../lib/utils';
import type { Profile } from '../types';
import { CheckIcon, CloseIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/Icons';

interface EditorState {
  mode: 'create' | 'edit';
  profile: Profile | null;
  name: string;
  avatar: string;
  kids: boolean;
  pinEnabled: boolean;
  pin: string;
  error: string | null;
  busy: boolean;
}

const EMPTY_EDITOR: EditorState = {
  mode: 'create',
  profile: null,
  name: '',
  avatar: 'a2',
  kids: false,
  pinEnabled: false,
  pin: '',
  error: null,
  busy: false,
};

export function ManageProfilesPage() {
  const {
    session,
    activeProfile,
    updateProfileDetails,
    createProfile,
    deleteProfile,
  } = useApp();
  const route = useRoute();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  usePageTitle('Manage Profiles — REELIX');
  const profiles = session?.profiles ?? [];
  const maxProfiles = session?.maxProfiles ?? 5;

  useEffect(() => {
    if (route.name !== 'manage-profiles') return;
    const wantsNew = sessionStorage.getItem('reelix.newProfileRequested') === '1';
    if (wantsNew) {
      sessionStorage.removeItem('reelix.newProfileRequested');
      setEditor({ ...EMPTY_EDITOR });
    }
  }, [route]);

  const openEdit = (profile: Profile) => {
    setEditor({
      mode: 'edit',
      profile,
      name: profile.name,
      avatar: profile.avatar,
      kids: profile.kids,
      pinEnabled: profile.locked,
      pin: '',
      error: null,
      busy: false,
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setEditor({ ...editor, error: 'Enter a profile name.' });
      return;
    }
    if (editor.pinEnabled && editor.pin && !/^\d{4}$/.test(editor.pin)) {
      setEditor({ ...editor, error: 'PIN must be exactly 4 digits.' });
      return;
    }
    if (editor.pinEnabled && !editor.pin && !editor.profile?.locked) {
      setEditor({ ...editor, error: 'Set a 4-digit PIN or turn off profile lock.' });
      return;
    }
    setEditor({ ...editor, busy: true, error: null });
    try {
      if (editor.mode === 'create') {
        await createProfile({
          name,
          avatar: editor.avatar,
          kids: editor.kids,
          pin: editor.pinEnabled ? editor.pin : null,
        });
      } else if (editor.profile) {
        const patch: Parameters<typeof updateProfileDetails>[1] = {
          name,
          avatar: editor.avatar,
          kids: editor.kids,
        };
        if (!editor.pinEnabled) patch.pin = null;
        else if (editor.pin) patch.pin = editor.pin;
        await updateProfileDetails(editor.profile.id, patch);
      }
      setEditor(null);
    } catch (error) {
      setEditor({
        ...editor,
        busy: false,
        error: error instanceof Error ? error.message : 'Could not save this profile.',
      });
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProfile(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      /* the app context surfaces the error */
    }
  };

  return (
    <div className="page page--padded manage-profiles-page">
      <PageHeader
        eyebrow="Profiles"
        title="Manage profiles"
        description={`Every profile keeps its own list, ratings and viewing history. ${profiles.length} of ${maxProfiles} profiles in use.`}
        actions={
          profiles.length < maxProfiles ? (
            <button type="button" className="btn btn--primary" onClick={() => setEditor({ ...EMPTY_EDITOR })}>
              <PlusIcon size={16} /> Add profile
            </button>
          ) : undefined
        }
      />

      <div className="manage-grid">
        {profiles.map((profile) => (
          <article key={profile.id} className={cx('manage-card', profile.id === activeProfile?.id && 'is-current')}>
            <Avatar avatar={profile.avatar} name={profile.name} size={92} />
            <div className="manage-card__body">
              <h2>
                {profile.name}
                {profile.id === activeProfile?.id && <span className="pill pill--brand">Watching</span>}
              </h2>
              <p>
                {profile.kids ? 'Kids profile · only kids-safe titles' : 'Standard profile'}
                {profile.locked && (
                  <>
                    <span className="dot-sep" />
                    <LockIcon size={13} /> PIN protected
                  </>
                )}
              </p>
            </div>
            <div className="manage-card__actions">
              <button type="button" className="btn btn--secondary btn--tiny" onClick={() => openEdit(profile)}>
                <PencilIcon size={14} /> Edit
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--tiny"
                onClick={() => setConfirmDelete(profile)}
                disabled={profiles.length <= 1}
                title={profiles.length <= 1 ? 'You need at least one profile' : 'Delete profile'}
              >
                <TrashIcon size={14} /> Delete
              </button>
            </div>
          </article>
        ))}
        {profiles.length < maxProfiles && (
          <button type="button" className="manage-add" onClick={() => setEditor({ ...EMPTY_EDITOR })}>
            <span className="manage-add__circle">
              <PlusIcon size={26} />
            </span>
            <strong>Add a profile</strong>
            <span>Give each viewer their own recommendations and list.</span>
          </button>
        )}
      </div>

      <section className="manage-tip">
        <h3>Profiles, explained</h3>
        <p>
          A locked profile asks for its 4-digit PIN before it can be opened. Kids profiles only show
          titles rated for younger viewers. You can switch profiles at any time from the profile menu
          in the top-right corner.
        </p>
      </section>

      {editor && (
        <Modal onClose={() => setEditor(null)} className="profile-editor" labelledBy="profile-editor-title" scrimClassName="modal-scrim--dim">
          <button type="button" className="modal-close" onClick={() => setEditor(null)} aria-label="Close profile editor">
            <CloseIcon size={20} />
          </button>
          <form onSubmit={save}>
            <h2 id="profile-editor-title">{editor.mode === 'create' ? 'Add a profile' : 'Edit profile'}</h2>
            <p className="profile-editor__intro">
              {editor.mode === 'create'
                ? 'Profiles keep separate recommendations. You can have up to five.'
                : 'Changes apply the next time this profile signs in.'}
            </p>

            <label className="field">
              <span>Profile name</span>
              <input
                autoFocus
                value={editor.name}
                maxLength={24}
                onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                placeholder="e.g. Aarav, Priya, Kabir"
              />
            </label>

            <fieldset className="avatar-picker">
              <legend>Avatar</legend>
              <div className="avatar-picker__grid">
                {AVATAR_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={cx('avatar-picker__item', editor.avatar === id && 'is-selected')}
                    onClick={() => setEditor({ ...editor, avatar: id })}
                    aria-label={avatarLabel(id)}
                    aria-pressed={editor.avatar === id}
                  >
                    <Avatar avatar={id} size={62} />
                    {editor.avatar === id && (
                      <span className="avatar-picker__check">
                        <CheckIcon size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="setting-row setting-row--inline">
              <span>
                <strong>Kids profile</strong>
                <small>Only shows titles suitable for children, with simplified navigation.</small>
              </span>
              <span className={cx('switch', editor.kids && 'is-on')}>
                <input
                  type="checkbox"
                  checked={editor.kids}
                  onChange={(event) => setEditor({ ...editor, kids: event.target.checked })}
                />
                <span className="switch__track" aria-hidden>
                  <span className="switch__thumb" />
                </span>
              </span>
            </label>

            <label className="setting-row setting-row--inline">
              <span>
                <strong>Profile lock</strong>
                <small>
                  Require a 4-digit PIN to open this profile.
                  {editor.mode === 'edit' && editor.profile?.locked && ' Leave blank to keep the current PIN.'}
                </small>
              </span>
              <span className={cx('switch', editor.pinEnabled && 'is-on')}>
                <input
                  type="checkbox"
                  checked={editor.pinEnabled}
                  onChange={(event) =>
                    setEditor({ ...editor, pinEnabled: event.target.checked, pin: event.target.checked ? editor.pin : '' })
                  }
                />
                <span className="switch__track" aria-hidden>
                  <span className="switch__thumb" />
                </span>
              </span>
            </label>

            {editor.pinEnabled && (
              <label className="field field--narrow">
                <span>4-digit PIN</span>
                <input
                  className="pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={editor.pin}
                  placeholder={editor.profile?.locked ? '••••' : 'Choose a PIN'}
                  onChange={(event) =>
                    setEditor({ ...editor, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })
                  }
                />
              </label>
            )}

            {editor.error && <p className="form-error" role="alert">{editor.error}</p>}

            <div className="profile-editor__actions">
              <button type="button" className="btn btn--secondary" onClick={() => setEditor(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={editor.busy}>
                {editor.busy ? 'Saving…' : editor.mode === 'create' ? 'Create profile' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} className="confirm-modal" labelledBy="delete-title" scrimClassName="modal-scrim--dim">
          <h2 id="delete-title">Delete {confirmDelete.name}?</h2>
          <p>
            This removes the profile and everything saved to it — My List, ratings and viewing
            history. You can’t undo this.
          </p>
          <div className="confirm-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmDelete(null)}>
              Keep profile
            </button>
            <button type="button" className="btn btn--danger" onClick={() => void remove()}>
              Delete profile
            </button>
          </div>
        </Modal>
      )}

      <p className="manage-profiles__note">
        Manage profiles is part of the REELIX reverse-engineering demo. Profiles are stored in a
        local JSON file and are visible only on this server.
      </p>
      <button
        type="button"
        className="btn btn--ghost manage-profiles__back"
        onClick={() => {
          if (activeProfile) window.location.hash = '#/';
          else window.location.hash = '#/profiles';
        }}
      >
        {activeProfile ? 'Back to REELIX' : 'Back to profiles'}
      </button>
    </div>
  );
}
