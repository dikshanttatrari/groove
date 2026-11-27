import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { apiFetch, apiUrl } from "../utils/api";
import { formatSongData, getAudioUrlByQuality } from "../utils/formatters";
import { getSongBlob } from "../utils/storage";
import {
  getAppSettings,
  saveAppSettings,
  getStoredVolume,
  saveStoredVolume,
  getListeningHistory,
  recordListeningHistory,
  clearListeningHistory,
} from "../utils/preferences";

const MusicContext = createContext();
export const useMusic = () => useContext(MusicContext);

const shuffleArray = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function MusicProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: Off, 1: Repeat All, 2: Repeat One

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolumeState] = useState(() => getStoredVolume());
  const [isMuted, setIsMuted] = useState(false);
  const [settings, setSettings] = useState(() => getAppSettings());
  const [playbackRate, setPlaybackRateState] = useState(
    () => getAppSettings().playbackRate || 1,
  );

  const [likedTrackIds, setLikedTrackIds] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState(() =>
    getListeningHistory(),
  );

  // Sleep Timer
  const [sleepTarget, setSleepTarget] = useState(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState(null);
  const [sleepEndOfTrack, setSleepEndOfTrack] = useState(false);

  // Global UI Modals & Toast
  const [toast, setToast] = useState(null);
  const [actionSheetPayload, setActionSheetPayload] = useState(null);
  const [playlistPickerSong, setPlaylistPickerSong] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  const audioRef = useRef(null);
  const toastTimerRef = useRef(null);
  const unshuffledQueueRef = useRef([]);
  const preventAutoRecoRef = useRef(false);

  // Latest state refs to prevent stale closures in audio/MediaSession callbacks
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      currentSong,
      queue,
      history,
      isShuffle,
      repeatMode,
      isPlaying,
      sleepEndOfTrack,
      settings,
    };
  });

  const showToast = useCallback((message, type = "default") => {
    if (!message) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshLikedIds = useCallback(async () => {
    try {
      const token = localStorage.getItem("groove_token");
      if (!token) return;
      const res = await apiFetch("/api/library/liked-ids");
      if (res.ok) {
        const data = await res.json();
        setLikedTrackIds(data.likedIds || []);
      }
    } catch (error) {
      console.error("Failed to load liked IDs", error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialLikes = async () => {
      try {
        const token = localStorage.getItem("groove_token");
        if (!token) return;
        const res = await apiFetch("/api/library/liked-ids");
        if (res.ok && active) {
          const data = await res.json();
          setLikedTrackIds(data.likedIds || []);
        }
      } catch (error) {
        console.error("Failed to load liked IDs", error);
      }
    };
    loadInitialLikes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncHistory = () => setRecentlyPlayed(getListeningHistory());
    window.addEventListener("historyUpdated", syncHistory);
    return () => window.removeEventListener("historyUpdated", syncHistory);
  }, []);

  // Keep audio element volume & playbackRate synced
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sleep Timer Countdown
  useEffect(() => {
    if (!sleepTarget) return;
    const checkTimer = () => {
      const remainingMs = sleepTarget - Date.now();
      if (remainingMs <= 0) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        setSleepTarget(null);
        setSleepTimeRemaining(null);
        showToast("Sleep timer paused playback");
      } else {
        setSleepTimeRemaining(Math.ceil(remainingMs / 60000));
      }
    };
    const initialTick = setTimeout(checkTimer, 0);
    const interval = setInterval(checkTimer, 1000);
    return () => {
      clearTimeout(initialTick);
      clearInterval(interval);
    };
  }, [sleepTarget, showToast]);

  const setSleepTimer = useCallback(
    (minutes) => {
      setSleepEndOfTrack(false);
      setSleepTarget(Date.now() + minutes * 60000);
      showToast(`Sleep timer set for ${minutes} min`);
    },
    [showToast],
  );

  const enableSleepEndOfTrack = useCallback(() => {
    setSleepTarget(null);
    setSleepTimeRemaining(null);
    setSleepEndOfTrack(true);
    showToast("Playback will pause after this track");
  }, [showToast]);

  const cancelSleepTimer = useCallback(() => {
    setSleepTarget(null);
    setSleepTimeRemaining(null);
    setSleepEndOfTrack(false);
    showToast("Sleep timer turned off");
  }, [showToast]);

  const updateSettings = useCallback(
    (partial) => {
      const next = saveAppSettings(partial);
      setSettings(next);
      if (partial.playbackRate !== undefined) {
        setPlaybackRateState(partial.playbackRate);
      }
      return next;
    },
    [],
  );

  const setPlaybackRate = useCallback(
    (rate) => {
      setPlaybackRateState(rate);
      updateSettings({ playbackRate: rate });
      showToast(`Playback speed: ${rate}x`);
    },
    [updateSettings, showToast],
  );

  const setVolume = useCallback((nextVol) => {
    const saved = saveStoredVolume(nextVol);
    setVolumeState(saved);
    if (saved > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const fetchNextRecommendations = useCallback(async (songId, append = false) => {
    if (!songId) return;
    try {
      const res = await fetch(apiUrl(`/api/recommendations/${songId}`));
      if (!res.ok) throw new Error("Could not fetch recommendations");

      const data = await res.json();
      let rawSongs = [];

      if (data && Array.isArray(data.songs)) {
        rawSongs = data.songs;
      } else if (data && data.songs && typeof data.songs === "object") {
        if (
          data.songs.msg ||
          data.songs.error ||
          data.songs.status === "failure"
        ) {
          rawSongs = [];
        } else {
          const values = Object.values(data.songs);
          rawSongs =
            values.length > 0 && Array.isArray(values[0]) ? values[0] : values;
        }
      }

      if (!Array.isArray(rawSongs) || rawSongs.length === 0) {
        if (!append) setQueue([]);
        return;
      }

      const formattedSongs = rawSongs
        .map((track) =>
          track && typeof track === "object" ? formatSongData(track) : null,
        )
        .filter(Boolean);

      setQueue((prevQueue) => {
        const activeId = stateRef.current.currentSong?.id;
        if (append) {
          const existingIds = new Set(prevQueue.map((s) => s.id));
          if (activeId) existingIds.add(activeId);
          const newUniqueSongs = formattedSongs.filter(
            (s) => !existingIds.has(s.id),
          );
          const combined = [...prevQueue, ...newUniqueSongs];
          return stateRef.current.isShuffle ? shuffleArray(combined) : combined;
        }
        unshuffledQueueRef.current = formattedSongs;
        return stateRef.current.isShuffle
          ? shuffleArray(formattedSongs)
          : formattedSongs;
      });
    } catch (error) {
      console.error("Failed to populate autoplay queue:", error);
      if (!append) setQueue([]);
    }
  }, []);

  const playSong = useCallback(
    async (song, isManual = true, preventFetch = false) => {
      if (!song) return;
      if (audioRef.current?.src?.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      setHasError(false);
      setIsBuffering(true);
      preventAutoRecoRef.current = preventFetch;

      const localData = await getSongBlob(song.id).catch(() => null);

      const preferredUrl = getAudioUrlByQuality(
        song,
        stateRef.current.settings?.streamQuality || "320kbps",
      );
      const audioSource = localData?.blob
        ? URL.createObjectURL(localData.blob)
        : preferredUrl || song.audioUrl || song.previewUrl || song.url;

      if (!audioSource) {
        setHasError(true);
        setIsBuffering(false);
        setIsPlaying(false);
        showToast("Audio stream unavailable for this track", "error");
        return;
      }

      if (stateRef.current.currentSong && isManual) {
        setHistory((prev) => [...prev.slice(-39), stateRef.current.currentSong]);
      }

      setCurrentSong({
        ...song,
        streamUrl: audioSource,
        isOfflinePlayback: !!localData?.blob,
      });
      setIsPlaying(true);

      if (audioRef.current) {
        audioRef.current.src = audioSource;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play().catch((err) => {
          console.warn("Autoplay blocked:", err);
          setIsPlaying(false);
          setIsBuffering(false);
        });
      }

      // Record local listening history
      const nextHistory = recordListeningHistory(song);
      setRecentlyPlayed(nextHistory);

      // Silent analytics tracking
      const user = JSON.parse(localStorage.getItem("groove_user") || "null") || {
        name: "Guest",
      };
      fetch(apiUrl("/api/admin/track-stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id || user.name,
          userName: user.name,
          songId: song.id,
          songTitle: song.title,
          artistName:
            song.artists?.[0]?.name || song.artist || "Unknown Artist",
          albumArt:
            song.image ||
            song.albumArt?.[0]?.url ||
            "https://c.saavncdn.com/default_album.jpg",
        }),
      }).catch(() => {});

      if (isManual && song.id && !preventFetch) {
        fetchNextRecommendations(song.id, false);
      }
    },
    [fetchNextRecommendations, playbackRate, showToast],
  );

  const playList = useCallback(
    (songs, startIndex = 0, options = {}) => {
      if (!Array.isArray(songs) || songs.length === 0) return;
      const { shuffle = false, preventFetch = true } = options;

      if (shuffle) {
        setIsShuffle(true);
        const picked = songs[startIndex] || songs[0];
        const remaining = songs.filter((_, idx) => idx !== startIndex);
        unshuffledQueueRef.current = remaining;
        setQueue(shuffleArray(remaining));
        playSong(picked, true, preventFetch);
        return;
      }

      const targetSong = songs[startIndex] || songs[0];
      const upcoming = songs.slice(startIndex + 1);
      unshuffledQueueRef.current = upcoming;
      setQueue(stateRef.current.isShuffle ? shuffleArray(upcoming) : upcoming);
      playSong(targetSong, true, preventFetch);
    },
    [playSong],
  );

  const handleNextTrack = useCallback(
    (fromOnEnded = false) => {
      const {
        queue: q,
        history: h,
        currentSong: active,
        repeatMode: repeat,
        sleepEndOfTrack: stopAtEnd,
      } = stateRef.current;

      if (fromOnEnded && stopAtEnd) {
        setSleepEndOfTrack(false);
        setIsPlaying(false);
        showToast("Sleep timer paused after track");
        return;
      }

      if (fromOnEnded && repeat === 2 && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
        return;
      }

      if (q.length > 0) {
        const nextSong = q[0];
        setQueue((prev) => prev.slice(1));
        if (active) {
          setHistory((prev) => [...prev.slice(-39), active]);
        }
        playSong(nextSong, false, preventAutoRecoRef.current);

        if (q.length <= 4 && !preventAutoRecoRef.current) {
          fetchNextRecommendations(nextSong.id, true);
        }
      } else if (repeat === 1) {
        const cycle = [...h, active].filter(Boolean);
        if (cycle.length > 1) {
          const [first, ...rest] = cycle;
          setHistory([]);
          setQueue(rest);
          playSong(first, false, true);
        } else if (active && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        setIsPlaying(false);
      }
    },
    [fetchNextRecommendations, playSong, showToast],
  );

  const handlePrevTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
      return;
    }

    const { history: h, currentSong: active } = stateRef.current;
    if (h.length > 0) {
      const prevSong = h[h.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      if (active) {
        setQueue((prev) => [active, ...prev]);
      }
      playSong(prevSong, false, preventAutoRecoRef.current);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
    }
  }, [playSong]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || hasError || !stateRef.current.currentSong) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch((e) => console.warn(e));
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [hasError]);

  const seek = useCallback((percentage) => {
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      const newTime = (percentage / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(percentage);
      setCurrentTime(newTime);
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      setQueue((currentQ) => {
        if (next) {
          unshuffledQueueRef.current = currentQ;
          return shuffleArray(currentQ);
        }
        const remainingIds = new Set(currentQ.map((s) => s.id));
        const restored = unshuffledQueueRef.current.filter((s) =>
          remainingIds.has(s.id),
        );
        const missing = currentQ.filter(
          (s) => !restored.some((r) => r.id === s.id),
        );
        return [...restored, ...missing];
      });
      showToast(next ? "Shuffle enabled" : "Shuffle disabled");
      return next;
    });
  }, [showToast]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const next = (prev + 1) % 3;
      const labels = ["Repeat off", "Repeating queue", "Repeating track"];
      showToast(labels[next]);
      return next;
    });
  }, [showToast]);

  const playNext = useCallback(
    (song) => {
      if (!song) return;
      if (!stateRef.current.currentSong) {
        playSong(song);
        return;
      }
      setQueue((prev) => [song, ...prev.filter((s) => s.id !== song.id)]);
      showToast(`Playing "${song.title}" next`);
    },
    [playSong, showToast],
  );

  const addToQueue = useCallback(
    (song) => {
      if (!song) return;
      if (!stateRef.current.currentSong) {
        playSong(song);
        return;
      }
      setQueue((prev) => [...prev, song]);
      showToast(`Added "${song.title}" to queue`);
    },
    [playSong, showToast],
  );

  const removeFromQueue = useCallback((index) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const moveInQueue = useCallback((fromIndex, toIndex) => {
    setQueue((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    unshuffledQueueRef.current = [];
    showToast("Queue cleared");
  }, [showToast]);

  const toggleLikeSong = useCallback(
    async (songOrId) => {
      const songId = typeof songOrId === "string" ? songOrId : songOrId?.id;
      if (!songId) return false;
      const wasLiked = likedTrackIds.includes(songId);

      setLikedTrackIds((prev) =>
        wasLiked ? prev.filter((id) => id !== songId) : [...prev, songId],
      );

      try {
        const res = await apiFetch("/api/library/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        });
        if (res.ok) {
          const data = await res.json();
          setLikedTrackIds(data.likedSongs || []);
          showToast(
            wasLiked ? "Removed from Liked Songs" : "Saved to Liked Songs",
          );
          return !wasLiked;
        }
        throw new Error("Like request failed");
      } catch {
        setLikedTrackIds((prev) =>
          wasLiked ? [...prev, songId] : prev.filter((id) => id !== songId),
        );
        showToast("Could not update Liked Songs", "error");
        return wasLiked;
      }
    },
    [likedTrackIds, showToast],
  );

  const openSongActions = useCallback((song, options = {}) => {
    if (!song) return;
    setActionSheetPayload({ song, ...options });
  }, []);

  const closeSongActions = useCallback(() => {
    setActionSheetPayload(null);
  }, []);

  const openPlaylistPicker = useCallback((song) => {
    setActionSheetPayload(null);
    setPlaylistPickerSong(song);
  }, []);

  const closePlaylistPicker = useCallback(() => {
    setPlaylistPickerSong(null);
  }, []);

  const clearHistory = useCallback(() => {
    clearListeningHistory();
    setRecentlyPlayed([]);
    showToast("Listening history cleared");
  }, [showToast]);

  // MediaSession integration
  useEffect(() => {
    if (currentSong && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist:
          currentSong.artists?.[0]?.name ||
          currentSong.artist ||
          "Unknown Artist",
        album: currentSong.album || "Groove Music",
        artwork: [
          {
            src:
              currentSong.albumArt?.[0]?.url ||
              currentSong.image ||
              "https://c.saavncdn.com/default_album.jpg",
            sizes: "50x50",
            type: "image/jpeg",
          },
          {
            src:
              currentSong.albumArt?.[1]?.url ||
              currentSong.image ||
              "https://c.saavncdn.com/default_album.jpg",
            sizes: "150x150",
            type: "image/jpeg",
          },
          {
            src:
              currentSong.albumArt?.[2]?.url ||
              currentSong.image ||
              "https://c.saavncdn.com/default_album.jpg",
            sizes: "500x500",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        handleNextTrack(false),
      );
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        handlePrevTrack(),
      );
    }
  }, [currentSong, handleNextTrack, handlePrevTrack]);

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable
      ) {
        return;
      }
      if (!stateRef.current.currentSong) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNextTrack(false);
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevTrack();
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, handleNextTrack, handlePrevTrack, toggleMute]);

  const value = {
    currentSong,
    isPlaying,
    isBuffering,
    hasError,
    progress,
    currentTime,
    duration,
    queue,
    history,
    isShuffle,
    repeatMode,
    volume,
    isMuted,
    playbackRate,
    settings,
    likedTrackIds,
    recentlyPlayed,
    sleepTimeRemaining,
    sleepEndOfTrack,
    toast,
    actionSheetPayload,
    playlistPickerSong,
    isSettingsOpen,
    isQueueDrawerOpen,
    isPlayerExpanded,
    nextTrack: () => handleNextTrack(false),
    prevTrack: handlePrevTrack,
    seek,
    togglePlay,
    playSong,
    playList,
    setQueue,
    toggleShuffle,
    cycleRepeatMode,
    playNext,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    setVolume,
    toggleMute,
    setPlaybackRate,
    updateSettings,
    toggleLikeSong,
    refreshLikedIds,
    setSleepTimer,
    enableSleepEndOfTrack,
    cancelSleepTimer,
    showToast,
    openSongActions,
    closeSongActions,
    openPlaylistPicker,
    closePlaylistPicker,
    setIsSettingsOpen,
    setIsQueueDrawerOpen,
    setIsPlayerExpanded,
    clearHistory,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onEnded={() => handleNextTrack(true)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
          }
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setHasError(true);
        }}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTime(audioRef.current.currentTime);
          const percentage =
            (audioRef.current.currentTime / audioRef.current.duration) * 100 ||
            0;
          setProgress(percentage);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.playbackRate = playbackRate;
          }
        }}
      />
    </MusicContext.Provider>
  );
}
