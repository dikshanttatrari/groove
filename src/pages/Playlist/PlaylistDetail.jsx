import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  ArrowLeft,
  MoreVertical,
  Shuffle,
  Heart,
  Trash2,
  MinusCircle,
  Pencil,
  Download,
  HardDriveDownload,
  PackageOpen,
} from "lucide-react";
import { useMusic } from "../../context/MusicContext";
import { apiFetch } from "../../utils/api";
import {
  cleanHtmlText,
  formatBytes,
  formatSongData,
} from "../../utils/formatters";
import "./PlaylistDetail.css";
import { isSongDownloaded } from "../../utils/storage";
import {
  downloadSongToDevice,
  exportSongsAsZip,
  silentDownload,
} from "../../utils/downloadSongs";

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playList,
    openSongActions,
    showToast,
    settings,
    currentSong,
    isPlaying,
  } = useMusic();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState("");

  const [downloadedIds, setDownloadedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isPlaylistDownloading, setIsPlaylistDownloading] = useState(false);
  const [zipProgress, setZipProgress] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const token = localStorage.getItem("groove_token");
        if (!token) return;
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const userData = await res.json();
          const alreadySaved = userData.savedPlaylists?.some(
            (pl) => pl.playlistId === id,
          );
          setIsSaved(!!alreadySaved);
        }
      } catch (error) {
        console.error("Could not verify saved status", error);
      }
    };
    checkSavedStatus();
  }, [id]);

  const toggleSavePlaylist = async () => {
    if (!playlist) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await apiFetch("/api/library/save-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: id,
          title: playlist.title,
          image: playlist.image,
          subtitle: playlist.subtitle,
        }),
      });
      window.dispatchEvent(new Event("libraryUpdated"));
      showToast(
        nextSaved ? "Saved playlist to Library" : "Removed from Library",
      );
    } catch {
      setIsSaved(!nextSaved);
      showToast("Failed to update playlist", "error");
    }
  };

  const isPlaylistDownloaded =
    playlist?.songs?.length > 0 &&
    downloadedIds.length === playlist.songs.length;

  const handleDownloadPlaylist = async () => {
    if (isPlaylistDownloaded || isPlaylistDownloading || !playlist) return;

    setIsPlaylistDownloading(true);
    const songsToDownload = playlist.songs.filter(
      (s) => !downloadedIds.includes(s.id),
    );

    for (const song of songsToDownload) {
      const success = await silentDownload(song, { mode: "offline" });
      if (success) {
        setDownloadedIds((prev) => [...prev, song.id]);
      }
    }

    setIsPlaylistDownloading(false);
    window.dispatchEvent(new Event("downloadsUpdated"));
    showToast(`Saved "${playlist.title}" offline`);
  };

  const handleExportZip = async () => {
    if (!playlist?.songs?.length || zipProgress !== null) return;
    setZipProgress(0);
    try {
      const res = await exportSongsAsZip(
        playlist.songs,
        playlist.title || "Groove-Playlist",
        (pct) => setZipProgress(pct),
      );
      showToast(
        `Exported ${res.count} tracks (${formatBytes(res.sizeBytes)})`,
      );
    } catch {
      showToast("ZIP export failed", "error");
    } finally {
      setZipProgress(null);
    }
  };

  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/playlist/${id}`);
        if (!res.ok) throw new Error("Failed to fetch playlist");

        const data = await res.json();
        let rawSongs = data.songs || [];
        if (data.isCustom) rawSongs = rawSongs.reverse();

        const cleanTracks = rawSongs
          .map((track) => formatSongData(track))
          .filter(Boolean);

        const playlistData = {
          title: cleanHtmlText(data.title),
          subtitle: cleanHtmlText(data.subtitle || "").replace(
            /JioSaavn/gi,
            "Groove",
          ),
          image: data.image,
          songs: cleanTracks,
          isCustom: data.isCustom,
        };

        setPlaylist(playlistData);
        setEditName(playlistData.title);
        setEditImage(data.image);

        localStorage.setItem(
          `offline_playlist_${id}`,
          JSON.stringify(playlistData),
        );
      } catch {
        const cachedPlaylist = JSON.parse(
          localStorage.getItem(`offline_playlist_${id}`) || "null",
        );
        if (cachedPlaylist) {
          setPlaylist(cachedPlaylist);
          setEditName(cachedPlaylist.title);
          setEditImage(cachedPlaylist.image);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [id]);

  useEffect(() => {
    const checkDownloads = async () => {
      if (!playlist?.songs) return;
      const results = await Promise.all(
        playlist.songs.map(async (s) => ({
          id: s.id,
          exists: await isSongDownloaded(s.id),
        })),
      );
      setDownloadedIds(results.filter((r) => r.exists).map((r) => r.id));
    };

    checkDownloads();
    window.addEventListener("downloadsUpdated", checkDownloads);
    return () => window.removeEventListener("downloadsUpdated", checkDownloads);
  }, [playlist?.songs]);

  const handleDownloadClick = async (song, e) => {
    e.stopPropagation();
    if (downloadingId === song.id) return;

    setDownloadingId(song.id);
    if (downloadedIds.includes(song.id)) {
      const res = await downloadSongToDevice(song, {
        quality: settings.downloadQuality,
      });
      setDownloadingId(null);
      showToast(
        res.ok ? "Saved .m4a file to device" : "Device export failed",
        res.ok ? "default" : "error",
      );
      return;
    }

    const success = await silentDownload(song);
    setDownloadingId(null);

    if (success) {
      if (settings.downloadMode !== "device") {
        setDownloadedIds((prev) => [...prev, song.id]);
      }
      showToast(
        settings.downloadMode === "offline"
          ? "Saved to offline vault"
          : `Downloaded .m4a (${settings.downloadQuality})`,
      );
    } else {
      showToast("Download failed", "error");
    }
  };

  const removeSongById = async (songId) => {
    setPlaylist((prev) => ({
      ...prev,
      songs: prev.songs.filter((s) => s.id !== songId),
      subtitle: prev.subtitle.replace(
        /\d+ tracks/,
        `${prev.songs.length - 1} tracks`,
      ),
    }));

    try {
      await apiFetch(`/api/library/playlist/${id}/song/${songId}`, {
        method: "DELETE",
      });
      window.dispatchEvent(new Event("libraryUpdated"));
      showToast("Removed track from playlist");
    } catch {
      showToast("Failed to remove song", "error");
    }
  };

  const handleDeletePlaylist = async () => {
    if (!window.confirm("Delete this playlist? This cannot be undone.")) return;

    try {
      const res = await apiFetch(`/api/library/playlist/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.dispatchEvent(new Event("libraryUpdated"));
        showToast("Playlist deleted");
        navigate("/library");
      }
    } catch {
      showToast("Failed to delete playlist", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    setPlaylist((prev) => ({
      ...prev,
      title: editName.trim(),
      image: editImage || "https://c.saavncdn.com/default_album.jpg",
    }));
    setShowEditModal(false);

    try {
      await apiFetch(`/api/library/playlist/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), imageUrl: editImage }),
      });
      window.dispatchEvent(new Event("libraryUpdated"));
      showToast("Playlist updated");
    } catch {
      showToast("Failed to save changes", "error");
    }
  };

  if (loading) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div className="majestic-loader"></div>
      </div>
    );
  }

  if (!playlist)
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: "50px" }}>
        Playlist not found
      </div>
    );

  const handlePlayPlaylist = (startIndex = 0, shuffle = false) => {
    if (!playlist || playlist.songs.length === 0) return;
    playList(playlist.songs, startIndex, { shuffle, preventFetch: true });
  };

  return (
    <div className="scrollable-page fade-in playlist-page-padding">
      {showEditModal && (
        <div
          className="modal-overlay fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <div className="aesthetic-modal" onClick={(e) => e.stopPropagation()}>
            <h2
              style={{
                fontSize: "1.6rem",
                margin: "0 0 10px 0",
                fontFamily: "var(--font-editorial, serif)",
              }}
            >
              Edit Playlist
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label
                  style={{
                    color: "#a89f98",
                    fontSize: "0.8rem",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  Playlist Name
                </label>
                <input
                  type="text"
                  className="aesthetic-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ textAlign: "left", width: "100%" }}
                />
              </div>
              <div>
                <label
                  style={{
                    color: "#a89f98",
                    fontSize: "0.8rem",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  Cover Image URL
                </label>
                <input
                  type="text"
                  className="aesthetic-input"
                  placeholder="https://example.com/image.jpg"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  style={{ textAlign: "left", width: "100%" }}
                />
              </div>
            </div>
            <div
              className="modal-actions"
              style={{ marginTop: "20px", display: "flex", gap: 10 }}
            >
              <button
                className="btn-ghost native-tap"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-glow native-tap"
                style={{ background: "#1DB954", color: "#000" }}
                onClick={handleSaveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="playlist-hero">
        <div
          className="playlist-hero-bg"
          style={{ backgroundImage: `url(${playlist.image})` }}
        ></div>
        <div className="playlist-hero-overlay"></div>

        <div className="playlist-hero-nav">
          <button className="back-btn native-tap" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} color="#ffffff" />
          </button>

          {playlist.isCustom && (
            <button
              className="edit-btn native-tap"
              onClick={() => setShowEditModal(true)}
            >
              <Pencil size={18} color="#ffffff" />
            </button>
          )}
        </div>

        <div className="playlist-hero-content">
          <div className="playlist-art-shadow">
            <img
              src={playlist.image}
              alt={playlist.title}
              className="playlist-cover-img"
            />
          </div>
          <div className="playlist-text">
            <h1 className="playlist-title">{playlist.title}</h1>
            <p className="playlist-meta">{playlist.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="playlist-action-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="playlist-play-btn native-tap"
            onClick={() => handlePlayPlaylist(0, false)}
          >
            <Play
              size={28}
              color="#000000"
              fill="#000000"
              className="play-icon-center"
            />
          </button>
          <button
            className="icon-btn native-tap"
            onClick={() => handlePlayPlaylist(0, true)}
            title="Shuffle Playlist"
          >
            <Shuffle size={24} color="#a89f98" />
          </button>
        </div>

        <div className="action-icons-right" style={{ gap: 14 }}>
          {playlist.songs.length > 0 && (
            <button
              onClick={handleExportZip}
              disabled={zipProgress !== null}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,229,182,0.3)",
                background: "rgba(255,229,182,0.1)",
                color: "#ffe5b6",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Download playlist as ZIP (.m4a files)"
            >
              <PackageOpen size={15} />
              <span>
                {zipProgress !== null ? `${zipProgress}%` : "Save ZIP"}
              </span>
            </button>
          )}

          {isPlaylistDownloading ? (
            <div className="download-ring-container">
              <Download
                size={14}
                color="#1DB954"
                className="inner-download-icon"
              />
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
          ) : isPlaylistDownloaded ? (
            <div
              title="Saved offline"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                backgroundColor: "#1DB954",
                borderRadius: "50%",
              }}
            >
              <Download size={16} color="#000000" strokeWidth={3} />
            </div>
          ) : (
            <button
              className="icon-btn native-tap"
              onClick={handleDownloadPlaylist}
              title="Save playlist offline"
            >
              <Download size={25} color="#a89f98" />
            </button>
          )}

          {!playlist.isCustom && (
            <button
              className="icon-btn native-tap"
              onClick={toggleSavePlaylist}
              title={isSaved ? "Remove from Library" : "Save Playlist"}
            >
              <Heart
                size={25}
                color={isSaved ? "#1DB954" : "#a89f98"}
                fill={isSaved ? "#1DB954" : "none"}
              />
            </button>
          )}

          {playlist.isCustom && (
            <button
              className="icon-btn native-tap"
              onClick={handleDeletePlaylist}
              title="Delete Playlist"
            >
              <Trash2 size={22} color="lightcoral" />
            </button>
          )}
        </div>
      </div>

      <main className="playlist-tracklist-container">
        {playlist.songs.length === 0 ? (
          <div className="empty-playlist-state">
            <p>No tracks in this playlist yet.</p>
          </div>
        ) : (
          <div className="songs-list">
            {playlist.songs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div
                  key={song.id || index}
                  className="premium-song-row native-tap"
                  onClick={() => handlePlayPlaylist(index, false)}
                >
                  <span className="song-rank">
                    {isCurrent && isPlaying ? (
                      <div className="eq-bars" style={{ margin: "0 auto" }}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      index + 1
                    )}
                  </span>

                  <img
                    src={
                      song.albumArt?.[1]?.url ||
                      song.albumArt?.[0]?.url ||
                      "https://c.saavncdn.com/default_album.jpg"
                    }
                    alt="cover"
                    className="row-song-img"
                    loading="lazy"
                  />

                  <div className="row-song-info">
                    <h4
                      className="row-song-title"
                      style={{ color: isCurrent ? "#1DB954" : "#fff" }}
                    >
                      {song.title}
                    </h4>
                    <div className="row-song-artist">
                      {song.artists?.[0]?.name ||
                        song.subtitle ||
                        "Unknown Artist"}
                    </div>
                  </div>

                  <div className="song-trailing-actions">
                    {song.duration && (
                      <span className="song-duration">{song.duration}</span>
                    )}

                    {downloadingId === song.id ? (
                      <div
                        className="download-ring-container"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download
                          size={12}
                          color="#1DB954"
                          className="inner-download-icon"
                        />
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
                    ) : downloadedIds.includes(song.id) ? (
                      <button
                        className="more-btn native-tap"
                        onClick={(e) => handleDownloadClick(song, e)}
                        title="Saved offline — tap to save .m4a file"
                        style={{
                          width: "24px",
                          height: "24px",
                          backgroundColor: "#1DB954",
                          borderRadius: "50%",
                        }}
                      >
                        <HardDriveDownload
                          size={13}
                          color="#000000"
                          strokeWidth={2.6}
                        />
                      </button>
                    ) : (
                      <button
                        className="more-btn native-tap"
                        onClick={(e) => handleDownloadClick(song, e)}
                      >
                        <Download size={19} color="#a0a0a0" />
                      </button>
                    )}

                    {playlist.isCustom && (
                      <button
                        className="more-btn native-tap"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSongById(song.id);
                        }}
                        title="Remove from playlist"
                      >
                        <MinusCircle size={19} color="#a0a0a0" />
                      </button>
                    )}

                    <button
                      className="more-btn native-tap"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSongActions(
                          song,
                          playlist.isCustom
                            ? { onRemoveFromPlaylist: removeSongById }
                            : {},
                        );
                      }}
                    >
                      <MoreVertical size={19} color="#a0a0a0" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
