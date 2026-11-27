import { useState, useEffect } from "react";
import {
  DownloadCloud,
  Play,
  ArrowLeft,
  Trash2,
  HardDriveDownload,
  Shuffle,
  SlidersHorizontal,
  PackageOpen,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./DownloadedSongs.css";
import {
  deleteSongBlob,
  getAllSongs,
  getStorageStats,
} from "../../utils/storage";
import { formatBytes } from "../../utils/formatters";
import {
  downloadSongToDevice,
  exportSongsAsZip,
} from "../../utils/downloadSongs";
import { useMusic } from "../../context/MusicContext";

const DownloadedSongs = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    count: 0,
    totalBytes: 0,
    quotaBytes: null,
  });
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [zipProgress, setZipProgress] = useState(null);

  const navigate = useNavigate();
  const {
    playList,
    currentSong,
    isPlaying,
    settings,
    setIsSettingsOpen,
    openSongActions,
    showToast,
  } = useMusic();

  useEffect(() => {
    let active = true;
    const loadDownloads = async () => {
      try {
        const [allData, storageStats] = await Promise.all([
          getAllSongs(),
          getStorageStats(),
        ]);
        if (!active) return;
        const sorted = [...allData].sort(
          (a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0),
        );
        setRecords(sorted);
        setStats(storageStats);
      } catch (err) {
        console.error("Failed to load from DB", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDownloads();
    window.addEventListener("downloadsUpdated", loadDownloads);
    return () => {
      active = false;
      window.removeEventListener("downloadsUpdated", loadDownloads);
    };
  }, []);

  const handleRemoveDownload = async (songId, e) => {
    e.stopPropagation();
    setRecords((prev) => prev.filter((item) => item.id !== songId));
    await deleteSongBlob(songId);
    window.dispatchEvent(new Event("downloadsUpdated"));
    showToast("Removed from offline vault");
  };

  const handleSaveToDevice = async (record, e) => {
    e.stopPropagation();
    const res = await downloadSongToDevice(record.song, {
      quality: record.quality || settings.downloadQuality,
    });
    showToast(
      res.ok ? `Saved ${res.filename || ".m4a file"}` : "Export failed",
      res.ok ? "default" : "error",
    );
  };

  const handleExportAllZip = async () => {
    if (records.length === 0 || zipProgress !== null) return;
    setZipProgress(0);
    try {
      const res = await exportSongsAsZip(
        records,
        "Groove-Offline-Vault",
        (pct) => setZipProgress(pct),
      );
      showToast(`Exported ${res.count} songs (${formatBytes(res.sizeBytes)})`);
    } catch {
      showToast("Failed to export zip archive", "error");
    } finally {
      setZipProgress(null);
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    const title = rec.song?.title?.toLowerCase() || "";
    const artist = rec.song?.artists?.[0]?.name?.toLowerCase() || "";
    return title.includes(q) || artist.includes(q);
  });

  const songsList = filteredRecords.map((r) => r.song).filter(Boolean);

  const handlePlayOffline = (startIndex = 0, shuffle = false) => {
    if (songsList.length === 0) return;
    playList(songsList, startIndex, { shuffle, preventFetch: true });
  };

  if (loading) {
    return (
      <div
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

  const quotaPct =
    stats.quotaBytes && stats.totalBytes
      ? Math.min(100, Math.max(2, (stats.totalBytes / stats.quotaBytes) * 100))
      : records.length > 0
        ? 12
        : 0;

  return (
    <div className="scrollable-page fade-in downloaded-page-padding">
      <div className="downloaded-hero-section">
        <div className="downloaded-hero-nav">
          <button
            className="back-btn native-tap"
            style={{ position: "static" }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={22} color="#fff" />
          </button>
          <button
            className="vault-pill-btn native-tap"
            onClick={() => setIsSettingsOpen(true)}
          >
            <SlidersHorizontal size={15} color="#ffe5b6" />
            <span>{settings.downloadQuality}</span>
          </button>
        </div>

        <div className="downloaded-content-wrapper">
          <div className="downloaded-icon-glass">
            <DownloadCloud size={46} color="#1db954" />
          </div>
          <div className="downloaded-hero-text">
            <h1>Downloads & Vault</h1>
            <p className="downloaded-meta">
              {records.length} offline tracks • {formatBytes(stats.totalBytes)}{" "}
              cached • Save individual .m4a files or export as ZIP
            </p>
          </div>
        </div>
      </div>

      {/* Storage Overview Card */}
      <div className="vault-storage-card">
        <div className="vault-storage-top">
          <div style={{ fontSize: "0.86rem", color: "#e6ddd5" }}>
            <strong>Offline Storage:</strong> {formatBytes(stats.totalBytes)}{" "}
            {stats.quotaBytes
              ? `of ${formatBytes(stats.quotaBytes)} available`
              : "used in browser vault"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#1db954", fontWeight: 600 }}>
            Mode:{" "}
            {settings.downloadMode === "both"
              ? "Device .m4a + Offline"
              : settings.downloadMode === "device"
                ? "Device .m4a Only"
                : "Offline Vault Only"}
          </div>
        </div>
        <div className="vault-storage-bar">
          <div
            className="vault-storage-fill"
            style={{ width: `${quotaPct}%` }}
          ></div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="downloaded-action-bar">
        <div className="downloaded-action-left">
          <button
            className="downloaded-play-btn native-tap"
            onClick={() => handlePlayOffline(0, false)}
            disabled={songsList.length === 0}
          >
            <Play
              size={26}
              fill="#000000"
              color="#000000"
              className="play-icon-center"
            />
          </button>

          <button
            className="vault-pill-btn native-tap"
            onClick={() => handlePlayOffline(0, true)}
            disabled={songsList.length === 0}
          >
            <Shuffle size={16} color="#1db954" />
            <span>Shuffle</span>
          </button>
        </div>

        {records.length > 0 && (
          <button
            className="vault-pill-btn primary native-tap"
            onClick={handleExportAllZip}
            disabled={zipProgress !== null}
          >
            <PackageOpen size={16} />
            <span>
              {zipProgress !== null
                ? `Packaging ZIP (${zipProgress}%)`
                : "Export All (.zip)"}
            </span>
          </button>
        )}
      </div>

      {records.length > 0 && (
        <div className="vault-filter-wrap">
          <input
            type="text"
            className="vault-filter-input"
            placeholder="Filter offline tracks or artists..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      )}

      <div className="downloaded-tracklist-container">
        {records.length === 0 ? (
          <div className="empty-downloaded-state">
            <DownloadCloud
              size={44}
              color="rgba(255,255,255,0.22)"
              strokeWidth={1.2}
            />
            <h3>Your Offline Vault is Empty</h3>
            <p>
              Tap the Download icon on any song or playlist to save real .m4a
              audio files to your device and cache them here for offline
              listening.
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-downloaded-state">
            <h3>No matches for "{filterText}"</h3>
          </div>
        ) : (
          <div className="songs-list">
            {filteredRecords.map((record, index) => {
              const song = record.song;
              if (!song) return null;
              const isCurrent = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className="premium-song-row native-tap"
                  onClick={() => handlePlayOffline(index, false)}
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
                    className="row-song-img"
                    alt="cover"
                  />
                  <div className="row-song-info">
                    <h4
                      className="row-song-title"
                      style={{ color: isCurrent ? "#1db954" : "#fff" }}
                    >
                      {song.title}
                    </h4>
                    <p className="row-song-artist">
                      {song.artists?.[0]?.name || "Unknown Artist"}
                      {record.sizeBytes
                        ? ` • ${formatBytes(record.sizeBytes)}`
                        : ""}
                    </p>
                  </div>
                  <div className="song-trailing-actions">
                    <span className="vault-quality-tag">
                      {(record.quality || "320kbps").replace("kbps", "k")}
                    </span>
                    {song.duration && (
                      <span className="song-duration">{song.duration}</span>
                    )}
                    <button
                      className="more-btn native-tap"
                      onClick={(e) => handleSaveToDevice(record, e)}
                      title="Save .m4a audio file to device"
                    >
                      <HardDriveDownload size={19} color="#1db954" />
                    </button>
                    <button
                      className="more-btn native-tap"
                      onClick={(e) => handleRemoveDownload(song.id, e)}
                      title="Remove from offline vault"
                    >
                      <Trash2 size={18} color="#a89f98" />
                    </button>
                    <button
                      className="more-btn native-tap"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSongActions(song);
                      }}
                    >
                      <MoreVertical size={18} color="#a89f98" />
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

export default DownloadedSongs;
