const SETTINGS_KEY = "groove_settings";
const FOLLOWED_ARTISTS_KEY = "groove_followed_artists";
const SAVED_SHOWS_KEY = "groove_saved_shows";
const RECENT_SEARCHES_KEY = "groove_recent_searches";
const LISTENING_HISTORY_KEY = "groove_listening_history";
const PLAYER_VOLUME_KEY = "groove_volume";

export const DEFAULT_SETTINGS = {
  streamQuality: "320kbps",
  downloadQuality: "320kbps",
  downloadMode: "both", // "both" | "device" | "offline"
  playbackRate: 1,
};

const safeParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const getAppSettings = () => ({
  ...DEFAULT_SETTINGS,
  ...safeParse(SETTINGS_KEY, {}),
});

export const saveAppSettings = (partial) => {
  const next = { ...getAppSettings(), ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("grooveSettingsUpdated", { detail: next }));
  return next;
};

export const getStoredVolume = () => {
  const raw = parseFloat(localStorage.getItem(PLAYER_VOLUME_KEY));
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.9;
};

export const saveStoredVolume = (volume) => {
  const clamped = Math.min(1, Math.max(0, volume));
  localStorage.setItem(PLAYER_VOLUME_KEY, String(clamped));
  return clamped;
};

export const getFollowedArtists = () => safeParse(FOLLOWED_ARTISTS_KEY, []);

export const isArtistFollowed = (id) =>
  getFollowedArtists().some((a) => String(a.id) === String(id));

export const toggleFollowedArtist = (artist) => {
  const list = getFollowedArtists();
  const exists = list.some((a) => String(a.id) === String(artist.id));
  const next = exists
    ? list.filter((a) => String(a.id) !== String(artist.id))
    : [
        {
          id: artist.id,
          name: artist.name || "Unknown Artist",
          image: artist.image || "",
          followedAt: Date.now(),
        },
        ...list,
      ];
  localStorage.setItem(FOLLOWED_ARTISTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("libraryUpdated"));
  return !exists;
};

export const getSavedShows = () => safeParse(SAVED_SHOWS_KEY, []);

export const isShowSaved = (id) =>
  getSavedShows().some((s) => String(s.id) === String(id));

export const toggleSavedShow = (show) => {
  const list = getSavedShows();
  const exists = list.some((s) => String(s.id) === String(show.id));
  const next = exists
    ? list.filter((s) => String(s.id) !== String(show.id))
    : [
        {
          id: show.id,
          title: show.title || "Podcast Show",
          image: show.image || "",
          subtitle: show.subtitle || "Podcast",
          savedAt: Date.now(),
        },
        ...list,
      ];
  localStorage.setItem(SAVED_SHOWS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("libraryUpdated"));
  return !exists;
};

export const getRecentSearches = () => safeParse(RECENT_SEARCHES_KEY, []);

export const addRecentSearch = (term) => {
  const clean = term?.trim();
  if (!clean) return getRecentSearches();
  const next = [
    clean,
    ...getRecentSearches().filter(
      (q) => q.toLowerCase() !== clean.toLowerCase(),
    ),
  ].slice(0, 8);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
};

export const removeRecentSearch = (term) => {
  const next = getRecentSearches().filter((q) => q !== term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
};

export const clearRecentSearches = () => {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
  return [];
};

export const getListeningHistory = () => safeParse(LISTENING_HISTORY_KEY, []);

export const recordListeningHistory = (song) => {
  if (!song?.id) return [];
  const current = getListeningHistory();
  const existing = current.find((item) => item.id === song.id);
  const entry = {
    id: song.id,
    song,
    playCount: (existing?.playCount || 0) + 1,
    lastPlayedAt: Date.now(),
  };
  const next = [entry, ...current.filter((item) => item.id !== song.id)].slice(
    0,
    40,
  );
  localStorage.setItem(LISTENING_HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("historyUpdated"));
  return next;
};

export const clearListeningHistory = () => {
  localStorage.removeItem(LISTENING_HISTORY_KEY);
  window.dispatchEvent(new Event("historyUpdated"));
  return [];
};
