import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  ArrowLeft,
  MoreVertical,
  Heart,
  Shuffle,
  Check,
  Download,
  HardDriveDownload,
} from "lucide-react";
import "./ArtistDetail.css";
import { useMusic } from "../../context/MusicContext";
import { apiUrl } from "../../utils/api";
import { cleanHtmlText, formatSongData } from "../../utils/formatters";
import { isArtistFollowed, toggleFollowedArtist } from "../../utils/preferences";
import { isSongDownloaded } from "../../utils/storage";
import { downloadSongToDevice, silentDownload } from "../../utils/downloadSongs";

const getHighResImage = (url) => {
  if (!url) return "https://c.saavncdn.com/default_album.jpg";
  return url.replace("50x50", "500x500").replace("150x150", "500x500");
};

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playList,
    currentSong,
    isPlaying,
    likedTrackIds,
    toggleLikeSong,
    openSongActions,
    showToast,
    settings,
  } = useMusic();

  const [artistData, setArtistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [followOverrides, setFollowOverrides] = useState({});
  const [downloadedIds, setDownloadedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const isFollowing = followOverrides[id] ?? isArtistFollowed(id);

  useEffect(() => {
    let active = true;
    const fetchArtist = async () => {
      try {
        const res = await fetch(apiUrl(`/api/artist?id=${id}`));
        const data = await res.json();
        if (active) setArtistData(data);
      } catch (error) {
        console.error("Failed to load artist details", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchArtist();
    return () => {
      active = false;
    };
  }, [id]);

  const topSongsRaw = useMemo(() => artistData?.topSongs || [], [artistData]);
  const topSongs = useMemo(
    () => topSongsRaw.map(formatSongData).filter(Boolean),
    [topSongsRaw],
  );
  const topAlbums = artistData?.topAlbums || [];

  useEffect(() => {
    const syncDownloads = async () => {
      if (!topSongs.length) return;
      const checks = await Promise.all(
        topSongs.map(async (s) => ({
          id: s.id,
          exists: await isSongDownloaded(s.id),
        })),
      );
      setDownloadedIds(checks.filter((c) => c.exists).map((c) => c.id));
    };
    syncDownloads();
    window.addEventListener("downloadsUpdated", syncDownloads);
    return () => window.removeEventListener("downloadsUpdated", syncDownloads);
  }, [topSongs]);

  const handlePlaySong = (index, shuffle = false) => {
    if (topSongs.length === 0) return;
    playList(topSongs, index, { shuffle, preventFetch: false });
  };

  const handleToggleFollow = () => {
    if (!artistData) return;
    const nowFollowing = toggleFollowedArtist({
      id,
      name: cleanHtmlText(artistData.name),
      image: getHighResImage(artistData.image),
    });
    setFollowOverrides((prev) => ({ ...prev, [id]: nowFollowing }));
    showToast(
      nowFollowing
        ? `Following ${cleanHtmlText(artistData.name)}`
        : `Unfollowed ${cleanHtmlText(artistData.name)}`,
    );
  };

  const handleDownloadTrack = async (song, e) => {
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

    const ok = await silentDownload(song);
    setDownloadingId(null);
    if (ok) {
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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#110f0d",
        }}
      >
        <div className="majestic-loader"></div>
      </div>
    );
  }

  if (!artistData) return null;

  const artistImage = getHighResImage(artistData.image);
  const artistTitle = cleanHtmlText(artistData.name || "Unknown Artist");
  const displayedSongs = showAllSongs ? topSongs : topSongs.slice(0, 5);

  return (
    <div className="detail-page-wrapper fade-in scrollable-page">
      <div
        className="detail-gradient-bg"
        style={{ height: "60vh", opacity: 0.8 }}
      >
        <img src={artistImage} alt="blur bg" />
      </div>

      <header className="detail-nav">
        <button
          className="detail-nav-btn native-tap"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </button>
      </header>

      <div className="artist-hero-content">
        <div className="verified-badge">
          <div className="verified-icon">
            <Check size={14} strokeWidth={3} />
          </div>
          Verified Artist
        </div>
        <h1 className="artist-massive-title">{artistTitle}</h1>
        <p className="monthly-listeners">
          {artistData.follower_count
            ? `${parseInt(artistData.follower_count, 10).toLocaleString()} listeners`
            : "Popular Artist"}
        </p>
      </div>

      <div
        className="detail-action-bar"
        style={{
          padding: "0 24px 30px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          className="detail-play-circle native-tap"
          onClick={() => handlePlaySong(0, false)}
        >
          <Play
            size={28}
            fill="#000"
            color="#000"
            style={{ marginLeft: "4px" }}
          />
        </button>

        <button
          className="detail-icon-btn native-tap"
          onClick={() => handlePlaySong(0, true)}
          title="Shuffle artist tracks"
        >
          <Shuffle size={22} color="#a89f98" />
        </button>

        <div className="detail-secondary-actions">
          <button
            className="detail-icon-btn native-tap"
            onClick={handleToggleFollow}
            style={{
              border: isFollowing
                ? "1px solid #1DB954"
                : "1px solid rgba(255,255,255,0.35)",
              background: isFollowing
                ? "rgba(29, 185, 84, 0.16)"
                : "transparent",
              borderRadius: "999px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: "bold",
              color: isFollowing ? "#1DB954" : "#fff",
              cursor: "pointer",
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      <div style={{ padding: "0 14px" }}>
        <h2 className="shelf-title" style={{ paddingLeft: "10px" }}>
          Popular
        </h2>

        <div className="vibe-tracklist">
          {displayedSongs.length > 0 ? (
            displayedSongs.map((song, index) => {
              const rawSong = topSongsRaw[index] || {};
              const isCurrentlyPlaying = currentSong?.id === song.id;
              const isLiked = likedTrackIds.includes(song.id);
              const isSaved = downloadedIds.includes(song.id);
              const songImage =
                song.albumArt?.[1]?.url ||
                song.albumArt?.[0]?.url ||
                artistImage;

              return (
                <div
                  key={song.id}
                  className={`vibe-track-row native-tap ${isCurrentlyPlaying ? "active-playing" : ""}`}
                  onClick={() => handlePlaySong(index, false)}
                >
                  <div
                    className="vibe-track-index"
                    style={{
                      width: "24px",
                      textAlign: "right",
                      marginRight: "14px",
                    }}
                  >
                    {isCurrentlyPlaying && isPlaying ? (
                      <div className="eq-bars" style={{ margin: "0 auto" }}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  <img
                    src={songImage}
                    alt="art"
                    className="vibe-track-art"
                    style={{ width: "42px", height: "42px" }}
                  />

                  <div className="vibe-track-info">
                    <h4 className="vibe-track-title">{song.title}</h4>
                    <p
                      className="vibe-track-subtitle"
                      style={{ color: "#b3b3b3" }}
                    >
                      {rawSong.play_count
                        ? `${parseInt(rawSong.play_count, 10).toLocaleString()} plays`
                        : song.album || "Popular Track"}
                      {song.duration ? ` • ${song.duration}` : ""}
                    </p>
                  </div>

                  <div className="vibe-track-actions">
                    {downloadingId === song.id ? (
                      <div
                        className="download-ring-container"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download
                          size={11}
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
                    ) : isSaved ? (
                      <button
                        className="detail-icon-btn native-tap"
                        onClick={(e) => handleDownloadTrack(song, e)}
                        title="Saved offline — tap to save .m4a"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#1DB954",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <HardDriveDownload
                          size={13}
                          color="#000"
                          strokeWidth={2.5}
                        />
                      </button>
                    ) : (
                      <button
                        className="detail-icon-btn native-tap"
                        onClick={(e) => handleDownloadTrack(song, e)}
                      >
                        <Download size={18} color="#a89f98" />
                      </button>
                    )}

                    <button
                      className="detail-icon-btn native-tap"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeSong(song.id);
                      }}
                    >
                      <Heart
                        size={18}
                        color={isLiked ? "#1DB954" : "#a89f98"}
                        fill={isLiked ? "#1DB954" : "none"}
                      />
                    </button>
                    <button
                      className="detail-icon-btn native-tap"
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
            })
          ) : (
            <p style={{ color: "#666", padding: "20px 10px" }}>
              No top songs available.
            </p>
          )}

          {topSongs.length > 5 && (
            <button
              className="see-more-btn native-tap"
              onClick={() => setShowAllSongs(!showAllSongs)}
            >
              {showAllSongs ? "Show less" : "See more"}
            </button>
          )}
        </div>
      </div>

      {topAlbums.length > 0 && (
        <div className="artist-album-shelf" style={{ marginTop: "30px" }}>
          <h2 className="shelf-title">Albums</h2>
          <div className="spotify-shelf">
            {topAlbums.map((album) => (
              <div
                key={album.id}
                className="spotify-card native-tap"
                onClick={() => navigate(`/playlist/${album.id}`)}
                style={{
                  minWidth: "150px",
                  padding: "12px",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <img
                  src={getHighResImage(album.image)}
                  alt={cleanHtmlText(album.title)}
                  className="spotify-card-img"
                  style={{ boxShadow: "none" }}
                  loading="lazy"
                />
                <h4 className="spotify-card-title">
                  {cleanHtmlText(album.title)}
                </h4>
                <p className="spotify-card-subtitle">{album.year || "Album"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
