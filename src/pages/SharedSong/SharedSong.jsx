import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  ArrowLeft,
  Heart,
  MoreVertical,
  HardDriveDownload,
} from "lucide-react";
import "./SharedSong.css";
import { useMusic } from "../../context/MusicContext";
import { apiUrl } from "../../utils/api";
import { formatSongData } from "../../utils/formatters";
import { downloadSongToDevice } from "../../utils/downloadSongs";

export default function SharedSong() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playSong,
    likedTrackIds,
    toggleLikeSong,
    openSongActions,
    showToast,
    settings,
  } = useMusic();

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchSharedSong = async () => {
      try {
        const res = await fetch(apiUrl(`/api/song/${id}`));
        if (res.ok) {
          const data = await res.json();
          let rawSong = null;
          if (Array.isArray(data)) {
            rawSong = data[0];
          } else if (data.songs && Array.isArray(data.songs)) {
            rawSong = data.songs[0];
          } else if (typeof data === "object") {
            const values = Object.values(data);
            rawSong = values.length > 0 ? values[0] : null;
          }
          if (rawSong) {
            setSong(formatSongData(rawSong));
          }
        }
      } catch (error) {
        console.error("Failed to fetch shared song", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedSong();
  }, [id]);

  const handlePlaySong = () => {
    if (!song) return;
    playSong(song, true, false);
    if (localStorage.getItem("groove_token")) {
      navigate("/home");
    }
  };

  const handleDeviceDownload = async () => {
    if (!song || downloading) return;
    setDownloading(true);
    const res = await downloadSongToDevice(song, {
      quality: settings.downloadQuality,
      alsoSaveOffline: true,
    });
    setDownloading(false);
    showToast(
      res.ok ? `Downloaded .m4a (${settings.downloadQuality})` : "Download failed",
      res.ok ? "default" : "error",
    );
  };

  const isLiked = song ? likedTrackIds.includes(song.id) : false;

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

  if (!song) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#fff",
        }}
      >
        <h2>Song not found</h2>
        <button
          className="btn-ghost native-tap"
          onClick={() => navigate("/")}
          style={{ marginTop: "20px" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const coverArt =
    song.albumArt?.[2]?.url ||
    song.albumArt?.[0]?.url ||
    "https://c.saavncdn.com/default_album.jpg";

  return (
    <div className="scrollable-page fade-in shared-page-padding">
      <div className="shared-bg-container">
        <div
          className="shared-bg"
          style={{ backgroundImage: `url(${coverArt})` }}
        />
        <div className="shared-overlay" />
      </div>

      <header className="shared-header">
        <button
          className="shared-back-btn native-tap"
          onClick={() => navigate("/home", { replace: true })}
          style={{ marginTop: "calc(env(safe-area-inset-top, 12px))" }}
        >
          <ArrowLeft size={22} color="#fff" />
        </button>
        <button
          className="icon-btn native-tap"
          onClick={() => openSongActions(song)}
          style={{ marginTop: "calc(env(safe-area-inset-top, 12px))" }}
        >
          <MoreVertical size={22} color="#fff" />
        </button>
      </header>

      <main className="shared-main">
        <img src={coverArt} alt={song.title} className="shared-cover" />

        <h1 className="shared-title">{song.title}</h1>
        <p className="shared-artist">
          {song.artists?.[0]?.name || song.artist || "Unknown Artist"}
        </p>

        <div className="shared-action-row">
          <button
            className="shared-icon-btn native-tap"
            onClick={() => toggleLikeSong(song.id)}
          >
            <Heart
              size={30}
              color={isLiked ? "#1DB954" : "#a89f98"}
              fill={isLiked ? "#1DB954" : "none"}
              className={isLiked ? "heart-pop" : ""}
            />
          </button>

          <button
            className="shared-play-btn native-tap btn-glow"
            onClick={handlePlaySong}
          >
            <Play size={22} color="#000" fill="#000" />
            Play
          </button>

          <button
            className="shared-icon-btn native-tap"
            onClick={handleDeviceDownload}
            disabled={downloading}
            title="Download .m4a file"
          >
            <HardDriveDownload
              size={28}
              color={downloading ? "#1DB954" : "#ffe5b6"}
            />
          </button>
        </div>
      </main>
    </div>
  );
}
