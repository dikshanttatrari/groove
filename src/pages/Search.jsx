import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatSongData } from "../utils/formatters";
import { useMusic } from "../context/MusicContext";

export default function Search() {
  const { playSong } = useMusic();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const rawTracks = data.songs?.data || data.results || [];
      const cleanTracks = rawTracks
        .map((track) => formatSongData(track))
        .filter(Boolean);
      setResults(cleanTracks);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container fade-in">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ color: "#ffe5b6" }}>Groove Music</h2>
        <button
          className="btn-text"
          style={{ marginTop: 0 }}
          onClick={() => navigate("/")}
        >
          Log out
        </button>
      </header>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">
          {loading ? "..." : "Search"}
        </button>
      </form>

      <main style={{ display: "flex", flexDirection: "column" }}>
        {results.map((song) => (
          <div
            key={song.id}
            onClick={() => playSong(song)}
            className="song-card"
          >
            <img
              src={song.albumArt[1]?.url}
              alt="cover"
              className="song-img"
              loading="lazy"
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <h4 className="song-title">{song.title}</h4>
              <div className="song-artist">
                {song.isDRM && (
                  <span style={{ color: "#1DB954", marginRight: "5px" }}>
                    Preview
                  </span>
                )}
                {song.artists[0]?.name || song.subtitle}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
