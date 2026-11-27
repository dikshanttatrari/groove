import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  HardDriveDownload,
  Heart,
  ListEnd,
  ListMusic,
  ListPlus,
  Plus,
  Share2,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useMusic } from "../context/MusicContext";
import { apiFetch } from "../utils/api";
import { formatBytes } from "../utils/formatters";
import {
  deleteSongBlob,
  getStorageStats,
  isSongDownloaded,
  clearAllDownloadedSongs,
} from "../utils/storage";
import {
  downloadSongToDevice,
  saveOfflineSong,
} from "../utils/downloadSongs";

const QUALITY_OPTIONS = ["320kbps", "160kbps", "96kbps"];
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const DOWNLOAD_MODES = [
  {
    id: "both",
    title: "Save to Device (.m4a) + Offline",
    desc: "Downloads audio file to your device and caches offline playback",
  },
  {
    id: "device",
    title: "Download to Device Only (.m4a)",
    desc: "Saves directly to your device Downloads folder",
  },
  {
    id: "offline",
    title: "In-App Offline Vault Only",
    desc: "Caches inside browser storage for offline listening",
  },
];

export default function GlobalOverlays() {
  const navigate = useNavigate();
  const {
    toast,
    showToast,
    actionSheetPayload,
    closeSongActions,
    playlistPickerSong,
    openPlaylistPicker,
    closePlaylistPicker,
    isSettingsOpen,
    setIsSettingsOpen,
    likedTrackIds,
    toggleLikeSong,
    playNext,
    addToQueue,
    settings,
    updateSettings,
    playbackRate,
    setPlaybackRate,
  } = useMusic();

  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [downloadPct, setDownloadPct] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [storageStats, setStorageStats] = useState({
    count: 0,
    totalBytes: 0,
    quotaBytes: null,
  });

  const actionSong = actionSheetPayload?.song || null;

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!actionSong?.id) {
        setIsOfflineSaved(false);
        return;
      }
      const exists = await isSongDownloaded(actionSong.id);
      if (active) setIsOfflineSaved(exists);
    };
    check();
    return () => {
      active = false;
    };
  }, [actionSong?.id]);

  useEffect(() => {
    if (!playlistPickerSong) return;
    const loadPlaylists = async () => {
      try {
        const res = await apiFetch("/api/library");
        if (res.ok) {
          const data = await res.json();
          setUserPlaylists((data.playlists || []).slice().reverse());
        }
      } catch {
        showToast("Could not load playlists", "error");
      }
    };
    loadPlaylists();
  }, [playlistPickerSong, showToast]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    getStorageStats().then(setStorageStats).catch(() => {});
  }, [isSettingsOpen]);

  const handleDeviceDownload = async () => {
    if (!actionSong || downloadPct !== null) return;
    setDownloadPct(0);
    const res = await downloadSongToDevice(actionSong, {
      quality: settings.downloadQuality,
      alsoSaveOffline: settings.downloadMode === "both",
      onProgress: (pct) => setDownloadPct(pct),
    });
    setDownloadPct(null);
    if (res.ok) {
      if (settings.downloadMode === "both") setIsOfflineSaved(true);
      showToast(
        res.fromCache
          ? "Saved .m4a file from offline vault"
          : `Downloaded .m4a (${settings.downloadQuality})`,
      );
      closeSongActions();
    } else {
      showToast("Download failed. Try again.", "error");
    }
  };

  const handleToggleOfflineVault = async () => {
    if (!actionSong || downloadPct !== null) return;
    if (isOfflineSaved) {
      await deleteSongBlob(actionSong.id);
      window.dispatchEvent(new CustomEvent("downloadsUpdated"));
      setIsOfflineSaved(false);
      showToast("Removed from offline vault");
      closeSongActions();
      return;
    }

    setDownloadPct(0);
    const res = await saveOfflineSong(actionSong, {
      quality: settings.downloadQuality,
      onProgress: (pct) => setDownloadPct(pct),
    });
    setDownloadPct(null);
    if (res.ok) {
      setIsOfflineSaved(true);
      showToast("Saved to offline vault");
      closeSongActions();
    } else {
      showToast("Offline save failed", "error");
    }
  };

  const handleShareSong = async () => {
    if (!actionSong) return;
    const url = `https://music.groove.mooo.com/#/song/${actionSong.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: actionSong.title,
          text: `${actionSong.title} — ${actionSong.artists?.[0]?.name || "Groove Music"}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Song link copied to clipboard");
      }
    } catch {
      // User dismissed share sheet
    }
    closeSongActions();
  };

  const handleAddToPlaylist = async (playlistId, playlistName) => {
    if (!playlistPickerSong) return;
    try {
      const res = await apiFetch("/api/library/playlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, songId: playlistPickerSong.id }),
      });
      if (res.ok) {
        closePlaylistPicker();
        showToast(`Added to "${playlistName}"`);
      } else {
        showToast("Already in playlist");
      }
    } catch {
      showToast("Could not add to playlist", "error");
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || !playlistPickerSong || creatingPlaylist)
      return;
    setCreatingPlaylist(true);
    try {
      const createRes = await apiFetch("/api/library/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });
      if (!createRes.ok) throw new Error("Failed");
      const created = await createRes.json();
      setNewPlaylistName("");
      window.dispatchEvent(new Event("libraryUpdated"));
      await handleAddToPlaylist(created._id, created.name);
    } catch {
      showToast("Failed to create playlist", "error");
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleClearVault = async () => {
    await clearAllDownloadedSongs();
    const updated = await getStorageStats();
    setStorageStats(updated);
    showToast("Offline vault cleared");
  };

  const isLiked = actionSong ? likedTrackIds.includes(actionSong.id) : false;
  const primaryArtist = actionSong?.artists?.[0];

  return (
    <>
      {toast && (
        <div
          key={toast.id}
          className={`global-toast ${toast.type === "error" ? "error" : ""}`}
        >
          <CheckCircle2
            size={16}
            color={toast.type === "error" ? "#f87171" : "#1db954"}
          />
          <span>{toast.message}</span>
        </div>
      )}

      {actionSong && (
        <div className="sheet-backdrop fade-in" onClick={closeSongActions}>
          <div
            className="sheet-panel slide-up-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-song-header">
              <img
                src={
                  actionSong.albumArt?.[1]?.url ||
                  actionSong.albumArt?.[0]?.url ||
                  "https://c.saavncdn.com/default_album.jpg"
                }
                alt={actionSong.title}
                className="sheet-song-art"
              />
              <div className="sheet-song-meta">
                <h4>{actionSong.title}</h4>
                <p>
                  {primaryArtist?.name ||
                    actionSong.subtitle ||
                    "Unknown Artist"}
                  {actionSong.duration ? ` • ${actionSong.duration}` : ""}
                </p>
              </div>
              <button
                className="icon-btn native-tap"
                onClick={closeSongActions}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                }}
              >
                <X size={18} color="#fff" />
              </button>
            </div>

            <div className="sheet-action-list">
              <button
                className="sheet-action-btn"
                onClick={handleDeviceDownload}
              >
                <span className="sheet-action-btn-left">
                  <HardDriveDownload size={20} color="#1db954" />
                  <span>
                    Download Audio File (.m4a • {settings.downloadQuality})
                  </span>
                </span>
                {downloadPct !== null && (
                  <span className="sheet-progress-pill">{downloadPct}%</span>
                )}
              </button>

              <button
                className="sheet-action-btn"
                onClick={handleToggleOfflineVault}
              >
                <span className="sheet-action-btn-left">
                  <Download
                    size={20}
                    color={isOfflineSaved ? "#1db954" : "#ffe5b6"}
                  />
                  <span>
                    {isOfflineSaved
                      ? "Remove from Offline Vault"
                      : "Save to In-App Offline Vault"}
                  </span>
                </span>
                {isOfflineSaved && (
                  <span className="sheet-progress-pill">Saved</span>
                )}
              </button>

              <button
                className="sheet-action-btn"
                onClick={() => {
                  playNext(actionSong);
                  closeSongActions();
                }}
              >
                <span className="sheet-action-btn-left">
                  <ListMusic size={20} color="#a89f98" />
                  <span>Play Next</span>
                </span>
              </button>

              <button
                className="sheet-action-btn"
                onClick={() => {
                  addToQueue(actionSong);
                  closeSongActions();
                }}
              >
                <span className="sheet-action-btn-left">
                  <ListEnd size={20} color="#a89f98" />
                  <span>Add to Queue</span>
                </span>
              </button>

              <button
                className="sheet-action-btn"
                onClick={() => {
                  toggleLikeSong(actionSong.id);
                  closeSongActions();
                }}
              >
                <span className="sheet-action-btn-left">
                  <Heart
                    size={20}
                    color={isLiked ? "#1db954" : "#a89f98"}
                    fill={isLiked ? "#1db954" : "none"}
                  />
                  <span>
                    {isLiked
                      ? "Remove from Liked Songs"
                      : "Save to Liked Songs"}
                  </span>
                </span>
              </button>

              <button
                className="sheet-action-btn"
                onClick={() => openPlaylistPicker(actionSong)}
              >
                <span className="sheet-action-btn-left">
                  <ListPlus size={20} color="#a89f98" />
                  <span>Add to Playlist</span>
                </span>
              </button>

              {primaryArtist?.id && (
                <button
                  className="sheet-action-btn"
                  onClick={() => {
                    closeSongActions();
                    navigate(`/artist/${primaryArtist.id}`);
                  }}
                >
                  <span className="sheet-action-btn-left">
                    <UserCheck size={20} color="#a89f98" />
                    <span>Go to Artist ({primaryArtist.name})</span>
                  </span>
                </button>
              )}

              <button className="sheet-action-btn" onClick={handleShareSong}>
                <span className="sheet-action-btn-left">
                  <Share2 size={20} color="#a89f98" />
                  <span>Share Track</span>
                </span>
              </button>

              {actionSheetPayload?.onRemoveFromPlaylist && (
                <button
                  className="sheet-action-btn danger"
                  onClick={() => {
                    actionSheetPayload.onRemoveFromPlaylist(actionSong.id);
                    closeSongActions();
                  }}
                >
                  <span className="sheet-action-btn-left">
                    <Trash2 size={20} color="#f87171" />
                    <span>Remove from This Playlist</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {playlistPickerSong && (
        <div className="sheet-backdrop fade-in" onClick={closePlaylistPicker}>
          <div
            className="sheet-panel slide-up-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-editorial, serif)",
                  fontSize: "1.6rem",
                  color: "#ffe5b6",
                }}
              >
                Add to Playlist
              </h2>
              <button
                className="icon-btn native-tap"
                onClick={closePlaylistPicker}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                }}
              >
                <X size={18} color="#fff" />
              </button>
            </div>

            <form
              onSubmit={handleCreateAndAdd}
              style={{ display: "flex", gap: 8, marginBottom: 16 }}
            >
              <input
                type="text"
                className="input-glass"
                placeholder="New playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", fontSize: "0.95rem" }}
              />
              <button
                type="submit"
                disabled={creatingPlaylist || !newPlaylistName.trim()}
                style={{
                  background: "#1db954",
                  color: "#000",
                  border: "none",
                  borderRadius: 10,
                  padding: "0 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={16} />
                Create
              </button>
            </form>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {userPlaylists.length === 0 ? (
                <p
                  style={{
                    color: "#a89f98",
                    textAlign: "center",
                    padding: "20px 0",
                    fontSize: "0.9rem",
                  }}
                >
                  No playlists yet. Create one above!
                </p>
              ) : (
                userPlaylists.map((pl) => (
                  <button
                    key={pl._id}
                    className="sheet-action-btn"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      padding: "13px 14px",
                    }}
                    onClick={() => handleAddToPlaylist(pl._id, pl.name)}
                  >
                    <span>{pl.name}</span>
                    <span style={{ color: "#a89f98", fontSize: "0.8rem" }}>
                      {pl.tracks?.length || 0} tracks
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div
          className="sheet-backdrop fade-in"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="sheet-panel slide-up-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-editorial, serif)",
                    fontSize: "1.7rem",
                    color: "#ffe5b6",
                  }}
                >
                  Audio & Downloads
                </h2>
                <p style={{ fontSize: "0.82rem", color: "#a89f98" }}>
                  Configure streaming bitrate, device downloads & offline vault
                </p>
              </div>
              <button
                className="icon-btn native-tap"
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                }}
              >
                <X size={18} color="#fff" />
              </button>
            </div>

            <div className="settings-group">
              <span className="settings-label">Streaming Audio Quality</span>
              <div className="settings-pills">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q}
                    className={`settings-pill ${settings.streamQuality === q ? "active" : ""}`}
                    onClick={() => {
                      updateSettings({ streamQuality: q });
                      showToast(`Streaming set to ${q}`);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <span className="settings-label">Download Audio Quality</span>
              <div className="settings-pills">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q}
                    className={`settings-pill ${settings.downloadQuality === q ? "active" : ""}`}
                    onClick={() => {
                      updateSettings({ downloadQuality: q });
                      showToast(`Download quality set to ${q}`);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <span className="settings-label">
                When Tapping Download Button
              </span>
              <div className="settings-mode-list">
                {DOWNLOAD_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    className={`settings-mode-card ${settings.downloadMode === mode.id ? "active" : ""}`}
                    onClick={() => {
                      updateSettings({ downloadMode: mode.id });
                      showToast(`Mode: ${mode.title}`);
                    }}
                  >
                    <div>
                      <strong>{mode.title}</strong>
                      <span>{mode.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <span className="settings-label">Playback Speed</span>
              <div className="settings-pills-5">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    className={`settings-pill ${playbackRate === rate ? "active" : ""}`}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  Offline Vault: {storageStats.count} tracks
                </div>
                <div style={{ fontSize: "0.78rem", color: "#a89f98" }}>
                  {formatBytes(storageStats.totalBytes)} cached in browser
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    navigate("/library/downloads");
                  }}
                  style={{
                    background: "#ffe5b6",
                    color: "#110f0d",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Open Vault
                </button>
                {storageStats.count > 0 && (
                  <button
                    onClick={handleClearVault}
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#f87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
