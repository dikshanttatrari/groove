import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Play, Shuffle, MoreVertical, ArrowLeft } from "lucide-react";
import { useMusic } from "../context/MusicContext";

export default function LikedSongs() {
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay } = useMusic();

  // We will fetch real songs from DB later. For now, empty state/mock state.
  const [songs, setSongs] = useState([]);
  const userData = JSON.parse(localStorage.getItem("groove_user"));

  return (
    <div className="scrollable-page fade-in" style={{ paddingBottom: "180px" }}>
      {/* Dynamic Scrolling Header */}
      <header
        className="playlist-hero"
        style={{
          background: "linear-gradient(180deg, #1d8243 0%, #110f0d 100%)",
        }}
      >
        <button
          className="icon-btn native-tap back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={28} color="#ffffff" />
        </button>

        <div className="playlist-hero-content">
          <div className="playlist-art-shadow">
            <div className="liked-art-placeholder">
              <Heart size={48} color="#ffffff" fill="#ffffff" />
            </div>
          </div>
          <div className="playlist-text">
            <p className="playlist-type">Playlist</p>
            <h1 className="playlist-title">Liked Songs</h1>
            <p className="playlist-meta">
              {userData?.name || "User"} • {songs.length} songs
            </p>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="playlist-action-bar">
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <button className="icon-btn native-tap">
            <Shuffle size={28} color="#1DB954" />
          </button>
          <button className="icon-btn native-tap">
            <MoreVertical size={28} color="#a89f98" />
          </button>
        </div>
        <button
          className="play-btn-large native-tap"
          style={{ width: "56px", height: "56px" }}
        >
          <Play
            size={28}
            color="#110f0d"
            fill="#110f0d"
            style={{ marginLeft: "4px" }}
          />
        </button>
      </div>

      {/* Tracklist Area */}
      <main className="playlist-tracklist">
        {songs.length === 0 ? (
          <div className="empty-state">
            <h3
              style={{
                color: "#f5ece6",
                fontSize: "1.3rem",
                marginBottom: "5px",
              }}
            >
              Songs you like will appear here
            </h3>
            <p style={{ color: "#a89f98" }}>
              Save songs by tapping the heart icon.
            </p>
            <button
              className="action-pill native-tap"
              style={{
                margin: "20px auto",
                background: "#f5ece6",
                color: "#110f0d",
                fontWeight: "bold",
              }}
              onClick={() => navigate("/search")}
            >
              Find songs
            </button>
          </div>
        ) : // Map through real songs here later
        null}
      </main>
    </div>
  );
}
