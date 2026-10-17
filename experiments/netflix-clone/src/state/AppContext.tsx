import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, onUnauthorized } from '../lib/api';
import { navigate } from '../lib/router';
import type {
  HomePayload,
  Profile,
  ProfileState,
  Rating,
  SessionPayload,
  TitleLite,
} from '../types';

const PROFILE_KEY = 'reelix.activeProfile';
const UNLOCKED_KEY = 'reelix.unlockedProfiles';
const PREFS_KEY = 'reelix.preferences';

export interface Preferences {
  autoplayPreviews: boolean;
  autoplayNext: boolean;
  brandSound: boolean;
  dataUsage: 'auto' | 'low' | 'medium' | 'high';
}

const DEFAULT_PREFERENCES: Preferences = {
  autoplayPreviews: true,
  autoplayNext: true,
  brandSound: true,
  dataUsage: 'auto',
};

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
}

interface AppContextValue {
  booting: boolean;
  bootError: string | null;
  retryBoot: () => void;
  session: SessionPayload | null;
  activeProfile: Profile | null;
  profileState: ProfileState | null;
  home: HomePayload | null;
  catalog: TitleLite[];
  loadingProfile: boolean;
  preferences: Preferences;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  login: (email: string, password: string) => Promise<SessionPayload>;
  signup: (name: string, email: string, password: string) => Promise<SessionPayload>;
  loginDemo: () => Promise<SessionPayload>;
  logout: () => Promise<void>;
  selectProfile: (profile: Profile, pin?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshHome: () => Promise<void>;
  leaveProfile: () => void;
  updateSessionProfiles: (profiles: Profile[]) => void;
  toggleList: (titleId: string) => Promise<boolean>;
  rate: (titleId: string, value: Rating) => Promise<void>;
  saveProgress: (input: {
    titleId: string;
    episodeId: string;
    seconds: number;
    duration: number;
    completed?: boolean;
  }) => void;
  refreshAfterWatch: () => Promise<void>;
  addDownload: (titleId: string, episodeId: string, quality?: string) => Promise<void>;
  removeDownload: (titleId: string, episodeId: string) => Promise<void>;
  toggleReminder: (titleId: string) => Promise<void>;
  recordSearch: (query: string) => void;
  clearSearches: () => Promise<void>;
  updatePlan: (plan: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  signOutAll: () => Promise<void>;
  updateProfileDetails: (
    profileId: string,
    patch: Partial<{ name: string; avatar: string; kids: boolean; pin: string | null }>,
  ) => Promise<Profile | null>;
  createProfile: (input: { name: string; avatar: string; kids: boolean; pin?: string | null }) => Promise<Profile>;
  deleteProfile: (profileId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function readUnlocked(): string[] {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeUnlocked(ids: string[]) {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function readPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [home, setHome] = useState<HomePayload | null>(null);
  const [catalog, setCatalog] = useState<TitleLite[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [preferences, setPreferencesState] = useState<Preferences>(readPreferences);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const homeRefreshTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const setPreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearActive = useCallback(() => {
    setActiveProfile(null);
    setProfileState(null);
    setHome(null);
    setCatalog([]);
    sessionStorage.removeItem(PROFILE_KEY);
  }, []);

  const applySession = useCallback((payload: SessionPayload) => {
    setSession(payload);
    setBootError(null);
  }, []);

  const hydrate = useCallback(async (profile: Profile) => {
    setActiveProfile(profile);
    setLoadingProfile(true);
    sessionStorage.setItem(PROFILE_KEY, profile.id);
    try {
      const [statePayload, homePayload, catalogPayload] = await Promise.all([
        api.state(profile.id),
        api.home(profile.id),
        api.catalog(profile.id),
      ]);
      setProfileState(statePayload);
      setHome(homePayload);
      setCatalog(catalogPayload.titles);
      if (!readUnlocked().includes(profile.id)) {
        writeUnlocked([...readUnlocked(), profile.id]);
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not load your profile.';
      notify(message, 'error');
      clearActive();
    } finally {
      setLoadingProfile(false);
    }
  }, [clearActive, notify]);

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    try {
      const payload = await api.session();
      applySession(payload);
      const storedId = sessionStorage.getItem(PROFILE_KEY);
      const stored = payload.profiles.find((profile) => profile.id === storedId);
      if (stored) {
        const unlocked = readUnlocked().includes(stored.id);
        if (!stored.locked || unlocked) {
          await hydrate(stored);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        clearActive();
      } else {
        setBootError(error instanceof ApiError ? error.message : 'Could not reach the REELIX service.');
      }
    } finally {
      setBooting(false);
    }
  }, [applySession, clearActive, hydrate]);

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setSession(null);
      clearActive();
      writeUnlocked([]);
    });
    return () => onUnauthorized(null);
  }, [clearActive]);

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await api.login(email, password);
      sessionStorage.removeItem(PROFILE_KEY);
      writeUnlocked([]);
      applySession(payload);
      clearActive();
      return payload;
    },
    [applySession, clearActive],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const payload = await api.signup(name, email, password);
      sessionStorage.removeItem(PROFILE_KEY);
      writeUnlocked([]);
      applySession(payload);
      clearActive();
      return payload;
    },
    [applySession, clearActive],
  );

  const loginDemo = useCallback(async () => {
    const payload = await api.demo();
    sessionStorage.removeItem(PROFILE_KEY);
    writeUnlocked([]);
    applySession(payload);
    clearActive();
    notify('Signed in with the demo account. Pick a profile to continue.', 'success');
    return payload;
  }, [applySession, clearActive, notify]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* logging out locally is still correct */
    }
    setSession(null);
    clearActive();
    writeUnlocked([]);
    notify('You have been signed out.');
    navigate('/');
  }, [clearActive, notify]);

  const selectProfile = useCallback(
    async (profile: Profile, pin?: string) => {
      if (profile.locked) {
        if (!pin) throw new ApiError('Enter your profile PIN.', 400, 'PIN_REQUIRED');
        await api.verifyPin(profile.id, pin);
        writeUnlocked([...readUnlocked().filter((id) => id !== profile.id), profile.id]);
      }
      await hydrate(profile);
    },
    [hydrate],
  );

  const refreshHome = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const payload = await api.home(activeProfile.id);
      setHome(payload);
    } catch {
      /* a stale row is better than an empty page */
    }
  }, [activeProfile]);

  const refreshProfile = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const [statePayload, homePayload] = await Promise.all([
        api.state(activeProfile.id),
        api.home(activeProfile.id),
      ]);
      setProfileState(statePayload);
      setHome(homePayload);
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Could not refresh this profile.', 'error');
    }
  }, [activeProfile, notify]);

  const scheduleHomeRefresh = useCallback(() => {
    if (homeRefreshTimer.current) window.clearTimeout(homeRefreshTimer.current);
    homeRefreshTimer.current = window.setTimeout(() => {
      void refreshHome();
    }, 700);
  }, [refreshHome]);

  const findLite = useCallback(
    (titleId: string): TitleLite | null => {
      const inState = profileState?.myList.find((title) => title.id === titleId);
      if (inState) return inState;
      const inCatalog = catalog.find((title) => title.id === titleId);
      if (inCatalog) return inCatalog;
      for (const row of home?.rows ?? []) {
        const found = row.items.find((title) => title.id === titleId);
        if (found) return found;
      }
      return null;
    },
    [catalog, home, profileState],
  );

  const patchTitleEverywhere = useCallback(
    (titleId: string, patch: Partial<TitleLite>) => {
      setHome((prev) => {
        if (!prev) return prev;
        const apply = (item: TitleLite) => (item.id === titleId ? { ...item, ...patch } : item);
        return {
          ...prev,
          rows: prev.rows.map((row) => ({ ...row, items: row.items.map(apply) })),
          billboard: prev.billboard.map((item) => (item.id === titleId ? { ...item, ...patch } : item)),
        };
      });
      setProfileState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          myList: prev.myList.map((item) => (item.id === titleId ? { ...item, ...patch } : item)),
        };
      });
      setCatalog((prev) => prev.map((item) => (item.id === titleId ? { ...item, ...patch } : item)));
    },
    [],
  );

  const toggleList = useCallback(
    async (titleId: string) => {
      if (!activeProfile || !profileState) return false;
      const lite = findLite(titleId);
      const currentlyIn =
        profileState.myList.some((title) => title.id === titleId) || Boolean(lite?.inList);
      const add = !currentlyIn;

      setProfileState((prev) => {
        if (!prev) return prev;
        if (add) {
          const entry = lite ?? (catalog.find((item) => item.id === titleId) as TitleLite | undefined);
          return {
            ...prev,
            myList: entry ? [{ ...entry, inList: true }, ...prev.myList.filter((item) => item.id !== titleId)] : prev.myList,
          };
        }
        return { ...prev, myList: prev.myList.filter((item) => item.id !== titleId) };
      });
      patchTitleEverywhere(titleId, { inList: add });

      try {
        await api.toggleList(activeProfile.id, titleId, add);
        notify(add ? 'Added to My List.' : 'Removed from My List.', 'success');
        scheduleHomeRefresh();
        return add;
      } catch (error) {
        // Revert optimistic state.
        setProfileState((prev) => {
          if (!prev) return prev;
          if (add) return { ...prev, myList: prev.myList.filter((item) => item.id !== titleId) };
          return lite ? { ...prev, myList: [{ ...lite, inList: false }, ...prev.myList] } : prev;
        });
        patchTitleEverywhere(titleId, { inList: !add });
        notify(error instanceof ApiError ? error.message : 'Could not update My List.', 'error');
        return !add;
      }
    },
    [activeProfile, catalog, findLite, notify, patchTitleEverywhere, profileState, scheduleHomeRefresh],
  );

  const rate = useCallback(
    async (titleId: string, value: Rating) => {
      if (!activeProfile || !profileState) return;
      const previous = profileState.ratings[titleId] ?? null;
      const next = previous === value ? null : value;
      setProfileState((prev) =>
        prev ? { ...prev, ratings: { ...prev.ratings, [titleId]: next as Rating } } : prev,
      );
      patchTitleEverywhere(titleId, { rating: next });
      try {
        const result = await api.rate(activeProfile.id, titleId, next);
        setProfileState((prev) => (prev ? { ...prev, ratings: result.ratings } : prev));
        scheduleHomeRefresh();
      } catch (error) {
        setProfileState((prev) =>
          prev ? { ...prev, ratings: { ...prev.ratings, [titleId]: previous } } : prev,
        );
        patchTitleEverywhere(titleId, { rating: previous });
        notify(error instanceof ApiError ? error.message : 'Could not save your rating.', 'error');
      }
    },
    [activeProfile, notify, patchTitleEverywhere, profileState, scheduleHomeRefresh],
  );

  const saveProgress = useCallback(
    (input: { titleId: string; episodeId: string; seconds: number; duration: number; completed?: boolean }) => {
      if (!activeProfile) return;
      const entry = {
        titleId: input.titleId,
        episodeId: input.episodeId,
        seconds: Math.round(input.seconds),
        duration: Math.round(input.duration),
        completed: Boolean(input.completed) || input.seconds >= input.duration * 0.97,
        updatedAt: new Date().toISOString(),
      };
      setProfileState((prev) =>
        prev ? { ...prev, progress: { ...prev.progress, [input.titleId]: entry } } : prev,
      );
      patchTitleEverywhere(input.titleId, { progress: entry });
      void api
        .saveProgress(activeProfile.id, {
          titleId: input.titleId,
          episodeId: input.episodeId,
          seconds: entry.seconds,
          duration: entry.duration,
          completed: entry.completed,
        })
        .catch(() => {
          /* progress is best-effort while scrubbing */
        });
    },
    [activeProfile, patchTitleEverywhere],
  );

  const refreshAfterWatch = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const [statePayload, homePayload] = await Promise.all([
        api.state(activeProfile.id),
        api.home(activeProfile.id),
      ]);
      setProfileState(statePayload);
      setHome(homePayload);
    } catch {
      /* ignore refresh errors after playback */
    }
  }, [activeProfile]);

  const addDownload = useCallback(
    async (titleId: string, episodeId: string, quality = 'HD') => {
      if (!activeProfile) return;
      try {
        const result = await api.download(activeProfile.id, { titleId, episodeId, quality, action: 'add' });
        await refreshProfile();
        notify('Download complete. Available on the Downloads page (demo).', 'success');
        void result;
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Could not download this title.', 'error');
      }
    },
    [activeProfile, notify, refreshProfile],
  );

  const removeDownload = useCallback(
    async (titleId: string, episodeId: string) => {
      if (!activeProfile) return;
      try {
        await api.download(activeProfile.id, { titleId, episodeId, action: 'remove' });
        await refreshProfile();
        notify('Download removed.');
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Could not remove this download.', 'error');
      }
    },
    [activeProfile, notify, refreshProfile],
  );

  const toggleReminder = useCallback(
    async (titleId: string) => {
      if (!activeProfile || !profileState) return;
      const isSet = profileState.reminders.includes(titleId);
      setProfileState((prev) =>
        prev
          ? {
              ...prev,
              reminders: isSet
                ? prev.reminders.filter((id) => id !== titleId)
                : [...prev.reminders, titleId],
            }
          : prev,
      );
      patchTitleEverywhere(titleId, { reminder: !isSet });
      try {
        await api.toggleReminder(activeProfile.id, titleId);
        notify(isSet ? 'Reminder removed.' : 'We will remind you when this arrives.', 'success');
      } catch (error) {
        setProfileState((prev) =>
          prev
            ? {
                ...prev,
                reminders: isSet
                  ? [...prev.reminders, titleId]
                  : prev.reminders.filter((id) => id !== titleId),
              }
            : prev,
        );
        patchTitleEverywhere(titleId, { reminder: isSet });
        notify(error instanceof ApiError ? error.message : 'Could not update the reminder.', 'error');
      }
    },
    [activeProfile, notify, patchTitleEverywhere, profileState],
  );

  const recordSearch = useCallback(
    (query: string) => {
      if (!activeProfile) return;
      void api
        .recordSearch(activeProfile.id, query)
        .then((result) => {
          setProfileState((prev) => (prev ? { ...prev, searches: result.searches } : prev));
        })
        .catch(() => {
          /* search still works without history */
        });
    },
    [activeProfile],
  );

  const clearSearches = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const result = await api.clearSearches(activeProfile.id);
      setProfileState((prev) => (prev ? { ...prev, searches: result.searches } : prev));
    } catch {
      notify('Could not clear search history.', 'error');
    }
  }, [activeProfile, notify]);

  const updatePlan = useCallback(
    async (plan: string) => {
      try {
        const result = await api.updateAccount({ plan });
        setSession((prev) => (prev ? { ...prev, user: result.user } : prev));
        notify(`You are now on the ${result.user.planDetails.name} plan (demo).`, 'success');
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Could not change your plan.', 'error');
      }
    },
    [notify],
  );

  const markNotificationsRead = useCallback(async () => {
    try {
      const result = await api.readNotifications(null);
      setSession((prev) => (prev ? { ...prev, notifications: result.notifications } : prev));
    } catch {
      /* non-critical */
    }
  }, []);

  const signOutAll = useCallback(async () => {
    try {
      await api.signOutAll();
    } catch {
      /* the local session is cleared regardless */
    }
    setSession(null);
    clearActive();
    writeUnlocked([]);
    notify('Signed out of all devices.', 'success');
    navigate('/');
  }, [clearActive, notify]);

  const updateSessionProfiles = useCallback((profiles: Profile[]) => {
    setSession((prev) => (prev ? { ...prev, profiles } : prev));
  }, []);

  const updateProfileDetails = useCallback(
    async (profileId: string, patch: Partial<{ name: string; avatar: string; kids: boolean; pin: string | null }>) => {
      try {
        const result = await api.updateProfile(profileId, patch);
        updateSessionProfiles(result.profiles);
        setActiveProfile((prev) => (prev?.id === profileId ? result.profile : prev));
        notify('Profile updated.', 'success');
        return result.profile;
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Could not update the profile.', 'error');
        return null;
      }
    },
    [notify, updateSessionProfiles],
  );

  const createProfile = useCallback(
    async (input: { name: string; avatar: string; kids: boolean; pin?: string | null }) => {
      const result = await api.createProfile(input);
      updateSessionProfiles(result.profiles);
      notify('Profile created.', 'success');
      return result.profile;
    },
    [notify, updateSessionProfiles],
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      try {
        const result = await api.deleteProfile(profileId);
        updateSessionProfiles(result.profiles);
        if (activeProfile?.id === profileId) clearActive();
        notify('Profile deleted.');
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Could not delete the profile.', 'error');
        throw error;
      }
    },
    [activeProfile, clearActive, notify, updateSessionProfiles],
  );

  const leaveProfile = useCallback(() => {
    clearActive();
    navigate('/profiles');
  }, [clearActive]);

  const value = useMemo<AppContextValue>(
    () => ({
      booting,
      bootError,
      retryBoot: () => void boot(),
      session,
      activeProfile,
      profileState,
      home,
      catalog,
      loadingProfile,
      preferences,
      toasts,
      notify,
      dismissToast,
      setPreferences,
      login,
      signup,
      loginDemo,
      logout,
      selectProfile,
      refreshProfile,
      refreshHome,
      leaveProfile,
      updateSessionProfiles,
      toggleList,
      rate,
      saveProgress,
      refreshAfterWatch,
      addDownload,
      removeDownload,
      toggleReminder,
      recordSearch,
      clearSearches,
      updatePlan,
      markNotificationsRead,
      signOutAll,
      updateProfileDetails,
      createProfile,
      deleteProfile,
    }),
    [
      booting,
      bootError,
      boot,
      session,
      activeProfile,
      profileState,
      home,
      catalog,
      loadingProfile,
      preferences,
      toasts,
      notify,
      dismissToast,
      setPreferences,
      login,
      signup,
      loginDemo,
      logout,
      selectProfile,
      refreshProfile,
      refreshHome,
      leaveProfile,
      updateSessionProfiles,
      toggleList,
      rate,
      saveProgress,
      refreshAfterWatch,
      addDownload,
      removeDownload,
      toggleReminder,
      recordSearch,
      clearSearches,
      updatePlan,
      markNotificationsRead,
      signOutAll,
      updateProfileDetails,
      createProfile,
      deleteProfile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
