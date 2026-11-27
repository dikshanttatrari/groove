import { useState, useEffect } from "react";
import {
  Heart,
  Play,
  MoreVertical,
  ArrowLeft,
  Download,
  HardDriveDownload,
  Shuffle,
  PackageOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../../context/MusicContext";
import { apiFetch } from "../../utils/api";
import { formatBytes, formatSongData } from "../../utils/formatters";
import "./LikedSongs.css";
import {
  downloadSongToDevice,
  exportSongsAsZip,
  silentDownload,
} from "../../utils/downloadSongs";
import { isSongDownloaded } from "../../utils/storage";

const LikedSongs = () => {
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [downloadedIds, setDownloadedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isPlaylistDownloading, setIsPlaylistDownloading] = useState(false);
  const [zipProgress, setZipProgress] = useState(null);

  const navigate = useNavigate();
  const {
    playList,
    toggleLikeSong,
    openSongActions,
    showToast,
    settings,
    currentSong,
    isPlaying,
  } = useMusic();

  const user = JSON.parse(localStorage.getItem("groove_user") || "null") || {
    name: "Guest",
  };

  useEffect(() => {
    const fetchLikedSongs = async () => {
      try {
        const res = await apiFetch("/api/library/liked");
        if (res.ok) {
          const data = await res.json();
          const cleanTracks = (data.songs || [])
            .map((track) => formatSongData(track))
            .filter(Boolean);

          const finalSongs = cleanTracks.reverse();
          setLikedSongs(finalSongs);
          localStorage.setItem(
            "offline_liked_songs",
            JSON.stringify(finalSongs),
          );
        } else {
          throw new Error("Network failed");
        }
      } catch {
        const cachedSongs = JSON.parse(
          localStorage.getItem("offline_liked_songs") || "[]",
        );
        setLikedSongs(cachedSongs);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedSongs();
  }, []);

  useEffect(() => {
    const checkDownloads = async () => {
      if (!likedSongs.length) return;
      const results = await Promise.all(
        likedSongs.map(async (s) => ({
          id: s.id,
          exists: await isSongDownloaded(s.id),
        })),
      );
      setDownloadedIds(results.filter((r) => r.exists).map((r) => r.id));
    };

    checkDownloads();
    window.addEventListener("downloadsUpdated", checkDownloads);
    return () => window.removeEventListener("downloadsUpdated", checkDownloads);
  }, [likedSongs]);

  const isPlaylistDownloaded =
    likedSongs.length > 0 && downloadedIds.length === likedSongs.length;

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

  const handleDownloadPlaylist = async () => {
    if (isPlaylistDownloaded || isPlaylistDownloading) return;

    setIsPlaylistDownloading(true);
    const songsToDownload = likedSongs.filter(
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
    showToast("Liked Songs saved for offline playback");
  };

  const handleExportZip = async () => {
    if (likedSongs.length === 0 || zipProgress !== null) return;
    setZipProgress(0);
    try {
      const res = await exportSongsAsZip(
        likedSongs,
        "Groove-Liked-Songs",
        (pct) => setZipProgress(pct),
      );
      showToast(
        `Downloaded ${res.count} songs ZIP (${formatBytes(res.sizeBytes)})`,
      );
    } catch {
      showToast("ZIP export failed", "error");
    } finally {
      setZipProgress(null);
    }
  };

  const handleUnlike = async (songId, e) => {
    e.stopPropagation();
    setLikedSongs((prev) => prev.filter((song) => song.id !== songId));
    await toggleLikeSong(songId);
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

  const handlePlayLikedSongs = (startIndex = 0, shuffle = false) => {
    if (likedSongs.length === 0) return;
    playList(likedSongs, startIndex, { shuffle, preventFetch: true });
  };

  return (
    <div className="scrollable-page fade-in liked-page-padding">
      <div className="liked-hero-section">
        <div className="liked-hero-nav">
          <button
            className="back-btn native-tap"
            style={{ position: "static" }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={22} color="#fff" />
          </button>
        </div>

        <div className="liked-hero-content">
          <div className="liked-hero-glass-icon">
            <Heart size={48} color="#fff" fill="#fff" />
          </div>
          <div className="liked-hero-text">
            <h1>Liked Songs</h1>
            <p className="liked-meta">
              <strong>{user.name}</strong> • {likedSongs.length} songs
            </p>
          </div>
        </div>
      </div>

      <div
        className="liked-action-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="liked-play-btn native-tap"
            onClick={() => handlePlayLikedSongs(0, false)}
          >
            <Play
              size={28}
              fill="#000000"
              color="#000000"
              className="play-icon-center"
            />
          </button>
          <button
            className="icon-btn native-tap"
            onClick={() => handlePlayLikedSongs(0, true)}
            title="Shuffle Liked Songs"
          >
            <Shuffle size={24} color="#a89f98" />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingRight: "6px",
          }}
        >
          {likedSongs.length > 0 && (
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
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Download all tracks to device as ZIP"
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
          ) : isPlaylistDownloaded && likedSongs.length > 0 ? (
            <div
              title="All tracks saved offline"
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
              title="Save all offline"
            >
              <Download size={26} color="#a89f98" />
            </button>
          )}
        </div>
      </div>

      <div className="liked-tracklist-container">
        {likedSongs.length === 0 ? (
          <div className="empty-liked-state">
            <Heart size={40} color="rgba(255,255,255,0.2)" strokeWidth={1} />
            <h3>No liked songs yet</h3>
            <p>Find some tracks you love and tap the heart.</p>
          </div>
        ) : (
          <div className="songs-list">
            {likedSongs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div
                  key={song.id || index}
                  className="premium-song-row native-tap"
                  onClick={() => handlePlayLikedSongs(index, false)}
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
                      style={{ color: isCurrent ? "#1DB954" : "white" }}
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
                          margin: "0 4px",
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
                        style={{ margin: "0 2px" }}
                        onClick={(e) => handleDownloadClick(song, e)}
                      >
                        <Download size={19} color="#a0a0a0" />
                      </button>
                    )}

                    <Heart
                      size={19}
                      color="#1DB954"
                      fill="#1DB954"
                      className="native-tap"
                      onClick={(e) => handleUnlike(song.id, e)}
                    />
                    <button
                      className="icon-btn action-menu-btn native-tap"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSongActions(song);
                      }}
                    >
                      <MoreVertical size={19} color="#888" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedSongs;
