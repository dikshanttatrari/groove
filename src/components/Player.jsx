/* eslint-disable no-useless-escape */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  ChevronDown,
  SkipForward,
  SkipBack,
  Heart,
  Shuffle,
  Repeat,
  Timer,
  ListPlus,
  MoreVertical,
  X,
  ListMusic,
  Download,
  HardDriveDownload,
  Share2,
  Mic2,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  ArrowUp,
  ArrowDown,
  Trash2,
  SlidersHorizontal,
  WifiOff,
} from "lucide-react";
import { useMusic } from "../context/MusicContext";
import { deleteSongBlob, isSongDownloaded } from "../utils/storage";
import { downloadSongToDevice, silentDownload } from "../utils/downloadSongs";

const formatTime = (timeInSeconds) => {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return "0:00";
  const m = Math.floor(timeInSeconds / 60);
  const s = Math.floor(timeInSeconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const getImageUrl = (artArray, preferredIndex) => {
  if (!Array.isArray(artArray) || artArray.length === 0) {
    return "https://c.saavncdn.com/default_album.jpg";
  }
  return (
    artArray[preferredIndex]?.url ||
    artArray[artArray.length - 1]?.url ||
    artArray[0]?.url ||
    "https://c.saavncdn.com/default_album.jpg"
  );
};

const getDominantColor = (imageUrl, callback) => {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);

    try {
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      r = Math.floor((r / count) * 0.42);
      g = Math.floor((g / count) * 0.42);
      b = Math.floor((b / count) * 0.42);
      callback(`rgb(${r}, ${g}, ${b})`);
    } catch {
      callback("#1a1816");
    }
  };
  img.onerror = () => callback("#1a1816");
};

const parseLRC = (lrcString) => {
  const lines = lrcString.split("\n");
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach((line) => {
    const match = line.match(timeRegex);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      const timeInSeconds =
        mins * 60 + secs + ms / (match[3].length === 3 ? 1000 : 100);
      const text = line.replace(timeRegex, "").trim();
      if (text) parsed.push({ time: timeInSeconds, text });
    }
  });
  return parsed;
};

const cleanText = (text) =>
  String(text || "")
    .replace(/\(feat\..*?\)/i, "")
    .replace(/\(ft\..*?\)/i, "")
    .replace(/\(Remastered.*?\)/i, "")
    .replace(/\- Remastered.*?$/i, "")
    .replace(/\(Live.*?\)/i, "")
    .trim();

const SPEED_CYCLE = [1, 1.25, 1.5, 2, 0.75];

export default function Player() {
  const navigate = useNavigate();
  const {
    currentSong,
    isPlaying,
    isBuffering,
    togglePlay,
    hasError,
    progress,
    currentTime,
    duration,
    seek,
    queue,
    nextTrack,
    prevTrack,
    playSong,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeatMode,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    playbackRate,
    setPlaybackRate,
    settings,
    likedTrackIds,
    toggleLikeSong,
    sleepTimeRemaining,
    sleepEndOfTrack,
    setSleepTimer,
    enableSleepEndOfTrack,
    cancelSleepTimer,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    showToast,
    openPlaylistPicker,
    setIsSettingsOpen,
    isQueueDrawerOpen,
    setIsQueueDrawerOpen,
    isPlayerExpanded,
    setIsPlayerExpanded,
  } = useMusic();

  const [isClosing, setIsClosing] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);

  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [miniPlayerColor, setMiniPlayerColor] = useState("#1a1816");
  const [isSharing, setIsSharing] = useState(false);
  const [slideDirection, setSlideDirection] = useState("");
  const prevSongIdRef = useRef(currentSong?.id);

  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const lyricsContainerRef = useRef(null);

  const playerRef = useRef(null);
  const touchStart = useRef({ y: 0, time: 0 });
  const isDragging = useRef(false);

  const lyricsSongIdRef = useRef(null);

  // Lyrics fetch
  useEffect(() => {
    if (!currentSong?.id || lyricsSongIdRef.current === currentSong.id) return;
    lyricsSongIdRef.current = currentSong.id;

    const fetchLyrics = async () => {
      setIsFetchingLyrics(true);
      setLyrics([]);
      setActiveLyricIndex(-1);

      try {
        const rawArtist =
          currentSong.artists?.[0]?.name || currentSong.artist || "";
        const rawTrack = currentSong.title || "";
        const artist = cleanText(rawArtist);
        const track = cleanText(rawTrack);
        const album = currentSong.album ? cleanText(currentSong.album) : "";
        const trackDuration = Math.floor(currentSong.durationSeconds || 0);

        const params = new URLSearchParams({
          track_name: track,
          artist_name: artist,
        });
        if (album) params.append("album_name", album);
        if (trackDuration) params.append("duration", trackDuration.toString());

        const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);

        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            setLyrics(parseLRC(data.syncedLyrics));
            setIsFetchingLyrics(false);
            return;
          } else if (data.plainLyrics) {
            setLyrics([{ time: 0, text: data.plainLyrics, isPlain: true }]);
            setIsFetchingLyrics(false);
            return;
          }
        }

        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(`${track} ${artist}`)}`,
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData && searchData.length > 0) {
            const syncedResult = searchData.find((item) => item.syncedLyrics);
            if (syncedResult) {
              setLyrics(parseLRC(syncedResult.syncedLyrics));
            } else {
              const plainResult = searchData.find((item) => item.plainLyrics);
              if (plainResult) {
                setLyrics([
                  { time: 0, text: plainResult.plainLyrics, isPlain: true },
                ]);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch lyrics", error);
      } finally {
        setIsFetchingLyrics(false);
      }
    };
    fetchLyrics();
  }, [currentSong]);

  useEffect(() => {
    if (!lyrics.length || lyrics[0]?.isPlain || !currentTime) return;
    const index = lyrics.findIndex((lyric, i) => {
      const nextLyric = lyrics[i + 1];
      return (
        currentTime >= lyric.time &&
        (!nextLyric || currentTime < nextLyric.time)
      );
    });
    if (index !== activeLyricIndex && index !== -1) {
      setActiveLyricIndex(index);
    }
  }, [currentTime, lyrics, activeLyricIndex]);

  useEffect(() => {
    if (showLyrics && lyricsContainerRef.current) {
      const activeEl =
        lyricsContainerRef.current.querySelector(".lyric-active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLyricIndex, showLyrics]);

  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (currentSong?.id) {
        const status = await isSongDownloaded(currentSong.id);
        setIsDownloaded(status);
      }
    };
    checkDownloadStatus();
    window.addEventListener("downloadsUpdated", checkDownloadStatus);
    return () =>
      window.removeEventListener("downloadsUpdated", checkDownloadStatus);
  }, [currentSong?.id]);

  useEffect(() => {
    if (
      currentSong &&
      prevSongIdRef.current &&
      currentSong.id !== prevSongIdRef.current
    ) {
      setTimeout(() => setSlideDirection("slide-left"), 0);
    }
    prevSongIdRef.current = currentSong?.id;
  }, [currentSong]);

  const highResImage = currentSong
    ? getImageUrl(currentSong.albumArt, 2)
    : null;
  const lowResImage = currentSong ? getImageUrl(currentSong.albumArt, 1) : null;

  useEffect(() => {
    if (lowResImage) {
      getDominantColor(lowResImage, (color) => setMiniPlayerColor(color));
    }
  }, [lowResImage]);

  useEffect(() => {
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        isPlayerExpanded || isClosing ? "#000000" : "#110f0d",
      );
    }
  }, [isPlayerExpanded, isClosing]);

  const generateShareImage = async (song, bgColor, imageUrl) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
      gradient.addColorStop(0, bgColor || "#1a1816");
      gradient.addColorStop(1, "#050505");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;

      img.onload = () => {
        const size = 800;
        const x = (1080 - size) / 2;
        const y = 350;

        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 50;
        ctx.shadowOffsetY = 20;
        ctx.drawImage(img, x, y, size, size);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 75px 'EB Garamond', Garamond, serif";
        const title =
          song.title.length > 25
            ? `${song.title.substring(0, 25)}...`
            : song.title;
        ctx.fillText(title, 540, 1350);

        ctx.fillStyle = "#b3b3b3";
        ctx.font = "italic 55px 'EB Garamond', Garamond, serif";
        const artist =
          song.artists?.[0]?.name || song.artist || "Unknown Artist";
        ctx.fillText(artist, 540, 1430);

        ctx.fillStyle = "#1DB954";
        ctx.font = "bold 40px 'EB Garamond', Garamond, serif";
        ctx.fillText("Listen on Groove Music", 540, 1750);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      };
      img.onerror = reject;
    });
  };

  const handleShare = async (e) => {
    if (e) e.stopPropagation();
    if (!currentSong || isSharing) return;

    setShowMoreModal(false);
    setIsSharing(true);
    showToast("Generating share poster...");

    try {
      const deepLink = `https://music.groove.mooo.com/#/song/${currentSong.id}`;
      const highResUrl = getImageUrl(currentSong.albumArt, 2);
      const imageBlob = await generateShareImage(
        currentSong,
        miniPlayerColor,
        highResUrl,
      );
      const file = new File(
        [imageBlob],
        `${currentSong.title.replace(/\s+/g, "-")}.jpg`,
        { type: "image/jpeg" },
      );
      const shareData = { url: deepLink };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showToast("Link copied to clipboard");
      }
    } catch {
      // Cancelled
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadClick = async (e) => {
    if (e) e.stopPropagation();
    if (isDownloading || !currentSong) return;

    // If already cached in offline vault, save .m4a file directly to device!
    if (isDownloaded) {
      setIsDownloading(true);
      setDownloadPct(100);
      const res = await downloadSongToDevice(currentSong, {
        quality: settings.downloadQuality,
      });
      setIsDownloading(false);
      setDownloadPct(0);
      showToast(
        res.ok ? "Saved .m4a audio file to device" : "Device export failed",
        res.ok ? "default" : "error",
      );
      return;
    }

    setIsDownloading(true);
    setDownloadPct(0);
    const success = await silentDownload(currentSong, {
      onProgress: (pct) => setDownloadPct(pct),
    });
    setIsDownloading(false);
    setDownloadPct(0);
    if (success) {
      if (settings.downloadMode !== "device") setIsDownloaded(true);
      showToast(
        settings.downloadMode === "offline"
          ? "Saved to offline vault"
          : `Downloaded .m4a (${settings.downloadQuality})`,
      );
    } else {
      showToast("Download failed", "error");
    }
  };

  const handleSaveToDeviceOnly = async (e) => {
    if (e) e.stopPropagation();
    if (!currentSong || isDownloading) return;
    setShowMoreModal(false);
    setIsDownloading(true);
    setDownloadPct(0);
    const res = await downloadSongToDevice(currentSong, {
      quality: settings.downloadQuality,
      alsoSaveOffline: settings.downloadMode === "both",
      onProgress: (pct) => setDownloadPct(pct),
    });
    setIsDownloading(false);
    setDownloadPct(0);
    showToast(
      res.ok
        ? `Saved .m4a (${settings.downloadQuality})`
        : "Device download failed",
      res.ok ? "default" : "error",
    );
  };

  const handleToggleOfflineCache = async () => {
    if (!currentSong) return;
    setShowMoreModal(false);
    if (isDownloaded) {
      await deleteSongBlob(currentSong.id);
      window.dispatchEvent(new CustomEvent("downloadsUpdated"));
      setIsDownloaded(false);
      showToast("Removed from offline vault");
      return;
    }
    setIsDownloading(true);
    setDownloadPct(0);
    const ok = await silentDownload(currentSong, {
      mode: "offline",
      onProgress: (pct) => setDownloadPct(pct),
    });
    setIsDownloading(false);
    setDownloadPct(0);
    if (ok) {
      setIsDownloaded(true);
      showToast("Saved to offline vault");
    } else {
      showToast("Offline save failed", "error");
    }
  };

  if (!currentSong) return null;

  const isLiked = likedTrackIds.includes(currentSong.id);
  const primaryArtist = currentSong.artists?.[0];
  const artistName =
    primaryArtist?.name || currentSong.artist || "Unknown Artist";

  const handleCycleSpeed = (e) => {
    e?.stopPropagation();
    const idx = SPEED_CYCLE.indexOf(playbackRate);
    const next = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    setPlaybackRate(next);
  };

  const handleArtistJump = (e) => {
    e?.stopPropagation();
    if (primaryArtist?.id) {
      setIsPlayerExpanded(false);
      navigate(`/artist/${primaryArtist.id}`);
    }
  };

  const handleSkipNext = (e) => {
    e?.stopPropagation();
    setSlideDirection("slide-left");
    nextTrack();
  };

  const handleSkipPrev = (e) => {
    e?.stopPropagation();
    setSlideDirection("slide-right");
    prevTrack();
  };

  const handleClosePlayer = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsPlayerExpanded(false);
      setIsClosing(false);
      setShowLyrics(false);
      if (playerRef.current) {
        playerRef.current.style.transform = "";
        playerRef.current.style.transition = "";
        playerRef.current.style.opacity = "1";
      }
    }, 280);
  };

  const handleTouchStart = (e) => {
    if (
      showLyrics ||
      isQueueDrawerOpen ||
      showTimerModal ||
      showMoreModal
    ) {
      return;
    }
    touchStart.current = { y: e.touches[0].clientY, time: Date.now() };
    isDragging.current = true;
    if (playerRef.current) playerRef.current.style.transition = "none";
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !playerRef.current) return;
    const deltaY = e.touches[0].clientY - touchStart.current.y;
    if (deltaY > 0) {
      playerRef.current.style.transform = `translateY(${deltaY}px)`;
      playerRef.current.style.opacity = String(
        1 - (deltaY / window.innerHeight) * 0.8,
      );
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!playerRef.current) return;

    const currentY = e.changedTouches[0]?.clientY || touchStart.current.y;
    const deltaY = currentY - touchStart.current.y;
    const velocity = deltaY / Math.max(1, Date.now() - touchStart.current.time);

    playerRef.current.style.transition =
      "transform 0.38s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.28s ease";

    if (deltaY > 150 || velocity > 0.6) {
      playerRef.current.style.transform = "translateY(100%)";
      playerRef.current.style.opacity = "0";
      setTimeout(handleClosePlayer, 260);
    } else {
      playerRef.current.style.transform = "translateY(0px)";
      playerRef.current.style.opacity = "1";
    }
  };

  const overlayStyle = {
    alignItems: "flex-end",
    display: "flex",
    justifyContent: "center",
    padding: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    position: "fixed",
    inset: 0,
    zIndex: 9999,
  };

  const bottomSheetStyle = {
    width: "100%",
    maxWidth: "520px",
    backgroundColor: "rgba(24, 21, 19, 0.94)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    padding: "24px",
    paddingBottom: "36px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -10px 40px rgba(0,0,0,0.65)",
  };

  const renderQueueModal = () =>
    isQueueDrawerOpen && (
      <div
        className="fade-in"
        onClick={() => setIsQueueDrawerOpen(false)}
        style={overlayStyle}
      >
        <div
          className="slide-up-enter"
          onClick={(e) => e.stopPropagation()}
          style={{ ...bottomSheetStyle, height: "75vh" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  margin: 0,
                  fontWeight: "bold",
                  color: "#ffe5b6",
                  fontFamily: "var(--font-editorial, serif)",
                }}
              >
                Up Next ({queue.length})
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f87171",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
              <button
                className="icon-btn native-tap"
                onClick={() => setIsQueueDrawerOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  padding: "6px",
                }}
              >
                <X size={20} color="#fff" />
              </button>
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(29, 185, 84, 0.1)",
              border: "1px solid rgba(29, 185, 84, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <img
              src={getImageUrl(currentSong.albumArt, 0)}
              alt="now"
              style={{
                width: 42,
                height: 42,
                borderRadius: 6,
                objectFit: "cover",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "#1DB954",
                  fontWeight: 700,
                }}
              >
                Now Playing
              </div>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.94rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentSong.title}
              </div>
            </div>
            {isPlaying && (
              <div className="eq-bars">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {queue && queue.length > 0 ? (
              queue.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  className="aesthetic-song-row native-tap"
                  onClick={() => {
                    playSong(song);
                    setIsQueueDrawerOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 4px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={getImageUrl(song.albumArt, 0)}
                    alt="cover"
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "6px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <h4
                      style={{
                        margin: "0 0 2px 0",
                        color: "#fff",
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {song.title}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        color: "#a89f98",
                        fontSize: "0.8rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {song.artists?.[0]?.name ||
                        song.artist ||
                        "Unknown Artist"}
                    </p>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {index > 0 && (
                      <button
                        className="icon-btn"
                        style={{ padding: 6 }}
                        onClick={() => moveInQueue(index, index - 1)}
                        title="Move up"
                      >
                        <ArrowUp size={15} color="#a89f98" />
                      </button>
                    )}
                    {index < queue.length - 1 && (
                      <button
                        className="icon-btn"
                        style={{ padding: 6 }}
                        onClick={() => moveInQueue(index, index + 1)}
                        title="Move down"
                      >
                        <ArrowDown size={15} color="#a89f98" />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      style={{ padding: 6 }}
                      onClick={() => removeFromQueue(index)}
                      title="Remove from queue"
                    >
                      <Trash2 size={15} color="#f87171" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p
                style={{
                  color: "#888",
                  textAlign: "center",
                  marginTop: "40px",
                }}
              >
                Queue is empty. Play a song or tap "..." to queue tracks.
              </p>
            )}
          </div>
        </div>
      </div>
    );

  const renderDownloadButton = (iconSize = 22) => {
    if (isDownloading) {
      return (
        <div
          className="download-ring-container"
          title={`Downloading ${downloadPct}%`}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              color: "#1DB954",
            }}
          >
            {downloadPct > 0 ? `${downloadPct}` : "·"}
          </span>
          <svg className="spotify-spinner" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="#1DB954"
              strokeWidth="2"
              fill="none"
              strokeDasharray="45"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    }
    if (isDownloaded) {
      return (
        <button
          className="icon-btn native-tap"
          onClick={handleDownloadClick}
          title="Saved offline — click to save .m4a file to device"
          style={{
            width: 26,
            height: 26,
            backgroundColor: "#1DB954",
            borderRadius: "50%",
          }}
        >
          <HardDriveDownload size={14} color="#000000" strokeWidth={2.6} />
        </button>
      );
    }
    return (
      <button
        className="icon-btn native-tap"
        onClick={handleDownloadClick}
        title={`Download (${settings.downloadQuality})`}
      >
        <Download size={iconSize} color="rgba(255,255,255,0.75)" />
      </button>
    );
  };

  return (
    <>
      {/* FULLSCREEN PLAYER */}
      {(isPlayerExpanded || isClosing) && (
        <div
          ref={playerRef}
          className={`full-player native-scroll-lock ${isClosing ? "slide-down-exit" : "slide-up-enter"}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ willChange: "transform, opacity" }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              paddingTop: "12px",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "5px",
                backgroundColor: "rgba(255,255,255,0.3)",
                borderRadius: "10px",
              }}
            ></div>
          </div>

          {/* Sleep Timer Modal */}
          {showTimerModal && (
            <div
              className="fade-in"
              onClick={() => setShowTimerModal(false)}
              style={overlayStyle}
            >
              <div
                className="slide-up-enter"
                onClick={(e) => e.stopPropagation()}
                style={bottomSheetStyle}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        margin: 0,
                        fontWeight: "bold",
                        color: "#ffe5b6",
                        fontFamily: "var(--font-editorial, serif)",
                      }}
                    >
                      Sleep Timer
                    </h2>
                    {sleepTimeRemaining && (
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          color: "#1DB954",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                        }}
                      >
                        {sleepTimeRemaining} minutes remaining
                      </p>
                    )}
                    {sleepEndOfTrack && (
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          color: "#1DB954",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                        }}
                      >
                        Stopping at end of track
                      </p>
                    )}
                  </div>
                  <button
                    className="icon-btn native-tap"
                    onClick={() => setShowTimerModal(false)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "50%",
                      padding: "6px",
                    }}
                  >
                    <X size={20} color="#fff" />
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      className="aesthetic-row native-tap"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "none",
                        color: "#fff",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        fontSize: "0.98rem",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSleepTimer(mins);
                        setShowTimerModal(false);
                      }}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                  <button
                    className="aesthetic-row native-tap"
                    style={{
                      background: "rgba(255, 229, 182, 0.08)",
                      border: "1px solid rgba(255, 229, 182, 0.25)",
                      color: "#ffe5b6",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      fontSize: "0.98rem",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      enableSleepEndOfTrack();
                      setShowTimerModal(false);
                    }}
                  >
                    End of Current Track
                  </button>
                  {(sleepTimeRemaining || sleepEndOfTrack) && (
                    <button
                      className="aesthetic-row native-tap"
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#f87171",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        marginTop: "6px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        cancelSleepTimer();
                        setShowTimerModal(false);
                      }}
                    >
                      Turn Off Timer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* More Options Modal */}
          {showMoreModal && (
            <div
              className="fade-in"
              onClick={() => setShowMoreModal(false)}
              style={overlayStyle}
            >
              <div
                className="slide-up-enter"
                onClick={(e) => e.stopPropagation()}
                style={bottomSheetStyle}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    paddingBottom: "16px",
                    marginBottom: "12px",
                  }}
                >
                  <img
                    src={getImageUrl(currentSong.albumArt, 0)}
                    alt="cover"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      marginRight: 14,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.05rem",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {currentSong.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.86rem",
                        color: "#a89f98",
                      }}
                    >
                      {artistName}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <button
                    className="sheet-action-btn"
                    onClick={handleSaveToDeviceOnly}
                  >
                    <span className="sheet-action-btn-left">
                      <HardDriveDownload size={22} color="#1db954" />
                      <span>
                        Download Audio File (.m4a • {settings.downloadQuality})
                      </span>
                    </span>
                  </button>
                  <button
                    className="sheet-action-btn"
                    onClick={handleToggleOfflineCache}
                  >
                    <span className="sheet-action-btn-left">
                      <Download
                        size={22}
                        color={isDownloaded ? "#1db954" : "#ffe5b6"}
                      />
                      <span>
                        {isDownloaded
                          ? "Remove from Offline Vault"
                          : "Save to In-App Offline Vault"}
                      </span>
                    </span>
                  </button>
                  <button
                    className="sheet-action-btn"
                    onClick={() => {
                      setShowMoreModal(false);
                      openPlaylistPicker(currentSong);
                    }}
                  >
                    <span className="sheet-action-btn-left">
                      <ListPlus size={22} color="#a89f98" />
                      <span>Add to Playlist</span>
                    </span>
                  </button>
                  <button className="sheet-action-btn" onClick={handleShare}>
                    <span className="sheet-action-btn-left">
                      <Share2 size={22} color="#a89f98" />
                      <span>Share Poster</span>
                    </span>
                  </button>
                  <button
                    className="sheet-action-btn"
                    onClick={() => {
                      setShowMoreModal(false);
                      setIsSettingsOpen(true);
                    }}
                  >
                    <span className="sheet-action-btn-left">
                      <SlidersHorizontal size={22} color="#a89f98" />
                      <span>Audio & Download Settings</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="player-ambient-bg">
            <img src={highResImage} alt="ambient" className="ambient-blur" />
            <div className="ambient-gradient"></div>
          </div>

          <div className="full-player-content">
            <div className="full-player-desktop-wrap">
              <header
                className="full-player-header"
                style={{ paddingTop: "20px", marginBottom: "2.5vh" }}
              >
                <button
                  className="icon-btn native-tap"
                  onClick={handleClosePlayer}
                >
                  <ChevronDown size={30} color="#ffffff" />
                </button>
                <div style={{ textAlign: "center" }}>
                  <span
                    className="now-playing-label"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "200px",
                      display: "block",
                    }}
                  >
                    {currentSong.album || "NOW PLAYING"}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <span className="offline-chip">
                      {currentSong.isOfflinePlayback
                        ? "Offline Vault"
                        : settings.streamQuality}
                    </span>
                    {playbackRate !== 1 && (
                      <span
                        className="offline-chip"
                        style={{
                          background: "rgba(255,229,182,0.16)",
                          color: "#ffe5b6",
                        }}
                      >
                        {playbackRate}x
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="icon-btn native-tap"
                  onClick={() => setShowMoreModal(true)}
                >
                  <MoreVertical size={26} color="#ffffff" />
                </button>
              </header>

              <div
                className={`transition-wrapper ${slideDirection}`}
                onAnimationEnd={() => setSlideDirection("")}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 0,
                }}
              >
                {!showLyrics ? (
                  <>
                    <div
                      className="art-container"
                      style={{ position: "relative" }}
                    >
                      <img
                        src={highResImage}
                        alt="Album Art"
                        className={`premium-art ${isPlaying ? "playing" : "paused"}`}
                        style={{
                          filter: hasError ? "grayscale(100%)" : "none",
                        }}
                      />
                      {lyrics.length > 0 && !lyrics[0].isPlain && (
                        <div
                          onClick={() => setShowLyrics(true)}
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "100%",
                            maxWidth: 400,
                            padding: "46px 18px 16px 18px",
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)",
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            cursor: "pointer",
                          }}
                        >
                          <p
                            key={activeLyricIndex}
                            className="slide-up-fade-in"
                            style={{
                              margin: 0,
                              textAlign: "left",
                              fontFamily: "var(--font-editorial, serif)",
                              fontSize: "1.35rem",
                              color: "rgba(255,255,255,0.95)",
                              fontWeight: "bold",
                              textShadow: "0px 2px 10px rgba(0,0,0,0.8)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: "1.3",
                            }}
                          >
                            {activeLyricIndex >= 0
                              ? lyrics[activeLyricIndex].text
                              : "♪"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="info-action-row">
                      <div className="full-player-text">
                        <h2 className="premium-title">
                          {hasError ? "Stream Unavailable" : currentSong.title}
                        </h2>
                        <h3
                          className="premium-artist"
                          onClick={handleArtistJump}
                          style={{
                            cursor: primaryArtist?.id ? "pointer" : "default",
                          }}
                        >
                          {artistName}
                        </h3>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {isPlaying && (
                          <div className="eq-bars">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        )}
                        <button
                          className="icon-btn native-tap heart-container"
                          onClick={() => toggleLikeSong(currentSong.id)}
                        >
                          <Heart
                            size={28}
                            color={isLiked ? "#1DB954" : "#ffffff"}
                            fill={isLiked ? "#1DB954" : "none"}
                            className={isLiked ? "heart-pop" : ""}
                          />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="lyrics-container fade-in"
                    ref={lyricsContainerRef}
                    style={{
                      height: "52vh",
                      overflowY: "auto",
                      padding: "20px 10px",
                      display: "flex",
                      flexDirection: "column",
                      scrollBehavior: "smooth",
                      fontFamily: "var(--font-editorial, serif)",
                      maskImage:
                        "linear-gradient(to bottom, transparent, black 10%, black 80%, transparent)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent, black 10%, black 80%, transparent)",
                    }}
                  >
                    {isFetchingLyrics ? (
                      <p
                        style={{
                          color: "#a89f98",
                          textAlign: "center",
                          margin: "auto",
                          fontSize: "1.3rem",
                        }}
                      >
                        Finding synced lyrics...
                      </p>
                    ) : lyrics.length > 0 ? (
                      lyrics[0].isPlain ? (
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            color: "#fff",
                            fontSize: "1.4rem",
                            lineHeight: "1.8",
                            textAlign: "center",
                            padding: "40px 0",
                          }}
                        >
                          {lyrics[0].text}
                        </div>
                      ) : (
                        <>
                          <div style={{ height: "40%" }}></div>
                          {lyrics.map((lyric, index) => {
                            const isActive = index === activeLyricIndex;
                            return (
                              <p
                                key={index}
                                className={isActive ? "lyric-active" : ""}
                                onClick={() =>
                                  duration && seek((lyric.time / duration) * 100)
                                }
                                style={{
                                  margin: "14px 0",
                                  fontSize: "2rem",
                                  fontWeight: "700",
                                  color: "#ffffff",
                                  opacity: isActive ? 1 : 0.3,
                                  filter: isActive ? "blur(0px)" : "blur(1.2px)",
                                  transform: isActive ? "scale(1.02)" : "scale(1)",
                                  transformOrigin: "left center",
                                  transition:
                                    "all 0.6s cubic-bezier(0.25, 1, 0.25, 1)",
                                  cursor: "pointer",
                                  lineHeight: "1.3",
                                }}
                              >
                                {lyric.text || "♪"}
                              </p>
                            );
                          })}
                          <div style={{ height: "50%" }}></div>
                        </>
                      )
                    ) : (
                      <p
                        style={{
                          color: "#a89f98",
                          textAlign: "center",
                          margin: "auto",
                          fontSize: "1.3rem",
                        }}
                      >
                        No lyrics available for this track.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="premium-slider-container">
                <input
                  type="range"
                  className="premium-slider native-tap"
                  min="0"
                  max="100"
                  value={progress || 0}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={hasError}
                  style={{ backgroundSize: `${progress}% 100%` }}
                />
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="premium-controls">
                <button
                  className="icon-btn native-tap"
                  onClick={toggleShuffle}
                  title="Shuffle"
                >
                  <Shuffle
                    size={22}
                    color={isShuffle ? "#1DB954" : "rgba(255,255,255,0.7)"}
                  />
                </button>
                <button
                  className="icon-btn native-tap"
                  onClick={handleSkipPrev}
                >
                  <SkipBack size={36} color="#ffffff" fill="#ffffff" />
                </button>
                <button
                  className="premium-play-btn native-tap"
                  onClick={togglePlay}
                  disabled={hasError}
                >
                  {isBuffering ? (
                    <div className="tiny-loader-dark"></div>
                  ) : isPlaying ? (
                    <Pause size={32} color="#000000" fill="#000000" />
                  ) : (
                    <Play
                      size={32}
                      color="#000000"
                      fill="#000000"
                      style={{ marginLeft: "4px" }}
                    />
                  )}
                </button>
                <button
                  className="icon-btn native-tap"
                  onClick={handleSkipNext}
                >
                  <SkipForward size={36} color="#ffffff" fill="#ffffff" />
                </button>
                <button
                  className="icon-btn native-tap"
                  onClick={cycleRepeatMode}
                  style={{ position: "relative" }}
                  title="Repeat"
                >
                  <Repeat
                    size={22}
                    color={repeatMode > 0 ? "#1DB954" : "rgba(255,255,255,0.7)"}
                  />
                  {repeatMode === 2 && (
                    <div
                      style={{
                        position: "absolute",
                        background: "#1DB954",
                        borderRadius: "50%",
                        width: "13px",
                        height: "13px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bottom: -3,
                        right: -5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#000",
                          fontWeight: "900",
                        }}
                      >
                        1
                      </span>
                    </div>
                  )}
                </button>
              </div>

              <div
                className="premium-footer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    className="icon-btn native-tap"
                    onClick={() => setShowLyrics(!showLyrics)}
                    style={{
                      background: showLyrics
                        ? "rgba(29, 185, 84, 0.2)"
                        : "transparent",
                      borderRadius: "50%",
                      padding: "8px",
                    }}
                    title="Lyrics"
                  >
                    <Mic2
                      size={22}
                      color={showLyrics ? "#1DB954" : "rgba(255,255,255,0.75)"}
                    />
                  </button>
                  <button
                    className="speed-pill-btn"
                    onClick={handleCycleSpeed}
                    title="Playback speed"
                  >
                    {playbackRate}x
                  </button>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "18px" }}
                >
                  <button
                    className="icon-btn native-tap"
                    onClick={() => setShowTimerModal(true)}
                    title="Sleep timer"
                  >
                    <Timer
                      size={22}
                      color={
                        sleepTimeRemaining || sleepEndOfTrack
                          ? "#1DB954"
                          : "rgba(255,255,255,0.75)"
                      }
                    />
                  </button>
                  <button
                    className="icon-btn native-tap"
                    onClick={() => setIsQueueDrawerOpen(true)}
                    title="Up next"
                  >
                    <ListMusic size={22} color="rgba(255,255,255,0.75)" />
                  </button>
                  {renderDownloadButton(22)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP PERSISTENT PLAYER DOCK */}
      <div className="desktop-player-dock">
        <div className="dock-left">
          <button
            className="dock-cover-btn"
            onClick={() => setIsPlayerExpanded(true)}
            title="Expand Now Playing"
          >
            <img
              src={lowResImage}
              alt={currentSong.title}
              style={{ filter: hasError ? "grayscale(100%)" : "none" }}
            />
            <span className="dock-cover-expand">
              <Maximize2 size={16} color="#fff" />
            </span>
          </button>

          <div className="dock-track-meta">
            <div
              className="dock-track-title"
              onClick={() => setIsPlayerExpanded(true)}
            >
              {hasError ? "Stream Unavailable" : currentSong.title}
            </div>
            <div className="dock-track-sub">
              <span
                onClick={handleArtistJump}
                style={{
                  cursor: primaryArtist?.id ? "pointer" : "default",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {artistName}
              </span>
              {currentSong.isOfflinePlayback && (
                <span className="offline-chip">
                  <WifiOff size={9} /> Offline
                </span>
              )}
            </div>
          </div>

          <button
            className="icon-btn native-tap"
            onClick={() => toggleLikeSong(currentSong.id)}
            title={isLiked ? "Unlike" : "Save to Liked Songs"}
          >
            <Heart
              size={18}
              color={isLiked ? "#1DB954" : "#a89f98"}
              fill={isLiked ? "#1DB954" : "none"}
            />
          </button>
        </div>

        <div className="dock-center">
          <div className="dock-buttons">
            <button
              className="icon-btn"
              onClick={toggleShuffle}
              title="Shuffle"
            >
              <Shuffle
                size={17}
                color={isShuffle ? "#1DB954" : "#a89f98"}
              />
            </button>
            <button
              className="icon-btn"
              onClick={handleSkipPrev}
              title="Previous"
            >
              <SkipBack size={20} color="#fff" fill="#fff" />
            </button>
            <button
              className="dock-play-circle"
              onClick={togglePlay}
              disabled={hasError}
              title="Play / Pause"
            >
              {isBuffering ? (
                <div
                  className="tiny-loader-dark"
                  style={{ width: 16, height: 16 }}
                ></div>
              ) : isPlaying ? (
                <Pause size={18} color="#000" fill="#000" />
              ) : (
                <Play
                  size={18}
                  color="#000"
                  fill="#000"
                  style={{ marginLeft: 2 }}
                />
              )}
            </button>
            <button
              className="icon-btn"
              onClick={handleSkipNext}
              title="Next"
            >
              <SkipForward size={20} color="#fff" fill="#fff" />
            </button>
            <button
              className="icon-btn"
              onClick={cycleRepeatMode}
              style={{ position: "relative" }}
              title="Repeat"
            >
              <Repeat
                size={17}
                color={repeatMode > 0 ? "#1DB954" : "#a89f98"}
              />
              {repeatMode === 2 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -5,
                    background: "#1DB954",
                    color: "#000",
                    borderRadius: "50%",
                    width: 11,
                    height: 11,
                    fontSize: 8,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  1
                </span>
              )}
            </button>
          </div>

          <div className="dock-progress-row">
            <span className="dock-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="dock-slider"
              min="0"
              max="100"
              value={progress || 0}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={hasError}
              style={{ backgroundSize: `${progress}% 100%` }}
            />
            <span className="dock-time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="dock-right">
          <button
            className="speed-pill-btn"
            onClick={handleCycleSpeed}
            title="Playback Speed"
          >
            {playbackRate}x
          </button>

          <button
            className="icon-btn"
            onClick={() => {
              setShowLyrics(true);
              setIsPlayerExpanded(true);
            }}
            title="Synced Lyrics"
          >
            <Mic2 size={18} color="#a89f98" />
          </button>

          <button
            className="icon-btn"
            onClick={() => setIsQueueDrawerOpen(true)}
            title="Up Next Queue"
          >
            <ListMusic size={18} color="#a89f98" />
          </button>

          {renderDownloadButton(18)}

          <div className="dock-volume-wrap">
            <button className="icon-btn" onClick={toggleMute} title="Mute">
              {isMuted || volume === 0 ? (
                <VolumeX size={18} color="#a89f98" />
              ) : volume < 0.5 ? (
                <Volume1 size={18} color="#a89f98" />
              ) : (
                <Volume2 size={18} color="#a89f98" />
              )}
            </button>
            <input
              type="range"
              className="dock-slider"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{
                backgroundSize: `${(isMuted ? 0 : volume) * 100}% 100%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* MOBILE MINI PLAYER */}
      {!isPlayerExpanded && !isClosing && (
        <div
          className="mini-player-wrapper fade-in native-tap"
          onClick={() => setIsPlayerExpanded(true)}
          style={{
            backgroundColor: miniPlayerColor,
            transition: "background-color 0.8s ease",
          }}
        >
          <div className="mini-progress-bar">
            <div
              className="mini-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div
            className="mini-player"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
                gap: "2px",
              }}
            >
              <img
                src={lowResImage}
                alt="cover"
                className={`mini-img ${isPlaying ? "playing" : "paused"}`}
                style={{
                  filter: hasError ? "grayscale(100%)" : "none",
                  flexShrink: 0,
                }}
              />
              <div
                className="mini-info"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    textAlign: "left",
                    width: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: "0.94rem",
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  {hasError ? "Unavailable" : currentSong.title}
                </span>
                <span
                  style={{
                    textAlign: "left",
                    width: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: "0.78rem",
                    color: "#d0c8c0",
                  }}
                >
                  {artistName}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <button
                className="icon-btn native-tap"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLikeSong(currentSong.id);
                }}
              >
                <Heart
                  size={21}
                  color={isLiked ? "#1DB954" : "#ffffff"}
                  fill={isLiked ? "#1DB954" : "none"}
                />
              </button>
              <button
                className="icon-btn native-tap"
                disabled={hasError}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? (
                  <Pause size={26} color="#ffffff" fill="#ffffff" />
                ) : (
                  <Play size={26} color="#ffffff" fill="#ffffff" />
                )}
              </button>
              <button
                className="icon-btn native-tap"
                onClick={handleSkipNext}
              >
                <SkipForward size={22} color="#ffffff" fill="#ffffff" />
              </button>
            </div>
          </div>
        </div>
      )}

      {renderQueueModal()}
    </>
  );
}
